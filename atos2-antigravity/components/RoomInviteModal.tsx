import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, ActivityIndicator, Alert, Share, Platform
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';
import { MemberRole, inviteUserToRoom, RoomType } from '../services/group';
import api, { SERVER_URL } from '../services/api';
import CachedImage from './CachedImage';

interface Contact {
  id: string;
  name: string;
  nickname: string;
  profileImage?: string;
}

interface RoomInviteModalProps {
  visible: boolean;
  roomId: string;
  roomName: string;
  roomType: RoomType | string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function RoomInviteModal({
  visible,
  roomId,
  roomName,
  roomType = 'GROUP',
  onClose,
  onSuccess,
}: RoomInviteModalProps) {
  const [activeTab, setActiveTab] = useState<'qr' | 'contacts'>('qr');
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedRole, setSelectedRole] = useState<MemberRole>('SPEAKER');
  const [sendingInvite, setSendingInvite] = useState(false);

  const inviteUrl = `https://atos2.online/connect?room=${roomId}&name=${encodeURIComponent(roomName)}&type=GROUP`;

  useEffect(() => {
    if (visible) {
      setActiveTab('qr');
      loadContacts();
    } else {
      setSelectedContact(null);
      setSearch('');
      setSelectedRole('SPEAKER');
      setCopied(false);
    }
  }, [visible, roomType]);

  const loadContacts = async () => {
    setLoadingContacts(true);
    try {
      const resp = await api.get('/messages/conversations/list');
      const raw: any[] = resp.data.data || [];

      const list: Contact[] = raw.map((item) => {
        const pImg = item.other_user_profile_image;
        return {
          id: item.other_user_id,
          name: item.other_user_name || 'Usuário',
          nickname: item.other_user_nickname || '',
          profileImage: pImg ? (pImg.startsWith('http') ? pImg : `${SERVER_URL}${pImg}`) : undefined,
        };
      });

      setContacts(list);
    } catch (e) {
      console.warn('[RoomInviteModal] Erro ao carregar contatos:', e);
      setContacts([]);
    } finally {
      setLoadingContacts(false);
    }
  };

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.nickname.toLowerCase().includes(search.toLowerCase())
  );

  const handleCopyLink = async () => {
    try {
      await Clipboard.setStringAsync(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.warn('Erro ao copiar link:', e);
    }
  };

  const handleShareLink = async () => {
    try {
      await Share.share({
        title: `AtoS2 - Modo Guia: ${roomName}`,
        message: `Entre na sala "${roomName}" pelo AtoS2 para ouvir o guia com áudio traduzido em tempo real no seu idioma nativo:\n${inviteUrl}`,
        url: inviteUrl,
      });
    } catch (e) {
      console.warn('Erro ao compartilhar:', e);
    }
  };

  const handleSendInvite = async () => {
    if (!selectedContact) {
      Alert.alert('Atenção', 'Selecione um contato para enviar o convite.');
      return;
    }

    setSendingInvite(true);
    try {
      await inviteUserToRoom(roomId, selectedContact.id, 'SPEAKER');

      Alert.alert(
        'Convite Enviado! 🎉',
        `Convite enviado com sucesso para ${selectedContact.name} participar do Modo Guia "${roomName}".`,
        [
          {
            text: 'OK',
            onPress: () => {
              setSelectedContact(null);
              if (onSuccess) onSuccess();
              onClose();
            },
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('Erro', e.message || 'Falha ao enviar convite.');
    } finally {
      setSendingInvite(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[styles.iconCircle, { backgroundColor: '#E0F2FE' }]}>
                <Feather
                  name="headphones"
                  size={20}
                  color="#0284C7"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>
                  QR Code do Modo Guia
                </Text>
                <Text style={styles.headerSub} numberOfLines={1}>
                  {roomName}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={22} color={Colors.light.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Abas: QR Code vs Contatos */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'qr' && styles.tabBtnActive]}
              onPress={() => setActiveTab('qr')}
              activeOpacity={0.8}
            >
              <Feather name="maximize" size={15} color={activeTab === 'qr' ? '#fff' : Colors.light.textMuted} />
              <Text style={[styles.tabBtnText, activeTab === 'qr' && styles.tabBtnTextActive]}>
                QR Code do Guia
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'contacts' && styles.tabBtnActive]}
              onPress={() => setActiveTab('contacts')}
              activeOpacity={0.8}
            >
              <Feather name="users" size={15} color={activeTab === 'contacts' ? '#fff' : Colors.light.textMuted} />
              <Text style={[styles.tabBtnText, activeTab === 'contacts' && styles.tabBtnTextActive]}>
                Meus Contatos
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'qr' ? (
            <View style={styles.qrSection}>
              <View style={styles.qrBadge}>
                <Feather name="headphones" size={14} color="#0369A1" />
                <Text style={styles.qrBadgeText}>
                  🎧 Modo Guia • Tradução Simultânea Coletiva
                </Text>
              </View>

              <View style={styles.qrWrapper}>
                <QRCode value={inviteUrl} size={200} color="#041527" />
              </View>

              <Text style={styles.qrInstructions}>
                Aponte a câmera do celular para este QR Code. Todos entram na mesma conversa e ouvem a voz traduzida instantaneamente em seu idioma nativo, sem atrito!
              </Text>

              {/* Link de compartilhamento */}
              <View style={styles.linkCard}>
                <Text style={styles.linkText} numberOfLines={1}>{inviteUrl}</Text>
              </View>

              <View style={styles.qrButtonRow}>
                <TouchableOpacity style={styles.copyBtn} onPress={handleCopyLink} activeOpacity={0.8}>
                  <Feather name={copied ? 'check' : 'copy'} size={16} color={Colors.primary} />
                  <Text style={styles.copyBtnText}>{copied ? 'Link Copiado! 🎉' : 'Copiar Link'}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.shareBtn} onPress={handleShareLink} activeOpacity={0.8}>
                  <Feather name="share-2" size={16} color="#fff" />
                  <Text style={styles.shareBtnText}>Compartilhar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              {/* Campo de Busca de Contatos */}
              <View style={styles.searchBox}>
                <Feather name="search" size={18} color={Colors.light.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar contato por nome ou apelido..."
                  placeholderTextColor={Colors.light.textMuted}
                  value={search}
                  onChangeText={setSearch}
                />
              </View>



              {/* Lista de Contatos */}
              <Text style={styles.sectionLabel}>Selecione um Contato:</Text>

              {loadingContacts ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator color={Colors.primary} size="small" />
                  <Text style={styles.loadingText}>Carregando seus contatos...</Text>
                </View>
              ) : (
                <FlatList
                  data={filteredContacts}
                  keyExtractor={item => item.id}
                  style={styles.list}
                  contentContainerStyle={{ gap: 8, paddingBottom: 16 }}
                  renderItem={({ item }) => {
                    const isSelected = selectedContact?.id === item.id;
                    return (
                      <TouchableOpacity
                        style={[styles.contactCard, isSelected && styles.contactCardSelected]}
                        onPress={() => setSelectedContact(item)}
                        activeOpacity={0.7}
                      >
                        {item.profileImage ? (
                          <CachedImage url={item.profileImage} style={styles.avatar} />
                        ) : (
                          <View style={styles.avatarFallback}>
                            <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                          </View>
                        )}

                        <View style={{ flex: 1 }}>
                          <Text style={styles.contactName}>{item.name}</Text>
                          {item.nickname ? (
                            <Text style={styles.contactNickname}>@{item.nickname}</Text>
                          ) : null}
                        </View>

                        <View style={[styles.radio, isSelected && styles.radioSelected]}>
                          {isSelected && <Feather name="check" size={14} color="#fff" />}
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                  ListEmptyComponent={
                    <View style={styles.emptyBox}>
                      <Feather name="users" size={32} color={Colors.light.textMuted} />
                      <Text style={styles.emptyText}>Nenhum contato encontrado.</Text>
                    </View>
                  }
                />
              )}

              {/* Rodapé com Botão de Enviar Convite */}
              <View style={styles.footer}>
                <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={sendingInvite}>
                  <Text style={styles.cancelText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sendBtn, (!selectedContact || sendingInvite) && styles.sendBtnDisabled]}
                  onPress={handleSendInvite}
                  disabled={!selectedContact || sendingInvite}
                  activeOpacity={0.8}
                >
                  {sendingInvite ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Feather name="send" size={16} color="#fff" />
                      <Text style={styles.sendBtnText}>Enviar Convite</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.light.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '90%',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.light.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.light.text,
  },
  headerSub: {
    fontSize: FontSize.xs,
    color: Colors.light.textMuted,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  tabBar: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: Colors.light.surfaceLight,
    padding: 4,
    borderRadius: BorderRadius.md,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: BorderRadius.sm,
  },
  tabBtnActive: {
    backgroundColor: Colors.primary,
  },
  tabBtnText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.light.textMuted,
  },
  tabBtnTextActive: {
    color: '#fff',
  },
  qrSection: {
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  qrBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  qrBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  qrWrapper: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    marginVertical: 4,
  },
  qrInstructions: {
    fontSize: FontSize.xs,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  linkCard: {
    width: '100%',
    backgroundColor: Colors.light.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  linkText: {
    fontSize: 11,
    color: Colors.light.textMuted,
  },
  qrButtonRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 4,
  },
  copyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  copyBtnText: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
  },
  shareBtnText: {
    color: '#fff',
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.light.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.light.text,
    padding: 0,
  },
  roleSelectionBox: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    gap: 8,
  },
  roleSelectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: '#92400E',
  },
  roleButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  roleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.surface,
  },
  roleBtnActiveSpeaker: {
    backgroundColor: '#D97706',
    borderColor: '#B45309',
  },
  roleBtnActiveListener: {
    backgroundColor: '#0284C7',
    borderColor: '#0369A1',
  },
  roleBtnText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  roleBtnTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  list: {
    maxHeight: 220,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.surfaceLight,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  contactCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#EFF6FF',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  contactName: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.light.text,
  },
  contactNickname: {
    fontSize: FontSize.xs,
    color: Colors.light.textMuted,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.light.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  loadingBox: {
    alignItems: 'center',
    padding: Spacing.lg,
    gap: 8,
  },
  loadingText: {
    fontSize: FontSize.xs,
    color: Colors.light.textMuted,
  },
  emptyBox: {
    alignItems: 'center',
    padding: Spacing.lg,
    gap: 6,
  },
  emptyText: {
    fontSize: FontSize.xs,
    color: Colors.light.textMuted,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
    alignItems: 'center',
  },
  cancelText: {
    color: Colors.light.textMuted,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  sendBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
  },
  sendBtnDisabled: {
    backgroundColor: Colors.light.textMuted,
    opacity: 0.6,
  },
  sendBtnText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: '700',
  },
});
