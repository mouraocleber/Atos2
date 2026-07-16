import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import userService from '../services/userService';
import { generateToken, generateRefreshToken } from '../utils/jwt';
import { isValidPassword } from '../utils/password';
import { AppError } from '../middleware/errorHandler';
import validationService from '../services/validationService';
import { query } from '../config/database';
import { Message } from '../types';
import currencyService from '../services/currencyService';


export class AuthController {
  async register(req: AuthenticatedRequest, res: Response) {
    console.log('--- Início de Registro ---');
    console.log('Payload recebido:', { ...req.body, password: '***', passwordConfirm: '***' });
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

      if (preferredLanguage && !['pt-BR', 'pt-PT', 'en-US', 'en-GB', 'es-ES', 'es-MX', 'fr-FR', 'de-DE', 'it-IT', 'ja-JP', 'zh-CN', 'zh-TW', 'ru-RU', 'ko-KR', 'ar-SA', 'hi-IN', 'tr-TR', 'pl-PL', 'nl-NL', 'sv-SE', 'da-DK', 'fi-FI', 'nb-NO', 'uk-UA', 'id-ID', 'ms-MY', 'th-TH', 'vi-VN', 'he-IL', 'cs-CZ', 'ro-RO', 'hu-HU', 'el-GR'].includes(preferredLanguage)) {
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
            profileImage: user.profileImage,
            preferredLanguage: user.preferredLanguage,
            balance: user.balance,
            plan: user.plan,
            planExpiresAt: user.planExpiresAt,
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
    console.log('--- Tentativa de Login ---');
    console.log('E-mail:', req.body.email);
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
            profileImage: user.profileImage,
            preferredLanguage: user.preferredLanguage,
            balance: user.balance,
            plan: user.plan,
            planExpiresAt: user.planExpiresAt,
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
            plan: user.plan,
            planExpiresAt: user.planExpiresAt,
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

  async uploadProfileImage(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      if (!req.file) {
        throw new AppError(400, 'Nenhuma imagem foi enviada.', 'MISSING_FILE');
      }

      // O arquivo foi salvo. Mapeamos a URL estática:
      const imageUrl = `/uploads/images/${req.file.filename}`;

      await userService.updateUser(userId, { profile_image: imageUrl } as any);

      res.json({
        success: true,
        message: 'Foto de perfil atualizada com sucesso!',
        data: { profileImage: imageUrl },
      });
    } catch (error) {
      throw error;
    }
  }

  async upgradePlan(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { plan, billingCycle = 'MONTHLY' } = req.body;

      if (!['PRO', 'BUSINESS'].includes(plan)) {
        throw new AppError(400, 'Plano inválido (deve ser PRO ou BUSINESS).', 'INVALID_PLAN');
      }
      if (!['MONTHLY', 'ANNUAL'].includes(billingCycle)) {
        throw new AppError(400, 'Ciclo de faturamento inválido.', 'INVALID_CYCLE');
      }

      const PRICES = {
        PRO: { MONTHLY: 4.00, ANNUAL: 38.40 }, // 4 * 12 * 0.8
        BUSINESS: { MONTHLY: 40.00, ANNUAL: 384.00 } // 40 * 12 * 0.8
      };

      const cost = (PRICES as any)[plan][billingCycle];

      // 1. Checar Carteira local (BRL por padrão se não houver)
      const walletRes = await query(`SELECT id, balance, currency FROM wallets WHERE user_id = $1`, [userId]);
      let wallet = walletRes.rows[0];
      
      if (!wallet) {
        // Criar carteira local por padrão
        const insertRes = await query(
          `INSERT INTO wallets (user_id, currency, balance) VALUES ($1, 'BRL', 0.00) RETURNING id, balance, currency`,
          [userId]
        );
        wallet = insertRes.rows[0];
      }

      const currentUser = await userService.getUserById(userId);
      if (!currentUser) throw new AppError(404, 'Usuário não encontrado', 'USER_NOT_FOUND');

      const isFirstTimeFree = currentUser.plan === 'FREE';

      // Converter o custo em G para a moeda local da carteira
      const localCost = isFirstTimeFree ? 0.00 : await currencyService.convertFromGlobal(cost, wallet.currency);

      // Se for renovação e não tiver o bônus, verificar saldo
      if (!isFirstTimeFree && parseFloat(wallet.balance) < localCost) {
        throw new AppError(400, `Saldo insuficiente. Custo de renovação/upgrade: ${cost} G (${localCost.toFixed(2)} ${wallet.currency})`, 'INSUFFICIENT_FUNDS');
      }

      try {
        await query('BEGIN');

        let expiresAt = new Date();
        
        if (isFirstTimeFree) {
          // Conceder Trial de 90 Dias sem cobrar
          expiresAt.setDate(expiresAt.getDate() + 90);
        } else {
          // Cobrar (Renovação ou Upgrade de conta recorrente)
          await query('UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2', [localCost, wallet.id]);

          await query(`
            INSERT INTO transactions (from_user_id, type, amount, currency, status, description, reference)
            VALUES ($1, 'PAYMENT', $2, $3, 'COMPLETED', $4, 'PLAN_UPGRADE')
          `, [userId, localCost, wallet.currency, `Assinatura Plano ${plan} (${billingCycle})`]);

          expiresAt = currentUser.planExpiresAt && currentUser.planExpiresAt > new Date() 
            ? new Date(currentUser.planExpiresAt) 
            : new Date();
          
          if (billingCycle === 'ANNUAL') expiresAt.setDate(expiresAt.getDate() + 365);
          else expiresAt.setDate(expiresAt.getDate() + 30);
        }

        await query(`UPDATE users SET plan = $1, plan_expires_at = $2 WHERE id = $3`, [plan, expiresAt, userId]);

        await query('COMMIT');

        res.json({
          success: true,
          message: isFirstTimeFree 
            ? `Parabéns! Conta atualizada para ${plan}. Você ganhou 90 dias de acesso 100% gratuito!`
            : `Assinatura de ${plan} ativada/estendida com sucesso!`,
          data: { plan, planExpiresAt: expiresAt, deductedAmount: isFirstTimeFree ? 0 : localCost }
        });

      } catch (err) {
        await query('ROLLBACK');
        console.error('Erro no Upgrade de Plano:', err);
        throw new AppError(500, 'Erro interno ao processar pagamento', 'TRANSACTION_FAILED');
      }

    } catch (error) {
      throw error;
    }
  }
  /**
   * Verifica se a senha fornecida corresponde à senha do usuário autenticado.
   * Usado pelo app mobile para autenticar no lock screen e na carteira (fallback bio).
   */
  async verifyPassword(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { password } = req.body;

      if (!password) {
        throw new AppError(400, 'Senha é obrigatória', 'MISSING_FIELDS');
      }

      const isValid = await userService.verifyPassword(userId, password);
      if (!isValid) {
        throw new AppError(401, 'Senha incorreta', 'INVALID_PASSWORD');
      }

      res.json({ success: true, message: 'Senha confirmada com sucesso' });
    } catch (error) {
      throw error;
    }
  }
  async googleSignIn(req: AuthenticatedRequest, res: Response) {
    try {
      const { idToken } = req.body;
      if (!idToken) {
        throw new AppError(400, 'idToken é obrigatório', 'MISSING_ID_TOKEN');
      }

      // Verificar o idToken com o Google
      const axios = require('axios');
      let googleUser: any;
      try {
        const resp = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
        googleUser = resp.data;
      } catch (err) {
        throw new AppError(401, 'Token Google inválido ou expirado', 'INVALID_GOOGLE_TOKEN');
      }

      if (!googleUser.email) {
        throw new AppError(400, 'Google não retornou e-mail do usuário', 'GOOGLE_NO_EMAIL');
      }

      // Verificar se usuário já existe
      let user = await userService.getUserByEmail(googleUser.email);

      if (!user) {
        // Criar o usuário com dados do Google
        const name = googleUser.name || googleUser.email.split('@')[0];
        const nickname = (googleUser.given_name || name).toLowerCase().replace(/\s+/g, '_') + '_' + Date.now().toString().slice(-4);
        
        user = await userService.createUser({
          email: googleUser.email,
          phone: `google_${Date.now()}`, // Placeholder — usuário pode atualizar depois
          nickname,
          name,
          personType: 'PF',
          cpf: `google_${googleUser.sub}`, // Placeholder usando Google sub
          cep: '00000-000',
          password: require('crypto').randomBytes(32).toString('hex'), // Senha aleatória
          preferredLanguage: 'pt-BR',
          profileImage: googleUser.picture || null,
        } as any);
      }

      const token = generateToken(user.id, user.email);
      const refreshToken = generateRefreshToken(user.id);

      res.json({
        success: true,
        message: 'Login com Google realizado com sucesso',
        data: {
          user: {
            id: user.id,
            email: user.email,
            nickname: user.nickname,
            name: user.name,
            personType: user.personType,
            cpf: user.cpf,
            profileImage: user.profileImage,
            preferredLanguage: user.preferredLanguage,
            balance: user.balance,
            plan: user.plan,
            planExpiresAt: user.planExpiresAt,
          },
          token,
          refreshToken,
        },
      });
    } catch (error) {
      throw error;
    }
  }
}

export default new AuthController();

