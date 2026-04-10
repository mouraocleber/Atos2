import { query, getClient } from '../config/database';

export class ProductReservationService {
  /**
   * Reserva um produto transacionando o valor X (1.00) cobrando a comissão de 3%.
   */
  async reserveProduct(
    buyerId: string, 
    productId: string, 
    reservationDate: string, 
    reservationTime: string, 
    observation?: string
  ): Promise<any> {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      
      // 1. Validar e recuperar dados do produto
      const prodRes = await client.query(
        'SELECT user_id, is_reservable FROM products WHERE id = $1 AND status = $2', 
        [productId, 'ACTIVE']
      );
      
      if (prodRes.rows.length === 0) {
        throw new Error('Produto não encontrado ou inativo');
      }
      
      const product = prodRes.rows[0];
      if (!product.is_reservable) {
        throw new Error('O produto selecionado não está disponível para reservas.');
      }
      
      const sellerId = product.user_id;

      if (buyerId === sellerId) {
        throw new Error('Você não pode reservar seu próprio produto.');
      }

      // 2. Definir os valores conforme especificado:
      // Valor X global da reserva é de "1.00".
      // A plataforma cobra 3% de quem compra e 3% de quem vende.
      const baseAmount = 1.00;
      const buyerFee = +(baseAmount * 0.03).toFixed(2);  // 0.03
      const sellerFee = +(baseAmount * 0.03).toFixed(2); // 0.03
      
      const buyerTotalDeduction = baseAmount + buyerFee; // 1.03
      const sellerTotalCredit = baseAmount - sellerFee;  // 0.97

      // 3. Validar e bloquear (Lock) linha do saldo dos dois lados
      const buyerAcc = await client.query('SELECT balance FROM users WHERE id = $1 FOR UPDATE', [buyerId]);
      if (buyerAcc.rows.length === 0) throw new Error('Usuário comprador não encontrado');
      if (parseFloat(buyerAcc.rows[0].balance) < buyerTotalDeduction) {
        throw new Error(`Saldo insuficiente. É necessário pelo menos ${buyerTotalDeduction} GLB para a reserva.`);
      }

      const sellerAcc = await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [sellerId]);
      if (sellerAcc.rows.length === 0) throw new Error('Usuário vendedor não existe mais');

      // 4. Executar transação de saldos
      await client.query(
        'UPDATE users SET balance = balance - $1 WHERE id = $2',
        [buyerTotalDeduction, buyerId]
      );
      
      await client.query(
        'UPDATE users SET balance = balance + $1 WHERE id = $2',
        [sellerTotalCredit, sellerId]
      );

      // 5. Registrar transação contábil primária (Transferência com taxas)
      const transRes = await client.query(`
        INSERT INTO transactions (from_user_id, to_user_id, type, amount, currency, fee, status, description)
        VALUES ($1, $2, 'PAYMENT', $3, 'GLB', $4, 'COMPLETED', 'Reserva de Produto via Monetização Atos2')
        RETURNING id
      `, [buyerId, sellerId, baseAmount, buyerFee + sellerFee]);
      const transactionId = transRes.rows[0].id;

      // 6. Criar o ticket de reserva  
      const presRes = await client.query(`
        INSERT INTO product_reservations 
          (product_id, buyer_id, seller_id, reservation_date, reservation_time, observation, amount_paid, transaction_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [productId, buyerId, sellerId, reservationDate, reservationTime, observation || null, buyerTotalDeduction, transactionId]);

      await client.query('COMMIT');
      return presRes.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Retorna histórico de compras (reservas feitas pelo usuário)
   */
  async getBuyerReservations(buyerId: string): Promise<any[]> {
    const res = await query(`
      SELECT pr.*, p.name as product_name, u.name as seller_name
      FROM product_reservations pr
      JOIN products p ON pr.product_id = p.id
      JOIN users u ON pr.seller_id = u.id
      WHERE pr.buyer_id = $1
      ORDER BY pr.created_at DESC
    `, [buyerId]);
    return res.rows;
  }

  /**
   * Retorna histórico de vendas (reservas recebidas pelo vendedor)
   */
  async getSellerReservations(sellerId: string): Promise<any[]> {
    const res = await query(`
      SELECT pr.*, p.name as product_name, u.name as buyer_name
      FROM product_reservations pr
      JOIN products p ON pr.product_id = p.id
      JOIN users u ON pr.buyer_id = u.id
      WHERE pr.seller_id = $1
      ORDER BY pr.created_at DESC
    `, [sellerId]);
    return res.rows;
  }
}

export default new ProductReservationService();
