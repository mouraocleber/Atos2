import { Redirect } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useBiometric } from '../contexts/BiometricContext';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';
import React, { useEffect, useState } from 'react';

export default function Index() {
  const { user, loading, signOut } = useAuth();
  const { checkShouldLock } = useBiometric();

  // Estado local para aguardar a verificação de timeout (cold start)
  const [lockChecking, setLockChecking] = useState(true);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    // Só verifica quando o carregamento do AuthContext terminar
    if (loading) return;

    if (!user) {
      // Sem usuário logado: não há nada para checar
      setLockChecking(false);
      return;
    }

    // Usuário logado: verifica se o prazo de 3h foi ultrapassado (cold start)
    checkShouldLock().then(async (shouldLock) => {
      if (shouldLock) {
        // Prazo expirado → faz logout completo antes de redirecionar
        await signOut();
        setTimedOut(true);
      }
      setLockChecking(false);
    });
  }, [loading, user]);

  if (loading || lockChecking) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // Prazo expirado ou sem sessão → tela de login
  if (!user || timedOut) {
    return <Redirect href="/(auth)/login" />;
  }

  // Sessão válida e dentro do prazo → home
  return <Redirect href="/(tabs)/chat" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
  },
});
