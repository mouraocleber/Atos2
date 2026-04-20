import { Slot, useRouter, useSegments } from 'expo-router';
import { StripeProvider } from '@stripe/stripe-react-native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../contexts/AuthContext';
import { LocalizationProvider } from '../contexts/LocalizationContext';
import { BiometricProvider, useBiometric } from '../contexts/BiometricContext';
import { SocketProvider } from '../contexts/SocketContext';
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

import React, { useState } from 'react';

// Safe lazy import - if the native module isn't properly linked it won't crash the whole app
let TerminalProvider: React.ComponentType<any> | null = null;
try {
  TerminalProvider = require('@stripe/stripe-terminal-react-native').TerminalProvider;
} catch (e) {
  console.warn('[Stripe Terminal] Native module not available:', e);
}

import api from '../services/api';

// This never throws - if it fails, Stripe Terminal just won't work,
// but the rest of the app continues normally.
const fetchTokenProvider = async () => {
  try {
    const { data } = await api.post('/stripe/connection_token');
    return data.secret as string;
  } catch (e) {
    console.error('Falha ao obter ConnectionToken para Stripe Terminal:', e);
    return ''; // Return empty string instead of throwing
  }
};

export default function RootLayout() {
  const stripeKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_sample';

  const content = (
    <LocalizationProvider>
      <AuthProvider>
        <SocketProvider>
          <BiometricProvider>
            <StatusBar style="light" />
            <AppStateWatcher />
            <Slot />
          </BiometricProvider>
        </SocketProvider>
      </AuthProvider>
    </LocalizationProvider>
  );

  return (
    <SafeAreaProvider>
      <StripeProvider publishableKey={stripeKey}>
        {TerminalProvider ? (
          <TerminalProvider logLevel="verbose" tokenProvider={fetchTokenProvider}>
            {content}
          </TerminalProvider>
        ) : content}
      </StripeProvider>
    </SafeAreaProvider>
  );
}
