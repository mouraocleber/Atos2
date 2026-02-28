import { query, getClient } from '../config/database';
import { Transaction, TransactionType, TransactionStatus } from '../types';

export class TransactionService {
  async createTransaction(transactionData: {
    fromUserId: string;
    toUserId?: string;
    type: TransactionType;
    amount: number;
    description?: string;
    reference?: string;
  }): Promise<Transaction> {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Verificar saldo do usuário
      const userResult = await client.query(
        'SELECT balance FROM users WHERE id = $1 FOR UPDATE',
        [transactionData.fromUserId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('Usuário não encontrado');
      }

      const currentBalance = userResult.rows[0].balance;

      if (transactionData.type === 'WITHDRAW' || transactionData.type === 'TRANSFER' || transactionData.type === 'PAYMENT') {
        if (currentBalance < transactionData.amount) {
          throw new Error('Saldo insuficiente');
        }
      }

      // Criar transação
      const transactionResult = await client.query(
        `INSERT INTO transactions (
          from_user_id, to_user_id, type, amount, status, description, reference
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, from_user_id, to_user_id, type, amount, status, 
                  description, reference, created_at, updated_at`,
        [
          transactionData.fromUserId,
          transactionData.toUserId || null,
          transactionData.type,
          transactionData.amount,
          'COMPLETED',
          transactionData.description,
          transactionData.reference,
        ]
      );

      // Atualizar saldo do usuário que envia
      if (transactionData.type === 'WITHDRAW' || transactionData.type === 'TRANSFER' || transactionData.type === 'PAYMENT') {
        await client.query(
          'UPDATE users SET balance = balance - $1 WHERE id = $2',
          [transactionData.amount, transactionData.fromUserId]
        );
      } else if (transactionData.type === 'DEPOSIT' || transactionData.type === 'REFUND') {
        await client.query(
          'UPDATE users SET balance = balance + $1 WHERE id = $2',
          [transactionData.amount, transactionData.fromUserId]
        );
      }

      // Atualizar saldo do usuário que recebe (se houver)
      if (transactionData.toUserId && (transactionData.type === 'TRANSFER' || transactionData.type === 'REFUND')) {
        await client.query(
          'UPDATE users SET balance = balance + $1 WHERE id = $2',
          [transactionData.amount, transactionData.toUserId]
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

  async getTransactionById(transactionId: string): Promise<Transaction | null> {
    const result = await query(
      `SELECT id, from_user_id, to_user_id, type, amount, status, 
              description, reference, created_at, updated_at
       FROM transactions WHERE id = $1`,
      [transactionId]
    );

    return result.rows[0] || null;
  }

  async getUserTransactions(userId: string, limit: number = 50, offset: number = 0): Promise<Transaction[]> {
    const result = await query(
      `SELECT id, from_user_id, to_user_id, type, amount, status, 
              description, reference, created_at, updated_at
       FROM transactions 
       WHERE from_user_id = $1 OR to_user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return result.rows;
  }

  async getTransactionsByType(userId: string, type: TransactionType): Promise<Transaction[]> {
    const result = await query(
      `SELECT id, from_user_id, to_user_id, type, amount, status, 
              description, reference, created_at, updated_at
       FROM transactions 
       WHERE (from_user_id = $1 OR to_user_id = $1) AND type = $2
       ORDER BY created_at DESC`,
      [userId, type]
    );

    return result.rows;
  }

  async getTransactionsByStatus(userId: string, status: TransactionStatus): Promise<Transaction[]> {
    const result = await query(
      `SELECT id, from_user_id, to_user_id, type, amount, status, 
              description, reference, created_at, updated_at
       FROM transactions 
       WHERE (from_user_id = $1 OR to_user_id = $1) AND status = $2
       ORDER BY created_at DESC`,
      [userId, status]
    );

    return result.rows;
  }

  async getTotalBalance(userId: string): Promise<number> {
    const result = await query(
      'SELECT balance FROM users WHERE id = $1',
      [userId]
    );

    return result.rows[0]?.balance || 0;
  }

  async getTransactionStats(userId: string): Promise<{
    totalDeposits: number;
    totalWithdrawals: number;
    totalTransfers: number;
    totalPayments: number;
  }> {
    const result = await query(
      `SELECT 
        COALESCE(SUM(CASE WHEN type = 'DEPOSIT' THEN amount ELSE 0 END), 0) as total_deposits,
        COALESCE(SUM(CASE WHEN type = 'WITHDRAW' THEN amount ELSE 0 END), 0) as total_withdrawals,
        COALESCE(SUM(CASE WHEN type = 'TRANSFER' THEN amount ELSE 0 END), 0) as total_transfers,
        COALESCE(SUM(CASE WHEN type = 'PAYMENT' THEN amount ELSE 0 END), 0) as total_payments
       FROM transactions 
       WHERE from_user_id = $1 OR to_user_id = $1`,
      [userId]
    );

    return {
      totalDeposits: parseFloat(result.rows[0]?.total_deposits || 0),
      totalWithdrawals: parseFloat(result.rows[0]?.total_withdrawals || 0),
      totalTransfers: parseFloat(result.rows[0]?.total_transfers || 0),
      totalPayments: parseFloat(result.rows[0]?.total_payments || 0),
    };
  }
}

export default new TransactionService();

