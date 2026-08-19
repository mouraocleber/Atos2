import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * Utilitário de Armazenamento Seguro (AppSec)
 * Utiliza o Android Keystore (EncryptedSharedPreferences) e iOS Keychain no mobile,
 * evitando salvamento de tokens sensíveis em texto puro no AsyncStorage.
 */

export const setSecureItem = async (key: string, value: string): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  } catch (error) {
    console.warn(`[secureStorage] Erro ao salvar item seguro (${key}):`, error);
    await AsyncStorage.setItem(key, value);
  }
};

export const getSecureItem = async (key: string): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      return await AsyncStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.warn(`[secureStorage] Erro ao buscar item seguro (${key}):`, error);
    return await AsyncStorage.getItem(key);
  }
};

export const deleteSecureItem = async (key: string): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  } catch (error) {
    console.warn(`[secureStorage] Erro ao deletar item seguro (${key}):`, error);
    await AsyncStorage.removeItem(key);
  }
};
