import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import userService from '../services/userService';
import { generateToken, generateRefreshToken } from '../utils/jwt';
import { isValidPassword } from '../utils/password';
import { AppError } from '../middleware/errorHandler';

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

      // Verificar se nickname já existe
      const existingNickname = await userService.getUserByNickname(nickname);
      if (existingNickname) {
        throw new AppError(409, 'Nickname já cadastrado', 'NICKNAME_ALREADY_EXISTS');
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
}

export default new AuthController();

