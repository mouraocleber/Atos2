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
  async createPaymentIntent(amountInCents: number, currency: string = 'brl', destinationAccountId?: string): Promise<string> {
    const params: any = {
      amount: Math.round(amountInCents),
      currency: currency.toLowerCase(),
      payment_method_types: ['card_present'],
      capture_method: 'automatic',
    };

    // If destinationAccountId is provided, we route funds directly to the Stripe Connected account (less platform fee)
    if (destinationAccountId) {
      params.transfer_data = {
        destination: destinationAccountId,
      };
      // Important: Connected accounts must use 'on_behalf_of' for Terminal/card_present on destination charges depending on setup.
      // We will assume direct destination charges for simplicity.
    }

    const intent = await stripe.paymentIntents.create(params);
    return intent.client_secret!;
  }

  // --- STRIPE CONNECT METHODS ---

  /**
   * Create a Stripe Express Account for a user
   */
  async createConnectAccount(email: string, country: string = 'BR'): Promise<string> {
    const account = await stripe.accounts.create({
      type: 'express',
      country: country,
      email: email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
    });
    return account.id;
  }

  /**
   * Generate an onboarding link for the user to complete their Stripe identity verification
   */
  async createAccountLink(accountId: string, returnUrl: string, refreshUrl: string): Promise<string> {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });
    return accountLink.url;
  }

  /**
   * Check the user's balances directly on their Stripe Connect account
   */
  async getConnectBalance(accountId: string): Promise<any> {
    return await stripe.balance.retrieve(undefined, {
      stripeAccount: accountId,
    });
  }

  /**
   * Trigger a payout from the user's Stripe Connect balance to their external Bank Account
   */
  async createPayout(accountId: string, amount: number, currency: string): Promise<any> {
    return await stripe.payouts.create(
      {
        amount: Math.round(amount),
        currency: currency.toLowerCase(),
      },
      {
        stripeAccount: accountId,
      }
    );
  }
}

export const stripeService = new StripeService();
