import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator, Image
} from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const { t } = useLocalization();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert(t('attention'), t('fill_all_fields'));
      return;
    }

    setLoading(true);
    try {
      await signIn(email.trim(), password);
      router.replace('/(tabs)/chat');
    } catch (error: any) {
      Alert.alert(t('error'), error.message || t('login_failed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo / Header */}
          <View style={styles.header}>
            <Image 
              source={require('../../assets/logo.png')} 
              style={styles.logoImage} 
              resizeMode="contain" 
            />
            <Text style={styles.title}>Atos2</Text>
            <Text style={styles.subtitle}>{t('connect_with_world')}</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>📧 {t('email')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('email_placeholder')}
                placeholderTextColor={Colors.light.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>🔒 {t('password')}</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.light.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>{t('login')}</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>{t('dont_have_account')}</Text>
              <Link href="/(auth)/register" asChild>
                <TouchableOpacity>
                  <Text style={styles.registerLink}>{t('create_account')}</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  logoImage: {
    width: 120,
    height: 120,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.title,
    fontWeight: '800',
    color: Colors.light.text,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.light.textSecondary,
    marginTop: Spacing.xs,
  },
  form: {
    backgroundColor: Colors.light.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  label: {
    color: Colors.light.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  input: {
    backgroundColor: Colors.light.surfaceLight,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    color: Colors.light.text,
    fontSize: FontSize.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: Spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  eyeIcon: {
    fontSize: 20,
  },
  loginButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  footerText: {
    color: Colors.light.textSecondary,
    fontSize: FontSize.sm,
  },
  registerLink: {
    color: Colors.secondary,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
});
