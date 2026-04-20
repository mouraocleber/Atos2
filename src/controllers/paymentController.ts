import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { mercadoPagoService } from '../services/mercadoPagoService';
import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export class PaymentController {
  /**
   * Endpoint Privado: Gera uma cobrança/depósito PIX
   */
  async generatePixDeposit(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { amount, currency } = req.body;
      console.log(`[PaymentController] Initing PIX request for User: ${userId}, Amount: ${amount}, Currency: ${currency}`);

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Insira um valor maior que 0 para depósito.' });
      }

      // Isolar Mercado Pago exclusivamente ao uso local (BRL)
      if (currency && currency.toUpperCase() !== 'BRL') {
        return res.status(400).json({ error: 'Mercado Pago é restrito apenas a depósitos em BRL (Pix).' });
      }


      // Buscar email e identificação do user para o construtor do MP
      const userRes = await query('SELECT email, name, cpf, plan FROM users WHERE id = $1', [userId]);
      if (userRes.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
      const { email: payerEmail, name: payerName, cpf: payerCpf, plan } = userRes.rows[0];

      if (plan !== 'BUSINESS') {
        return res.status(403).json({ error: 'A geração de cobranças/depósitos PIX é restrita ao plano Business.' });
      }

      // Criar a transação PRELIMINAR (Aguardando Pagamento) na Carteira do Atos2
      const depositId = uuidv4();
      
      // Salva na tabela interna de rastreamento
      await query(
        `INSERT INTO transactions (
          id, to_user_id, type, amount, currency, status, description, reference
        ) VALUES ($1, $2, 'DEPOSIT', $3, 'BRL', 'PENDING', 'Recarga de Saldo Pix - Mercado Pago', $4)`,
        [depositId, userId, amount, depositId]
      );

      // Gera efetivamente a cobrança
      const pixData = await mercadoPagoService.createPixPayment(amount, payerEmail, depositId, payerName, payerCpf);

      console.log(`[PaymentController] PIX Generated successfully! ID: ${pixData.id}`);
      return res.status(200).json({
        success: true,
        data: {
          transactionId: depositId,
          pix: pixData
        }
      });

    } catch (error: any) {
      console.error('[PaymentController] Falha no depósito:', error);
      res.status(500).json({ error: error.message || 'Erro interno ao gerar pagamento PIX.' });
    }
  }

  /**
   * Endpoint Público (Webhook): Onde o Mercado Pago avisa sobre pagamentos aprovados 
   */
  async mercadoPagoWebhook(req: any, res: Response) {
    // O Mercado Pago manda POSTs contínuos pro seu servidor informando mudanças de estado
    try {
      // 1. O MP nos envia um sinal do tipo "payment"
      if (req.query.topic === 'payment' || req.query.type === 'payment' || req.body?.type === 'payment') {
        const paymentId = req.query.id || req.body?.data?.id;

        if (paymentId) {
          // 2. Com o ID da notificação, buscamos DE FATO na API deles para garantir a segurança (evitar fraude)
          const securePaymentData = await mercadoPagoService.getPaymentStatus(paymentId);
          
          if (securePaymentData.status === 'approved' && securePaymentData.external_reference) {
            const depositId = securePaymentData.external_reference;

            // 3. Checamos se essa transação existe em nosso DB como "PENDING"
            const dbCheck = await query('SELECT * FROM transactions WHERE id = $1 AND status = $2', [depositId, 'PENDING']);
            
            if (dbCheck.rows.length > 0) {
              const deposit = dbCheck.rows[0];
              const userId = deposit.to_user_id;
              const amount = parseFloat(deposit.amount);

              // 4. Se for válido e não-pago, efetivamos o pagamento:
              const client = await (require('../config/database').getClient)();
              try {
                await client.query('BEGIN');
                
                // Marca transação como completa
                await client.query("UPDATE transactions SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [depositId]);
                
                // Infla a carteira em BRL
                await client.query("UPDATE wallets SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 AND currency = 'BRL'", [amount, userId]);
                
                await client.query('COMMIT');
                console.log(`[Webhook Atos2] Saldo de R$ ${amount} creditado com SUCESSO na carteira do user: ${userId}`);
              } catch (e) {
                await client.query('ROLLBACK');
                throw e;
              } finally {
                client.release();
              }
            }
          }
        }
      }

      // 200 OK pro Webhook parar de reenviar a notificação
      res.status(200).send('Webhook Processado');
    } catch (error) {
      console.error('[PaymentController Webhook Error]:', error);
      res.status(500).send('Erro no Webhook');
    }
  }
}

export const paymentController = new PaymentController();
