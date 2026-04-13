import { Slot, useRouter, useSegments } from 'expo-router';
import { StripeProvider } from '@stripe/stripe-react-native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../contexts/AuthContext';
import { LocalizationProvider } from '../contexts/LocalizationContext';
import { BiometricProvider, useBiometric } from '../contexts/BiometricContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

/**
 * Inner component that has access to auth and biometric contexts.
 * Handles the AppState transitions and enforces the 3h lock.
 */
function AppStateWatcher() {
  const { token } = useAuth();
  const { updateLastActiveAt, checkShouldLock } = useBiometric();
  const router = useRouter();
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextState: AppStateStatus) => {
      const prev = appState.current;
      appState.current = nextState;

      if (prev === 'active' && nextState === 'background') {
        // App indo para background → salva timestamp
        await updateLastActiveAt();
      }

      if (prev === 'background' && nextState === 'active') {
        // App voltando ao foreground → verifica se passou das 3h
        if (token) {
          const shouldLock = await checkShouldLock();
          if (shouldLock) {
            router.replace('/lock');
          }
        }
      }
    });

    return () => subscription.remove();
  }, [token, updateLastActiveAt, checkShouldLock, router]);

  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StripeProvider publishableKey="pk_test_sample">
        <LocalizationProvider>
          <AuthProvider>
            <BiometricProvider>
              <StatusBar style="light" />
              <AppStateWatcher />
              <Slot />
            </BiometricProvider>
          </AuthProvider>
        </LocalizationProvider>
      </StripeProvider>
    </SafeAreaProvider>
  );
}
