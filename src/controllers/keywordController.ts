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

    if (keyword.length > 16) {
      throw new AppError(400, 'A palavra-chave pode ter no máximo 16 caracteres', 'KEYWORD_TOO_LONG');
    }

    if (position < 1 || position > 5) {
      throw new AppError(400, 'A posição deve estar entre 1 e 5', 'INVALID_POSITION');
    }

    // Regra: Apenas PRO ou BUSINESS podem registrar keywords livremente.
    const { default: userServiceObj } = await import('../services/userService');
    const user = await userServiceObj.getUserById(userId);

    if (user?.plan === 'FREE' || !user?.plan) {
      throw new AppError(403, 'Acesso Negado: O gerenciamento de palavras-chave requer plano PRO ou BUSINESS.', 'UPGRADE_REQUIRED');
    }

    try {
      // Iniciar Transaction Postgres
      await query('BEGIN');

      // Calcular expiração (30 dias)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      // Inserir ou Atualizar a keyword
      await query(`
        INSERT INTO user_search_keywords (user_id, keyword, position, price_paid, expires_at, active)
        VALUES ($1, $2, $3, 0, $4, true)
        ON CONFLICT (user_id, position) DO UPDATE SET
          keyword = EXCLUDED.keyword,
          price_paid = 0,
          expires_at = EXCLUDED.expires_at,
          active = true,
          updated_at = CURRENT_TIMESTAMP
      `, [userId, keyword.toLowerCase().trim(), position, expiresAt]);

      await query('COMMIT');

      res.json({
        success: true,
        message: 'Palavra-chave registrada com sucesso',
        data: {
          keyword: keyword.toLowerCase().trim(),
          position,
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
