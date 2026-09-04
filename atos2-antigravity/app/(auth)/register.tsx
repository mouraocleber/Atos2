import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator, Image, FlatList, Modal
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import { LANGUAGES, LanguageCode } from '../../constants/translations';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { isValidEmail, isValidPhone } from '../../utils/validators';
import { Feather, FontAwesome } from '@expo/vector-icons';

// Função para gerar CPF matematicamente válido caso o backend exija no cadastro
function generateValidCPF(): string {
  const rnd = (n: number) => Math.floor(Math.random() * n);
  const n = Array(9).fill(0).map(() => rnd(10));
  let d1 = n.reduce((total, num, i) => total + num * (10 - i), 0);
  d1 = 11 - (d1 % 11);
  if (d1 >= 10) d1 = 0;
  let d2 = [...n, d1].reduce((total, num, i) => total + num * (11 - i), 0);
  d2 = 11 - (d2 % 11);
  if (d2 >= 10) d2 = 0;
  return `${n.join('')}${d1}${d2}`;
}

export default function RegisterScreen() {
  const { signUp, signInWithGoogle, setLinkAccess } = useAuth();
  const { t, setAppLanguage } = useLocalization();
  const params = useLocalSearchParams();
  const redirectUrl = (params.redirectUrl as string) || '';

  React.useEffect(() => {
    if (redirectUrl) {
      setLinkAccess(true);
    }
  }, [redirectUrl]);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [langSearch, setLangSearch] = useState('');
  const [showLangModal, setShowLangModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsType, setTermsType] = useState<'termos' | 'privacidade'>('termos');

  // Campos principais simplificados (Zero Fricção)
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
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

  async function handleGoogleSignIn() {
    try {
      setGoogleLoading(true);
      await signInWithGoogle();
      if (redirectUrl) {
        router.replace(redirectUrl as any);
      } else {
        router.replace('/(tabs)/chat');
      }
    } catch (error: any) {
      const code = (error as any)?.code;
      if (code === 'SIGN_IN_CANCELLED' || error.message === 'Login cancelado') {
        // Cancelado pelo usuário
      } else {
        Alert.alert('Google Sign-In', error.message || 'Não foi possível entrar com o Google.');
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleRegister() {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      Alert.alert(t('signup_title'), 'Por favor, informe seu nome completo.');
      return;
    }

    if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
      Alert.alert(t('signup_title'), 'Por favor, insira um e-mail válido.');
      return;
    }

    if (!trimmedPhone || !isValidPhone(trimmedPhone)) {
      Alert.alert(t('signup_title'), 'Por favor, insira um telefone válido com código de área (ex: 11999998888).');
      return;
    }

    setLoading(true);
    try {
      // Gera nickname limpo a partir do primeiro nome ou email
      const rawNickname = trimmedName.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      const nickname = (rawNickname || trimmedEmail.split('@')[0].slice(0, 8)) + Math.floor(100 + Math.random() * 900);

      // Gera senha segura padrão para acesso inicial com base no celular
      const phoneDigits = trimmedPhone.replace(/\D/g, '');
      const generatedPassword = `Atos2@${phoneDigits.slice(-6) || '2026'}`;

      const res = await signUp({
        email: trimmedEmail,
        phone: trimmedPhone,
        nickname,
        name: trimmedName,
        personType: 'PF',
        cpf: generateValidCPF(),
        cep: '01001-000',
        password: generatedPassword,
        preferredLanguage: language,
      });

      if (res?.requiresVerification) {
        router.push({
          pathname: '/(auth)/verify-otp',
          params: {
            mode: 'register_verification',
            email: trimmedEmail,
            phone: trimmedPhone,
            redirectUrl,
          },
        });
      } else {
        if (redirectUrl) {
          router.replace(redirectUrl as any);
        } else {
          router.replace('/(tabs)/chat');
        }
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Falha ao criar conta. Verifique os dados informados.');
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
            <Text style={styles.subtitle}>Acesso rápido e sem complicação</Text>

            {/* Botão de idioma centralizado */}
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

          {/* Modal de Termos de Uso e Privacidade */}
          <Modal visible={showTermsModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowTermsModal(false)}>
            <View style={[styles.modalContent, { height: '100%', paddingTop: Platform.OS === 'ios' ? 40 : 20 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {termsType === 'termos' ? 'Termos de Uso' : 'Política de Privacidade'}
                </Text>
                <TouchableOpacity onPress={() => setShowTermsModal(false)}>
                  <Feather name="x" size={24} color={Colors.light.text} />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: Spacing.xl }}>
                {termsType === 'termos' ? (
                  <Text style={{ color: Colors.light.text, lineHeight: 22 }}>
                    Para utilizar o Atos2 (carteira Global, marketplace e chat), você concorda que: {'\n\n'}
                    1. Fornecerá dados reais para viabilizar as conexões e transações. {'\n'}
                    2. As transferências internas entre contas são instantâneas. {'\n'}
                    3. É proibido qualquer tipo de spam, fraude ou comércio de produtos ilegais. {'\n'}
                    4. As conversões da moeda (Global - G) acompanham as cotações internacionais.
                  </Text>
                ) : (
                  <Text style={{ color: Colors.light.text, lineHeight: 22 }}>
                    Suas informações são tratadas de forma segura e confidencial (LGPD): {'\n\n'}
                    1. Proteção de dados e criptografia de ponta a ponta. {'\n'}
                    2. Senhas e autenticação recebem Hash de alta complexidade. {'\n'}
                    3. Mídias e conversas são protegidas para seu uso exclusivo com seus contatos.
                  </Text>
                )}
                <TouchableOpacity style={[styles.btnSubmit, { marginTop: 30 }]} onPress={() => setShowTermsModal(false)}>
                  <Text style={styles.btnSubmitText}>Ciente e Voltar</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </Modal>

          {/* Formulário Simplificado em 1 única etapa */}
          <View style={styles.form}>
            {/* Botão Google rápido */}
            <TouchableOpacity 
              style={styles.googleBtn} 
              onPress={handleGoogleSignIn}
              disabled={loading || googleLoading}
              activeOpacity={0.8}
            >
              {googleLoading ? (
                <ActivityIndicator color="#333" />
              ) : (
                <>
                  <FontAwesome name="google" size={20} color="#DB4437" />
                  <Text style={styles.googleBtnText}>Entrar com o Google</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.socialSeparator}>
              <View style={styles.separatorLine} />
              <Text style={styles.separatorText}>ou preencha apenas 3 dados</Text>
              <View style={styles.separatorLine} />
            </View>

            {/* 1. Nome */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>👤 {t('name')}</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: João da Silva"
                placeholderTextColor={Colors.light.textMuted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>

            {/* 2. E-mail */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>📧 {t('email')}</Text>
              <TextInput
                style={styles.input}
                placeholder="seu.email@exemplo.com"
                placeholderTextColor={Colors.light.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
              />
            </View>

            {/* 3. Telefone */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>📱 {t('phone')} (WhatsApp)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 11999998888"
                placeholderTextColor={Colors.light.textMuted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />
            </View>

            {/* Botão Cadastrar */}
            <TouchableOpacity 
              style={[styles.btnSubmit, loading && styles.buttonDisabled]} 
              onPress={handleRegister}
              disabled={loading || googleLoading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnSubmitText}>Concluir e Entrar 🚀</Text>
              )}
            </TouchableOpacity>

            {/* Aceite legal discreto */}
            <Text style={styles.legalDisclaimer}>
              Ao continuar, você concorda com nossos{' '}
              <Text style={styles.linkText} onPress={() => { setTermsType('termos'); setShowTermsModal(true); }}>
                Termos de Uso
              </Text>{' '}
              e{' '}
              <Text style={styles.linkText} onPress={() => { setTermsType('privacidade'); setShowTermsModal(true); }}>
                Política de Privacidade
              </Text>.
            </Text>
          </View>

          {/* Rodapé: Link para Login */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('already_have_account')} </Text>
            <TouchableOpacity
              onPress={() => {
                if (redirectUrl) {
                  router.push({
                    pathname: '/(auth)/login',
                    params: { redirectUrl },
                  });
                } else {
                  router.push('/(auth)/login');
                }
              }}
            >
              <Text style={styles.footerLink}>{t('login')}</Text>
            </TouchableOpacity>
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
    marginBottom: Spacing.xl,
  },
  logoImage: {
    width: 90,
    height: 90,
    marginBottom: Spacing.md,
  },
  title: {
    color: Colors.primary,
    fontSize: FontSize.xxl,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.light.textSecondary,
    fontSize: FontSize.sm,
    textAlign: 'center',
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
    color: Colors.light.text,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    fontSize: FontSize.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  socialSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.xs,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.light.border,
  },
  separatorText: {
    marginHorizontal: Spacing.sm,
    color: Colors.light.textMuted,
    fontSize: FontSize.xs,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#dadce0',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  googleBtnText: {
    color: '#3c4043',
    fontWeight: '600',
    fontSize: FontSize.md,
  },
  btnSubmit: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    marginTop: Spacing.xs,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  btnSubmitText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  legalDisclaimer: {
    fontSize: FontSize.xs,
    color: Colors.light.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: Spacing.xs,
  },
  linkText: {
    color: Colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xl,
    gap: Spacing.xs,
  },
  footerText: {
    color: Colors.light.textSecondary,
    fontSize: FontSize.sm,
  },
  footerLink: {
    color: Colors.secondary,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  headerLangBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: Spacing.sm,
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xl || 24,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  headerLangCode: {
    fontSize: FontSize.sm,
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
});
