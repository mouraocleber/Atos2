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
      const { amount: amountInCents, currency = 'brl' } = req.body;
      const userId = req.userId!;

      if (!amountInCents || amountInCents <= 0) {
        return res.status(400).json({ error: 'O valor da cobrança deve ser maior que zero (em centavos).' });
      }

      // Check if user has a Stripe connected account and their business tier
      const userRes = await query('SELECT stripe_account_id, plan FROM users WHERE id = $1', [userId]);
      const stripeAccountId = userRes.rows[0]?.stripe_account_id;
      const userPlan = userRes.rows[0]?.plan;

      if (userPlan !== 'BUSINESS') {
        return res.status(403).json({ error: 'Recurso exclusivo do plano Business. Faça upgrade para transformar seu perfil em loja.' });
      }

      // Se for USD/EUR na maquininha, exigimos que ele tenha a conta gringa conectada (Stripe Connect)
      if (['usd', 'eur'].includes(currency.toLowerCase()) && !stripeAccountId) {
        return res.status(403).json({ error: 'Para cobrar em USD/EUR, você precisa configurar sua conta internacional (Stripe Connect).' });
      }

      // Generate the intent specifically for Terminal (card_present)
      // Se tiver stripeAccountId, ele roteará o fundo direto pra ele (multi-moeda real)
      const client_secret = await stripeService.createPaymentIntent(amountInCents, currency, stripeAccountId);
      
      // Log the intention as usual
      const transactionId = uuidv4();
      await query(
        `INSERT INTO transactions (id, to_user_id, type, amount, currency, status, description, reference)
         VALUES ($1, $2, 'DEPOSIT', $3, $5, 'PENDING', 'Máquina de Cartão - POS', $4)`,
        [transactionId, userId, amountInCents / 100, transactionId, currency.toUpperCase()] 
      );

      return res.status(200).json({ client_secret, transactionId });
    } catch (error: any) {
      console.error('[StripeController] Falha ao criar PaymentIntent:', error);
      return res.status(500).json({ error: error.message || 'Erro ao gerar pagamento' });
    }
  }

  // --- MÉTODOS STRIPE CONNECT ---

  async onboardUser(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const userRes = await query('SELECT email, stripe_account_id FROM users WHERE id = $1', [userId]);
      if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
      
      let { stripe_account_id, email } = userRes.rows[0];

      if (!stripe_account_id) {
        stripe_account_id = await stripeService.createConnectAccount(email, 'BR');
        await query('UPDATE users SET stripe_account_id = $1 WHERE id = $2', [stripe_account_id, userId]);
      }

      // Create return/refresh URLs for the onboarding flow
      const baseUrl = process.env.CLIENT_URL || 'atos2://';
      const onBoardingUrl = await stripeService.createAccountLink(
        stripe_account_id,
        `${baseUrl}stripe-onboarding-success`,
        `${baseUrl}stripe-onboarding-refresh`
      );

      return res.json({ url: onBoardingUrl });
    } catch (error: any) {
      console.error('[StripeController] Falha no Onboarding:', error);
      return res.status(500).json({ error: error.message || 'Falha ao iniciar processo Connect' });
    }
  }

  async getConnectBalance(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const userRes = await query('SELECT stripe_account_id FROM users WHERE id = $1', [userId]);
      const stripeAccountId = userRes.rows[0]?.stripe_account_id;

      if (!stripeAccountId) {
        return res.status(404).json({ error: 'Usuário não possui conta Stripe Connect.' });
      }

      const balance = await stripeService.getConnectBalance(stripeAccountId);
      return res.json({ balance });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async payout(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { amount, currency } = req.body; // Amount needs to be in internal integer format e.g., cents if Stripe expects it

      if (!amount || !currency) {
        return res.status(400).json({ error: 'Informe valor (em centavos) e a moeda para saque.' });
      }

      const userRes = await query('SELECT stripe_account_id FROM users WHERE id = $1', [userId]);
      const stripeAccountId = userRes.rows[0]?.stripe_account_id;

      if (!stripeAccountId) {
        return res.status(403).json({ error: 'Você precisa configurar o Stripe Connect para realizar saques internacionais.' });
      }

      const payout = await stripeService.createPayout(stripeAccountId, amount, currency);
      
      // Registrar Payout no histórico da nossa plataforma (opcional, só para controle de registro)
      const transactionId = uuidv4();
      await query(
        `INSERT INTO transactions (id, from_user_id, type, amount, currency, status, description)
         VALUES ($1, $2, 'WITHDRAW', $3, $4, 'COMPLETED', 'Saque Internacional via Stripe Payout')`,
        [transactionId, userId, amount / 100, currency.toUpperCase()] 
      );

      return res.json({ success: true, payout });
    } catch (error: any) {
      console.error('[StripeController] Erro no Payout:', error);
      return res.status(500).json({ error: error.message });
    }
  }
}

export const stripeController = new StripeController();
