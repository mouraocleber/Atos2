import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WalletBalanceResponse {
  original: { balance: number; currency: string };
  local: { balance: number; currency: string };
  global: { balance: number; currency: string };
  usdc?: { balance: number; currency: string; activated: boolean };
}

export interface CryptoSettlementDetails {
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  cryptoAmount: string;
  cryptoCurrency: 'USDC' | 'SOL';
  minPayoutEur: number;
  payoutEtaHours: number;
  bankNotice: string;
  table?: string;
  merchant?: string;
}

export interface CryptoSettlementTransaction {
  id: string;
  type: 'DEPOSIT';
  amount: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED';
  description: string;
  reference: string;
  created_at: string;
  settlementDetails?: CryptoSettlementDetails;
}

const SETTLEMENT_STORAGE_KEY = '@atos2_crypto_settlement_transactions';

export const getBalance = async (): Promise<WalletBalanceResponse> => {
  const response = await api.get('/wallet/balance');
  return response.data.data;
};

export const getTransactionHistory = async (): Promise<any[]> => {
  const response = await api.get('/wallet/transactions');
  return response.data.data;
};

export const createTransaction = async (data: any): Promise<any> => {
  const response = await api.post('/wallet/transactions', data);
  return response.data;
};

export const addBalance = async (data: any): Promise<any> => {
  const response = await api.post('/wallet/add-balance', data);
  return response.data;
};

/**
 * Obtém o histórico de recebimentos em cripto (Solana Pay) aguardando ou concluídos
 */
export const getCryptoSettlementTransactions = async (): Promise<CryptoSettlementTransaction[]> => {
  try {
    const raw = await AsyncStorage.getItem(SETTLEMENT_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('[Wallet] Erro ao obter liquidações de cripto:', err);
  }
  return [];
};

/**
 * Registra novo recebimento de Solana Pay para repasse fiduciário D+1
 */
export const saveCryptoSettlementTransaction = async (tx: CryptoSettlementTransaction): Promise<void> => {
  try {
    const existing = await getCryptoSettlementTransactions();
    const updated = [tx, ...existing.filter((item) => item.id !== tx.id)];
    await AsyncStorage.setItem(SETTLEMENT_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('[Wallet] Erro ao salvar liquidação de cripto:', err);
  }
};

