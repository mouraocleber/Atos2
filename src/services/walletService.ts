import { query, getClient } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { isCurrencySupported, getSupportedCurrencyCodes } from '../config/currencies';

export interface Wallet {
  id: string;
  user_id: string;
  currency: string;
  balance: number;
  created_at: Date;
  updated_at: Date;
}

export interface Transaction {
  id: string;
  from_user_id: string;
  to_user_id?: string;
  type: 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER' | 'PAYMENT' | 'REFUND';
  amount: number;
  currency: string;
  converted_amount?: number;
  converted_currency?: string;
  exchange_rate?: number;
  fee?: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  description?: string;
  reference?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ExchangeRate {
  from_currency: string;
  to_currency: string;
  rate: number;
  updated_at: Date;
}

export class WalletService {
  /**
   * Criar carteira para usuário
   */
  async createWallet(userId: string, currency: string = 'BRL'): Promise<Wallet> {
    if (!isCurrencySupported(currency)) {
      throw new Error(`Moeda não suportada: ${currency}`);
    }

    const id = uuidv4();

    const result = await query(
      `INSERT INTO wallets (id, user_id, currency, balance)
       VALUES ($1, $2, $3, 0)
       RETURNING *`,
      [id, userId, currency]
    );

    return result.rows[0];
  }

  /**
   * Obter carteira do usuário
   */
  async getWallet(userId: string): Promise<Wallet | null> {
    const result = await query(
      `SELECT * FROM wallets WHERE user_id = $1`,
      [userId]
    );

    return result.rows[0] || null;
  }

  /**
   * Obter saldo em moeda específica
   */
  async getBalance(userId: string, currency?: string): Promise<number> {
    if (currency && !isCurrencySupported(currency)) {
      throw new Error(`Moeda não suportada: ${currency}`);
    }

    const result = await query(
      `SELECT balance FROM wallets 
       WHERE user_id = $1 ${currency ? 'AND currency = $2' : ''}`,
      currency ? [userId, currency] : [userId]
    );

    if (result.rows.length === 0) {
      return 0;
    }

    return parseFloat(result.rows[0].balance);
  }

  /**
   * Adicionar saldo à carteira
   */
  async addBalance(userId: string, amount: number, currency: string = 'BRL'): Promise<Wallet> {
    const result = await query(
      `UPDATE wallets 
       SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2 AND currency = $3
       RETURNING *`,
      [amount, userId, currency]
    );

    if (result.rows.length === 0) {
      throw new Error('Carteira não encontrada');
    }

    return result.rows[0];
  }

  /**
   * Remover saldo da carteira
   */
  async removeBalance(userId: string, amount: number, currency: string = 'BRL'): Promise<Wallet> {
    const balance = await this.getBalance(userId, currency);

    if (balance < amount) {
      throw new Error('Saldo insuficiente');
    }

    const result = await query(
      `UPDATE wallets 
       SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2 AND currency = $3
       RETURNING *`,
      [amount, userId, currency]
    );

    return result.rows[0];
  }

  /**
   * Obter taxa de câmbio entre moedas
   */
  async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
    if (fromCurrency === toCurrency) {
      return 1;
    }

    const result = await query(
      `SELECT rate FROM exchange_rates 
       WHERE from_currency = $1 AND to_currency = $2
       ORDER BY updated_at DESC LIMIT 1`,
      [fromCurrency, toCurrency]
    );

    if (result.rows.length === 0) {
      throw new Error(`Taxa de câmbio não encontrada: ${fromCurrency} -> ${toCurrency}`);
    }

    return parseFloat(result.rows[0].rate);
  }

  /**
   * Converter valor entre moedas
   */
  async convertCurrency(amount: number, fromCurrency: string, toCurrency: string): Promise<number> {
    const rate = await this.getExchangeRate(fromCurrency, toCurrency);
    return amount * rate;
  }

  /**
   * Calcular taxa de transação
   */
  calculateFee(amount: number, isInternal: boolean = true): number {
    if (isInternal) {
      return 0; // Sem taxa para transferência entre usuários
    }

    let fee = 0;
    // Taxa para transferência externa
    if (amount <= 999.99) {
      fee = amount * 0.01; // 1%
    } else if (amount <= 4999.99) {
      fee = amount * 0.02; // 2%
    } else {
      fee = amount * 0.05; // 5%
    }
    
    return Math.round(fee * 100) / 100;
  }

  /**
   * Criar transação
   */
  async createTransaction(data: {
    fromUserId: string;
    toUserId?: string;
    type: 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER' | 'PAYMENT' | 'REFUND';
    amount: number;
    currency: string;
    convertedCurrency?: string;
    description?: string;
    reference?: string;
  }): Promise<Transaction> {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Validar saldo da carteira do usuário (ignorando a moeda do pagamento para converter automaticamente)
      const balanceResult = await client.query(
        `SELECT balance, currency as wallet_currency FROM wallets WHERE user_id = $1 FOR UPDATE`,
        [data.fromUserId]
      );

      if (balanceResult.rows.length === 0) {
        throw new Error('Carteira não encontrada');
      }

      const currentBalance = parseFloat(balanceResult.rows[0].balance);
      const walletCurrency = balanceResult.rows[0].wallet_currency;

      const isInternal = !!data.toUserId;
      const fee = this.calculateFee(data.amount, isInternal);
      // Valor total do pagamento na moeda requisitada
      const totalPaymentAmount = Math.round((data.amount + fee) * 100) / 100;

      // Calcular o valor a deduzir da carteira original se as moedas divergirem
      let deductionAmount = totalPaymentAmount;
      let transactionExchangeRate = 1;

      if (data.currency !== walletCurrency) {
        transactionExchangeRate = await this.getExchangeRate(data.currency, walletCurrency);
        deductionAmount = Math.round((totalPaymentAmount * transactionExchangeRate) * 100) / 100;
      }

      if (currentBalance < deductionAmount) {
        throw new Error('Saldo insuficiente na carteira para cobrir o valor convertido');
      }

      // Preparar os valores convertidos para registrar histórico
      let convertedAmount = data.amount;
      let finalExchangeRate = 1;

      if (data.convertedCurrency && data.convertedCurrency !== data.currency) {
        if (!isCurrencySupported(data.convertedCurrency)) {
          throw new Error(`Moeda não suportada: ${data.convertedCurrency}`);
        }
        finalExchangeRate = await this.getExchangeRate(data.currency, data.convertedCurrency);
        // Arredondar valor convertido
        convertedAmount = Math.round((data.amount * finalExchangeRate) * 100) / 100;
      }

      // Se o usuário não enviou requested converted target, mas o pagamento foi em moeda diferente
      const historicalExRate = data.convertedCurrency ? finalExchangeRate : 
                               (data.currency !== walletCurrency ? transactionExchangeRate : null);

      // Criar transação
      const transactionId = uuidv4();
      const transactionResult = await client.query(
        `INSERT INTO transactions (
          id, from_user_id, to_user_id, type, amount, currency, 
          converted_amount, converted_currency, exchange_rate, fee, 
          status, description, reference
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          transactionId,
          data.fromUserId,
          data.toUserId || null,
          data.type,
          data.amount,
          data.currency,
          data.convertedCurrency ? convertedAmount : deductionAmount,
          data.convertedCurrency || walletCurrency,
          historicalExRate,
          fee > 0 ? fee : null,
          'COMPLETED',
          data.description,
          data.reference
        ]
      );

      // Atualizar saldo do remetente
      await client.query(
        `UPDATE wallets 
         SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2 AND currency = $3`,
        [deductionAmount, data.fromUserId, walletCurrency]
      );

      // Atualizar saldo do destinatário se for transferência interna
      if (data.toUserId) {
        const recipientCurrency = data.convertedCurrency || data.currency;
        const recipientAmount = data.convertedCurrency ? convertedAmount : data.amount;

        await client.query(
          `INSERT INTO wallets (user_id, currency, balance) 
           VALUES ($1, $3, $2)
           ON CONFLICT (user_id) 
           DO UPDATE SET balance = wallets.balance + EXCLUDED.balance, updated_at = CURRENT_TIMESTAMP`,
          [data.toUserId, recipientAmount, recipientCurrency]
        );
      }

      await client.query('COMMIT');

      return transactionResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Obter histórico de transações
   */
  async getTransactionHistory(userId: string, limit: number = 50, offset: number = 0): Promise<Transaction[]> {
    const result = await query(
      `SELECT * FROM transactions 
       WHERE from_user_id = $1 OR to_user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return result.rows;
  }

  /**
   * Obter transação específica
   */
  async getTransaction(transactionId: string, userId: string): Promise<Transaction | null> {
    const result = await query(
      `SELECT * FROM transactions 
       WHERE id = $1 AND (from_user_id = $2 OR to_user_id = $2)`,
      [transactionId, userId]
    );

    return result.rows[0] || null;
  }

  /**
   * Obter estatísticas de transações
   */
  async getTransactionStats(userId: string): Promise<any> {
    const result = await query(
      `SELECT 
        COUNT(*) as total_transactions,
        COUNT(CASE WHEN type = 'TRANSFER' THEN 1 END) as transfers,
        COUNT(CASE WHEN type = 'DEPOSIT' THEN 1 END) as deposits,
        COUNT(CASE WHEN type = 'WITHDRAW' THEN 1 END) as withdrawals,
        SUM(CASE WHEN type = 'TRANSFER' AND from_user_id = $1 THEN amount ELSE 0 END) as total_sent,
        SUM(CASE WHEN type = 'TRANSFER' AND to_user_id = $1 THEN amount ELSE 0 END) as total_received,
        SUM(fee) as total_fees,
        AVG(amount) as average_amount
       FROM transactions 
       WHERE from_user_id = $1 OR to_user_id = $1`,
      [userId]
    );

    return result.rows[0];
  }

  /**
   * Atualizar taxa de câmbio
   */
  async updateExchangeRate(fromCurrency: string, toCurrency: string, rate: number): Promise<ExchangeRate> {
    const result = await query(
      `INSERT INTO exchange_rates (from_currency, to_currency, rate)
       VALUES ($1, $2, $3)
       ON CONFLICT (from_currency, to_currency) 
       DO UPDATE SET rate = $3, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [fromCurrency, toCurrency, rate]
    );

    return result.rows[0];
  }

  /**
   * Obter todas as taxas de câmbio
   */
  async getExchangeRates(): Promise<ExchangeRate[]> {
    const result = await query(
      `SELECT * FROM exchange_rates 
       ORDER BY from_currency, to_currency`
    );

    return result.rows;
  }

  /**
   * Obter moedas suportadas
   */
  async getSupportedCurrencies(): Promise<string[]> {
    return getSupportedCurrencyCodes();
  }

  /**
   * Reembolsar transação
   */
  async refundTransaction(transactionId: string, userId: string): Promise<Transaction> {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Obter transação original
      const transactionResult = await client.query(
        `SELECT * FROM transactions WHERE id = $1`,
        [transactionId]
      );

      if (transactionResult.rows.length === 0) {
        throw new Error('Transação não encontrada');
      }

      const originalTransaction = transactionResult.rows[0];

      if (originalTransaction.from_user_id !== userId) {
        throw new Error('Você não tem permissão para reembolsar esta transação');
      }

      // Criar transação de reembolso
      const refundId = uuidv4();
      const refundResult = await client.query(
        `INSERT INTO transactions (
          id, from_user_id, to_user_id, type, amount, currency, 
          status, description, reference
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          refundId,
          originalTransaction.to_user_id || userId,
          originalTransaction.from_user_id,
          'REFUND',
          originalTransaction.amount,
          originalTransaction.currency,
          'COMPLETED',
          `Reembolso da transação ${transactionId}`,
          transactionId
        ]
      );

      // Atualizar saldos
      await client.query(
        `UPDATE wallets 
         SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2 AND currency = $3`,
        [originalTransaction.amount, originalTransaction.from_user_id, originalTransaction.currency]
      );

      if (originalTransaction.to_user_id) {
        await client.query(
          `UPDATE wallets 
           SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $2 AND currency = $3`,
          [originalTransaction.amount, originalTransaction.to_user_id, originalTransaction.currency]
        );
      }

      await client.query('COMMIT');

      return refundResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

