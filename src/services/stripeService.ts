import Stripe from 'stripe';
import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { io } from '../index';

const stripeSecret = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export const stripe = new Stripe(stripeSecret, {
  apiVersion: '2023-10-16' as any,
});

export interface CreateStripeSessionParams {
  amount: number; // Valor nominal (ex: 100.00 ou 20.50)
  currency?: string; // 'brl', 'usd', 'eur', 'gbp'
  table?: string;
  merchantName?: string;
  merchantId?: string;
  customerEmail?: string;
  successUrl?: string;
  cancelUrl?: string;
}

export class StripeService {
  /**
   * Cria uma sessão de Checkout hospedada na Stripe com suporte a Cartão, Apple Pay e Google Pay
   */
  async createCheckoutSession(params: CreateStripeSessionParams): Promise<{ sessionId: string; sessionUrl: string }> {
    const currency = (params.currency || 'brl').toLowerCase();
    const amountInCents = Math.round(params.amount * 100);

    if (!amountInCents || amountInCents <= 0) {
      throw new Error('Valor inválido para o checkout Stripe.');
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: `AtoS2 - ${params.merchantName || 'Estabelecimento Parceiro'}`,
              description: `Pagamento Ref/Mesa ${params.table || '01'} • Checkout Seguro com 3D Secure`,
              images: ['https://atos2.online/assets/logo_atos2.png'],
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url:
        params.successUrl ||
        `https://atos2.online/checkout/success?session_id={CHECKOUT_SESSION_ID}&table=${encodeURIComponent(params.table || '01')}`,
      cancel_url:
        params.cancelUrl ||
        `https://atos2.online/checkout?canceled=true&table=${encodeURIComponent(params.table || '01')}`,
      customer_email: params.customerEmail,
      metadata: {
        merchantId: params.merchantId || '',
        table: params.table || '01',
        amountNominal: params.amount.toString(),
        currency: currency.toUpperCase(),
        platform: 'atos2',
      },
    });

    if (!session.url) {
      throw new Error('Falha ao gerar URL de pagamento da Stripe.');
    }

    return {
      sessionId: session.id,
      sessionUrl: session.url,
    };
  }

  /**
   * Processa o evento de webhook da Stripe para liquidação automática
   */
  async processWebhookEvent(rawBody: Buffer | string, signature: string): Promise<any> {
    let event: any;

    if (stripeWebhookSecret && stripeWebhookSecret !== '') {
      event = stripe.webhooks.constructEvent(rawBody, signature, stripeWebhookSecret);
    } else {
      event = typeof rawBody === 'string' ? JSON.parse(rawBody) : JSON.parse(rawBody.toString('utf8'));
    }

    console.log(`[Stripe Webhook] Evento recebido: ${event.type} (ID: ${event.id})`);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      await this.handleSuccessfulCheckout(session);
    }

    return { received: true };
  }

  /**
   * Executa a liquidação do pagamento aprovado e repasse ao estabelecimento parceiro
   */
  private async handleSuccessfulCheckout(session: any) {
    const metadata = session.metadata || {};
    const merchantId = metadata.merchantId;
    const table = metadata.table || '01';
    const totalAmount = session.amount_total ? session.amount_total / 100 : parseFloat(metadata.amountNominal || '0');
    const currency = (session.currency || metadata.currency || 'BRL').toUpperCase();

    console.log(`[Stripe Webhook] Pagamento Aprovado! Sessão: ${session.id}, Total: ${currency} ${totalAmount}, Mesa: ${table}`);

    // Regra financeira AtoS2:
    // Taxa de 2% retida pela plataforma AtoS2
    // 98% creditado na conta do estabelecimento
    const takeRate = 0.02;
    const platformFee = totalAmount * takeRate;
    const netPayout = totalAmount - platformFee;

    const transactionId = uuidv4();
    const description = `Pagamento Cartão/Stripe (Mesa ${table}) - Total: ${currency} ${totalAmount.toFixed(2)}`;

    try {
      const client = await (require('../config/database').getClient)();
      try {
        await client.query('BEGIN');

        await client.query(
          `INSERT INTO transactions (
            id, from_user_id, to_user_id, type, amount, currency, status, description, reference
          ) VALUES ($1, NULL, $2, 'DEPOSIT', $3, $4, 'COMPLETED', $5, $6)`,
          [transactionId, merchantId || null, netPayout, currency === 'BRL' ? 'BRL' : 'USDC', description, session.id]
        );

        if (merchantId) {
          await client.query(
            `UPDATE wallets 
             SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP 
             WHERE user_id = $2 AND currency = $3`,
            [netPayout, merchantId, currency === 'BRL' ? 'BRL' : 'USDC']
          );
        }

        await client.query('COMMIT');
        console.log(`[Stripe Webhook] Saldo líquido de ${currency} ${netPayout.toFixed(2)} creditado para o parceiro ${merchantId || 'geral'}.`);

        if (io) {
          io.emit('stripePaymentCompleted', {
            sessionId: session.id,
            table,
            merchantId,
            totalAmount,
            netPayout,
            currency,
            status: 'COMPLETED',
          });
        }
      } catch (dbErr) {
        await client.query('ROLLBACK');
        throw dbErr;
      } finally {
        client.release();
      }
    } catch (err) {
      console.error('[Stripe Webhook Error] Falha ao liquidar no banco:', err);
      throw err;
    }
  }
}

export const stripeService = new StripeService();
