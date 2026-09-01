import api from './api';

export interface PomeloCard {
  id: string;
  cardNumber: string;
  maskedCardNumber: string;
  cardHolderName: string;
  expirationDate: string; // MM/YY
  cvv?: string;
  brand: 'VISA' | 'MASTERCARD';
  type: 'VIRTUAL' | 'PHYSICAL';
  status: 'ACTIVE' | 'BLOCKED' | 'PENDING' | 'UNISSUED';
  limitBrl: number;
}

export interface PomeloCardResponse {
  success: boolean;
  data: PomeloCard;
  message?: string;
}

export interface ProvisionTokenResponse {
  success: boolean;
  data: {
    provisioningToken: string;
    cardholderName: string;
    lastFourDigits: string;
  };
}

/**
 * Busca dados do Cartão Virtual Pomelo do Usuário
 */
export const getVirtualCard = async (): Promise<PomeloCardResponse> => {
  const response = await api.get('/pomelo/cards/virtual');
  return response.data;
};

/**
 * Solicita Emissão Instantânea de Cartão Virtual Pomelo BaaS
 */
export const issueVirtualCard = async (): Promise<PomeloCardResponse> => {
  const response = await api.post('/pomelo/cards/virtual/issue');
  return response.data;
};

/**
 * Bloqueia ou Desbloqueia o Cartão na Rede Pomelo
 */
export const toggleCardLock = async (cardId: string, lock: boolean): Promise<{ success: boolean; status: 'ACTIVE' | 'BLOCKED' }> => {
  const response = await api.post('/pomelo/cards/toggle-lock', { cardId, lock });
  return response.data.data;
};

/**
 * Solicita a Emissão de Cartão Físico Pomelo com Frete
 */
export const requestPhysicalCard = async (shippingAddress: {
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}): Promise<{ success: boolean; trackingCode?: string; message: string }> => {
  const response = await api.post('/pomelo/cards/physical/request', { shippingAddress });
  return response.data;
};

/**
 * Solicita Dados de Tokenização para Apple Pay e Google Pay
 */
export const getCardTokenForWallet = async (cardId: string, walletType: 'APPLE_PAY' | 'GOOGLE_PAY'): Promise<ProvisionTokenResponse> => {
  const response = await api.post('/pomelo/cards/provision-token', { cardId, walletType });
  return response.data;
};
