import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCK_TIMEOUT_MS = 3 * 60 * 60 * 1000; // 3 horas
const STORAGE_KEYS = {
  BIOMETRIC_ENABLED: '@atos2:biometricEnabled',
  LAST_ACTIVE_AT: '@atos2:lastActiveAt',
};

interface BiometricContextData {
  isBiometricSupported: boolean;
  isBiometricEnabled: boolean;
  setBiometricEnabled: (enabled: boolean) => Promise<boolean>;
  authenticate: (reason?: string) => Promise<boolean>;
  checkShouldLock: () => Promise<boolean>;
  updateLastActiveAt: () => Promise<void>;
}

const BiometricContext = createContext<BiometricContextData>({} as BiometricContextData);

export function BiometricProvider({ children }: { children: ReactNode }) {
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabledState] = useState(false);

  useEffect(() => {
    checkSupport();
    loadPreferences();
  }, []);

  async function checkSupport() {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setIsBiometricSupported(compatible && enrolled);
    } catch (e) {
      console.warn('[BiometricContext] local authentication hardware check failed:', e);
      setIsBiometricSupported(false);
    }
  }

  async function loadPreferences() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.BIOMETRIC_ENABLED);
      setIsBiometricEnabledState(stored === 'true');
    } catch (e) {
      console.error('[BiometricContext] Erro ao carregar preferências:', e);
    }
  }

  /**
   * Ativa ou desativa biometria. Ao ativar, solicita autenticação imediata para confirmar.
   * Retorna true se a operação foi bem-sucedida.
   */
  const setBiometricEnabled = useCallback(async (enabled: boolean): Promise<boolean> => {
    if (enabled) {
      if (!isBiometricSupported) {
        return false;
      }
      // Confirma que o usuário consegue autenticar antes de ativar
      const success = await authenticate('Confirme sua identidade para ativar a biometria');
      if (!success) return false;
    }
    await AsyncStorage.setItem(STORAGE_KEYS.BIOMETRIC_ENABLED, enabled ? 'true' : 'false');
    setIsBiometricEnabledState(enabled);
    return true;
  }, [isBiometricSupported]);

  /**
   * Tenta autenticar via biometria. Se o dispositivo não suportar ou falhar,
   * retorna false (o caller deve oferecer fallback de senha).
   */
  const authenticate = useCallback(async (reason = 'Confirme sua identidade para continuar'): Promise<boolean> => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason,
        fallbackLabel: 'Usar senha',
        cancelLabel: 'Cancelar',
        disableDeviceFallback: true, // evita minimizar o app no Android ao acionar PIN do sistema
      });
      return result.success;
    } catch (e) {
      console.error('[BiometricContext] Erro na autenticação:', e);
      return false;
    }
  }, []);

  /**
   * Verifica se o app deve ser bloqueado (passou mais de 3h desde lastActiveAt).
   */
  const checkShouldLock = useCallback(async (): Promise<boolean> => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.LAST_ACTIVE_AT);
      if (!raw) return false; // Sem registro = primeira abertura, não bloqueia
      const lastActive = parseInt(raw, 10);
      const elapsed = Date.now() - lastActive;
      return elapsed > LOCK_TIMEOUT_MS;
    } catch (e) {
      console.error('[BiometricContext] Erro ao checar lock:', e);
      return false;
    }
  }, []);

  /**
   * Atualiza o timestamp de última atividade (chamado quando app vai para background).
   */
  const updateLastActiveAt = useCallback(async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_ACTIVE_AT, String(Date.now()));
    } catch (e) {
      console.error('[BiometricContext] Erro ao salvar lastActiveAt:', e);
    }
  }, []);

  return (
    <BiometricContext.Provider
      value={{
        isBiometricSupported,
        isBiometricEnabled,
        setBiometricEnabled,
        authenticate,
        checkShouldLock,
        updateLastActiveAt,
      }}
    >
      {children}
    </BiometricContext.Provider>
  );
}

export function useBiometric() {
  const context = useContext(BiometricContext);
  if (!context) {
    throw new Error('useBiometric must be used within a BiometricProvider');
  }
  return context;
}
