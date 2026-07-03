import { Slot, useRouter, useSegments, usePathname } from 'expo-router';
import { StripeProvider } from '@stripe/stripe-react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, DefaultTheme } from '@react-navigation/native';
import { AuthProvider } from '../contexts/AuthContext';
import { LocalizationProvider } from '../contexts/LocalizationContext';
import { BiometricProvider, useBiometric } from '../contexts/BiometricContext';
import { SocketProvider } from '../contexts/SocketContext';
import { OnboardingProvider, useOnboarding } from '../contexts/OnboardingContext';
import WelcomeShowcase from '../components/WelcomeShowcase';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import React, { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { Colors } from '../constants/theme';

// Tema de navegação forçado para Light — evita fundo preto em dispositivos com Dark Mode
const AppTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Colors.light.background, // '#f5f5f5' — fundo das telas
    card: Colors.dark.surface,           // header/tab bar
    text: Colors.light.text,
    border: Colors.dark.border,
    notification: Colors.primary,
  },
};

/**
 * Inner component that has access to auth and biometric contexts.
 * Handles the AppState transitions and enforces the 3h lock.
 */
function AppStateWatcher() {
  const { token, signOut } = useAuth();
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
            // Prazo expirado → logout completo e redireciona para login
            await signOut();
            router.replace('/(auth)/login');
          }
        }
      }
    });

    return () => subscription.remove();
  }, [token, updateLastActiveAt, checkShouldLock, signOut, router]);

  return null;
}

/**
 * Escuta chamadas entrantes globalmente.
 * Se o usuário NÃO está na tela do chat com o chamador, mostra um Alert.
 * 
 * ⚠️ NOTA DE PRODUÇÃO (CHAMADAS EM SEGUNDO PLANO / APP MINIMIZADO):
 * Quando o aplicativo está minimizado ou em segundo plano, os sistemas operacionais (iOS/Android) 
 * suspendem o loop do JavaScript, o que desconecta ou silencia este WebSocket.
 * Para que as chamadas sejam recebidas em segundo plano:
 * 1. Deve-se integrar o Firebase Cloud Messaging (FCM) para Android e APNs (VoIP) para iOS no backend.
 * 2. O backend envia um Push Notification do tipo "data" de alta prioridade contendo o payload da chamada.
 * 3. No React Native, utilize bibliotecas como `@react-native-firebase/messaging` ou `expo-notifications`
 *    junto com `react-native-callkeep` para interceptar a notificação em segundo plano, acordar o dispositivo
 *    e renderizar a tela nativa de recebimento de chamada.
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

/**
 * Exibe o WelcomeShowcase uma vez, após o login.
 */
function OnboardingGate() {
  const { token } = useAuth();
  const { showcaseDone, markShowcaseDone } = useOnboarding();
  const [showShowcase, setShowShowcase] = useState(false);

  useEffect(() => {
    if (token && !showcaseDone) {
      // Pequeno delay para a tela principal já estar montada
      const t = setTimeout(() => setShowShowcase(true), 600);
      return () => clearTimeout(t);
    }
  }, [token, showcaseDone]);

  const handleDone = async () => {
    setShowShowcase(false);
    await markShowcaseDone();
  };

  return <WelcomeShowcase visible={showShowcase} onDone={handleDone} />;
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
    <ThemeProvider value={AppTheme}>
      <LocalizationProvider>
        <AuthProvider>
          <OnboardingProvider>
            <SocketProvider>
              <BiometricProvider>
                <StatusBar style="light" />
                <AppStateWatcher />
                <GlobalCallHandler />
                <OnboardingGate />
                <Slot />
              </BiometricProvider>
            </SocketProvider>
          </OnboardingProvider>
        </AuthProvider>
      </LocalizationProvider>
    </ThemeProvider>
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
