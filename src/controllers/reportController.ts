import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import reportService from '../services/reportService';
import blockService from '../services/blockService';
import { AppError } from '../middleware/errorHandler';
import { ReportType } from '../types';

export class ReportController {
  async createReport(req: AuthenticatedRequest, res: Response) {
    try {
      const reporterId = req.userId!;
      const { reportType, description, reportedUserId, messageId, productId } = req.body;

      if (!reportType || !description) {
        throw new AppError(400, 'Tipo de denúncia e descrição são obrigatórios', 'MISSING_REPORT_DATA');
      }

      // Validar tipo de denúncia
      const validTypes: ReportType[] = ['OFFENSIVE', 'SCAM', 'HARASSMENT', 'SPAM', 'OTHER'];
      if (!validTypes.includes(reportType)) {
        throw new AppError(400, 'Tipo de denúncia inválido', 'INVALID_REPORT_TYPE');
      }

      // Criar denúncia
      const report = await reportService.createReport(
        reporterId,
        reportType,
        description,
        reportedUserId,
        messageId,
        productId
      );

      // Se for denúncia de golpe, bloquear automaticamente
      if (reportType === 'SCAM' && reportedUserId) {
        await blockService.blockUser(
          reporterId,
          reportedUserId,
          `Bloqueado automaticamente por denúncia de golpe`
        );
      }

      res.json({
        success: true,
        message: 'Denúncia criada com sucesso. Obrigado por ajudar a manter a comunidade segura!',
        data: {
          id: report.id,
          reportType: report.reportType,
          productId: report.productId,
          status: report.status,
          createdAt: report.createdAt,
        },
      });
    } catch (error) {
      throw error;
    }
  }

  async getReportById(req: AuthenticatedRequest, res: Response) {
    try {
      const { reportId } = req.params;

      if (!reportId) {
        throw new AppError(400, 'ID da denúncia é obrigatório', 'MISSING_REPORT_ID');
      }

      const report = await reportService.getReportById(reportId);

      if (!report) {
        throw new AppError(404, 'Denúncia não encontrada', 'REPORT_NOT_FOUND');
      }

      res.json({
        success: true,
        message: 'Denúncia encontrada',
        data: report,
      });
    } catch (error) {
      throw error;
    }
  }

  async getUserReports(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;

      const reports = await reportService.getUserReports(userId);

      res.json({
        success: true,
        message: 'Denúncias do usuário',
        data: {
          reports,
          count: reports.length,
        },
      });
    } catch (error) {
      throw error;
    }
  }

  async getReportsByUser(req: AuthenticatedRequest, res: Response) {
    try {
      const { userId } = req.params;

      if (!userId) {
        throw new AppError(400, 'ID do usuário é obrigatório', 'MISSING_USER_ID');
      }

      const reports = await reportService.getReportsByUser(userId);

      res.json({
        success: true,
        message: 'Denúncias sobre o usuário',
        data: {
          reports,
          count: reports.length,
        },
      });
    } catch (error) {
      throw error;
    }
  }

  async getPendingReports(req: AuthenticatedRequest, res: Response) {
    try {
      // Verificar se é admin (implementar depois)
      const reports = await reportService.getPendingReports();

      res.json({
        success: true,
        message: 'Denúncias pendentes',
        data: {
          reports,
          count: reports.length,
        },
      });
    } catch (error) {
      throw error;
    }
  }

  async updateReportStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const { reportId } = req.params;
      const { status, resolutionNotes } = req.body;

      if (!reportId || !status) {
        throw new AppError(400, 'ID da denúncia e status são obrigatórios', 'MISSING_REPORT_DATA');
      }

      // Validar status
      const validStatuses = ['PENDING', 'REVIEWING', 'RESOLVED', 'DISMISSED'];
      if (!validStatuses.includes(status)) {
        throw new AppError(400, 'Status inválido', 'INVALID_STATUS');
      }

      const report = await reportService.updateReportStatus(reportId, status, resolutionNotes);

      if (!report) {
        throw new AppError(404, 'Denúncia não encontrada', 'REPORT_NOT_FOUND');
      }

      res.json({
        success: true,
        message: 'Status da denúncia atualizado',
        data: report,
      });
    } catch (error) {
      throw error;
    }
  }

  async getReportStatistics(req: AuthenticatedRequest, res: Response) {
    try {
      const statistics = await reportService.getReportStatistics();

      res.json({
        success: true,
        message: 'Estatísticas de denúncias',
        data: statistics,
      });
    } catch (error) {
      throw error;
    }
  }
}

export default new ReportController();

