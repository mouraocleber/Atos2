import axios from 'axios';
import { query, getClient } from '../config/database';

export class PixReconciliationService {
  private isRunning = false;

  /**
   * Reconcilia transações PIX pendentes buscando na API do Mercado Pago
   */
  async reconcilePendingPix() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    const token = (process.env.MP_ACCESS_TOKEN || '').trim();
    if (!token) {
      this.isRunning = false;
      return;
    }

    try {
      // 1. Buscar transações PIX pendentes (DEPOSIT em BRL que estão PENDING)
      const pendingTx = await query(
        "SELECT id, to_user_id, amount, status FROM transactions WHERE type = 'DEPOSIT' AND currency = 'BRL' AND status = 'PENDING' ORDER BY created_at DESC"
      );

      if (pendingTx.rows.length === 0) {
        this.isRunning = false;
        return;
      }

      console.log(`[PixReconciler] Verificando ${pendingTx.rows.length} transações pendentes no Mercado Pago...`);

      for (const row of pendingTx.rows) {
        const depositId = row.id;
        const userId = row.to_user_id;
        const amount = parseFloat(row.amount);

        try {
          // 2. Consultar o pagamento no Mercado Pago pelo external_reference (nosso depositId)
          const mpResponse = await axios.get(
            `https://api.mercadopago.com/v1/payments/search?external_reference=${depositId}`,
            {
              headers: {
                'Authorization': `Bearer ${token}`
              },
              timeout: 10000
            }
          );

          const payments = mpResponse.data.results || [];
          for (const payment of payments) {
            if (payment.status === 'approved') {
              console.log(`[PixReconciler] 💰 Pagamento ID ${payment.id} aprovado para Transação ${depositId} (Valor: R$ ${amount}). Creditando...`);

              // 3. Efetuar o crédito no banco usando transação do BD
              const client = await getClient();
              try {
                await client.query('BEGIN');

                // Atualiza o status para completo se ainda estiver pendente
                const txUpdate = await client.query(
                  "UPDATE transactions SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND status = 'PENDING'",
                  [depositId]
                );

                if (txUpdate.rowCount && txUpdate.rowCount > 0) {
                  // Credita na carteira correspondente
                  await client.query(
                    "UPDATE wallets SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 AND currency = 'BRL'",
                    [amount, userId]
                  );

                  await client.query('COMMIT');
                  console.log(`[PixReconciler] ✅ Saldo de R$ ${amount} creditado com SUCESSO na carteira do user: ${userId}`);
                } else {
                  await client.query('ROLLBACK');
                }
              } catch (dbErr) {
                await client.query('ROLLBACK');
                console.error(`[PixReconciler] Erro no banco ao reconciliar transação ${depositId}:`, dbErr);
              } finally {
                client.release();
              }
            }
          }
        } catch (apiErr: any) {
          console.error(`[PixReconciler] Erro ao consultar API Mercado Pago para transação ${depositId}:`, apiErr.message);
        }
      }
    } catch (err: any) {
      console.error('[PixReconciler] Erro geral na rotina de reconciliação:', err.message);
    } finally {
      this.isRunning = false;
    }
  }
}

export const pixReconciliationService = new PixReconciliationService();
