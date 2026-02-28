import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import backupService from '../services/backupService';
import { AppError } from '../middleware/errorHandler';

export class BackupController {
  async createBackup(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { backupType, deviceId, email } = req.body;

      if (!backupType) {
        throw new AppError(400, 'Tipo de backup é obrigatório', 'MISSING_BACKUP_TYPE');
      }

      // Validar tipo de backup
      const validTypes = ['MANUAL', 'AUTOMATIC', 'EMAIL'];
      if (!validTypes.includes(backupType)) {
        throw new AppError(400, 'Tipo de backup inválido', 'INVALID_BACKUP_TYPE');
      }

      // Se for EMAIL, validar email
      if (backupType === 'EMAIL' && !email) {
        throw new AppError(400, 'Email é obrigatório para backup por email', 'MISSING_EMAIL');
      }

      // Se for DEVICE, validar deviceId
      if (backupType === 'MANUAL' && deviceId && !deviceId.trim()) {
        throw new AppError(400, 'ID do dispositivo inválido', 'INVALID_DEVICE_ID');
      }

      const backup = await backupService.createBackup(
        userId,
        backupType,
        deviceId,
        email
      );

      res.json({
        success: true,
        message: 'Backup iniciado com sucesso',
        data: backup,
      });
    } catch (error) {
      throw error;
    }
  }

  async getUserBackups(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;

      const backups = await backupService.getUserBackups(userId);

      res.json({
        success: true,
        message: 'Backups do usuário',
        data: {
          backups,
          count: backups.length,
        },
      });
    } catch (error) {
      throw error;
    }
  }

  async getBackupById(req: AuthenticatedRequest, res: Response) {
    try {
      const { backupId } = req.params;
      const userId = req.userId!;

      if (!backupId) {
        throw new AppError(400, 'ID do backup é obrigatório', 'MISSING_BACKUP_ID');
      }

      const backup = await backupService.getBackupById(backupId);

      if (!backup) {
        throw new AppError(404, 'Backup não encontrado', 'BACKUP_NOT_FOUND');
      }

      // Verificar se o backup pertence ao usuário
      if (backup.userId !== userId) {
        throw new AppError(403, 'Acesso negado', 'FORBIDDEN');
      }

      res.json({
        success: true,
        message: 'Backup encontrado',
        data: backup,
      });
    } catch (error) {
      throw error;
    }
  }

  async deleteBackup(req: AuthenticatedRequest, res: Response) {
    try {
      const { backupId } = req.params;
      const userId = req.userId!;

      if (!backupId) {
        throw new AppError(400, 'ID do backup é obrigatório', 'MISSING_BACKUP_ID');
      }

      // Verificar se o backup pertence ao usuário
      const backup = await backupService.getBackupById(backupId);

      if (!backup) {
        throw new AppError(404, 'Backup não encontrado', 'BACKUP_NOT_FOUND');
      }

      if (backup.userId !== userId) {
        throw new AppError(403, 'Acesso negado', 'FORBIDDEN');
      }

      const success = await backupService.deleteBackup(backupId);

      if (!success) {
        throw new AppError(500, 'Erro ao deletar backup', 'DELETE_FAILED');
      }

      res.json({
        success: true,
        message: 'Backup deletado com sucesso',
      });
    } catch (error) {
      throw error;
    }
  }

  async getBackupStatistics(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;

      const statistics = await backupService.getBackupStatistics(userId);

      res.json({
        success: true,
        message: 'Estatísticas de backups',
        data: statistics,
      });
    } catch (error) {
      throw error;
    }
  }
}

export default new BackupController();

