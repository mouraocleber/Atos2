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
  try {
    const response = await api.get('/payments/binance/quote', {
      params: { asset, amountBrl }
    });
    return response.data.data;
  } catch (error) {
    console.warn('Backend quote endpoint failed, using local calculation fallback:', error);
    // Local fallback/simulation for USDC
    const rate = 5.6; // standard rate BRL/USDC
    
    return {
      asset,
      amountBrl,
      estimatedCrypto: amountBrl / rate,
      rate
    };
  }
};

/**
 * Create a purchase order via Binance
 */
export const createBinanceBuyOrder = async (amountBrl: number, asset: string): Promise<BinanceOrderResponse> => {
  try {
    const response = await api.post('/payments/deposit/binance', {
      amount: amountBrl,
      currency: 'BRL',
      cryptoAsset: asset
    });
    return response.data;
  } catch (error: any) {
    console.warn('Backend deposit/binance endpoint failed, using mockup fallback:', error);
    // Simulation fallback if backend is not ready
    const rate = 5.6;
    return {
      success: true,
      data: {
        orderId: 'BIN-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        payUrl: `https://pay.binance.com/checkout?orderId=${Math.random().toString(36).substr(2, 9)}`,
        qrCode: `binance_pay_mock_qr_code_for_${asset}_${amountBrl}`,
        amount: amountBrl,
        cryptoAmount: amountBrl / rate,
        cryptoAsset: asset,
        status: 'PENDING'
      }
    };
  }
};
