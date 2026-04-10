import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator, Image
} from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import { LANGUAGES, LanguageCode } from '../../constants/translations';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { isValidEmail, isValidPhone, isValidCPF, isValidCNPJ } from '../../utils/validators';

type Step = 'language' | 'contact' | 'profile';

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const { t, setAppLanguage, language: currentLang } = useLocalization();
  const [step, setStep] = useState<Step>('language');
  const [loading, setLoading] = useState(false);

  // Contact step
  const [contactMethod, setContactMethod] = useState<'phone' | 'email'>('email');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Profile step
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [personType, setPersonType] = useState<'PF' | 'PJ'>('PF');
  const [cpf, setCpf] = useState('');
  const [cep, setCep] = useState('');
  const [password, setPassword] = useState('');
  const [language, setLanguage] = useState<LanguageCode>('pt-BR');

  async function handleSelectLanguage(code: LanguageCode) {
    setLanguage(code);
    await setAppLanguage(code);
    setStep('contact');
  }

  function handleNextStep() {
    if (contactMethod === 'email') {
      if (!email.trim() || !isValidEmail(email.trim())) {
        Alert.alert(t('signup_title'), 'Por favor, insira um e-mail válido.');
        return;
      }
    } else {
      if (!phone.trim() || !isValidPhone(phone.trim())) {
        Alert.alert(t('signup_title'), 'Por favor, insira um telefone válido com código de área.');
        return;
      }
    }
    setStep('profile');
  }

  async function handleRegister() {
    if (!name.trim() || !nickname.trim() || !cpf.trim() || !cep.trim() || !password.trim()) {
      Alert.alert(t('signup_title'), t('signup_subtitle'));
      return;
    }

    if (personType === 'PF' && !isValidCPF(cpf.trim())) {
      Alert.alert(t('signup_title'), 'Atenção. O CPF informado não é válido da Receita Federal.');
      return;
    }

    if (personType === 'PJ' && !isValidCNPJ(cpf.trim())) {
      Alert.alert(t('signup_title'), 'Atenção. O CNPJ informado não é válido da Receita Federal.');
      return;
    }

    if (password.length < 8) {
      Alert.alert(t('signup_title'), t('password_hint'));
      return;
    }

    setLoading(true);
    try {
      await signUp({
        email: contactMethod === 'email' ? email.trim() : `${nickname.trim() || 'user'}@atos2.com`,
        phone: contactMethod === 'phone' ? phone.trim() : '11000000000',
        nickname: nickname.trim(),
        name: name.trim(),
        personType,
        cpf: cpf.trim(),
        cep: cep.trim(),
        password,
        preferredLanguage: language,
      });
      router.replace('/(tabs)/chat');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Falha ao criar conta');
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
          {/* Header */}
          <View style={styles.header}>
            <Image 
              source={require('../../assets/logo.png')} 
              style={styles.logoImage} 
              resizeMode="contain" 
            />
            <Text style={styles.title}>{t('signup_title')}</Text>
            <Text style={styles.subtitle}>
              {step === 'language' ? t('signup_subtitle') : 
               step === 'contact' ? t('contact_method') : t('profile_title')}
            </Text>
          </View>

          {/* Step 0: Language Selection */}
          {step === 'language' && (
            <View style={styles.form}>
              <Text style={styles.label}>{t('select_language')}</Text>
              {LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.langItem,
                    language === lang.code && styles.langItemActive
                  ]}
                  onPress={() => handleSelectLanguage(lang.code as LanguageCode)}
                >
                  <Text style={[
                    styles.langText,
                    language === lang.code && styles.langTextActive
                  ]}>
                    {lang.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Progress */}
          {step !== 'language' && (
            <View style={styles.progress}>
              <View style={[styles.progressDot, step === 'contact' || step === 'profile' ? styles.progressActive : null]} />
              <View style={styles.progressLine} />
              <View style={[styles.progressDot, step === 'profile' ? styles.progressActive : null]} />
            </View>
          )}

          {/* Step 1: Contact */}
          {step === 'contact' && (
            <View style={styles.form}>
              <View style={styles.methodToggle}>
                <TouchableOpacity
                  style={[styles.methodBtn, contactMethod === 'email' && styles.methodBtnActive]}
                  onPress={() => setContactMethod('email')}
                >
                  <Text style={[styles.methodBtnText, contactMethod === 'email' && styles.methodBtnTextActive]}>{t('email')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.methodBtn, contactMethod === 'phone' && styles.methodBtnActive]}
                  onPress={() => setContactMethod('phone')}
                >
                  <Text style={[styles.methodBtnText, contactMethod === 'phone' && styles.methodBtnTextActive]}>{t('phone')}</Text>
                </TouchableOpacity>
              </View>

              {contactMethod === 'email' ? (
                <TextInput
                  style={styles.input}
                  placeholder={t('email')}
                  placeholderTextColor={Colors.light.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              ) : (
                <TextInput
                  style={styles.input}
                  placeholder={t('phone')}
                  placeholderTextColor={Colors.light.textMuted}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              )}

              <TouchableOpacity style={styles.btnSubmit} onPress={handleNextStep}>
                <Text style={styles.btnSubmitText}>{t('next')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.btnBack} onPress={() => setStep('language')}>
                <Text style={styles.btnBackText}>{t('back')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 'profile' && (
            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder={t('name')}
                placeholderTextColor={Colors.light.textMuted}
                value={name}
                onChangeText={setName}
              />
              <TextInput
                style={styles.input}
                placeholder={t('nickname')}
                placeholderTextColor={Colors.light.textMuted}
                value={nickname}
                onChangeText={setNickname}
                autoCapitalize="none"
              />
              
              <View style={styles.typeToggle}>
                <TouchableOpacity
                  style={[styles.typeBtn, personType === 'PF' && styles.typeBtnActive]}
                  onPress={() => setPersonType('PF')}
                >
                  <Text style={[styles.typeBtnText, personType === 'PF' && styles.typeBtnTextActive]}>{t('individual')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeBtn, personType === 'PJ' && styles.typeBtnActive]}
                  onPress={() => setPersonType('PJ')}
                >
                  <Text style={[styles.typeBtnText, personType === 'PJ' && styles.typeBtnTextActive]}>{t('corporate')}</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                placeholder={t('cpf')}
                placeholderTextColor={Colors.light.textMuted}
                value={cpf}
                onChangeText={setCpf}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder={t('cep')}
                placeholderTextColor={Colors.light.textMuted}
                value={cep}
                onChangeText={setCep}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder={t('password')}
                placeholderTextColor={Colors.light.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              
              <TouchableOpacity 
                style={styles.btnSubmit} 
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.light.text} />
                ) : (
                  <Text style={styles.btnSubmitText}>{t('register')}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.btnBack} 
                onPress={() => setStep('contact')}
                disabled={loading}
              >
                <Text style={styles.btnBackText}>{t('back')}</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('already_have_account')} </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={styles.footerLink}>{t('login')}</Text>
              </TouchableOpacity>
            </Link>
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
  keyboardView: { flex: 1 },
  scrollContent: {
    padding: Spacing.xl,
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  logoImage: {
    width: 100,
    height: 100,
    marginBottom: Spacing.lg,
  },
  title: {
    color: Colors.primary,
    fontSize: FontSize.xxl,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.light.textSecondary,
    fontSize: FontSize.md,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  progress: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xxl,
    gap: Spacing.sm,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.light.surfaceLight,
  },
  progressActive: {
    backgroundColor: Colors.primary,
  },
  progressLine: {
    width: 30,
    height: 2,
    backgroundColor: Colors.light.surfaceLight,
  },
  form: {
    gap: Spacing.md,
  },
  langItem: {
    backgroundColor: Colors.light.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  langItemActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  langText: {
    color: Colors.light.textSecondary,
    fontSize: FontSize.md,
    fontWeight: '500',
    textAlign: 'center',
  },
  langTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  input: {
    backgroundColor: Colors.light.surface,
    color: Colors.light.text,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    fontSize: FontSize.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  methodToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.light.surface,
    borderRadius: BorderRadius.md,
    padding: 4,
    marginBottom: Spacing.sm,
  },
  methodBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  methodBtnActive: {
    backgroundColor: Colors.light.surfaceLight,
  },
  methodBtnText: {
    color: Colors.light.textMuted,
    fontWeight: '600',
  },
  methodBtnTextActive: {
    color: Colors.primary,
  },
  typeToggle: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xs,
  },
  typeBtn: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.light.border,
    alignItems: 'center',
  },
  typeBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  typeBtnText: {
    color: Colors.light.textMuted,
    fontSize: FontSize.sm,
  },
  typeBtnTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  btnSubmit: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.md,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnSubmitText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  btnBack: {
    padding: Spacing.md,
    alignItems: 'center',
  },
  btnBackText: {
    color: Colors.light.textMuted,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.xxl,
  },
  footerText: {
    color: Colors.light.textSecondary,
    fontSize: FontSize.sm,
  },
  footerLink: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
});
