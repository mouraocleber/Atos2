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

type Step = 'contact' | 'profile';

export default function RegisterScreen() {
  const { signUp, signInWithGoogle } = useAuth();
  const { t, setAppLanguage, language: currentLang } = useLocalization();
  const [step, setStep] = useState<Step>('contact');
  const [loading, setLoading] = useState(false);
  const [langSearch, setLangSearch] = useState('');
  const [showLangModal, setShowLangModal] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsType, setTermsType] = useState<'termos' | 'privacidade'>('termos');

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
  const [showPassword, setShowPassword] = useState(false);
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
      // Usa o fluxo completo de autenticação do AuthContext
      // que já tem o webClientId correto configurado
      await signInWithGoogle();
      // Se bem sucedido, navega direto para o app
      router.replace('/(tabs)/chat');
    } catch (error: any) {
      const code = (error as any)?.code;
      if (code === 'SIGN_IN_CANCELLED' || error.message === 'Login cancelado') {
        // Cancelado pelo usuário — sem mensagem
      } else {
        Alert.alert('Google Sign-In', error.message || 'Não foi possível entrar com o Google.');
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
      {/* Background Glows */}
      <View style={styles.glowBlue} pointerEvents="none" />
      <View style={styles.glowPurple} pointerEvents="none" />

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
              <Feather name="globe" size={16} color="#00F2FE" />
              <Text style={styles.headerLangCode}>{language.toUpperCase()}</Text>
              <Feather name="chevron-down" size={15} color="#00F2FE" />
            </TouchableOpacity>
          </View>

          {/* Modal de Busca de Idioma */}
          <Modal visible={showLangModal} animationType="slide" transparent={true}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Selecionar Idioma</Text>
                  <TouchableOpacity onPress={() => setShowLangModal(false)}>
                    <Feather name="x" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>

                {/* Barra de Busca Modal */}
                <View style={styles.searchBar}>
                  <Feather name="search" size={16} color="#6366F1" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Pesquisar idioma..."
                    placeholderTextColor="#6366F1"
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
                      <Feather name="globe" size={32} color={Colors.dark.textMuted} />
                      <Text style={styles.emptyText}>Nenhum idioma encontrado</Text>
                    </View>
                  )}
                />
              </View>
            </View>
          </Modal>

          {/* Modal de Termos de Uso e Privacidade */}
          <Modal visible={showTermsModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowTermsModal(false)}>
            <View style={[styles.modalContent, { height: '100%', paddingTop: Platform.OS === 'ios' ? 40 : 20 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {termsType === 'termos' ? 'Termos de Uso' : 'Política de Privacidade'}
                </Text>
                <TouchableOpacity onPress={() => setShowTermsModal(false)}>
                  <Feather name="x" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: Spacing.xl }}>
                {termsType === 'termos' ? (
                  <Text style={{ color: '#fff', lineHeight: 22 }}>
                    Para utilizar o Atos2 (carteira Global, marketplace e chat), você concorda que: {'\n\n'}
                    1. Fornecerá dados reais (PF/PJ) para viabilizar as transações financeiras. {'\n'}
                    2. As transferências internas são gratuitas, porém saques/repasses externos possuem taxas progressivas. {'\n'}
                    3. Você será punido (banimento ou suspensão de repasses) se cometer spam, fraude ou anúncio de produtos proibidos. {'\n'}
                    4. As conversões da moeda (Global - G) flutuam com as bolsas internacionais livremente.
                  </Text>
                ) : (
                  <Text style={{ color: '#fff', lineHeight: 22 }}>
                    Suas informações são tratadas rigorosamente confidenciais, baseando-se na LGPD Brasileira: {'\n\n'}
                    1. Rastreamos IPS e exigimos validações matemáticas de CPF/CNPJ contra fraudes. {'\n'}
                    2. Senhas e biometria recebem Hash de alta complexidade e não chegam cruas à nossa nuvem. {'\n'}
                    3. Fotos enviadas são criptografadas no servidor em cache temporário ou banco dedicado para seu uso único com seus contatos. {'\n'}
                    4. Logs de depósitos/saques são retidos legalmente na nuvem, sendo invioláveis.
                  </Text>
                )}
                <TouchableOpacity style={[styles.btnSubmit, { marginTop: 30 }]} onPress={() => setShowTermsModal(false)}>
                  <Text style={styles.btnSubmitText}>Ciente e Voltar</Text>
                </TouchableOpacity>
              </ScrollView>
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
                <FontAwesome name="google" size={20} color="#fff" />
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
                placeholderTextColor="#6366F1"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <TextInput
                style={styles.input}
                placeholder={t('phone') + ' (ex: 11999998888)'}
                placeholderTextColor="#6366F1"
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
                placeholderTextColor="#6366F1"
                value={name}
                onChangeText={setName}
              />
              <TextInput
                style={styles.input}
                placeholder={t('nickname')}
                placeholderTextColor="#6366F1"
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
                placeholderTextColor="#6366F1"
                value={cpf}
                onChangeText={setCpf}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder={t('cep')}
                placeholderTextColor="#6366F1"
                value={cep}
                onChangeText={setCep}
                keyboardType="numeric"
              />
              <View style={{ position: 'relative' }}>
                <TextInput
                  style={[styles.input, { paddingRight: 50 }]}
                  placeholder={t('password')}
                  placeholderTextColor="#6366F1"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={{ position: 'absolute', right: Spacing.md, top: 0, bottom: 0, justifyContent: 'center' }}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={{ fontSize: 20 }}>{showPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.checkboxContainer}>
                <TouchableOpacity onPress={() => setAgreedToTerms(!agreedToTerms)}>
                  <Feather 
                    name={agreedToTerms ? "check-square" : "square"} 
                    size={20} 
                    color={agreedToTerms ? '#00F2FE' : Colors.dark.textMuted} 
                  />
                </TouchableOpacity>
                <Text style={styles.checkboxText}>
                  Li e concordo com os <Text style={styles.linkText} onPress={() => { setTermsType('termos'); setShowTermsModal(true); }}>Termos de Uso</Text> e a <Text style={styles.linkText} onPress={() => { setTermsType('privacidade'); setShowTermsModal(true); }}>Política de Privacidade</Text>.
                </Text>
              </View>

              <TouchableOpacity 
                style={styles.btnSubmit} 
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#000" />
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
  keyboardView: { flex: 1, zIndex: 10 },
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
    color: '#fff',
    fontSize: FontSize.xxl,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.dark.textSecondary,
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  progressActive: {
    backgroundColor: '#00F2FE',
  },
  progressLine: {
    width: 30,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  form: {
    gap: Spacing.md,
  },
  // ---- Language selection styles ----
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
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
    backgroundColor: Colors.dark.surface,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: 'center',
    gap: 4,
  },
  langItemActive: {
    borderColor: '#00F2FE',
    backgroundColor: 'rgba(0, 242, 254, 0.15)',
  },
  langFlag: {
    fontSize: 28,
    lineHeight: 34,
  },
  langText: {
    color: Colors.dark.textSecondary,
    fontSize: FontSize.xs,
    fontWeight: '500',
    textAlign: 'center',
  },
  langTextActive: {
    color: '#00F2FE',
    fontWeight: '700',
  },
  emptySearch: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.sm,
  },
  emptyText: {
    color: Colors.dark.textMuted,
    fontSize: FontSize.sm,
  },

  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: '#fff',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    fontSize: FontSize.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  methodToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.dark.surface,
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
    backgroundColor: Colors.dark.surfaceLight,
  },
  methodBtnText: {
    color: Colors.dark.textMuted,
    fontWeight: '600',
  },
  methodBtnTextActive: {
    color: '#00F2FE',
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
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  separatorText: {
    marginHorizontal: Spacing.sm,
    color: Colors.dark.textMuted,
    fontSize: FontSize.sm,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B2039',
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  googleBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: FontSize.md,
  },
  typeBtn: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
  },
  typeBtnActive: {
    borderColor: '#00F2FE',
    backgroundColor: 'rgba(0, 242, 254, 0.15)',
  },
  typeBtnText: {
    color: Colors.dark.textMuted,
    fontSize: FontSize.sm,
  },
  typeBtnTextActive: {
    color: '#00F2FE',
    fontWeight: '600',
  },
  btnSubmit: {
    backgroundColor: '#00F2FE',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  btnSubmitText: {
    color: '#000',
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  btnBack: {
    padding: Spacing.md,
    alignItems: 'center',
  },
  btnBackText: {
    color: Colors.dark.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.xxl,
  },
  footerText: {
    color: Colors.dark.textSecondary,
    fontSize: FontSize.sm,
  },
  footerLink: {
    color: '#00F2FE',
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  headerLangBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: Spacing.md,
    backgroundColor: 'rgba(0, 242, 254, 0.15)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 24,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.3)',
  },
  headerLangCode: {
    fontSize: FontSize.md,
    color: '#00F2FE',
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(6, 8, 20, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0B2039',
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    padding: Spacing.lg,
    height: '80%',
    borderWidth: 1,
    borderColor: Colors.dark.border,
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
    color: '#fff',
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
    color: Colors.dark.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  linkText: {
    color: '#00F2FE',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
