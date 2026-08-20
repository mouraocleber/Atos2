import { getSecureItem, setSecureItem } from './secureStorage';
import { Platform } from 'react-native';

const DEVICE_ID_KEY = 'atos2_device_id';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Retorna o ID único persistente deste dispositivo.
 * Se ainda não existir, gera um novo UUIDv4 e salva no SecureStorage/AsyncStorage.
 */
export async function getOrCreateDeviceId(): Promise<string> {
  try {
    let deviceId = await getSecureItem(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = `${Platform.OS}_${generateUUID()}`;
      await setSecureItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  } catch (error) {
    console.warn('[deviceId] Erro ao obter deviceId:', error);
    return `fallback_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
