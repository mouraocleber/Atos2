import api from './api';

export interface BinanceQuoteResponse {
  asset: string;
  amountBrl: number;
  estimatedCrypto: number;
  rate: number; // Quote rate (BRL per 1 Crypto)
}

export interface BinanceOrderResponse {
  success: boolean;
  data: {
    orderId: string;
    payUrl: string; // Binance Pay checkout URL
    qrCode: string; // QR code data or image link
    amount: number; // amount in BRL
    cryptoAmount: number; // estimated crypto amount
    cryptoAsset: string;
    status: 'PENDING' | 'COMPLETED' | 'FAILED';
  };
}

/**
 * Fetch estimated conversion quote for a crypto asset
 */
export const getBinanceQuote = async (asset: string, amountBrl: number): Promise<BinanceQuoteResponse> => {
  const response = await api.get('/payments/binance/quote', {
    params: { asset, amountBrl }
  });
  return response.data.data;
};

/**
 * Create a purchase order via Binance
 */
export const createBinanceBuyOrder = async (amountBrl: number, asset: string): Promise<BinanceOrderResponse> => {
  const response = await api.post('/payments/deposit/binance', {
    amount: amountBrl,
    currency: 'BRL',
    cryptoAsset: asset
  });
  return response.data;
};

/**
 * Check status of a Binance Pay order
 */
export const checkBinanceOrderStatus = async (orderId: string): Promise<{ success: boolean; status: 'PENDING' | 'COMPLETED' | 'FAILED' }> => {
  const response = await api.get(`/payments/binance/order-status/${orderId}`);
  return response.data.data;
};
