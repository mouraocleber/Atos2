import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { stripeService } from '../services/stripeService';
import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export class StripeController {
  
  async getConnectionToken(req: AuthenticatedRequest, res: Response) {
    try {
      const secret = await stripeService.createConnectionToken();
      return res.status(200).json({ secret });
    } catch (error: any) {
      console.error('[StripeController] Falha ao obter ConnectionToken:', error);
      return res.status(500).json({ error: error.message || 'Erro interno no Stripe' });
    }
  }

  async createPaymentIntent(req: AuthenticatedRequest, res: Response) {
    try {
      const { amount } = req.body;
      const userId = req.userId!;

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'O valor da cobrança deve ser maior que zero.' });
      }

      // Generate the intent
      const client_secret = await stripeService.createPaymentIntent(amount, 'brl');
      
      // Optionally we can log an INTENTION in our transactions table.
      const transactionId = uuidv4();
      await query(
        `INSERT INTO transactions (id, to_user_id, type, amount, currency, status, description, reference)
         VALUES ($1, $2, 'DEPOSIT', $3, 'BRL', 'PENDING', 'Máquina de Cartão - POS', $4)`,
        [transactionId, userId, amount, transactionId]
      );

      return res.status(200).json({ client_secret, transactionId });
    } catch (error: any) {
      console.error('[StripeController] Falha ao criar PaymentIntent:', error);
      return res.status(500).json({ error: error.message || 'Erro ao gerar pagamento' });
    }
  }
}

export const stripeController = new StripeController();
