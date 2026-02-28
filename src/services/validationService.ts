import { query } from '../config/database';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import { v4 as uuidv4 } from 'uuid';

export interface ValidationCode {
  id: string;
  phone?: string;
  email?: string;
  code: string;
  type: 'SMS' | 'EMAIL';
  status: 'PENDING' | 'VERIFIED' | 'EXPIRED';
  attempts: number;
  createdAt: Date;
  expiresAt: Date;
  verifiedAt?: Date;
}

export class ValidationService {
  private twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  // Gerar código de validação
  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Enviar código por SMS
  async sendSMSCode(phone: string): Promise<ValidationCode> {
    try {
      const code = this.generateCode();
      const validationId = uuidv4();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10); // Expira em 10 minutos

      // Salvar no banco
      const result = await query(
        `INSERT INTO validation_codes (id, phone, code, type, status, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, phone, email, code, type, status, attempts, created_at, expires_at, verified_at`,
        [validationId, phone, code, 'SMS', 'PENDING', expiresAt]
      );

      // Enviar SMS via Twilio
      try {
        await this.twilioClient.messages.create({
          body: `Seu código de validação Atos2 é: ${code}. Válido por 10 minutos.`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phone,
        });
      } catch (error) {
        console.error('Erro ao enviar SMS:', error);
        // Continuar mesmo se SMS falhar (pode estar em modo teste)
      }

      const validation = result.rows[0];

      return {
        id: validation.id,
        phone: validation.phone,
        email: validation.email,
        code: validation.code,
        type: validation.type,
        status: validation.status,
        attempts: validation.attempts,
        createdAt: validation.created_at,
        expiresAt: validation.expires_at,
        verifiedAt: validation.verified_at,
      };
    } catch (error) {
      console.error('Erro ao enviar SMS:', error);
      throw error;
    }
  }

  // Enviar código por Email
  async sendEmailCode(email: string): Promise<ValidationCode> {
    try {
      const code = this.generateCode();
      const validationId = uuidv4();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10); // Expira em 10 minutos

      // Salvar no banco
      const result = await query(
        `INSERT INTO validation_codes (id, email, code, type, status, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, phone, email, code, type, status, attempts, created_at, expires_at, verified_at`,
        [validationId, email, code, 'EMAIL', 'PENDING', expiresAt]
      );

      // Enviar email
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
        subject: 'Seu Código de Validação Atos2',
        html: `
          <h2>Bem-vindo ao Atos2!</h2>
          <p>Seu código de validação é:</p>
          <div style="background: linear-gradient(135deg, #FF8C00 0%, #FFD700 100%); padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0;">
            <h1 style="color: white; margin: 0; font-size: 2.5rem; letter-spacing: 5px;">${code}</h1>
          </div>
          <p>Este código é válido por 10 minutos.</p>
          <p style="color: #999; font-size: 12px;">Se você não solicitou este código, ignore este email.</p>
        `,
      };

      await transporter.sendMail(mailOptions);

      const validation = result.rows[0];

      return {
        id: validation.id,
        phone: validation.phone,
        email: validation.email,
        code: validation.code,
        type: validation.type,
        status: validation.status,
        attempts: validation.attempts,
        createdAt: validation.created_at,
        expiresAt: validation.expires_at,
        verifiedAt: validation.verified_at,
      };
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      throw error;
    }
  }

  // Verificar código
  async verifyCode(validationId: string, code: string): Promise<boolean> {
    try {
      const result = await query(
        `SELECT * FROM validation_codes WHERE id = $1`,
        [validationId]
      );

      if (result.rows.length === 0) {
        throw new Error('Código de validação não encontrado');
      }

      const validation = result.rows[0];

      // Verificar se expirou
      if (new Date(validation.expires_at) < new Date()) {
        await query(
          `UPDATE validation_codes SET status = $1 WHERE id = $2`,
          ['EXPIRED', validationId]
        );
        throw new Error('Código expirado');
      }

      // Verificar tentativas
      if (validation.attempts >= 3) {
        throw new Error('Muitas tentativas. Tente novamente mais tarde.');
      }

      // Verificar código
      if (validation.code !== code) {
        await query(
          `UPDATE validation_codes SET attempts = attempts + 1 WHERE id = $1`,
          [validationId]
        );
        throw new Error('Código inválido');
      }

      // Marcar como verificado
      await query(
        `UPDATE validation_codes SET status = $1, verified_at = CURRENT_TIMESTAMP WHERE id = $2`,
        ['VERIFIED', validationId]
      );

      return true;
    } catch (error) {
      console.error('Erro ao verificar código:', error);
      throw error;
    }
  }

  // Obter validação
  async getValidation(validationId: string): Promise<ValidationCode | null> {
    try {
      const result = await query(
        `SELECT * FROM validation_codes WHERE id = $1`,
        [validationId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];

      return {
        id: row.id,
        phone: row.phone,
        email: row.email,
        code: row.code,
        type: row.type,
        status: row.status,
        attempts: row.attempts,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        verifiedAt: row.verified_at,
      };
    } catch (error) {
      console.error('Erro ao obter validação:', error);
      throw error;
    }
  }

  // Limpar códigos expirados
  async cleanupExpiredCodes(): Promise<number> {
    try {
      const result = await query(
        `DELETE FROM validation_codes WHERE expires_at < CURRENT_TIMESTAMP`
      );

      return result.rowCount || 0;
    } catch (error) {
      console.error('Erro ao limpar códigos expirados:', error);
      throw error;
    }
  }
}

export default new ValidationService();

