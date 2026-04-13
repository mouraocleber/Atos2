import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_123', {
  apiVersion: '2023-10-16' as any,
});

export class StripeService {
  /**
   * Terminal: Generate Connection Token
   * Necessary for the React Native app to initialize Stripe Terminal
   */
  async createConnectionToken(): Promise<string> {
    const token = await stripe.terminal.connectionTokens.create();
    return token.secret;
  }

  /**
   * Terminal: Generate Payment Intent
   * Creates an intent specifically for 'card_present' physical payments
   */
  async createPaymentIntent(amount: number, currency: string = 'brl'): Promise<string> {
    // Stripe amount is in cents, so amount * 100
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: currency.toLowerCase(),
      payment_method_types: ['card_present'],
      capture_method: 'automatic', // SDK will handle the capture directly inside the reader
    });
    
    return intent.client_secret!;
  }
}

export const stripeService = new StripeService();
