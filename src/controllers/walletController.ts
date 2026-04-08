import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { WalletService } from '../services/walletService';
import { SUPPORTED_CURRENCIES, POPULAR_CURRENCIES, MAJOR_CURRENCIES } from '../config/currencies';
import userService from '../services/userService';
import currencyService from '../services/currencyService';

const service = new WalletService();

export class WalletController {
  /**
   * Obter carteira do usuário
   */
  async getWallet(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      if (!userId) {
        return res.status(401).json({ error: 'Não autenticado' });
      }

      let wallet = await service.getWallet(userId);

      if (!wallet) {
        wallet = await service.createWallet(userId, 'BRL');
      }

      res.json({
        success: true,
        data: wallet
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Obter saldo
   */
  async getBalance(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      if (!userId) {
        return res.status(401).json({ error: 'Não autenticado' });
      }

      let wallet = await service.getWallet(userId);
      if (!wallet) {
        wallet = await service.createWallet(userId, 'BRL');
      }

      const user = await userService.getUserById(userId);
      // Se não houver req.query.currency, assume moeda base do país do perfil do usuário
      const localCurrencyCode = (req.query.currency as string) || (user?.country === 'BR' ? 'BRL' : 'USD');

      // Calcular conversões correspondentes
      const localBalance = await service.convertCurrency(wallet.balance, wallet.currency, localCurrencyCode);
      const globalBalance = await currencyService.convertToGlobal(wallet.balance, wallet.currency);

      res.json({
        success: true,
        data: {
          original: { balance: wallet.balance, currency: wallet.currency },
          local: { balance: Math.round(localBalance * 100) / 100, currency: localCurrencyCode },
          global: { balance: Math.round(globalBalance * 10000) / 10000, currency: 'G' }
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Adicionar saldo
   */
  async addBalance(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      if (!userId) {
        return res.status(401).json({ error: 'Não autenticado' });
      }

      const { amount, currency, password } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Valor inválido' });
      }

      if (!password) {
        return res.status(401).json({ error: 'Senha obrigatória para movimentação na carteira' });
      }

      const isPasswordValid = await userService.verifyPassword(userId, password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Senha incorreta para realizar a movimentação' });
      }

      const wallet = await service.addBalance(userId, amount, currency || 'BRL');

      res.json({
        success: true,
        message: 'Saldo adicionado com sucesso',
        data: wallet
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Criar transação
   */
  async createTransaction(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      if (!userId) {
        return res.status(401).json({ error: 'Não autenticado' });
      }

      const {
        toUserId,
        type,
        amount,
        currency,
        convertedCurrency,
        description,
        reference,
        password
      } = req.body;

      if (!type || !amount || !currency) {
        return res.status(400).json({ error: 'Campos obrigatórios: type, amount, currency' });
      }

      if (amount <= 0) {
        return res.status(400).json({ error: 'Valor deve ser maior que zero' });
      }

      if (!password) {
        return res.status(401).json({ error: 'Senha obrigatória para registrar a transação' });
      }

      const isPasswordValid = await userService.verifyPassword(userId, password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Senha incorreta para registrar a transação' });
      }

      let finalToUserId = toUserId;
      if (toUserId && !toUserId.includes('-')) {
        const { query } = require('../config/database');
        const userRes = await query(
          'SELECT id FROM users WHERE nickname ILIKE $1 OR email ILIKE $1 OR phone = $1',
          [toUserId]
        );
        if (userRes.rows.length === 0) {
          return res.status(404).json({ error: 'Usuário de destino não encontrado. Use o nickname, email ou telefone exato.' });
        }
        finalToUserId = userRes.rows[0].id;
      }

      const transaction = await service.createTransaction({
        fromUserId: userId,
        toUserId: finalToUserId,
        type,
        amount,
        currency,
        convertedCurrency,
        description,
        reference
      });

      res.status(201).json({
        success: true,
        message: 'Transação criada com sucesso',
        data: transaction
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Obter histórico de transações
   */
  async getTransactionHistory(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      if (!userId) {
        return res.status(401).json({ error: 'Não autenticado' });
      }

      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const offset = parseInt(req.query.offset as string) || 0;

      const transactions = await service.getTransactionHistory(userId, limit, offset);

      res.json({
        success: true,
        data: transactions,
        pagination: {
          limit,
          offset,
          total: transactions.length
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Obter transação específica
   */
  async getTransaction(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      if (!userId) {
        return res.status(401).json({ error: 'Não autenticado' });
      }

      const { transactionId } = req.params;
      const transaction = await service.getTransaction(transactionId, userId);

      if (!transaction) {
        return res.status(404).json({ error: 'Transação não encontrada' });
      }

      res.json({
        success: true,
        data: transaction
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Obter estatísticas
   */
  async getStatistics(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      if (!userId) {
        return res.status(401).json({ error: 'Não autenticado' });
      }

      const stats = await service.getTransactionStats(userId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Converter moeda
   */
  async convertCurrency(req: AuthenticatedRequest, res: Response) {
    try {
      const { amount, fromCurrency, toCurrency } = req.body;

      if (!amount || !fromCurrency || !toCurrency) {
        return res.status(400).json({ error: 'Campos obrigatórios: amount, fromCurrency, toCurrency' });
      }

      const convertedAmount = await service.convertCurrency(amount, fromCurrency, toCurrency);
      const rate = await service.getExchangeRate(fromCurrency, toCurrency);

      res.json({
        success: true,
        data: {
          original: {
            amount,
            currency: fromCurrency
          },
          converted: {
            amount: convertedAmount,
            currency: toCurrency
          },
          exchangeRate: rate
        }
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Obter taxas de câmbio
   */
  async getExchangeRates(req: AuthenticatedRequest, res: Response) {
    try {
      const rates = await service.getExchangeRates();

      res.json({
        success: true,
        data: rates
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Obter moedas suportadas
   */
  async getSupportedCurrencies(req: AuthenticatedRequest, res: Response) {
    try {
      const currencies = await service.getSupportedCurrencies();
      const currencyDetails = currencies.map(code => SUPPORTED_CURRENCIES[code as keyof typeof SUPPORTED_CURRENCIES]);

      res.json({
        success: true,
        data: {
          codes: currencies,
          details: currencyDetails,
          popular: POPULAR_CURRENCIES,
          major: MAJOR_CURRENCIES,
          total: currencies.length
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Obter informacoes de uma moeda
   */
  async getCurrencyInfo(req: AuthenticatedRequest, res: Response) {
    try {
      const { code } = req.params;
      const info = SUPPORTED_CURRENCIES[code as keyof typeof SUPPORTED_CURRENCIES];

      if (!info) {
        return res.status(404).json({ error: 'Moeda nao encontrada' });
      }

      res.json({
        success: true,
        data: info
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Reembolsar transação
   */
  async refundTransaction(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      if (!userId) {
        return res.status(401).json({ error: 'Não autenticado' });
      }

      const { transactionId } = req.params;
      const { password } = req.body;

      if (!password) {
        return res.status(401).json({ error: 'Senha obrigatória para realizar o reembolso' });
      }

      const isPasswordValid = await userService.verifyPassword(userId, password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Senha incorreta para realizar o reembolso' });
      }

      const refund = await service.refundTransaction(transactionId, userId);

      res.json({
        success: true,
        message: 'Transação reembolsada com sucesso',
        data: refund
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

