import api from './api';

export interface WalletBalanceResponse {
  original: { balance: number; currency: string };
  local: { balance: number; currency: string };
  global: { balance: number; currency: string };
}

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
