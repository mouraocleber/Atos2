import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, ActivityIndicator, Alert
} from 'react-native';
import { Feather } from '@expo/vector-icons';
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
  const [search, setSearch] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedRole, setSelectedRole] = useState<MemberRole>('LISTENER');
  const [sendingInvite, setSendingInvite] = useState(false);

  useEffect(() => {
    if (visible) {
      loadContacts();
    } else {
      setSelectedContact(null);
      setSearch('');
      setSelectedRole('LISTENER');
    }
  }, [visible]);

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

  const handleSendInvite = async () => {
    if (!selectedContact) {
      Alert.alert('Atenção', 'Selecione um contato para enviar o convite.');
      return;
    }

    setSendingInvite(true);
    try {
      await inviteUserToRoom(roomId, selectedContact.id, selectedRole);

      const roleText = roomType === 'LECTURE'
        ? (selectedRole === 'SPEAKER' ? 'Palestrante (Pode Falar)' : 'Ouvinte')
        : 'Membro';

      Alert.alert(
        'Convite Enviado! 🎉',
        `Convite enviado com sucesso para ${selectedContact.name} como ${roleText} em "${roomName}".`,
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
              <View style={styles.iconCircle}>
                <Feather
                  name={roomType === 'LECTURE' ? 'mic' : 'users'}
                  size={20}
                  color={Colors.secondaryDark}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>
                  {roomType === 'LECTURE' ? 'Convidar para Palestra' : 'Convidar para o Grupo'}
                </Text>
                <Text style={styles.headerSub} numberOfLines={1}>
                  Sala: {roomName}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={22} color={Colors.light.textMuted} />
            </TouchableOpacity>
          </View>

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

          {/* Seleção do Papel na Palestra (Palestrante vs Ouvinte) */}
          {roomType === 'LECTURE' && (
            <View style={styles.roleSelectionBox}>
              <Text style={styles.roleSelectionLabel}>Definir Papel na Palestra:</Text>
              <View style={styles.roleButtonsRow}>
                <TouchableOpacity
                  style={[styles.roleBtn, selectedRole === 'SPEAKER' && styles.roleBtnActiveSpeaker]}
                  onPress={() => setSelectedRole('SPEAKER')}
                  activeOpacity={0.8}
                >
                  <Feather name="mic" size={16} color={selectedRole === 'SPEAKER' ? '#fff' : '#D97706'} />
                  <Text style={[styles.roleBtnText, selectedRole === 'SPEAKER' && styles.roleBtnTextActive]}>
                    🎤 Palestrante (Fala)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.roleBtn, selectedRole === 'LISTENER' && styles.roleBtnActiveListener]}
                  onPress={() => setSelectedRole('LISTENER')}
                  activeOpacity={0.8}
                >
                  <Feather name="headphones" size={16} color={selectedRole === 'LISTENER' ? '#fff' : '#0369A1'} />
                  <Text style={[styles.roleBtnText, selectedRole === 'LISTENER' && styles.roleBtnTextActive]}>
                    🎧 Ouvinte
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

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
                  <Feather name="send" size={18} color="#fff" />
                  <Text style={styles.sendBtnText}>Enviar Convite</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.light.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '85%',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.secondary + '20',
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
    padding: 6,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: FontSize.sm,
    color: Colors.light.text,
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
    borderColor: '#D97706',
    backgroundColor: '#fff',
  },
  roleBtnActiveSpeaker: {
    backgroundColor: '#D97706',
    borderColor: '#D97706',
  },
  roleBtnActiveListener: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  roleBtnText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.light.text,
  },
  roleBtnTextActive: {
    color: '#fff',
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.light.textMuted,
    marginTop: 4,
  },
  list: {
    maxHeight: 240,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.surfaceLight,
  },
  contactCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
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
