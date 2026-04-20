import { Slot, useRouter, useSegments, usePathname } from 'expo-router';
import { StripeProvider } from '@stripe/stripe-react-native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../contexts/AuthContext';
import { LocalizationProvider } from '../contexts/LocalizationContext';
import { BiometricProvider, useBiometric } from '../contexts/BiometricContext';
import { SocketProvider } from '../contexts/SocketContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import React, { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';

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

/**
 * Escuta chamadas entrantes globalmente.
 * Se o usuário NÃO está na tela do chat com o chamador, mostra um Alert.
 */
function GlobalCallHandler() {
  const { socket } = useSocket();
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!socket) return;

    const handleCallUser = (data: { from: string; fromName: string; type: 'audio' | 'video' }) => {
      // Se já está na tela do chat com o chamador, o [id].tsx trata o evento
      if (pathnameRef.current === `/chat/${data.from}`) return;

      const callTypeLabel = data.type === 'video' ? '📹 Chamada de Vídeo' : '📞 Chamada de Áudio';
      Alert.alert(
        callTypeLabel,
        `${data.fromName || 'Alguém'} está te chamando`,
        [
          {
            text: '❌ Rejeitar',
            style: 'destructive',
            onPress: () => {
              socket.emit('hangUp', { to: data.from, from: user?.id });
            },
          },
          {
            text: '✅ Atender',
            onPress: () => {
              router.push({
                pathname: '/chat/[id]',
                params: {
                  id: data.from,
                  name: data.fromName || 'Usuário',
                  status: 'online',
                  autoAcceptCall: data.type,
                },
              });
            },
          },
        ],
        { cancelable: false }
      );
    };

    socket.on('callUser', handleCallUser);
    return () => {
      socket.off('callUser', handleCallUser);
    };
  }, [socket, user?.id, router]);

  return null;
}


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
            <GlobalCallHandler />
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
