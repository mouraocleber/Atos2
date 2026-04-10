import { query } from '../config/database';
import { ReportType, ReportStatus } from '../types';

export interface Report {
  id: string;
  reporterId: string;
  reportedUserId?: string;
  messageId?: string;
  productId?: string;
  reportType: ReportType;
  description: string;
  status: ReportStatus;
  resolutionNotes?: string;
  createdAt: Date;
  resolvedAt?: Date;
}

export class ReportService {
  async createReport(
    reporterId: string,
    reportType: ReportType,
    description: string,
    reportedUserId?: string,
    messageId?: string,
    productId?: string
  ): Promise<Report> {
    try {
      // Validar que pelo menos um dos alvos foi fornecido
      if (!reportedUserId && !messageId && !productId) {
        throw new Error('Você deve denunciar um usuário, um produto ou uma mensagem');
      }

      // Validar que não está denunciando a si mesmo
      if (reportedUserId && reporterId === reportedUserId) {
        throw new Error('Você não pode denunciar a si mesmo');
      }

      // Validar descrição
      if (!description || description.trim().length < 10) {
        throw new Error('Descrição deve ter pelo menos 10 caracteres');
      }

      // Criar denúncia
      const result = await query(
        `INSERT INTO reports (reporter_id, reported_user_id, message_id, product_id, report_type, description)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, reporter_id, reported_user_id, message_id, product_id, report_type, description, status, created_at`,
        [reporterId, reportedUserId || null, messageId || null, productId || null, reportType, description]
      );

      const report = result.rows[0];

      // Verificação de bloqueio automático por denúncias recorrentes de produto
      if (productId) {
        const countRes = await query('SELECT COUNT(*) as sum FROM reports WHERE product_id = $1 AND status != \'DISMISSED\'', [productId]);
        const total = parseInt(countRes.rows[0].sum);
        if (total >= 3) {
          const prodInfo = await query('SELECT user_id FROM products WHERE id = $1', [productId]);
          if (prodInfo.rows.length > 0) {
            const sellerId = prodInfo.rows[0].user_id;
            await query("UPDATE products SET status = 'INACTIVE', is_active = false WHERE id = $1", [productId]);
            await query("UPDATE users SET is_active = false, status = 'BLOCKED' WHERE id = $1", [sellerId]);
          }
        }
      }

      return {
        id: report.id,
        reporterId: report.reporter_id,
        reportedUserId: report.reported_user_id,
        messageId: report.message_id,
        productId: report.product_id,
        reportType: report.report_type,
        description: report.description,
        status: report.status,
        createdAt: report.created_at,
      };
    } catch (error) {
      console.error('Erro ao criar denúncia:', error);
      throw error;
    }
  }

  async getReportById(reportId: string): Promise<Report | null> {
    try {
      const result = await query(
        `SELECT id, reporter_id, reported_user_id, message_id, product_id, report_type, description, 
                status, resolution_notes, created_at, resolved_at
         FROM reports WHERE id = $1`,
        [reportId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const report = result.rows[0];

      return {
        id: report.id,
        reporterId: report.reporter_id,
        reportedUserId: report.reported_user_id,
        messageId: report.message_id,
        productId: report.product_id,
        reportType: report.report_type,
        description: report.description,
        status: report.status,
        resolutionNotes: report.resolution_notes,
        createdAt: report.created_at,
        resolvedAt: report.resolved_at,
      };
    } catch (error) {
      console.error('Erro ao obter denúncia:', error);
      throw error;
    }
  }

  async getUserReports(userId: string): Promise<Report[]> {
    try {
      const result = await query(
        `SELECT id, reporter_id, reported_user_id, message_id, product_id, report_type, description, 
                status, resolution_notes, created_at, resolved_at
         FROM reports WHERE reporter_id = $1
         ORDER BY created_at DESC
         LIMIT 50`,
        [userId]
      );

      return result.rows.map((row: any) => ({
        id: row.id,
        reporterId: row.reporter_id,
        reportedUserId: row.reported_user_id,
        messageId: row.message_id,
        productId: row.product_id,
        reportType: row.report_type,
        description: row.description,
        status: row.status,
        resolutionNotes: row.resolution_notes,
        createdAt: row.created_at,
        resolvedAt: row.resolved_at,
      }));
    } catch (error) {
      console.error('Erro ao obter denúncias do usuário:', error);
      throw error;
    }
  }

  async getReportsByUser(reportedUserId: string): Promise<Report[]> {
    try {
      const result = await query(
        `SELECT id, reporter_id, reported_user_id, message_id, product_id, report_type, description, 
                status, resolution_notes, created_at, resolved_at
         FROM reports WHERE reported_user_id = $1
         ORDER BY created_at DESC
         LIMIT 50`,
        [reportedUserId]
      );

      return result.rows.map((row: any) => ({
        id: row.id,
        reporterId: row.reporter_id,
        reportedUserId: row.reported_user_id,
        messageId: row.message_id,
        productId: row.product_id,
        reportType: row.report_type,
        description: row.description,
        status: row.status,
        resolutionNotes: row.resolution_notes,
        createdAt: row.created_at,
        resolvedAt: row.resolved_at,
      }));
    } catch (error) {
      console.error('Erro ao obter denúncias sobre usuário:', error);
      throw error;
    }
  }

  async getPendingReports(): Promise<Report[]> {
    try {
      const result = await query(
        `SELECT id, reporter_id, reported_user_id, message_id, report_type, description, 
                status, resolution_notes, created_at, resolved_at
         FROM reports WHERE status = 'PENDING'
         ORDER BY created_at ASC
         LIMIT 100`
      );

      return result.rows.map((row: any) => ({
        id: row.id,
        reporterId: row.reporter_id,
        reportedUserId: row.reported_user_id,
        messageId: row.message_id,
        reportType: row.report_type,
        description: row.description,
        status: row.status,
        resolutionNotes: row.resolution_notes,
        createdAt: row.created_at,
        resolvedAt: row.resolved_at,
      }));
    } catch (error) {
      console.error('Erro ao obter denúncias pendentes:', error);
      throw error;
    }
  }

  async updateReportStatus(
    reportId: string,
    status: ReportStatus,
    resolutionNotes?: string
  ): Promise<Report | null> {
    try {
      const result = await query(
        `UPDATE reports 
         SET status = $1, resolution_notes = $2, resolved_at = CASE WHEN $1 != 'PENDING' THEN CURRENT_TIMESTAMP ELSE NULL END
         WHERE id = $3
         RETURNING id, reporter_id, reported_user_id, message_id, report_type, description, status, resolution_notes, created_at, resolved_at`,
        [status, resolutionNotes || null, reportId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const report = result.rows[0];

      return {
        id: report.id,
        reporterId: report.reporter_id,
        reportedUserId: report.reported_user_id,
        messageId: report.message_id,
        reportType: report.report_type,
        description: report.description,
        status: report.status,
        resolutionNotes: report.resolution_notes,
        createdAt: report.created_at,
        resolvedAt: report.resolved_at,
      };
    } catch (error) {
      console.error('Erro ao atualizar denúncia:', error);
      throw error;
    }
  }

  async getReportStatistics(): Promise<any> {
    try {
      const result = await query(
        `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'REVIEWING' THEN 1 ELSE 0 END) as reviewing,
          SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END) as resolved,
          SUM(CASE WHEN status = 'DISMISSED' THEN 1 ELSE 0 END) as dismissed,
          SUM(CASE WHEN report_type = 'OFFENSIVE' THEN 1 ELSE 0 END) as offensive,
          SUM(CASE WHEN report_type = 'SCAM' THEN 1 ELSE 0 END) as scam,
          SUM(CASE WHEN report_type = 'HARASSMENT' THEN 1 ELSE 0 END) as harassment,
          SUM(CASE WHEN report_type = 'SPAM' THEN 1 ELSE 0 END) as spam
         FROM reports`
      );

      return result.rows[0];
    } catch (error) {
      console.error('Erro ao obter estatísticas de denúncias:', error);
      throw error;
    }
  }
}

export default new ReportService();

