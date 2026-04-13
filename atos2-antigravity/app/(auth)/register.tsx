import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator, Image, FlatList, Modal
} from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import { LANGUAGES, LanguageCode } from '../../constants/translations';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { isValidEmail, isValidPhone, isValidCPF, isValidCNPJ } from '../../utils/validators';
import { Feather, FontAwesome } from '@expo/vector-icons';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '', // Configured via EAS / Env
});

type Step = 'contact' | 'profile';

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const { t, setAppLanguage, language: currentLang } = useLocalization();
  const [step, setStep] = useState<Step>('contact');
  const [loading, setLoading] = useState(false);
  const [langSearch, setLangSearch] = useState('');
  const [showLangModal, setShowLangModal] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Contact step
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

  const filteredLanguages = useMemo(() => {
    const q = langSearch.trim().toLowerCase();
    if (!q) return LANGUAGES;
    return LANGUAGES.filter(l =>
      l.label.toLowerCase().includes(q) ||
      l.english.toLowerCase().includes(q) ||
      l.code.toLowerCase().includes(q)
    );
  }, [langSearch]);

  async function handleSelectLanguage(code: LanguageCode) {
    setLanguage(code);
    await setAppLanguage(code);
    setShowLangModal(false);
  }

  function handleNextStep() {
    if (!email.trim() || !isValidEmail(email.trim())) {
      Alert.alert(t('signup_title'), 'Por favor, insira um e-mail válido.');
      return;
    }
    if (!phone.trim() || !isValidPhone(phone.trim())) {
      Alert.alert(t('signup_title'), 'Por favor, insira um telefone válido com código de área.');
      return;
    }
    setStep('profile');
  }

  async function handleGoogleSignIn() {
    try {
      setLoading(true);
      await GoogleSignin.hasPlayServices();
      const result = await GoogleSignin.signIn();
      const user = result.data ? result.data.user : (result as any).user;
      
      if (user) {
        setContactMethod('email');
        setEmail(user.email);
        setName(user.name || '');
        setStep('profile');
      }
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // Cancelado pelo usuário
      } else {
        Alert.alert('Google Sign-In', 'Não foi possivel concluir o login com o Google.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    if (!agreedToTerms) {
      Alert.alert(t('signup_title'), 'Você precisa aceitar os Termos de Uso e a Política de Privacidade para continuar.');
      return;
    }

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
        email: email.trim(),
        phone: phone.trim(),
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
              {step === 'contact' ? t('contact_method') : t('profile_title')}
            </Text>

            {/* Botão de idioma centralizado abaixo do subtítulo */}
            <TouchableOpacity style={styles.headerLangBtn} onPress={() => setShowLangModal(true)}>
              <Feather name="globe" size={16} color={Colors.primary} />
              <Text style={styles.headerLangCode}>{language.toUpperCase()}</Text>
              <Feather name="chevron-down" size={15} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Modal de Busca de Idioma */}
          <Modal visible={showLangModal} animationType="slide" transparent={true}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Selecionar Idioma</Text>
                  <TouchableOpacity onPress={() => setShowLangModal(false)}>
                    <Feather name="x" size={24} color={Colors.light.text} />
                  </TouchableOpacity>
                </View>

                {/* Barra de Busca Modal */}
                <View style={styles.searchBar}>
                  <Feather name="search" size={16} color={Colors.light.textMuted} style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Pesquisar idioma..."
                    placeholderTextColor={Colors.light.textMuted}
                    value={langSearch}
                    onChangeText={setLangSearch}
                    autoCorrect={false}
                  />
                </View>

                <FlatList
                  data={filteredLanguages}
                  keyExtractor={item => item.code}
                  numColumns={2}
                  columnWrapperStyle={{ gap: Spacing.sm }}
                  contentContainerStyle={{ gap: Spacing.sm, paddingBottom: Spacing.xl }}
                  renderItem={({ item: lang }) => (
                    <TouchableOpacity
                      style={[
                        styles.langItem,
                        language === lang.code && styles.langItemActive
                      ]}
                      onPress={() => handleSelectLanguage(lang.code as LanguageCode)}
                      activeOpacity={0.75}
                    >
                      <Text style={[
                        styles.langText,
                        language === lang.code && styles.langTextActive
                      ]} numberOfLines={1}>
                        {lang.label}
                      </Text>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={() => (
                    <View style={styles.emptySearch}>
                      <Feather name="globe" size={32} color={Colors.light.textMuted} />
                      <Text style={styles.emptyText}>Nenhum idioma encontrado</Text>
                    </View>
                  )}
                />
              </View>
            </View>
          </Modal>

          {/* Progress */}
          <View style={styles.progress}>
            <View style={[styles.progressDot, step === 'contact' || step === 'profile' ? styles.progressActive : null]} />
            <View style={styles.progressLine} />
            <View style={[styles.progressDot, step === 'profile' ? styles.progressActive : null]} />
          </View>

          {/* Step 1: Contact */}
          {step === 'contact' && (
            <View style={styles.form}>

              <TouchableOpacity 
                style={styles.googleBtn} 
                onPress={handleGoogleSignIn}
                disabled={loading}
              >
                <FontAwesome name="google" size={20} color="#DB4437" />
                <Text style={styles.googleBtnText}>Continuar com o Google</Text>
              </TouchableOpacity>

              <View style={styles.socialSeparator}>
                <View style={styles.separatorLine} />
                <Text style={styles.separatorText}>ou preencha abaixo</Text>
                <View style={styles.separatorLine} />
              </View>

              <TextInput
                style={styles.input}
                placeholder={t('email')}
                placeholderTextColor={Colors.light.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <TextInput
                style={styles.input}
                placeholder={t('phone') + ' (ex: 11999998888)'}
                placeholderTextColor={Colors.light.textMuted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />

              <TouchableOpacity style={styles.btnSubmit} onPress={handleNextStep}>
                <Text style={styles.btnSubmitText}>{t('next')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.btnBack} onPress={() => router.back()}>
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
                style={styles.checkboxContainer} 
                onPress={() => setAgreedToTerms(!agreedToTerms)}
              >
                <Feather 
                  name={agreedToTerms ? "check-square" : "square"} 
                  size={20} 
                  color={agreedToTerms ? Colors.primary : Colors.light.textMuted} 
                />
                <Text style={styles.checkboxText}>
                  Li e concordo com os <Text style={styles.linkText}>Termos de Uso</Text> e a <Text style={styles.linkText}>Política de Privacidade</Text>.
                </Text>
              </TouchableOpacity>

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
  // ---- Language selection styles ----
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: Colors.light.text,
    fontSize: FontSize.sm,
    paddingVertical: 0,
  },
  langGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  langItem: {
    width: '47.5%',
    backgroundColor: Colors.light.surface,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
    alignItems: 'center',
    gap: 4,
  },
  langItemActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '12',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  langFlag: {
    fontSize: 28,
    lineHeight: 34,
  },
  langText: {
    color: Colors.light.textSecondary,
    fontSize: FontSize.xs,
    fontWeight: '500',
    textAlign: 'center',
  },
  langTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  emptySearch: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.sm,
  },
  emptyText: {
    color: Colors.light.textMuted,
    fontSize: FontSize.sm,
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
  socialSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.sm,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.light.border,
  },
  separatorText: {
    marginHorizontal: Spacing.sm,
    color: Colors.light.textMuted,
    fontSize: FontSize.sm,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  googleBtnText: {
    color: '#333',
    fontWeight: '600',
    fontSize: FontSize.md,
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
  headerLangBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: Spacing.md,
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl || 24,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  headerLangCode: {
    fontSize: FontSize.md,
    color: Colors.primary,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    padding: Spacing.lg,
    height: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.light.text,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.sm,
    gap: Spacing.sm,
    paddingRight: Spacing.md,
  },
  checkboxText: {
    fontSize: FontSize.xs,
    color: Colors.light.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  linkText: {
    color: Colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
