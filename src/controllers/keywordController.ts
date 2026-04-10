import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';

export class KeywordController {
  
  // Endpoint para compra de uma palavra-chave
  async buyKeyword(req: AuthenticatedRequest, res: Response) {
    const { keyword, position } = req.body;
    const userId = req.userId;

    if (!userId) {
      throw new AppError(401, 'Usuário não autenticado', 'UNAUTHORIZED');
    }

    if (!keyword || typeof keyword !== 'string') {
      throw new AppError(400, 'Palavra-chave inválida', 'INVALID_KEYWORD');
    }

    if (position < 1 || position > 5) {
      throw new AppError(400, 'A posição deve estar entre 1 e 5', 'INVALID_POSITION');
    }

    // Regra de preços detalhada (onde X=1 Global)
    const basePrice = 1; 
    let cost = 0;
    switch (position) {
      case 1: cost = basePrice * 10; break;
      case 2: cost = basePrice * 6; break;
      case 3: cost = basePrice * 4; break;
      case 4: cost = basePrice * 2; break;
      case 5: cost = basePrice * 1; break;
    }

    // 1. Checar saldo do usuário na carteira Global ('G' ou 'BRL', assumindo 'G' para moeda do app)
    // Se o Atos2 usa BRL como primary ou G, vamos checar saldo disponível no record do usuário ou wallet
    // Em Atos2, a "Global" geralmente é gerenciada na coluna balance dos users ou tabela wallets
    const walletRes = await query(`SELECT id, balance FROM wallets WHERE user_id = $1 AND currency = 'G'`, [userId]);
    
    // Fallback: se não achar 'G', as carteiras podem ser BRL. 
    const wallet = walletRes.rows[0];
    
    if (!wallet) {
      throw new AppError(400, 'Carteira Global não encontrada', 'WALLET_NOT_FOUND');
    }

    if (parseFloat(wallet.balance) < cost) {
      throw new AppError(400, 'Saldo insuficiente', 'INSUFFICIENT_FUNDS');
    }

    // 2. Transação (debitar do wallet e inserir a keyword)
    try {
      // Iniciar Transaction Postgres
      await query('BEGIN');

      // Debita valor
      await query('UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2', [cost, wallet.id]);

      // Registrar Extrato / Transação
      await query(`
        INSERT INTO transactions (from_user_id, type, amount, currency, status, description, reference)
        VALUES ($1, 'PAYMENT', $2, 'G', 'COMPLETED', $3, 'KEYWORD_BUY')
      `, [userId, cost, `Compra de palavra-chave: "${keyword}" (posição ${position})`]);

      // Calcular expiração (30 dias)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      // Inserir ou Atualizar a keyword
      await query(`
        INSERT INTO user_search_keywords (user_id, keyword, position, price_paid, expires_at, active)
        VALUES ($1, $2, $3, $4, $5, true)
        ON CONFLICT (user_id, position) DO UPDATE SET
          keyword = EXCLUDED.keyword,
          price_paid = EXCLUDED.price_paid,
          expires_at = EXCLUDED.expires_at,
          active = true,
          updated_at = CURRENT_TIMESTAMP
      `, [userId, keyword.toLowerCase().trim(), position, cost, expiresAt]);

      await query('COMMIT');

      res.json({
        success: true,
        message: 'Palavra-chave adquirida com sucesso',
        data: {
          keyword: keyword.toLowerCase().trim(),
          position,
          cost,
          expiresAt
        }
      });
    } catch (error) {
      await query('ROLLBACK');
      console.error('Erro na compra da palavra-chave:', error);
      throw new AppError(500, 'Erro ao processar a compra da palavra-chave', 'TRANSACTION_FAILED');
    }
  }

  // Endpoint para listar palavras compradas pelo usuário logado
  async getMyKeywords(req: AuthenticatedRequest, res: Response) {
    const userId = req.userId;

    if (!userId) {
      throw new AppError(401, 'Usuário não autenticado', 'UNAUTHORIZED');
    }

    const result = await query(`
      SELECT keyword, position, price_paid as "pricePaid", active, expires_at as "expiresAt"
      FROM user_search_keywords
      WHERE user_id = $1
      ORDER BY position ASC
    `, [userId]);

    res.json({
      success: true,
      message: 'Palavras-chave recuperadas com sucesso',
      data: {
        keywords: result.rows
      }
    });
  }

  // Endpoint para desativar palavra chave (não gera refund)
  async toggleKeywordStatus(req: AuthenticatedRequest, res: Response) {
    const userId = req.userId;
    const { position, active } = req.body;

    if (!userId) {
      throw new AppError(401, 'Usuário não autenticado', 'UNAUTHORIZED');
    }

    await query(`
      UPDATE user_search_keywords 
      SET active = $1, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $2 AND position = $3
    `, [active, userId, position]);

    res.json({
      success: true,
      message: 'Status da palavra-chave atualizado com sucesso'
    });
  }
}

export default new KeywordController();
