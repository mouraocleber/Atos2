import { query } from '../config/database';
import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';

export interface Backup {
  id: string;
  userId: string;
  deviceId?: string;
  email?: string;
  backupType: 'MANUAL' | 'AUTOMATIC' | 'EMAIL';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  fileUrl?: string;
  fileSize?: number;
  messagesCount: number;
  mediaCount: number;
  errorMessage?: string;
  createdAt: Date;
  completedAt?: Date;
  expiresAt?: Date;
}

export class BackupService {
  // Criar backup
  async createBackup(
    userId: string,
    backupType: 'MANUAL' | 'AUTOMATIC' | 'EMAIL',
    deviceId?: string,
    email?: string
  ): Promise<Backup> {
    try {
      const backupId = uuidv4();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // Backup expira em 30 dias

      const result = await query(
        `INSERT INTO backups (id, user_id, device_id, email, backup_type, status, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, user_id, device_id, email, backup_type, status, file_url, file_size, 
                   messages_count, media_count, error_message, created_at, completed_at, expires_at`,
        [backupId, userId, deviceId || null, email || null, backupType, 'PENDING', expiresAt]
      );

      const backup = result.rows[0];

      // Iniciar processo de backup assincronamente
      this.processBackup(backup.id, userId, email);

      return {
        id: backup.id,
        userId: backup.user_id,
        deviceId: backup.device_id,
        email: backup.email,
        backupType: backup.backup_type,
        status: backup.status,
        fileUrl: backup.file_url,
        fileSize: backup.file_size,
        messagesCount: backup.messages_count,
        mediaCount: backup.media_count,
        errorMessage: backup.error_message,
        createdAt: backup.created_at,
        completedAt: backup.completed_at,
        expiresAt: backup.expires_at,
      };
    } catch (error) {
      console.error('Erro ao criar backup:', error);
      throw error;
    }
  }

  // Processar backup (assincronamente)
  private async processBackup(backupId: string, userId: string, email?: string) {
    try {
      // Atualizar status para IN_PROGRESS
      await query(
        `UPDATE backups SET status = $1 WHERE id = $2`,
        ['IN_PROGRESS', backupId]
      );

      // Coletar dados do usuário
      const messagesResult = await query(
        `SELECT COUNT(*) as count FROM messages WHERE sender_id = $1 OR recipient_id = $1`,
        [userId]
      );
      const messagesCount = parseInt(messagesResult.rows[0]?.count || 0);

      const mediaResult = await query(
        `SELECT COUNT(*) as count FROM messages WHERE (sender_id = $1 OR recipient_id = $1) 
         AND type IN ('IMAGE', 'AUDIO', 'VIDEO')`,
        [userId]
      );
      const mediaCount = parseInt(mediaResult.rows[0]?.count || 0);

      // Simular criação de arquivo de backup
      const fileUrl = `https://backup.atos2.app/backups/${backupId}.zip`;
      const fileSize = (messagesCount * 1024) + (mediaCount * 1024 * 1024); // Estimativa

      // Atualizar backup com sucesso
      await query(
        `UPDATE backups 
         SET status = $1, file_url = $2, file_size = $3, messages_count = $4, media_count = $5, completed_at = CURRENT_TIMESTAMP
         WHERE id = $6`,
        ['COMPLETED', fileUrl, fileSize, messagesCount, mediaCount, backupId]
      );

      // Se foi via email, enviar link
      if (email) {
        await this.sendBackupEmail(email, fileUrl, messagesCount, mediaCount);
      }
    } catch (error) {
      console.error('Erro ao processar backup:', error);

      // Atualizar com erro
      await query(
        `UPDATE backups 
         SET status = $1, error_message = $2
         WHERE id = $3`,
        ['FAILED', (error as Error).message, backupId]
      );
    }
  }

  // Enviar backup por email
  private async sendBackupEmail(
    email: string,
    fileUrl: string,
    messagesCount: number,
    mediaCount: number
  ): Promise<boolean> {
    try {
      // Configurar transporter (usar variáveis de ambiente)
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Seu Backup do Atos2 está Pronto',
        html: `
          <h2>Seu Backup do Atos2</h2>
          <p>Olá,</p>
          <p>Seu backup foi criado com sucesso!</p>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Detalhes do Backup:</h3>
            <ul>
              <li><strong>Mensagens:</strong> ${messagesCount}</li>
              <li><strong>Mídia (fotos, vídeos, áudios):</strong> ${mediaCount}</li>
              <li><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</li>
            </ul>
          </div>

          <p>
            <a href="${fileUrl}" style="background: #FF8C00; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Baixar Backup
            </a>
          </p>

          <p style="color: #999; font-size: 12px;">
            Este link expira em 30 dias. Após isso, você precisará criar um novo backup.
          </p>

          <p>Atenciosamente,<br>Equipe Atos2</p>
        `,
      };

      await transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Erro ao enviar email de backup:', error);
      return false;
    }
  }

  // Obter backups do usuário
  async getUserBackups(userId: string): Promise<Backup[]> {
    try {
      const result = await query(
        `SELECT id, user_id, device_id, email, backup_type, status, file_url, file_size, 
                messages_count, media_count, error_message, created_at, completed_at, expires_at
         FROM backups 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT 50`,
        [userId]
      );

      return result.rows.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        deviceId: row.device_id,
        email: row.email,
        backupType: row.backup_type,
        status: row.status,
        fileUrl: row.file_url,
        fileSize: row.file_size,
        messagesCount: row.messages_count,
        mediaCount: row.media_count,
        errorMessage: row.error_message,
        createdAt: row.created_at,
        completedAt: row.completed_at,
        expiresAt: row.expires_at,
      }));
    } catch (error) {
      console.error('Erro ao obter backups:', error);
      throw error;
    }
  }

  // Obter backup específico
  async getBackupById(backupId: string): Promise<Backup | null> {
    try {
      const result = await query(
        `SELECT id, user_id, device_id, email, backup_type, status, file_url, file_size, 
                messages_count, media_count, error_message, created_at, completed_at, expires_at
         FROM backups 
         WHERE id = $1`,
        [backupId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];

      return {
        id: row.id,
        userId: row.user_id,
        deviceId: row.device_id,
        email: row.email,
        backupType: row.backup_type,
        status: row.status,
        fileUrl: row.file_url,
        fileSize: row.file_size,
        messagesCount: row.messages_count,
        mediaCount: row.media_count,
        errorMessage: row.error_message,
        createdAt: row.created_at,
        completedAt: row.completed_at,
        expiresAt: row.expires_at,
      };
    } catch (error) {
      console.error('Erro ao obter backup:', error);
      throw error;
    }
  }

  // Deletar backup
  async deleteBackup(backupId: string): Promise<boolean> {
    try {
      const result = await query(
        `DELETE FROM backups WHERE id = $1`,
        [backupId]
      );

      return result.rowCount! > 0;
    } catch (error) {
      console.error('Erro ao deletar backup:', error);
      throw error;
    }
  }

  // Obter estatísticas de backups
  async getBackupStatistics(userId: string): Promise<any> {
    try {
      const result = await query(
        `SELECT 
          COUNT(*) as total_backups,
          SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed,
          SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending,
          SUM(file_size) as total_size,
          SUM(messages_count) as total_messages,
          SUM(media_count) as total_media
         FROM backups 
         WHERE user_id = $1`,
        [userId]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      throw error;
    }
  }
}

export default new BackupService();

