import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

export type PixKeyType = 'cnpj' | 'cpf' | 'email' | 'phone' | 'random';

export interface MerchantPixConfig {
  key: string;
  type: PixKeyType;
  holderName: string;
  bankName?: string;
  updatedAt?: string;
}

const STORAGE_KEY = '@atos2_merchant_pix_config';

export const PIX_TYPE_LABELS: Record<PixKeyType, string> = {
  cnpj: 'CNPJ',
  cpf: 'CPF',
  email: 'E-mail',
  phone: 'Telefone',
  random: 'Chave Aleatória (EVP)',
};

/**
 * Obtém a configuração de chave PIX de recebimento do estabelecimento/usuário
 */
export const getMerchantPixConfig = async (): Promise<MerchantPixConfig | null> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('[PixService] Erro ao obter chave PIX do storage:', err);
  }
  return null;
};

/**
 * Salva a chave PIX de recebimento tanto no armazenamento local quanto no backend (se disponível)
 */
export const saveMerchantPixConfig = async (
  config: MerchantPixConfig
): Promise<boolean> => {
  try {
    const payload = {
      ...config,
      updatedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

    // Tenta sincronizar com o perfil do backend silenciosamente
    try {
      await api.put('/users/profile', {
        pixKey: config.key,
        pixKeyType: config.type,
        pixHolderName: config.holderName,
      });
    } catch (apiErr) {
      // Backend pode não ter os campos mapeados ainda, mas o storage local garante persistência 100%
      console.log('[PixService] Sincronização remota pendente ou offline:', apiErr);
    }

    return true;
  } catch (err) {
    console.error('[PixService] Erro ao salvar chave PIX:', err);
    return false;
  }
};
