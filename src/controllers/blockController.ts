import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import blockService from '../services/blockService';
import userService from '../services/userService';
import { AppError } from '../middleware/errorHandler';

export class BlockController {
  async blockUser(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { blockedUserId, reason } = req.body;

      if (!blockedUserId) {
        throw new AppError(400, 'ID do usuário a bloquear é obrigatório', 'MISSING_BLOCKED_USER_ID');
      }

      // Verificar se o usuário existe
      const user = await userService.getUserById(blockedUserId);
      if (!user) {
        throw new AppError(404, 'Usuário não encontrado', 'USER_NOT_FOUND');
      }

      // Bloquear usuário
      const blocked = await blockService.blockUser(userId, blockedUserId, reason);

      res.json({
        success: true,
        message: 'Usuário bloqueado com sucesso',
        data: {
          id: blocked.id,
          blockedUserId: blocked.blockedUserId,
          reason: blocked.reason,
          createdAt: blocked.createdAt,
        },
      });
    } catch (error) {
      throw error;
    }
  }

  async unblockUser(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { blockedUserId } = req.body;

      if (!blockedUserId) {
        throw new AppError(400, 'ID do usuário a desbloquear é obrigatório', 'MISSING_BLOCKED_USER_ID');
      }

      // Desbloquear usuário
      const success = await blockService.unblockUser(userId, blockedUserId);

      if (!success) {
        throw new AppError(404, 'Bloqueio não encontrado', 'BLOCK_NOT_FOUND');
      }

      res.json({
        success: true,
        message: 'Usuário desbloqueado com sucesso',
      });
    } catch (error) {
      throw error;
    }
  }

  async getBlockedUsers(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;

      const blockedUsers = await blockService.getBlockedUsers(userId);

      res.json({
        success: true,
        message: 'Usuários bloqueados',
        data: {
          blockedUsers,
          count: blockedUsers.length,
        },
      });
    } catch (error) {
      throw error;
    }
  }

  async isUserBlocked(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { blockedUserId } = req.params;

      if (!blockedUserId) {
        throw new AppError(400, 'ID do usuário é obrigatório', 'MISSING_USER_ID');
      }

      const isBlocked = await blockService.isUserBlocked(userId, blockedUserId);

      res.json({
        success: true,
        message: 'Status de bloqueio',
        data: {
          isBlocked,
        },
      });
    } catch (error) {
      throw error;
    }
  }

  async getBlockedUsersCount(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;

      const count = await blockService.getBlockedUsersCount(userId);

      res.json({
        success: true,
        message: 'Total de usuários bloqueados',
        data: {
          count,
        },
      });
    } catch (error) {
      throw error;
    }
  }
}

export default new BlockController();

