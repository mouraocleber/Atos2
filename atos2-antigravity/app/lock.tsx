import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useBiometric } from '../contexts/BiometricContext';
import { useAuth } from '../contexts/AuthContext';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';
import api from '../services/api';

export default function LockScreen() {
  const router = useRouter();
  const { authenticate, isBiometricEnabled } = useBiometric();
  const { user, token, signOut } = useAuth();

  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswordInput, setShowPasswordInput] = useState(false);

  async function handleBiometric() {
    setLoading(true);
    const success = await authenticate('Confirme sua identidade para desbloquear o Atos2');
    setLoading(false);
    if (success) {
      router.replace('/(tabs)/chat');
    } else {
      // Biometria falhou → mostra campo de senha
      setShowPasswordInput(true);
    }
  }

  async function handlePasswordUnlock() {
    if (!password.trim()) {
      return Alert.alert('Atenção', 'Digite sua senha para continuar.');
    }
    setLoading(true);
    try {
      await api.post('/auth/verify-password', { password });
      router.replace('/(tabs)/chat');
    } catch (e: any) {
      Alert.alert('Senha incorreta', 'Verifique sua senha e tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    Alert.alert(
      'Sair da conta',
      'Deseja sair da sua conta? Você precisará fazer login novamente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Background Glows */}
      <View style={styles.glowBlue} pointerEvents="none" />
      <View style={styles.glowPurple} pointerEvents="none" />

      <View style={styles.content}>
        {/* Lock Icon */}
        <View style={styles.iconWrapper}>
          <Feather name="lock" size={48} color="#00F2FE" />
        </View>

        {/* Greeting */}
        <Text style={styles.title}>Olá, {user?.name?.split(' ')[0] ?? 'usuário'} 👋</Text>
        <Text style={styles.subtitle}>
          O Atos2 ficou inativo por mais de 3 horas.{'\n'}Confirme sua identidade para continuar.
        </Text>

        {/* Biometric Button */}
        {isBiometricEnabled && !showPasswordInput && (
          <TouchableOpacity
            style={styles.biometricBtn}
            onPress={handleBiometric}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Feather name="shield" size={22} color="#000" />
                <Text style={styles.biometricBtnText}>Usar Biometria</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Password fallback */}
        {(showPasswordInput || !isBiometricEnabled) && (
          <View style={styles.passwordSection}>
            {showPasswordInput && (
              <Text style={styles.fallbackHint}>
                Use sua senha para desbloquear:
              </Text>
            )}
            <TextInput
              style={styles.input}
              placeholder="Digite sua senha"
              placeholderTextColor="#6366F1"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={handlePasswordUnlock}
              returnKeyType="done"
              autoFocus={showPasswordInput || !isBiometricEnabled}
            />
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handlePasswordUnlock}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.submitBtnText}>Desbloquear</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Show password option if bio enabled but not yet showing */}
        {isBiometricEnabled && !showPasswordInput && (
          <TouchableOpacity
            style={styles.altLink}
            onPress={() => setShowPasswordInput(true)}
          >
            <Text style={styles.altLinkText}>Usar senha em vez disso</Text>
          </TouchableOpacity>
        )}

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutLink} onPress={handleSignOut}>
          <Feather name="log-out" size={14} color={Colors.error} />
          <Text style={styles.signOutText}>Sair da conta</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    position: 'relative',
    overflow: 'hidden',
  },
  glowBlue: {
    position: 'absolute',
    top: -50,
    left: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(0, 242, 254, 0.12)',
  },
  glowPurple: {
    position: 'absolute',
    bottom: -80,
    right: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(155, 81, 224, 0.12)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    zIndex: 10,
  },
  iconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(0, 242, 254, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 2,
    borderColor: 'rgba(0, 242, 254, 0.3)',
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: '#00F2FE',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    width: '100%',
    justifyContent: 'center',
  },
  biometricBtnText: {
    color: '#000',
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  fallbackHint: {
    color: Colors.dark.textSecondary,
    fontSize: FontSize.sm,
    marginBottom: Spacing.sm,
    alignSelf: 'flex-start',
  },
  passwordSection: {
    width: '100%',
    marginTop: Spacing.md,
  },
  input: {
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    color: '#fff',
    fontSize: FontSize.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: Spacing.md,
  },
  submitBtn: {
    backgroundColor: '#00F2FE',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: FontSize.md,
  },
  altLink: {
    marginTop: Spacing.lg,
  },
  altLinkText: {
    color: '#00F2FE',
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  signOutLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.xl,
  },
  signOutText: {
    color: Colors.error,
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
});
