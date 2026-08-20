import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

export default function VerifyOtpScreen() {
  const { verifyOtp, resendOtp, pendingAuthData } = useAuth();
  const { t } = useLocalization();
  const params = useLocalSearchParams<{ mode?: string; email?: string; phone?: string }>();

  const isDeviceChange = params.mode === 'new_device';
  const emailTarget = params.email || pendingAuthData?.email || '';
  const phoneTarget = params.phone || pendingAuthData?.phone || '';

  const [otpEmail, setOtpEmail] = useState(['', '', '', '', '', '']);
  const [otpSms, setOtpSms] = useState(['', '', '', '', '', '']);
  const [activeTab, setActiveTab] = useState<'email' | 'sms'>('email');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timer, setTimer] = useState(60);

  const emailInputsRef = useRef<Array<TextInput | null>>([]);
  const smsInputsRef = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  function handleOtpChange(
    value: string,
    index: number,
    type: 'email' | 'sms'
  ) {
    const cleanValue = value.replace(/\D/g, '');
    const currentOtp = type === 'email' ? [...otpEmail] : [...otpSms];
    const setCurrentOtp = type === 'email' ? setOtpEmail : setOtpSms;
    const inputsRef = type === 'email' ? emailInputsRef : smsInputsRef;

    if (cleanValue.length > 1) {
      // Trata colar de código com múltiplos dígitos
      const pasted = cleanValue.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        currentOtp[i] = pasted[i] || '';
      }
      setCurrentOtp(currentOtp);
      const nextFocus = Math.min(pasted.length, 5);
      inputsRef.current[nextFocus]?.focus();
      return;
    }

    currentOtp[index] = cleanValue;
    setCurrentOtp(currentOtp);

    // Auto-avanço para o próximo input
    if (cleanValue && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleKeyPress(
    e: any,
    index: number,
    type: 'email' | 'sms'
  ) {
    const currentOtp = type === 'email' ? otpEmail : otpSms;
    const inputsRef = type === 'email' ? emailInputsRef : smsInputsRef;

    if (e.nativeEvent.key === 'Backspace' && !currentOtp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  async function handleVerify() {
    const codeEmailStr = otpEmail.join('');
    const codeSmsStr = otpSms.join('');

    if (codeEmailStr.length < 6) {
      Alert.alert('Atenção', 'Por favor, digite o código de 6 dígitos recebido por e-mail.');
      return;
    }

    if (codeSmsStr.length < 6) {
      Alert.alert('Atenção', 'Por favor, digite o código de 6 dígitos recebido por SMS.');
      return;
    }

    setLoading(true);
    try {
      await verifyOtp(codeEmailStr, codeSmsStr);
      Alert.alert('Sucesso', 'Dispositivo verificado com sucesso!', [
        {
          text: 'Continuar',
          onPress: () => router.replace('/(tabs)/chat'),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Erro de Verificação', error.message || 'Código inválido ou expirado.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (timer > 0) return;
    setResendLoading(true);
    try {
      await resendOtp();
      setTimer(60);
      Alert.alert('Código Reenviado', 'Um novo código foi enviado para seu e-mail e SMS.');
    } catch (error: any) {
      Alert.alert('Erro ao Reenviar', error.message || 'Não foi possível reenviar o código.');
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.title}>
              {isDeviceChange ? 'Novo Aparelho Detectado' : 'Confirmação de Segurança'}
            </Text>
            <Text style={styles.subtitle}>
              {isDeviceChange
                ? 'Para sua proteção, digite os códigos de 6 dígitos enviados ao seu E-mail e SMS para autorizar este dispositivo.'
                : 'Enviamos os códigos de verificação para o seu e-mail e telefone de cadastro.'}
            </Text>
          </View>

          {/* Abas E-mail / SMS */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'email' && styles.tabButtonActive]}
              onPress={() => setActiveTab('email')}
            >
              <Feather name="mail" size={18} color={activeTab === 'email' ? Colors.primary : Colors.light.textMuted} />
              <Text style={[styles.tabText, activeTab === 'email' && styles.tabTextActive]}>
                E-mail
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'sms' && styles.tabButtonActive]}
              onPress={() => setActiveTab('sms')}
            >
              <Feather name="message-square" size={18} color={activeTab === 'sms' ? Colors.primary : Colors.light.textMuted} />
              <Text style={[styles.tabText, activeTab === 'sms' && styles.tabTextActive]}>
                SMS
              </Text>
            </TouchableOpacity>
          </View>

          {/* Seção Código E-mail */}
          <View style={styles.codeCard}>
            <View style={styles.cardHeader}>
              <Feather name={activeTab === 'email' ? 'mail' : 'message-square'} size={20} color={Colors.primary} />
              <Text style={styles.cardTitle}>
                {activeTab === 'email' ? `Código enviado para: ${emailTarget || 'Seu e-mail'}` : `Código enviado para: ${phoneTarget || 'Seu telefone'}`}
              </Text>
            </View>

            <View style={styles.otpRow}>
              {(activeTab === 'email' ? otpEmail : otpSms).map((digit, idx) => (
                <TextInput
                  key={idx}
                  ref={(ref) => {
                    if (activeTab === 'email') {
                      emailInputsRef.current[idx] = ref;
                    } else {
                      smsInputsRef.current[idx] = ref;
                    }
                  }}
                  style={[styles.otpInput, digit !== '' && styles.otpInputFilled]}
                  value={digit}
                  onChangeText={(val) => handleOtpChange(val, idx, activeTab)}
                  onKeyPress={(e) => handleKeyPress(e, idx, activeTab)}
                  keyboardType="numeric"
                  maxLength={6}
                  selectTextOnFocus
                  autoFocus={idx === 0}
                />
              ))}
            </View>
          </View>

          {/* Botão de Verificação */}
          <TouchableOpacity
            style={[styles.verifyButton, loading && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.verifyButtonText}>Confirmar e Autorizar</Text>
            )}
          </TouchableOpacity>

          {/* Reenvio e Contagem */}
          <View style={styles.resendContainer}>
            {timer > 0 ? (
              <Text style={styles.timerText}>
                Reenviar código em <Text style={styles.timerHighlight}>{timer}s</Text>
              </Text>
            ) : (
              <TouchableOpacity onPress={handleResend} disabled={resendLoading}>
                {resendLoading ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Text style={styles.resendText}>Não recebeu o código? Reenviar agora</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.backButtonText}>Voltar para o Login</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justify: 'center',
    padding: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoImage: {
    width: 90,
    height: 90,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.title,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: '#a0aec0',
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 20,
    paddingHorizontal: Spacing.md,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1a1f3d',
    borderRadius: BorderRadius.md,
    padding: 4,
    marginBottom: Spacing.lg,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: BorderRadius.sm,
  },
  tabButtonActive: {
    backgroundColor: '#2a3260',
  },
  tabText: {
    color: '#a0aec0',
    fontWeight: '600',
    fontSize: FontSize.sm,
  },
  tabTextActive: {
    color: '#ffffff',
  },
  codeCard: {
    backgroundColor: '#141a38',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: '#2a3260',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.md,
  },
  cardTitle: {
    color: '#e2e8f0',
    fontSize: FontSize.xs,
    fontWeight: '600',
    flex: 1,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  otpInput: {
    width: 44,
    height: 52,
    backgroundColor: '#0a0e27',
    borderRadius: BorderRadius.sm,
    borderWidth: 1.5,
    borderColor: '#2a3260',
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  otpInputFilled: {
    borderColor: Colors.primary,
    backgroundColor: '#1a234d',
  },
  verifyButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: Spacing.md,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  verifyButtonText: {
    color: '#ffffff',
    fontSize: FontSize.md,
    fontWeight: 'bold',
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  timerText: {
    color: '#a0aec0',
    fontSize: FontSize.sm,
  },
  timerHighlight: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  resendText: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  backButtonText: {
    color: '#a0aec0',
    fontSize: FontSize.sm,
  },
});
