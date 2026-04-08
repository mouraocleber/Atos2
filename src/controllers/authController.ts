import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import userService from '../services/userService';
import { generateToken, generateRefreshToken } from '../utils/jwt';
import { isValidPassword } from '../utils/password';
import { AppError } from '../middleware/errorHandler';
import validationService from '../services/validationService';
import { query } from '../config/database';
import { Message } from '../types';

export class AuthController {
  async register(req: AuthenticatedRequest, res: Response) {
    try {
      const { email, phone, nickname, name, personType, cpf, cep, password, passwordConfirm, preferredLanguage } = req.body;

      // Validações
      if (!email || !phone || !nickname || !name || !personType || !cpf || !cep || !password) {
        throw new AppError(400, 'Todos os campos são obrigatórios', 'MISSING_FIELDS');
      }

      if (password !== passwordConfirm) {
        throw new AppError(400, 'As senhas não correspondem', 'PASSWORD_MISMATCH');
      }

      if (!isValidPassword(password)) {
        throw new AppError(400, 'Senha deve ter no mínimo 8 caracteres, incluindo maiúsculas, minúsculas, números e caracteres especiais', 'WEAK_PASSWORD');
      }

      if (preferredLanguage && !['pt-BR', 'pt-PT', 'en-US', 'en-GB', 'es-ES', 'es-MX', 'fr-FR', 'de-DE', 'it-IT', 'ja-JP', 'zh-CN', 'zh-TW', 'ru-RU', 'ko-KR', 'ar-SA'].includes(preferredLanguage)) {
        throw new AppError(400, 'Idioma não suportado', 'UNSUPPORTED_LANGUAGE');
      }

      // Verificar se email já existe
      const existingUser = await userService.getUserByEmail(email);
      if (existingUser) {
        throw new AppError(409, 'Email já cadastrado', 'EMAIL_ALREADY_EXISTS');
      }

      // Verificar se telefone já existe
      const existingPhone = await userService.getUserByPhone(phone);
      if (existingPhone) {
        throw new AppError(409, 'Telefone já cadastrado', 'PHONE_ALREADY_EXISTS');
      }

      // Verificar se CPF/CNPJ já existe
      const existingCpf = await userService.getUserByCpf(cpf);
      if (existingCpf) {
        throw new AppError(409, 'Documento (CPF/CNPJ) já cadastrado', 'CPF_ALREADY_EXISTS');
      }

      // Criar usuário
      const user = await userService.createUser({
        email,
        phone,
        nickname,
        name,
        personType,
        cpf,
        cep,
        password,
        preferredLanguage: preferredLanguage || 'pt-BR',
      });

      const token = generateToken(user.id, user.email);
      const refreshToken = generateRefreshToken(user.id);

      res.status(201).json({
        success: true,
        message: 'Usuário registrado com sucesso',
        data: {
          user: {
            id: user.id,
            email: user.email,
            nickname: user.nickname,
            name: user.name,
            personType: user.personType,
            cpf: user.cpf,
            preferredLanguage: user.preferredLanguage,
            balance: user.balance,
          },
          token,
          refreshToken,
        },
      });
    } catch (error) {
      throw error;
    }
  }

  async login(req: AuthenticatedRequest, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new AppError(400, 'Email e senha são obrigatórios', 'MISSING_FIELDS');
      }

      const user = await userService.getUserByEmail(email);
      if (!user) {
        throw new AppError(401, 'Email ou senha incorretos', 'INVALID_CREDENTIALS');
      }

      const isPasswordValid = await userService.verifyPassword(user.id, password);
      if (!isPasswordValid) {
        throw new AppError(401, 'Email ou senha incorretos', 'INVALID_CREDENTIALS');
      }

      const token = generateToken(user.id, user.email);
      const refreshToken = generateRefreshToken(user.id);

      res.json({
        success: true,
        message: 'Login realizado com sucesso',
        data: {
          user: {
            id: user.id,
            email: user.email,
            nickname: user.nickname,
            name: user.name,
            personType: user.personType,
            cpf: user.cpf,
            preferredLanguage: user.preferredLanguage,
            balance: user.balance,
          },
          token,
          refreshToken,
        },
      });
    } catch (error) {
      throw error;
    }
  }

  async refreshToken(req: AuthenticatedRequest, res: Response) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new AppError(400, 'Refresh token é obrigatório', 'MISSING_REFRESH_TOKEN');
      }

      // Aqui você pode verificar o refresh token
      // Por simplicidade, estamos apenas gerando um novo token
      const user = await userService.getUserById(req.userId!);
      if (!user) {
        throw new AppError(401, 'Usuário não encontrado', 'USER_NOT_FOUND');
      }

      const newToken = generateToken(user.id, user.email);

      res.json({
        success: true,
        message: 'Token renovado com sucesso',
        data: {
          token: newToken,
        },
      });
    } catch (error) {
      throw error;
    }
  }

  async me(req: AuthenticatedRequest, res: Response) {
    try {
      const user = await userService.getUserById(req.userId!);
      if (!user) {
        throw new AppError(404, 'Usuário não encontrado', 'USER_NOT_FOUND');
      }

      res.json({
        success: true,
        message: 'Dados do usuário',
        data: {
          user: {
            id: user.id,
            email: user.email,
            phone: user.phone,
            nickname: user.nickname,
            name: user.name,
            personType: user.personType,
            cpf: user.cpf,
            cep: user.cep,
            address: user.address,
            city: user.city,
            state: user.state,
            profileImage: user.profileImage,
            status: user.status,
            preferredLanguage: user.preferredLanguage,
            balance: user.balance,
            isActive: user.isActive,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin,
          },
        },
      });
    } catch (error) {
      throw error;
    }
  }

  async sendSMSCode(req: AuthenticatedRequest, res: Response) {
    try {
      const { phone } = req.body;
      if (!phone) {
        throw new AppError(400, 'Telefone é obrigatório', 'MISSING_FIELDS');
      }

      const validation = await validationService.sendSMSCode(phone);

      res.json({
        success: true,
        message: `Código enviado para ${phone}`,
        data: { validationId: validation.id },
      });
    } catch (error) {
      throw error;
    }
  }

  async sendEmailCode(req: AuthenticatedRequest, res: Response) {
    try {
      const { email } = req.body;
      if (!email) {
        throw new AppError(400, 'Email é obrigatório', 'MISSING_FIELDS');
      }

      const validation = await validationService.sendEmailCode(email);

      res.json({
        success: true,
        message: `Código enviado para ${email}`,
        data: { validationId: validation.id },
      });
    } catch (error) {
      throw error;
    }
  }

  async verifyCode(req: AuthenticatedRequest, res: Response) {
    try {
      const { phone, email, code, validationId } = req.body;
      
      if (!code || (!phone && !email && !validationId)) {
        throw new AppError(400, 'Código e identificador são obrigatórios', 'MISSING_FIELDS');
      }

      // Se não enviou validationId, buscar o mais recente para aquele phone/email
      let actualValidationId = validationId;
      if (!actualValidationId) {
        const result = await query(
          `SELECT id FROM validation_codes 
           WHERE (phone = $1 OR email = $2) AND status = 'PENDING' 
           ORDER BY created_at DESC LIMIT 1`,
          [phone || null, email || null]
        );
        if (result.rows.length === 0) {
          throw new AppError(404, 'Código não encontrado ou expirado', 'VALIDATION_NOT_FOUND');
        }
        actualValidationId = result.rows[0].id;
      }

      const isValid = await validationService.verifyCode(actualValidationId, code);

      res.json({
        success: true,
        verified: isValid,
        message: 'Código verificado com sucesso',
      });
    } catch (error) {
      throw error;
    }
  }

  async updateProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { name, nickname, preferredLanguage } = req.body;

      const updated = await userService.updateUser(userId, { 
        name, 
        nickname, 
        preferred_language: preferredLanguage 
      } as any);

      res.json({
        success: true,
        message: 'Perfil atualizado com sucesso',
        data: updated,
      });
    } catch (error) {
      throw error;
    }
  }

  async changePassword(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        throw new AppError(400, 'Senha atual e nova senha são obrigatórias', 'MISSING_FIELDS');
      }
      if (newPassword.length < 8) {
        throw new AppError(400, 'A nova senha deve ter pelo menos 8 caracteres', 'WEAK_PASSWORD');
      }

      const isValid = await userService.verifyPassword(userId, currentPassword);
      if (!isValid) {
        throw new AppError(401, 'Senha atual incorreta', 'INVALID_PASSWORD');
      }

      await userService.updatePassword(userId, newPassword);

      res.json({
        success: true,
        message: 'Senha alterada com sucesso',
      });
    } catch (error) {
      throw error;
    }
  }
}

export default new AuthController();

