import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Switch, Image
} from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
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
  const [avatarUploading, setAvatarUploading] = useState(false);
  const SERVER_MEDIA_BASE = (api.defaults.baseURL as string).replace('/api', '');

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

  // Download Schedule
  const [dlVisible, setDlVisible] = useState(false);
  const [dlMode, setDlMode] = useState('wifi'); // always, wifi, scheduled
  const [dlStart, setDlStart] = useState('00:00');
  const [dlEnd, setDlEnd] = useState('06:00');

  // Monetization & Search Status
  const [isSearchable, setIsSearchable] = useState(user?.isSearchable !== false);
  const [kwVisible, setKwVisible] = useState(false);
  const [kwWord, setKwWord] = useState('');
  const [kwPosition, setKwPosition] = useState('1');
  const [kwSaving, setKwSaving] = useState(false);

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

          await api.post('/auth/profile-image', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          
          Alert.alert('Sucesso', 'Foto atualizada! Pode demorar alguns segundos para refletir em todas as telas em cache.');
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
      await api.post('/keywords', { keyword: kwWord.trim(), position: parseInt(kwPosition) });
      Alert.alert('Sucesso', 'Palavra-chave Promovida por 1 G (Mensal)! 🎉');
      setKwVisible(false);
      setKwWord('');
    } catch(e: any) {
      Alert.alert('Erro', e?.response?.data?.message || 'Falha ao processar assinatura');
    } finally {
      setKwSaving(false);
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

  const currentLangLabel = LANGUAGES.find(l => l.code === selectedLang)?.label || selectedLang;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <TouchableOpacity style={styles.profileAvatar} onPress={handlePickImage} disabled={avatarUploading} activeOpacity={0.8}>
          {avatarUploading ? (
             <ActivityIndicator color="#fff" />
          ) : user?.profileImage ? (
             <Image source={{ uri: user.profileImage.startsWith('http') ? user.profileImage : SERVER_MEDIA_BASE + user.profileImage }} style={{width: 64, height: 64, borderRadius: 32}} />
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
        <Text style={styles.sectionTitle}>Conta</Text>
        <View style={styles.menuGroup}>
          <MenuItem icon="user" title="Editar Perfil" subtitle="Nome e apelido" onPress={() => { setEditName(user?.name || ''); setEditNickname(user?.nickname || ''); setEditVisible(true); }} />
          <MenuItem icon="key" title="Alterar Senha" onPress={() => setPwVisible(true)} />
        </View>
      </View>

      {/* Monetização e Busca */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Promoção e Busca</Text>
        <View style={styles.menuGroup}>
          <MenuItem icon="eye" title="Aparecer nas Buscas" subtitle="Exibe seu perfil num raio de 20km." rightComponent={<Switch value={isSearchable} onValueChange={toggleSearchable} trackColor={{true: Colors.success}} />} />
          <MenuItem icon="award" title="Promover Vocação (Palavras-Chave)" subtitle="Custo Diário: 1 G" onPress={() => setKwVisible(true)} />
        </View>
      </View>

      {/* App */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Aplicativo</Text>
        <View style={styles.menuGroup}>
          <MenuItem icon="globe" title="Idioma das Traduções" subtitle={currentLangLabel} onPress={() => setLangVisible(true)} />
          <MenuItem icon="download-cloud" title="Agendar Downloads" subtitle={dlMode === 'wifi' ? "Apenas Wi-Fi" : dlMode === 'always' ? "Qualquer Rede" : `Madrugada (${dlStart} - ${dlEnd})`} onPress={() => setDlVisible(true)} />
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

      {/* Promover Keyword Modal */}
      <Modal visible={kwVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Vocações Premium</Text>
            <Text style={styles.modalSubtitle}>Assuma o Topo da busca 20km para até 5 palavras-chave!</Text>
            
            <TextInput style={styles.inputModal} placeholder="Palavra-Chave (Ex: Bolos)" placeholderTextColor={Colors.light.textMuted} value={kwWord} onChangeText={setKwWord} />
            <TextInput style={styles.inputModal} placeholder="Posição Desejada (1 a 5)" placeholderTextColor={Colors.light.textMuted} value={kwPosition} onChangeText={setKwPosition} keyboardType="numeric" />
            
            <View style={{backgroundColor: Colors.secondary + '20', padding: Spacing.sm, borderRadius: BorderRadius.sm, marginBottom: Spacing.md}}>
               <Text style={{color: Colors.secondaryDark, textAlign: 'center', fontWeight: 'bold'}}>Transação Instantânea: 1 G</Text>
               <Text style={{color: Colors.secondaryDark, textAlign: 'center', fontSize: 10}}>Tempo de Assinatura: Este mês</Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setKwVisible(false)} disabled={kwSaving}>
                <Text style={styles.modalBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtnSubmit, {backgroundColor: Colors.secondary}]} onPress={handleBuyKeyword} disabled={kwSaving}>
                {kwSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalBtnSubmitText}>Assinar por 1 G</Text>}
              </TouchableOpacity>
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
  langOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.light.border, marginBottom: Spacing.xs },
  langOptionActive: { backgroundColor: Colors.primary + '15', borderColor: Colors.primary },
  langOptionText: { color: Colors.light.text, fontSize: FontSize.md },
  langOptionTextActive: { color: Colors.primary, fontWeight: '700' },
});
