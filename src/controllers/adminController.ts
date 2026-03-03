import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { query } from '../config/database';
import userService from '../services/userService';
import { ApiResponse } from '../types';

export class AdminController {
  // Obter estatísticas gerais do sistema
  async getStats(req: AuthenticatedRequest, res: Response) {
    try {
      const userCount = await query('SELECT COUNT(*) FROM users');
      const messageCount = await query('SELECT COUNT(*) FROM messages');
      const transactionCount = await query('SELECT COUNT(*) FROM transactions');
      const totalVolume = await query('SELECT SUM(amount) FROM transactions WHERE status = \'COMPLETED\'');
      const pendingReports = await query('SELECT COUNT(*) FROM reports WHERE status = \'PENDING\'');

      const stats = {
        users: parseInt(userCount.rows[0].count),
        messages: parseInt(messageCount.rows[0].count),
        transactions: parseInt(transactionCount.rows[0].count),
        totalVolume: parseFloat(totalVolume.rows[0].sum || 0),
        pendingReports: parseInt(pendingReports.rows[0].count)
      };

      return res.json({
        success: true,
        message: 'Estatísticas recuperadas com sucesso',
        data: stats
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao buscar estatísticas',
        error: (error as Error).message
      });
    }
  }

  // Listar todos os usuários com paginação
  async listUsers(req: AuthenticatedRequest, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const result = await query(
        `SELECT id, email, phone, nickname, name, role, is_active, created_at, last_login 
         FROM users 
         ORDER BY created_at DESC 
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      const total = await query('SELECT COUNT(*) FROM users');

      return res.json({
        success: true,
        message: 'Usuários listados com sucesso',
        data: {
          users: result.rows,
          pagination: {
            total: parseInt(total.rows[0].count),
            page,
            limit,
            pages: Math.ceil(parseInt(total.rows[0].count) / limit)
          }
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao listar usuários',
        error: (error as Error).message
      });
    }
  }

  // Alterar status de um usuário (Ativar/Desativar)
  async toggleUserStatus(req: AuthenticatedRequest, res: Response) {
    const { userId } = req.params;
    const { isActive } = req.body;

    try {
      const user = await userService.updateUser(userId, { isActive });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      return res.json({
        success: true,
        message: `Usuário ${isActive ? 'ativado' : 'desativado'} com sucesso`,
        data: user
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao alterar status do usuário',
        error: (error as Error).message
      });
    }
  }

  // Alterar papel de um usuário (USER/ADMIN)
  async updateUserRole(req: AuthenticatedRequest, res: Response) {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['USER', 'ADMIN'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Papel inválido'
      });
    }

    try {
      const user = await userService.updateUser(userId, { role });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      return res.json({
        success: true,
        message: 'Papel do usuário atualizado com sucesso',
        data: user
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao atualizar papel do usuário',
        error: (error as Error).message
      });
    }
  }

  // Listar denúncias pendentes
  async listReports(req: AuthenticatedRequest, res: Response) {
    try {
      const result = await query(
        `SELECT r.*, u1.nickname as reporter_name, u2.nickname as reported_name 
         FROM reports r
         JOIN users u1 ON r.reporter_id = u1.id
         LEFT JOIN users u2 ON r.reported_user_id = u2.id
         ORDER BY r.created_at DESC`
      );

      return res.json({
        success: true,
        message: 'Denúncias listadas com sucesso',
        data: result.rows
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao listar denúncias',
        error: (error as Error).message
      });
    }
  }

  // Resolver uma denúncia
  async resolveReport(req: AuthenticatedRequest, res: Response) {
    const { reportId } = req.params;
    const { status, resolutionNotes } = req.body;

    try {
      const result = await query(
        `UPDATE reports 
         SET status = $1, resolution_notes = $2, resolved_at = CURRENT_TIMESTAMP 
         WHERE id = $3 
         RETURNING *`,
        [status, resolutionNotes, reportId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Denúncia não encontrada'
        });
      }

      return res.json({
        success: true,
        message: 'Denúncia resolvida com sucesso',
        data: result.rows[0]
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao resolver denúncia',
        error: (error as Error).message
      });
    }
  }
}

export default new AdminController();
