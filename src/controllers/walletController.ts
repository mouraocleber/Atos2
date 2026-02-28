import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { WalletService } from '../services/walletService';
import { SUPPORTED_CURRENCIES, POPULAR_CURRENCIES, MAJOR_CURRENCIES } from '../config/currencies';

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

      const wallet = await service.getWallet(userId);

      if (!wallet) {
        return res.status(404).json({ error: 'Carteira não encontrada' });
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

      const { currency } = req.query;
      const balance = await service.getBalance(userId, currency as string);

      res.json({
        success: true,
        data: {
          balance,
          currency: currency || 'BRL'
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

      const { amount, currency } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Valor inválido' });
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
        reference
      } = req.body;

      if (!type || !amount || !currency) {
        return res.status(400).json({ error: 'Campos obrigatórios: type, amount, currency' });
      }

      if (amount <= 0) {
        return res.status(400).json({ error: 'Valor deve ser maior que zero' });
      }

      const transaction = await service.createTransaction({
        fromUserId: userId,
        toUserId,
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

