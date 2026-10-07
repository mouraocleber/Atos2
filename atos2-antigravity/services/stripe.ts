import api from './api';
import * as Linking from 'expo-linking';

export interface StripeBalanceResponse {
  available?: Array<{ amount: number; currency: string }>;
  pending?: Array<{ amount: number; currency: string }>;
}

export interface StripeOnboardResponse {
  url: string;
}

/**
 * Inicia o onboarding do Stripe Connect para o estabelecimento/atendente.
 * Retorna a URL para preenchimento dos dados bancários diretamente na Stripe.
 */
export const startStripeOnboarding = async (autoOpen: boolean = true): Promise<string> => {
  try {
    const response = await api.post<StripeOnboardResponse>('/stripe/onboard');
    const url = response.data?.url;
    if (url && autoOpen) {
      await Linking.openURL(url);
    }
    return url;
  } catch (error: any) {
    console.error('[StripeService] Erro ao iniciar onboarding:', error);
    throw new Error(error?.response?.data?.error || error?.message || 'Falha ao iniciar onboarding Stripe Connect');
  }
};

/**
 * Busca o saldo da conta conectada Stripe Connect do lojista (Zero Custódia).
 */
export const getStripeConnectBalance = async (): Promise<StripeBalanceResponse | null> => {
  try {
    const response = await api.get('/stripe/balance');
    return response.data?.balance || null;
  } catch (error: any) {
    // 404 significa que o usuário ainda não conectou a conta
    if (error?.response?.status === 404) {
      return null;
    }
    console.warn('[StripeService] Erro ao buscar saldo Connect:', error?.message);
    return null;
  }
};

/**
 * Solicita repasse / payout manual do saldo Stripe Connect para a conta bancária vinculada.
 */
export const requestStripePayout = async (amountInCents: number, currency: string = 'brl'): Promise<any> => {
  try {
    const response = await api.post('/stripe/payout', {
      amount: amountInCents,
      currency: currency.toLowerCase(),
    });
    return response.data;
  } catch (error: any) {
    console.error('[StripeService] Erro no repasse Stripe:', error);
    throw new Error(error?.response?.data?.error || error?.message || 'Erro ao solicitar repasse bancário');
  }
};

/**
 * Cria sessão de checkout internacional para pagamentos com cartão, Apple Pay e Google Pay.
 */
export const createStripeCheckoutSession = async (params: {
  amount: number;
  currency?: string;
  table?: string;
  merchantName?: string;
}): Promise<{ sessionUrl: string; sessionId: string }> => {
  try {
    const response = await api.post('/payments/stripe/create-checkout-session', {
      amount: params.amount,
      currency: params.currency || 'brl',
      table: params.table,
      merchantName: params.merchantName,
    });
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Resposta inesperada da Stripe');
  } catch (error: any) {
    console.error('[StripeService] Erro ao criar Checkout Session:', error);
    throw new Error(error?.response?.data?.message || error?.message || 'Erro ao gerar checkout Stripe');
  }
};
