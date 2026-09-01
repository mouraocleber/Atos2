import React, { useState, useMemo, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Switch, Image
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useBiometric } from '../../contexts/BiometricContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import { useOnboarding } from '../../contexts/OnboardingContext';
import CoachMark from '../../components/CoachMark';
import api from '../../services/api';
import CachedImage from '../../components/CachedImage';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { clearMediaCache, getMediaCacheSize } from '../../services/MediaCacheService';
import { LANGUAGES } from '../../constants/translations';

export default function SettingsScreen() {
  const { user, signOut, updateUser, refreshUser } = useAuth();
  const { isBiometricSupported, isBiometricEnabled, setBiometricEnabled } = useBiometric();
  const { setAppLanguage, t } = useLocalization();
  const { isCoachDone, markCoachDone, resetAll } = useOnboarding();
  const [coachVisible, setCoachVisible] = useState(false);

  // Refs para os alvos do tutorial
  const profileCardRef       = useRef<View>(null);
  const planSectionRef       = useRef<View>(null);
  const languageSectionRef   = useRef<View>(null);
  const resetTutorialBtnRef  = useRef<View>(null);

  useFocusEffect(
    React.useCallback(() => {
      if (!isCoachDone('settings')) {
        const t = setTimeout(() => setCoachVisible(true), 500);
        return () => clearTimeout(t);
      }
    }, [isCoachDone])
  );
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [bioToggling, setBioToggling] = useState(false);

  async function handleToggleBiometric(value: boolean) {
    setBioToggling(true);
    const success = await setBiometricEnabled(value);
    setBioToggling(false);
    if (!success && value) {
      Alert.alert(
        'Biometria indisponível',
        'Seu dispositivo não possui biometria configurada ou a autenticação foi cancelada. Configure no sistema operacional e tente novamente.'
      );
    }
  }
  const SERVER_MEDIA_BASE = (api.defaults.baseURL as string).replace('/api', '');

  // Cache System
  const [cacheSize, setCacheSize] = useState<number>(0);
  useFocusEffect(
    React.useCallback(() => {
      getMediaCacheSize().then(setCacheSize);
    }, [])
  );

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const handleClearCache = () => {
    if (cacheSize === 0) return Alert.alert('Limpar Armazenamento', 'Não há mídias cacheadas para limpar.');
    Alert.alert('Limpar Armazenamento', `Deseja liberar ${formatBytes(cacheSize)} do armazenamento do seu aparelho? As mídias serão baixadas novamente quando precisar.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Limpar Agora', style: 'destructive', onPress: async () => {
         await clearMediaCache();
         setCacheSize(0);
         Alert.alert('Sucesso', 'Armazenamento liberado!');
      }}
    ])
  };

  // Edit Profile Modal
  const [editVisible, setEditVisible] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editNickname, setEditNickname] = useState(user?.nickname || '');
  const [editSaving, setEditSaving] = useState(false);

  // Change Password Modal
  const [pwVisible, setPwVisible] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  // Language Modal
  const [langVisible, setLangVisible] = useState(false);
  const [selectedLang, setSelectedLang] = useState(user?.preferredLanguage || 'pt-BR');
  const [langSaving, setLangSaving] = useState(false);
  const [langSearch, setLangSearch] = useState('');

  const filteredLangs = useMemo(() => {
    const q = langSearch.trim().toLowerCase();
    if (!q) return LANGUAGES;
    return LANGUAGES.filter(l =>
      l.label.toLowerCase().includes(q) ||
      l.english.toLowerCase().includes(q) ||
      l.code.toLowerCase().includes(q)
    );
  }, [langSearch]);

  // Download Schedule
  const [dlVisible, setDlVisible] = useState(false);
  const [dlMode, setDlMode] = useState('wifi'); // always, wifi, scheduled
  const [dlStart, setDlStart] = useState('00:00');
  const [dlEnd, setDlEnd] = useState('06:00');

  // Monetization & Search Status
  const [isSearchable, setIsSearchable] = useState(user?.isSearchable !== false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [kwVisible, setKwVisible] = useState(false);
  const [kwWord, setKwWord] = useState('');
  const [kwPosition, setKwPosition] = useState('1');
  const [kwSaving, setKwSaving] = useState(false);

  // Plan Modal
  const [planModal, setPlanModal] = useState(false);
  const [planUpgrading, setPlanUpgrading] = useState(false);

  async function toggleSearchable(value: boolean) {
    setIsSearchable(value);
    try {
      await api.put('/users/search-visibility', { isSearchable: value });
    } catch(e) {
      setIsSearchable(!value);
    }
  }

  async function handlePickImage() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        return Alert.alert('Permissão', 'Precisamos de acesso à galeria.');
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setAvatarUploading(true);
        
        try {
          const formData = new FormData();
          formData.append('image', {
            uri: asset.uri,
            name: asset.fileName || 'profile.jpg',
            type: asset.mimeType || 'image/jpeg',
          } as any);

          const res = await api.post('/auth/profile-image', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          
          // Atualiza a foto no contexto local imediatamente (sem precisar de logout)
          const newImageUrl = res?.data?.data?.profileImage || res?.data?.profileImage;
          if (newImageUrl) {
            const fullUrl = `${SERVER_MEDIA_BASE}${newImageUrl}?t=${Date.now()}`;
            updateUser({ profileImage: fullUrl });
          }
          
          Alert.alert('Sucesso', 'Foto de perfil atualizada!');
        } catch(e: any) {
          Alert.alert('Erro', e?.response?.data?.message || 'Falha no upload da foto');
        } finally {
          setAvatarUploading(false);
        }
      }
    } catch(e) {
      Alert.alert('Erro', 'Ocorreu um problema ao acessar a galeria');
    }
  }

  async function handleBuyKeyword() {
    if (!kwWord.trim() || !kwPosition) return Alert.alert('Atenção', 'Preencha a palavra e a posição (1-5)');
    setKwSaving(true);
    try {
      if (user?.plan === 'FREE') {
         throw new Error('Acesso Negado. Requer Plano PRO ou BUSINESS');
      }
      await api.post('/keywords', { keyword: kwWord.trim(), position: parseInt(kwPosition) });
      Alert.alert('Sucesso', 'Palavra-chave adicionada com sucesso! 🎉');
      setKwVisible(false);
      setKwWord('');
    } catch(e: any) {
      Alert.alert('Acesso Bloqueado', e?.response?.data?.message || e.message || 'Falha ao salvar palavra-chave');
    } finally {
      setKwSaving(false);
    }
  }

  async function handleUpgradePlan(planType: 'PRO' | 'BUSINESS' | 'ENTERPRISE') {
    const prices = {
      PRO:        { m: 99.90,  a: 999.00,  usdM: 19.99, usdA: 199.90 },
      BUSINESS:   { m: 299.90, a: 2999.00, usdM: 59.99, usdA: 599.90 },
      ENTERPRISE: { m: 499.90, a: 4999.00, usdM: 99.99, usdA: 999.90 },
    };
    const { m, a, usdM, usdA } = prices[planType];
    const isCurrentPlan = user?.plan === planType;

    Alert.alert(
      isCurrentPlan ? `Renovar Plano ${planType}` : `Assinar Plano ${planType}`,
      `Plano atual: ${user?.plan || 'FREE'}\n\nMensal: R$ ${m.toFixed(2).replace('.', ',')} ($ ${usdM.toFixed(2)} USD)/mês\nAnual: R$ ${a.toFixed(2).replace('.', ',')} ($ ${usdA.toFixed(2)} USD)/ano (2 meses grátis)\n\n${user?.plan === 'FREE' ? '⭐ 90 dias grátis sem cobrança para novos assinantes!' : ''}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: `Mensal (R$ ${m.toFixed(2).replace('.', ',')})`, onPress: () => confirmUpgrade(planType, 'MONTHLY') },
        { text: `Anual (R$ ${a.toFixed(2).replace('.', ',')}) ⭐`, onPress: () => confirmUpgrade(planType, 'ANNUAL') }
      ]
    );
  }

  async function confirmUpgrade(planType: 'PRO' | 'BUSINESS' | 'ENTERPRISE', billingCycle: 'MONTHLY' | 'ANNUAL') {
    setPlanUpgrading(true);
    try {
      const res = await api.post('/auth/upgrade-plan', { plan: planType, billingCycle });
      Alert.alert('Sucesso 🎉', res.data.message);
      await refreshUser();
      setPlanModal(false);
    } catch(e: any) {
      Alert.alert('Erro', e?.response?.data?.message || 'Falha ao realizar upgrade');
    } finally {
      setPlanUpgrading(false);
    }
  }

  async function handleSaveProfile() {
    if (!editName.trim() || !editNickname.trim()) {
      return Alert.alert('Atenção', 'Nome e apelido são obrigatórios');
    }
    setEditSaving(true);
    try {
      await api.put('/auth/me', { name: editName.trim(), nickname: editNickname.trim() });
      Alert.alert('Sucesso', 'Perfil atualizado!');
      setEditVisible(false);
    } catch (e: any) {
      Alert.alert('Erro', e?.response?.data?.message || 'Não foi possível atualizar o perfil');
    } finally {
      setEditSaving(false);
    }
  }

  async function handleChangePassword() {
    if (!currentPw || !newPw || !confirmPw) {
      return Alert.alert('Atenção', 'Preencha todos os campos');
    }
    if (newPw.length < 8) {
      return Alert.alert('Atenção', 'A nova senha deve ter pelo menos 8 caracteres');
    }
    if (newPw !== confirmPw) {
      return Alert.alert('Atenção', 'As senhas não coincidem');
    }
    setPwSaving(true);
    try {
      await api.put('/auth/change-password', { currentPassword: currentPw, newPassword: newPw });
      Alert.alert('Sucesso', 'Senha alterada com sucesso!');
      setPwVisible(false);
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (e: any) {
      Alert.alert('Erro', e?.response?.data?.message || 'Senha atual incorreta');
    } finally {
      setPwSaving(false);
    }
  }

  async function handleSaveLanguage(code: string) {
    setSelectedLang(code);
    setLangSaving(true);
    try {
      await api.put('/auth/me', { preferredLanguage: code });
      await setAppLanguage(code as any);
      Alert.alert('Sucesso', 'Idioma atualizado! As traduções usarão o novo idioma.');
    } catch (e: any) {
      Alert.alert('Erro', e?.response?.data?.message || 'Não foi possível salvar o idioma');
    } finally {
      setLangSaving(false);
      setLangVisible(false);
    }
  }

  async function handleLogout() {
    Alert.alert('Sair', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair', style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  const MenuItem = ({ icon, title, subtitle, onPress, danger, rightComponent }: {
    icon: any; title: string; subtitle?: string; onPress?: () => void; danger?: boolean; rightComponent?: React.ReactNode;
  }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7} disabled={!onPress && !rightComponent}>
      <Feather name={icon} size={20} color={danger ? Colors.error : Colors.light.textSecondary} />
      <View style={styles.menuInfo}>
        <Text style={[styles.menuTitle, danger && styles.menuTitleDanger]}>{title}</Text>
        {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
      </View>
      {rightComponent || <Feather name="chevron-right" size={20} color={Colors.light.textMuted} />}
    </TouchableOpacity>
  );

  const currentLangLabel = LANGUAGES.find(l => l.code === selectedLang)
    ? `${LANGUAGES.find(l => l.code === selectedLang)!.flag} ${LANGUAGES.find(l => l.code === selectedLang)!.label}`
    : selectedLang;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Card */}
      <View ref={profileCardRef} style={styles.profileCard}>
        <TouchableOpacity style={styles.profileAvatar} onPress={handlePickImage} disabled={avatarUploading} activeOpacity={0.8}>
          {avatarUploading ? (
             <ActivityIndicator color="#fff" />
          ) : user?.profileImage ? (
             <CachedImage url={user.profileImage} style={{width: 64, height: 64, borderRadius: 32}} />
          ) : (
             <Text style={styles.profileAvatarText}>{user?.name?.charAt(0) || '?'}</Text>
          )}
          <View style={{position: 'absolute', bottom: -2, right: -4, backgroundColor: Colors.primary, borderRadius: 12, padding: 4}}>
             <Feather name="camera" size={12} color="#fff" />
          </View>
        </TouchableOpacity>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user?.name || 'Usuário'}</Text>
          <Text style={styles.profileNickname}>@{user?.nickname || 'user'}</Text>
          <Text style={styles.profileEmail}>{user?.email || ''}</Text>
        </View>
      </View>

      {/* Conta */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('section_account') || 'Conta'}</Text>
        <View style={styles.menuGroup}>
          <MenuItem icon="user" title={t('edit_profile') || 'Editar Perfil'} subtitle="Nome e apelido" onPress={() => { setEditName(user?.name || ''); setEditNickname(user?.nickname || ''); setEditVisible(true); }} />
          <MenuItem icon="key" title={t('change_password') || 'Alterar Senha'} onPress={() => setPwVisible(true)} />
        </View>
      </View>

      {/* Segurança */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('section_security') || 'Segurança'}</Text>
        <View style={styles.menuGroup}>
          <MenuItem
            icon="shield"
            title={t('biometric') || 'Usar Biometria'}
            subtitle={
              !isBiometricSupported
                ? 'Dispositivo não suporta biometria'
                : isBiometricEnabled
                ? 'Ativa — usada no app e na Carteira'
                : 'Desativada — será pedida senha manual'
            }
            rightComponent={
              bioToggling ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Switch
                  value={isBiometricEnabled}
                  onValueChange={handleToggleBiometric}
                  disabled={!isBiometricSupported || bioToggling}
                  trackColor={{ true: Colors.primary, false: Colors.light.border }}
                  thumbColor={isBiometricEnabled ? '#fff' : Colors.light.textMuted}
                />
              )
            }
          />
        </View>
      </View>

      {/* Monetização e Busca */}
      <View ref={planSectionRef} style={styles.section}>
        <Text style={styles.sectionTitle}>{t('section_plan') || 'Meu Plano e Privacidade'}</Text>
        <View style={styles.menuGroup}>
          {/* ← CORRIGIDO: sempre abre o modal de plano */}
          <MenuItem 
            icon="star" 
            title={`Plano Atual: ${user?.plan || 'FREE'}`} 
            subtitle={
              user?.plan === 'FREE'
                ? 'Toque para ver opções PRO e BUSINESS'
                : `Válido até: ${user?.planExpiresAt ? new Date(user.planExpiresAt).toLocaleDateString('pt-BR') : 'Ativo'}`
            } 
            onPress={() => setPlanModal(true)}
            rightComponent={
              <View style={{
                backgroundColor: user?.plan === 'FREE' ? Colors.light.border : user?.plan === 'PRO' ? Colors.secondary + '30' : Colors.primary + '30',
                paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12
              }}>
                <Text style={{
                  color: user?.plan === 'FREE' ? Colors.light.textMuted : user?.plan === 'PRO' ? Colors.secondaryDark : Colors.primary,
                  fontWeight: '800', fontSize: 11
                }}>
                  {user?.plan || 'FREE'}
                </Text>
              </View>
            }
          />

          <MenuItem icon="eye-off" title="Ocultar meu Perfil Nativamente" subtitle="Remove seu perfil 100% de qualquer busca (Funcionalidade Global)" rightComponent={<Switch value={!isSearchable} onValueChange={(val) => toggleSearchable(!val)} trackColor={{true: Colors.error}} />} />
          <MenuItem icon="award" title="Palavras-Chave de Destaque" subtitle="Apenas para contas PRO e BUSINESS" onPress={() => setKwVisible(true)} />
        </View>
      </View>

      {/* Contatos / QR Code */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('section_connections') || 'Conexões Rápidas'}</Text>
        <View style={styles.menuGroup}>
          <MenuItem icon="figma" title="Meu QR Code Pessoal" subtitle="Adicione amigos pela Câmera na Carteira" onPress={() => setQrModalVisible(true)} />
        </View>
      </View>

      {/* App */}
      <View ref={languageSectionRef} style={styles.section}>
        <Text style={styles.sectionTitle}>{t('section_app') || 'Aplicativo'}</Text>
        <View style={styles.menuGroup}>
          <MenuItem icon="globe" title={t('language_label') || 'Idioma das Traduções'} subtitle={currentLangLabel} onPress={() => setLangVisible(true)} />
          <MenuItem icon="download-cloud" title="Agendar Downloads" subtitle={dlMode === 'wifi' ? "Apenas Wi-Fi" : dlMode === 'always' ? "Qualquer Rede" : `Madrugada (${dlStart} - ${dlEnd})`} onPress={() => setDlVisible(true)} />
          <MenuItem icon="hard-drive" title="Uso de Dados e Memória" subtitle={`Armazenamento Local: ${formatBytes(cacheSize)}`} onPress={handleClearCache} />
          <View ref={resetTutorialBtnRef}>
            <MenuItem icon="help-circle" title="Rever Tutorial" subtitle="Aprenda a usar os recursos do app novamente" onPress={async () => { await resetAll(); Alert.alert('Onboarding Reiniciado', 'O tutorial de boas-vindas e os guias visuais serão exibidos novamente.'); }} />
          </View>
        </View>
      </View>

      {/* Sobre */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('section_about') || 'Sobre'}</Text>
        <View style={styles.menuGroup}>
          <MenuItem icon="info" title={t('version') || 'Versão'} subtitle="1.0.0" />
        </View>
      </View>

      {/* Logout */}
      <View style={styles.section}>
        <View style={styles.menuGroup}>
          <MenuItem icon="log-out" title={t('logout') || 'Sair da conta'} danger onPress={handleLogout} />
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Atos2 • Feito com ❤️</Text>
      </View>

      {/* Edit Profile Modal */}
      <Modal visible={editVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar Perfil</Text>
            <TextInput style={styles.inputModal} placeholder="Nome completo" placeholderTextColor={Colors.light.textMuted} value={editName} onChangeText={setEditName} />
            <TextInput style={styles.inputModal} placeholder="Apelido (@)" placeholderTextColor={Colors.light.textMuted} value={editNickname} onChangeText={setEditNickname} autoCapitalize="none" />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setEditVisible(false)} disabled={editSaving}>
                <Text style={styles.modalBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnSubmit} onPress={handleSaveProfile} disabled={editSaving}>
                {editSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalBtnSubmitText}>Salvar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Change Password Modal */}
      <Modal visible={pwVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Alterar Senha</Text>
            <TextInput style={styles.inputModal} placeholder="Senha atual" placeholderTextColor={Colors.light.textMuted} value={currentPw} onChangeText={setCurrentPw} secureTextEntry />
            <TextInput style={styles.inputModal} placeholder="Nova senha (mín. 8 caracteres)" placeholderTextColor={Colors.light.textMuted} value={newPw} onChangeText={setNewPw} secureTextEntry />
            <TextInput style={styles.inputModal} placeholder="Confirmar nova senha" placeholderTextColor={Colors.light.textMuted} value={confirmPw} onChangeText={setConfirmPw} secureTextEntry />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => { setPwVisible(false); setCurrentPw(''); setNewPw(''); setConfirmPw(''); }} disabled={pwSaving}>
                <Text style={styles.modalBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnSubmit} onPress={handleChangePassword} disabled={pwSaving}>
                {pwSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalBtnSubmitText}>Alterar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Language Modal */}
      <Modal visible={langVisible} transparent animationType="slide" onDismiss={() => setLangSearch('')}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <Text style={styles.modalTitle}>Idioma das Traduções</Text>
            <Text style={styles.modalSubtitle}>As mensagens recebidas serão traduzidas para o idioma escolhido</Text>

            {/* Busca */}
            <View style={styles.langSearchBar}>
              <Feather name="search" size={14} color={Colors.light.textMuted} style={{ marginRight: 6 }} />
              <TextInput
                style={styles.langSearchInput}
                placeholder="Pesquisar... / Search..."
                placeholderTextColor={Colors.light.textMuted}
                value={langSearch}
                onChangeText={setLangSearch}
                autoCorrect={false}
              />
              {langSearch.length > 0 && (
                <TouchableOpacity onPress={() => setLangSearch('')}>
                  <Feather name="x" size={14} color={Colors.light.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {filteredLangs.map(lang => (
                <TouchableOpacity
                  key={lang.code}
                  style={[styles.langOption, selectedLang === lang.code && styles.langOptionActive]}
                  onPress={() => handleSaveLanguage(lang.code)}
                  disabled={langSaving}
                >
                  <Text style={styles.langOptionFlag}>{lang.flag}</Text>
                  <Text style={[styles.langOptionText, selectedLang === lang.code && styles.langOptionTextActive]}>{lang.label}</Text>
                  {selectedLang === lang.code && <Feather name="check" size={18} color={Colors.primary} />}
                </TouchableOpacity>
              ))}
              {filteredLangs.length === 0 && (
                <View style={{ alignItems: 'center', padding: Spacing.xl }}>
                  <Text style={{ color: Colors.light.textMuted }}>Nenhum idioma encontrado</Text>
                </View>
              )}
            </ScrollView>

            {langSaving && <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.sm }} />}
            <TouchableOpacity style={[styles.modalBtnCancel, { marginTop: Spacing.md }]} onPress={() => { setLangVisible(false); setLangSearch(''); }}>
              <Text style={[styles.modalBtnText, { textAlign: 'center' }]}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Perfil QR Code Modal */}
      <Modal visible={qrModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {alignItems: 'center'}]}>
            <Text style={styles.modalTitle}>Meu QR Code de Contato</Text>
            <Text style={styles.modalSubtitle}>Mostre este código para outro usuário escanear e iniciar uma conversa.</Text>
            <View style={{padding: 20, backgroundColor: '#fff', borderRadius: 10, marginVertical: 16}}>
              {user?.id ? (
                <QRCode value={`https://atos2.online/connect?user=${user.id}`} size={200} />
              ) : (
                <ActivityIndicator color={Colors.primary} />
              )}
            </View>
            {user?.id && (
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: Colors.primary + '15',
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: 10,
                  marginBottom: 16,
                }}
                onPress={() => {
                  const webUrl = `https://atos2.online/connect?user=${user.id}`;
                  Clipboard.setStringAsync(webUrl);
                  Alert.alert('Link Copiado!', 'Link do App Desk Web copiado para a área de transferência.');
                }}
              >
                <Feather name="copy" size={16} color={Colors.primary} />
                <Text style={{ color: Colors.primary, fontWeight: '700', fontSize: 13 }}>
                  Copiar Link App Desk Web
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Promover Keyword Modal */}
      <Modal visible={kwVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Vocações Premium</Text>
            <Text style={styles.modalSubtitle}>Assuma o Topo da busca 20km para até 5 palavras-chave (Exclusivo PRO/BUSINESS)!</Text>
            
            <TextInput style={styles.inputModal} placeholder="Palavra-Chave (Ex: Bolos)" maxLength={16} placeholderTextColor={Colors.light.textMuted} value={kwWord} onChangeText={setKwWord} />
            <TextInput style={styles.inputModal} placeholder="Posição Desejada (1 a 5)" placeholderTextColor={Colors.light.textMuted} value={kwPosition} onChangeText={setKwPosition} keyboardType="numeric" />
            
            <View style={{backgroundColor: Colors.secondary + '20', padding: Spacing.sm, borderRadius: BorderRadius.sm, marginBottom: Spacing.md}}>
               <Text style={{color: Colors.secondaryDark, textAlign: 'center', fontWeight: 'bold'}}>Incluso na assinatura PRO / BUSINESS</Text>
               <Text style={{color: Colors.secondaryDark, textAlign: 'center', fontSize: 10}}>Tempo de Assinatura: Contínuo</Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setKwVisible(false)} disabled={kwSaving}>
                <Text style={styles.modalBtnText}>Cancelar</Text>
              </TouchableOpacity>
              {user?.plan !== 'FREE' ? (
                <TouchableOpacity style={[styles.modalBtnSubmit, {backgroundColor: Colors.secondary}]} onPress={handleBuyKeyword} disabled={kwSaving}>
                  {kwSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalBtnSubmitText}>Salvar Vocação</Text>}
                </TouchableOpacity>
              ) : (
                <View style={[styles.modalBtnSubmit, {backgroundColor: Colors.light.border}]}>
                   <Text style={{color: Colors.light.textSecondary}}>Requer Upgrade</Text>
                </View>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Download Schedule Modal */}
      <Modal visible={dlVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Economia de Dados</Text>
            <Text style={styles.modalSubtitle}>Baixar fotos, vídeos e áudios para o armazenamento local</Text>
            
            <TouchableOpacity style={[styles.langOption, dlMode === 'always' && styles.langOptionActive]} onPress={() => setDlMode('always')}>
               <Text style={[styles.langOptionText, dlMode === 'always' && styles.langOptionTextActive]}>Rede Móvel ou Wi-Fi</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.langOption, dlMode === 'wifi' && styles.langOptionActive]} onPress={() => setDlMode('wifi')}>
               <Text style={[styles.langOptionText, dlMode === 'wifi' && styles.langOptionTextActive]}>Apenas usando Wi-Fi</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.langOption, dlMode === 'scheduled' && styles.langOptionActive]} onPress={() => setDlMode('scheduled')}>
               <Text style={[styles.langOptionText, dlMode === 'scheduled' && styles.langOptionTextActive]}>Agendar Horário Perso.</Text>
            </TouchableOpacity>

            {dlMode === 'scheduled' && (
              <View style={{flexDirection: 'row', gap: 10, marginTop: 10}}>
                <TextInput style={[styles.inputModal, {flex: 1}]} placeholder="Início" placeholderTextColor={Colors.light.textMuted} value={dlStart} onChangeText={setDlStart} />
                <TextInput style={[styles.inputModal, {flex: 1}]} placeholder="Fim" placeholderTextColor={Colors.light.textMuted} value={dlEnd} onChangeText={setDlEnd} />
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setDlVisible(false)}>
                <Text style={styles.modalBtnText}>Fechar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnSubmit} onPress={() => { Alert.alert('Sucesso', 'Regras de download de mídia salvas localmente!'); setDlVisible(false); }}>
                <Text style={styles.modalBtnSubmitText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ═══ Modal de Gerenciamento de Plano ═══ */}
      <Modal visible={planModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '92%', padding: 0, overflow: 'hidden' }]}>

            {/* Header */}
            <View style={{ backgroundColor: Colors.primary, padding: Spacing.lg, alignItems: 'center' }}>
              <Feather name="star" size={32} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 8 }}>Escolha seu Plano</Text>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4, textAlign: 'center' }}>
                Plano atual: <Text style={{ fontWeight: '800' }}>{user?.plan || 'FREE'}</Text>
              </Text>
            </View>

            <ScrollView style={{ padding: Spacing.md }} showsVerticalScrollIndicator={false}>

              {/* Card FREE */}
              <View style={[styles.planCard, user?.plan === 'FREE' && styles.planCardActive]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <View>
                    <Text style={styles.planName}>FREE</Text>
                    <Text style={styles.planPrice}>R$ 0 / mês</Text>
                  </View>
                  <View style={[styles.planBadge, { backgroundColor: Colors.light.border }]}>
                    <Text style={[styles.planBadgeText, { color: Colors.light.textMuted }]}>Gratuito</Text>
                  </View>
                </View>
                <Text style={styles.planFeature}>✓  Mensagens ilimitadas</Text>
                <Text style={styles.planFeature}>✓  Carteira Multi-Moeda (Moeda Local & USDC)</Text>
                <Text style={styles.planFeature}>✗  Sem acesso à Vitrine</Text>
                <Text style={styles.planFeature}>✗  Sem palavras-chave</Text>
                {user?.plan === 'FREE' && (
                  <View style={[styles.planCurrentBadge, { backgroundColor: Colors.light.surfaceLight }]}>
                    <Text style={{ color: Colors.light.textMuted, fontWeight: '700', fontSize: 12 }}>Plano Atual</Text>
                  </View>
                )}
              </View>

              {/* Card PRO */}
              <View style={[styles.planCard, { borderColor: Colors.secondary }, user?.plan === 'PRO' && styles.planCardActivePro]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <View>
                    <Text style={[styles.planName, { color: Colors.secondaryDark }]}>PRO (1 Usuário)</Text>
                    <Text style={styles.planPrice}>R$ 99,90/mês ($19.99 USD) <Text style={{ fontSize: 12, color: Colors.light.textMuted }}>ou R$ 999,00/ano</Text></Text>
                  </View>
                  <View style={[styles.planBadge, { backgroundColor: Colors.secondary + '20' }]}>
                    <Text style={[styles.planBadgeText, { color: Colors.secondaryDark }]}>Popular</Text>
                  </View>
                </View>
                <Text style={styles.planFeature}>✓  1 Licença de Usuário / Atendente</Text>
                <Text style={styles.planFeature}>✓  Tradução em Tempo Real no Balcão/Ponto</Text>
                <Text style={styles.planFeature}>✓  Modo Escuta & Push-to-Talk</Text>
                <Text style={[styles.planFeature, { color: Colors.secondary, fontWeight: '700' }]}>⭐ 90 dias grátis para novos assinantes!</Text>
                {user?.plan === 'PRO' ? (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                    <View style={[styles.planCurrentBadge, { flex: 1, backgroundColor: Colors.secondary + '20' }]}>
                      <Text style={{ color: Colors.secondaryDark, fontWeight: '700', fontSize: 12 }}>Plano Atual ✓</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.planBtn, { flex: 1, backgroundColor: Colors.secondary }]}
                      onPress={() => handleUpgradePlan('PRO')}
                      disabled={planUpgrading}
                    >
                      <Text style={styles.planBtnText}>Renovar</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.planBtn, { backgroundColor: Colors.secondary, marginTop: 12 }]}
                    onPress={() => handleUpgradePlan('PRO')}
                    disabled={planUpgrading}
                  >
                    {planUpgrading ? <ActivityIndicator color="#fff" size="small" /> : (
                      <Text style={styles.planBtnText}>Assinar PRO</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {/* Card BUSINESS */}
              <View style={[styles.planCard, { borderColor: Colors.primary }, user?.plan === 'BUSINESS' && styles.planCardActiveB]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <View>
                    <Text style={[styles.planName, { color: Colors.primary }]}>BUSINESS (5 Usuários)</Text>
                    <Text style={styles.planPrice}>R$ 299,90/mês ($59.99 USD) <Text style={{ fontSize: 12, color: Colors.light.textMuted }}>ou R$ 2.999,00/ano</Text></Text>
                  </View>
                  <View style={[styles.planBadge, { backgroundColor: Colors.primary + '20' }]}>
                    <Text style={[styles.planBadgeText, { color: Colors.primary }]}>Recomendado</Text>
                  </View>
                </View>
                <Text style={styles.planFeature}>✓  5 Licenças de Usuários / Atendentes</Text>
                <Text style={styles.planFeature}>✓  QR Code de Cobrança / Ponto de Venda</Text>
                <Text style={styles.planFeature}>✓  Bloqueio de Carteira Master no Caixa</Text>
                <Text style={styles.planFeature}>✓  Publicar ofertas e produtos na Vitrine</Text>
                <Text style={[styles.planFeature, { color: Colors.primary, fontWeight: '700' }]}>⭐ 90 dias grátis para novos assinantes!</Text>
                {user?.plan === 'BUSINESS' ? (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                    <View style={[styles.planCurrentBadge, { flex: 1, backgroundColor: Colors.primary + '20' }]}>
                      <Text style={{ color: Colors.primary, fontWeight: '700', fontSize: 12 }}>Plano Atual ✓</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.planBtn, { flex: 1, backgroundColor: Colors.primary }]}
                      onPress={() => handleUpgradePlan('BUSINESS')}
                      disabled={planUpgrading}
                    >
                      <Text style={styles.planBtnText}>Renovar</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.planBtn, { backgroundColor: Colors.primary, marginTop: 12 }]}
                    onPress={() => handleUpgradePlan('BUSINESS')}
                    disabled={planUpgrading}
                  >
                    {planUpgrading ? <ActivityIndicator color="#fff" size="small" /> : (
                      <Text style={styles.planBtnText}>Assinar BUSINESS</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {/* Card ENTERPRISE */}
              <View style={[styles.planCard, { borderColor: '#8B5CF6' }, user?.plan === 'ENTERPRISE' && styles.planCardActiveB]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <View>
                    <Text style={[styles.planName, { color: '#8B5CF6' }]}>ENTERPRISE (15 Licenças)</Text>
                    <Text style={styles.planPrice}>R$ 499,90/mês ($99.99 USD) <Text style={{ fontSize: 12, color: Colors.light.textMuted }}>ou R$ 4.999,00/ano</Text></Text>
                  </View>
                  <View style={[styles.planBadge, { backgroundColor: '#8B5CF620' }]}>
                    <Text style={[styles.planBadgeText, { color: '#8B5CF6' }]}>Corporativo</Text>
                  </View>
                </View>
                <Text style={styles.planFeature}>✓  15 Licenças para Grandes Equipes</Text>
                <Text style={styles.planFeature}>✓  Suporte Prioritário VIP 24/7</Text>
                <Text style={styles.planFeature}>✓  Relatórios Analíticos de Vendas e Tradução</Text>
                <Text style={styles.planFeature}>✓  Integração Customizada de PDV</Text>
                <Text style={[styles.planFeature, { color: '#8B5CF6', fontWeight: '700' }]}>⭐ 90 dias grátis para novos assinantes!</Text>
                {user?.plan === 'ENTERPRISE' ? (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                    <View style={[styles.planCurrentBadge, { flex: 1, backgroundColor: '#8B5CF620' }]}>
                      <Text style={{ color: '#8B5CF6', fontWeight: '700', fontSize: 12 }}>Plano Atual ✓</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.planBtn, { flex: 1, backgroundColor: '#8B5CF6' }]}
                      onPress={() => handleUpgradePlan('ENTERPRISE')}
                      disabled={planUpgrading}
                    >
                      <Text style={styles.planBtnText}>Renovar</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.planBtn, { backgroundColor: '#8B5CF6', marginTop: 12 }]}
                    onPress={() => handleUpgradePlan('ENTERPRISE')}
                    disabled={planUpgrading}
                  >
                    {planUpgrading ? <ActivityIndicator color="#fff" size="small" /> : (
                      <Text style={styles.planBtnText}>Assinar ENTERPRISE</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              <View style={{ height: 8 }} />
            </ScrollView>

            {/* Fechar */}
            <View style={{ padding: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.light.border }}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setPlanModal(false)}>
                <Text style={[styles.modalBtnText, { textAlign: 'center' }]}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Coach Marks */}
      <CoachMark
        visible={coachVisible}
        onComplete={async () => { setCoachVisible(false); await markCoachDone('settings'); }}
        steps={[
          {
            targetRef: profileCardRef,
            title: 'Editar Perfil',
            description: 'Toque na sua foto para alterar seu avatar ou nos botões de edição para atualizar seu nome e apelido.',
            tooltipPosition: 'bottom',
          },
          {
            targetRef: planSectionRef,
            title: 'Seu Plano Atos2',
            description: 'Gerencie seu plano atual e confira os benefícios exclusivos para vendedores PRO e BUSINESS.',
            tooltipPosition: 'top',
          },
          {
            targetRef: languageSectionRef,
            title: 'Idioma do App',
            description: 'Configure seu idioma preferido. O Atos2 traduzirá automaticamente as mensagens de chat para você!',
            tooltipPosition: 'top',
          },
          {
            targetRef: resetTutorialBtnRef,
            title: 'Rever Tutorial',
            description: 'Se precisar tirar dúvidas futuramente, toque neste botão para reiniciar o tutorial a qualquer momento.',
            tooltipPosition: 'top',
          },
        ]}
      />

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  content: { paddingBottom: Spacing.xxl },
  profileCard: { flexDirection: 'row', margin: Spacing.md, backgroundColor: Colors.light.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, gap: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.primary + '40' },
  profileAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  profileAvatarText: { color: '#fff', fontSize: FontSize.xxl, fontWeight: '800' },
  profileInfo: { flex: 1 },
  profileName: { color: Colors.light.text, fontSize: FontSize.lg, fontWeight: '700' },
  profileNickname: { color: Colors.secondary, fontSize: FontSize.sm, fontWeight: '600' },
  profileEmail: { color: Colors.light.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  section: { marginTop: Spacing.md },
  sectionTitle: { color: Colors.light.textMuted, fontSize: FontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: Spacing.lg, marginBottom: Spacing.xs },
  menuGroup: { backgroundColor: Colors.light.surface, marginHorizontal: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.light.border, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', padding: Spacing.md, paddingHorizontal: Spacing.lg, alignItems: 'center', gap: Spacing.md, borderBottomColor: Colors.light.border + '60' },
  menuInfo: { flex: 1 },
  menuTitle: { color: Colors.light.text, fontSize: FontSize.md, fontWeight: '500' },
  menuTitleDanger: { color: Colors.error },
  menuSubtitle: { color: Colors.light.textMuted, fontSize: FontSize.xs, marginTop: 1 },
  footer: { alignItems: 'center', padding: Spacing.lg },
  footerText: { color: Colors.light.textMuted, fontSize: FontSize.xs },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', backgroundColor: Colors.light.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.light.border },
  modalTitle: { color: Colors.light.text, fontSize: FontSize.lg, fontWeight: '700', textAlign: 'center', marginBottom: Spacing.sm },
  modalSubtitle: { color: Colors.light.textMuted, fontSize: FontSize.xs, textAlign: 'center', marginBottom: Spacing.md },
  inputModal: { backgroundColor: Colors.light.surfaceLight, borderRadius: BorderRadius.sm, padding: Spacing.md, color: Colors.light.text, fontSize: FontSize.md, borderWidth: 1, borderColor: Colors.light.border, marginBottom: Spacing.sm },
  modalActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  modalBtnCancel: { flex: 1, padding: Spacing.md, borderRadius: BorderRadius.sm, alignItems: 'center', backgroundColor: Colors.light.surfaceLight, borderWidth: 1, borderColor: Colors.light.border },
  modalBtnText: { color: Colors.light.textSecondary, fontWeight: '600' },
  modalBtnSubmit: { flex: 1, padding: Spacing.md, borderRadius: BorderRadius.sm, alignItems: 'center', backgroundColor: Colors.primary },
  modalBtnSubmitText: { color: '#fff', fontWeight: '700' },
  langSearchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.surfaceLight, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 6, borderWidth: 1, borderColor: Colors.light.border, marginBottom: Spacing.sm },
  langSearchInput: { flex: 1, color: Colors.light.text, fontSize: FontSize.sm, paddingVertical: 0 },
  langOption: { flexDirection: 'row', alignItems: 'center', padding: Spacing.sm, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.light.border, marginBottom: Spacing.xs, gap: Spacing.sm },
  langOptionActive: { backgroundColor: Colors.primary + '15', borderColor: Colors.primary },
  langOptionFlag: { fontSize: 22, width: 30, textAlign: 'center' },
  langOptionText: { flex: 1, color: Colors.light.text, fontSize: FontSize.sm },
  langOptionTextActive: { color: Colors.primary, fontWeight: '700' },
  // Plan Modal
  planCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    marginHorizontal: Spacing.xs,
    marginTop: Spacing.xs,
  },
  planCardActive: {
    borderColor: Colors.light.textMuted,
    backgroundColor: Colors.light.surfaceLight,
  },
  planCardActivePro: {
    borderColor: Colors.secondary,
    backgroundColor: Colors.secondary + '08',
  },
  planCardActiveB: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '08',
  },
  planName: { fontSize: 18, fontWeight: '800', color: Colors.light.text },
  planPrice: { fontSize: 14, fontWeight: '600', color: Colors.light.textSecondary, marginTop: 2 },
  planFeature: { fontSize: 13, color: Colors.light.text, marginTop: 4 },
  planBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  planBadgeText: { fontSize: 11, fontWeight: '800' },
  planCurrentBadge: {
    marginTop: 12, padding: 8, borderRadius: BorderRadius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  planBtn: {
    padding: Spacing.md, borderRadius: BorderRadius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  planBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.sm },
});
