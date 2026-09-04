import { Slot, useRouter, useSegments, usePathname } from 'expo-router';
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
import { AppState, AppStateStatus, Alert, Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ringtoneService } from '../services/RingtoneService';
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

interface IncomingCallData {
  from: string;
  fromName: string;
  type: 'audio' | 'video';
  callerLanguage?: string;
  roomId?: string;
}

/**
 * Escuta chamadas entrantes globalmente.
 * Se o usuário NÃO está na tela do chat com o chamador, exibe Modal global com foto, nome, som de toque e vibração.
 */
function GlobalCallHandler() {
  const { socket } = useSocket();
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!socket) return;

    const handleCallUser = (data: IncomingCallData) => {
      // Se já está na tela do chat com o chamador, o [id].tsx trata o evento
      if (pathnameRef.current === `/chat/${data.from}`) return;

      setIncomingCall(data);
      ringtoneService.startIncomingRingtone();
    };

    const handleHangUp = () => {
      ringtoneService.stopRingtone();
      setIncomingCall(null);
    };

    socket.on('callUser', handleCallUser);
    socket.on('hangUp', handleHangUp);

    return () => {
      socket.off('callUser', handleCallUser);
      socket.off('hangUp', handleHangUp);
    };
  }, [socket]);

  const handleAccept = () => {
    if (!incomingCall) return;
    const callData = incomingCall;
    ringtoneService.stopRingtone();
    setIncomingCall(null);

    router.push({
      pathname: '/chat/[id]',
      params: {
        id: callData.from,
        name: callData.fromName || 'Usuário',
        status: 'online',
        autoAcceptCall: callData.type,
      },
    });
  };

  const handleReject = () => {
    if (!incomingCall) return;
    socket?.emit('hangUp', { to: incomingCall.from, from: user?.id, roomId: incomingCall.roomId });
    ringtoneService.stopRingtone();
    setIncomingCall(null);
  };

  if (!incomingCall) return null;

  return (
    <Modal visible={!!incomingCall} animationType="slide" transparent statusBarTranslucent>
      <View style={globalCallStyles.modalOverlay}>
        <View style={globalCallStyles.modalContainer}>
          <View style={globalCallStyles.avatarCircle}>
            <Text style={globalCallStyles.avatarText}>
              {incomingCall.fromName?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
          
          <Text style={globalCallStyles.callerName}>{incomingCall.fromName || 'Usuário'}</Text>
          <Text style={globalCallStyles.callTypeLabel}>
            {incomingCall.type === 'video' ? '📹 Chamada de Vídeo Entrante' : '📞 Chamada de Áudio Entrante'}
          </Text>
          <Text style={globalCallStyles.secLabel}>Atos2 • Chamada Privada P2P</Text>

          <View style={globalCallStyles.actionsContainer}>
            <TouchableOpacity style={[globalCallStyles.btnAction, globalCallStyles.btnReject]} onPress={handleReject}>
              <Feather name="phone-off" size={28} color="#fff" />
              <Text style={globalCallStyles.btnText}>Rejeitar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[globalCallStyles.btnAction, globalCallStyles.btnAccept]} onPress={handleAccept}>
              <Feather name="phone" size={28} color="#fff" />
              <Text style={globalCallStyles.btnText}>Atender</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const globalCallStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: '#041527',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
  avatarCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 200, 87, 0.4)',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 54,
    fontWeight: '800',
  },
  callerName: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
  },
  callTypeLabel: {
    color: '#FFC857',
    fontSize: 16,
    fontWeight: '600',
  },
  secLabel: {
    color: '#94a3b8',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 40,
    marginTop: 48,
    alignItems: 'center',
  },
  btnAction: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  btnReject: {
    backgroundColor: '#ef4444',
  },
  btnAccept: {
    backgroundColor: '#22c55e',
  },
  btnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
});

/**
 * Exibe o WelcomeShowcase uma vez, após o login.
 */
function OnboardingGate() {
  const { token, isLinkAccess } = useAuth();
  const { showcaseDone, markShowcaseDone } = useOnboarding();
  const [showShowcase, setShowShowcase] = useState(false);

  useEffect(() => {
    if (isLinkAccess) {
      setShowShowcase(false);
      return;
    }
    if (token && !showcaseDone) {
      // Pequeno delay para a tela principal já estar montada
      const t = setTimeout(() => setShowShowcase(true), 600);
      return () => clearTimeout(t);
    }
  }, [token, showcaseDone, isLinkAccess]);

  const handleDone = async () => {
    setShowShowcase(false);
    await markShowcaseDone();
  };

  if (isLinkAccess) return null;

  return <WelcomeShowcase visible={showShowcase} onDone={handleDone} />;
}


export default function RootLayout() {
  return (
    <SafeAreaProvider>
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
    </SafeAreaProvider>
  );
}
