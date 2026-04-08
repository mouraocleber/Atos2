import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

const LANGUAGES = [
  { code: 'pt-BR', label: '🇧🇷 Português (Brasil)' },
  { code: 'en-US', label: '🇺🇸 English (US)' },
  { code: 'es-ES', label: '🇪🇸 Español' },
  { code: 'fr-FR', label: '🇫🇷 Français' },
  { code: 'de-DE', label: '🇩🇪 Deutsch' },
  { code: 'zh-CN', label: '🇨🇳 中文' },
  { code: 'ja-JP', label: '🇯🇵 日本語' },
];

export default function SettingsScreen() {
  const { user, signOut } = useAuth();

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

  const MenuItem = ({ icon, title, subtitle, onPress, danger }: {
    icon: any; title: string; subtitle?: string; onPress?: () => void; danger?: boolean;
  }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <Feather name={icon} size={20} color={danger ? Colors.error : Colors.dark.textSecondary} />
      <View style={styles.menuInfo}>
        <Text style={[styles.menuTitle, danger && styles.menuTitleDanger]}>{title}</Text>
        {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
      </View>
      <Feather name="chevron-right" size={20} color={Colors.dark.textMuted} />
    </TouchableOpacity>
  );

  const currentLangLabel = LANGUAGES.find(l => l.code === selectedLang)?.label || selectedLang;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileAvatarText}>{user?.name?.charAt(0) || '?'}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user?.name || 'Usuário'}</Text>
          <Text style={styles.profileNickname}>@{user?.nickname || 'user'}</Text>
          <Text style={styles.profileEmail}>{user?.email || ''}</Text>
        </View>
      </View>

      {/* Conta */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Conta</Text>
        <View style={styles.menuGroup}>
          <MenuItem icon="user" title="Editar Perfil" subtitle="Nome e apelido" onPress={() => { setEditName(user?.name || ''); setEditNickname(user?.nickname || ''); setEditVisible(true); }} />
          <MenuItem icon="key" title="Alterar Senha" onPress={() => setPwVisible(true)} />
        </View>
      </View>

      {/* App */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Aplicativo</Text>
        <View style={styles.menuGroup}>
          <MenuItem icon="globe" title="Idioma das Traduções" subtitle={currentLangLabel} onPress={() => setLangVisible(true)} />
        </View>
      </View>

      {/* Sobre */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sobre</Text>
        <View style={styles.menuGroup}>
          <MenuItem icon="info" title="Versão" subtitle="1.0.0" />
        </View>
      </View>

      {/* Logout */}
      <View style={styles.section}>
        <View style={styles.menuGroup}>
          <MenuItem icon="log-out" title="Sair da conta" danger onPress={handleLogout} />
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
            <TextInput style={styles.inputModal} placeholder="Nome completo" placeholderTextColor={Colors.dark.textMuted} value={editName} onChangeText={setEditName} />
            <TextInput style={styles.inputModal} placeholder="Apelido (@)" placeholderTextColor={Colors.dark.textMuted} value={editNickname} onChangeText={setEditNickname} autoCapitalize="none" />
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
            <TextInput style={styles.inputModal} placeholder="Senha atual" placeholderTextColor={Colors.dark.textMuted} value={currentPw} onChangeText={setCurrentPw} secureTextEntry />
            <TextInput style={styles.inputModal} placeholder="Nova senha (mín. 8 caracteres)" placeholderTextColor={Colors.dark.textMuted} value={newPw} onChangeText={setNewPw} secureTextEntry />
            <TextInput style={styles.inputModal} placeholder="Confirmar nova senha" placeholderTextColor={Colors.dark.textMuted} value={confirmPw} onChangeText={setConfirmPw} secureTextEntry />
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
      <Modal visible={langVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Idioma das Traduções</Text>
            <Text style={styles.modalSubtitle}>As mensagens recebidas serão traduzidas para o idioma escolhido</Text>
            {LANGUAGES.map(lang => (
              <TouchableOpacity
                key={lang.code}
                style={[styles.langOption, selectedLang === lang.code && styles.langOptionActive]}
                onPress={() => handleSaveLanguage(lang.code)}
                disabled={langSaving}
              >
                <Text style={[styles.langOptionText, selectedLang === lang.code && styles.langOptionTextActive]}>{lang.label}</Text>
                {selectedLang === lang.code && <Feather name="check" size={18} color={Colors.primary} />}
              </TouchableOpacity>
            ))}
            {langSaving && <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.sm }} />}
            <TouchableOpacity style={[styles.modalBtnCancel, { marginTop: Spacing.md }]} onPress={() => setLangVisible(false)}>
              <Text style={[styles.modalBtnText, { textAlign: 'center' }]}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  content: { paddingBottom: Spacing.xxl },
  profileCard: { flexDirection: 'row', margin: Spacing.md, backgroundColor: Colors.dark.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, gap: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.primary + '40' },
  profileAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  profileAvatarText: { color: '#fff', fontSize: FontSize.xxl, fontWeight: '800' },
  profileInfo: { flex: 1 },
  profileName: { color: Colors.dark.text, fontSize: FontSize.lg, fontWeight: '700' },
  profileNickname: { color: Colors.secondary, fontSize: FontSize.sm, fontWeight: '600' },
  profileEmail: { color: Colors.dark.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  section: { marginTop: Spacing.md },
  sectionTitle: { color: Colors.dark.textMuted, fontSize: FontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: Spacing.lg, marginBottom: Spacing.xs },
  menuGroup: { backgroundColor: Colors.dark.surface, marginHorizontal: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.dark.border, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', padding: Spacing.md, paddingHorizontal: Spacing.lg, alignItems: 'center', gap: Spacing.md, borderBottomColor: Colors.dark.border + '60' },
  menuInfo: { flex: 1 },
  menuTitle: { color: Colors.dark.text, fontSize: FontSize.md, fontWeight: '500' },
  menuTitleDanger: { color: Colors.error },
  menuSubtitle: { color: Colors.dark.textMuted, fontSize: FontSize.xs, marginTop: 1 },
  footer: { alignItems: 'center', padding: Spacing.lg },
  footerText: { color: Colors.dark.textMuted, fontSize: FontSize.xs },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', backgroundColor: Colors.dark.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.dark.border },
  modalTitle: { color: Colors.dark.text, fontSize: FontSize.lg, fontWeight: '700', textAlign: 'center', marginBottom: Spacing.sm },
  modalSubtitle: { color: Colors.dark.textMuted, fontSize: FontSize.xs, textAlign: 'center', marginBottom: Spacing.md },
  inputModal: { backgroundColor: Colors.dark.surfaceLight, borderRadius: BorderRadius.sm, padding: Spacing.md, color: Colors.dark.text, fontSize: FontSize.md, borderWidth: 1, borderColor: Colors.dark.border, marginBottom: Spacing.sm },
  modalActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  modalBtnCancel: { flex: 1, padding: Spacing.md, borderRadius: BorderRadius.sm, alignItems: 'center', backgroundColor: Colors.dark.surfaceLight, borderWidth: 1, borderColor: Colors.dark.border },
  modalBtnText: { color: Colors.dark.textSecondary, fontWeight: '600' },
  modalBtnSubmit: { flex: 1, padding: Spacing.md, borderRadius: BorderRadius.sm, alignItems: 'center', backgroundColor: Colors.primary },
  modalBtnSubmitText: { color: '#fff', fontWeight: '700' },
  langOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.dark.border, marginBottom: Spacing.xs },
  langOptionActive: { backgroundColor: Colors.primary + '15', borderColor: Colors.primary },
  langOptionText: { color: Colors.dark.text, fontSize: FontSize.md },
  langOptionTextActive: { color: Colors.primary, fontWeight: '700' },
});
