import { query } from '../config/database';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

export interface QRCodeData {
  userId: string;
  nickname: string;
  name: string;
  profileImage?: string;
  timestamp: number;
}

export class QRCodeService {
  async generateQRCode(userId: string, nickname: string, name: string, profileImage?: string): Promise<{
    qrCodeImage: string;
    qrCodeId: string;
    expiresAt: Date | null;
  }> {
    try {
      // Gerar ID único para o QR Code
      const qrCodeId = uuidv4();
      
      // Dados a serem codificados no QR Code
      const qrData: QRCodeData = {
        userId,
        nickname,
        name,
        profileImage,
        timestamp: Date.now(),
      };

      // Converter dados para string JSON
      const qrString = JSON.stringify(qrData);

      // Gerar QR Code como data URL
      const qrCodeImage = await QRCode.toDataURL(qrString, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        quality: 0.95,
        margin: 1,
        width: 300,
      } as any);

      // Salvar QR Code no banco de dados (sem expiração)
      const expiresAt = new Date('2099-12-31'); // Nunca expira

      await query(
        `INSERT INTO qr_codes (id, user_id, code, data, expires_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [qrCodeId, userId, qrString, JSON.stringify(qrData), expiresAt]
      );

      return {
        qrCodeImage,
        qrCodeId,
        expiresAt: null, // QR Code nunca expira
      };
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      throw new Error('Falha ao gerar QR Code');
    }
  }

  async scanQRCode(qrCodeString: string, scannedByUserId: string): Promise<QRCodeData> {
    try {
      // Parsear dados do QR Code
      const qrData: QRCodeData = JSON.parse(qrCodeString);

      // Verificar se o QR Code existe no banco
      const result = await query(
        `SELECT id, user_id, expires_at FROM qr_codes 
         WHERE code = $1 AND expires_at > CURRENT_TIMESTAMP`,
        [qrCodeString]
      );

      if (result.rows.length === 0) {
        throw new Error('QR Code inválido ou expirado');
      }

      const qrCode = result.rows[0];

      // Registrar leitura do QR Code
      await query(
        `UPDATE qr_codes SET scanned_by = $1, scanned_at = CURRENT_TIMESTAMP 
         WHERE id = $2`,
        [scannedByUserId, qrCode.id]
      );

      // Adicionar usuário aos contatos automaticamente
      await this.addContact(scannedByUserId, qrData.userId);
      await this.addContact(qrData.userId, scannedByUserId);

      return qrData;
    } catch (error) {
      console.error('Erro ao escanear QR Code:', error);
      throw error;
    }
  }

  async getQRCodeHistory(userId: string): Promise<any[]> {
    const result = await query(
      `SELECT id, user_id, scanned_by, scanned_at, created_at, expires_at
       FROM qr_codes 
       WHERE user_id = $1 OR scanned_by = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );

    return result.rows;
  }

  async deleteExpiredQRCodes(): Promise<number> {
    const result = await query(
      `DELETE FROM qr_codes WHERE expires_at < CURRENT_TIMESTAMP`
    );

    return result.rowCount || 0;
  }

  private async addContact(userId: string, contactUserId: string): Promise<void> {
    try {
      // Verificar se já é contato
      const existingContact = await query(
        `SELECT id FROM contacts WHERE user_id = $1 AND contact_user_id = $2`,
        [userId, contactUserId]
      );

      if (existingContact.rows.length === 0) {
        // Adicionar novo contato
        await query(
          `INSERT INTO contacts (user_id, contact_user_id) VALUES ($1, $2)`,
          [userId, contactUserId]
        );
      }
    } catch (error) {
      console.error('Erro ao adicionar contato:', error);
    }
  }

  async getQRCodeById(qrCodeId: string): Promise<any> {
    const result = await query(
      `SELECT id, user_id, code, data, expires_at, scanned_by, scanned_at, created_at
       FROM qr_codes WHERE id = $1`,
      [qrCodeId]
    );

    return result.rows[0] || null;
  }
}

export default new QRCodeService();

