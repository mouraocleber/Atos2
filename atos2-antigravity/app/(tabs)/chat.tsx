import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, RefreshControl
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useOnboarding } from '../../contexts/OnboardingContext';
import CoachMark from '../../components/CoachMark';
import api, { SERVER_URL } from '../../services/api';
import CachedImage from '../../components/CachedImage';

interface Conversation {
  id: string;
  userId: string;
  name: string;
  nickname: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  status: 'online' | 'offline';
  profileImage?: string;
}

export default function ChatScreen() {
  const { user } = useAuth();
  const { isCoachDone, markCoachDone } = useOnboarding();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [coachVisible, setCoachVisible] = useState(false);

  // Refs dos alvos do coach mark
  const searchRef = useRef<View>(null);
  const listRef   = useRef<View>(null);
  const badgeRef  = useRef<View>(null);
  const fabRef    = useRef<View>(null);

  useFocusEffect(
    React.useCallback(() => {
      if (!isCoachDone('chat')) {
        const t = setTimeout(() => setCoachVisible(true), 500);
        return () => clearTimeout(t);
      }
    }, [isCoachDone])
  );

  const loadConversations = async () => {
    try {
      const resp = await api.get('/messages/conversations/list');
      const raw: any[] = resp.data.data || [];

      // O backend agora retorna { other_user_id, last_message_at, unread_count, other_user_name, other_user_nickname }
      const enriched = raw.map((item) => {
        const pImg = item.other_user_profile_image;
        const profileImage = pImg 
          ? (pImg.startsWith('http') ? pImg : `${SERVER_URL}${pImg}`) 
          : undefined;
        return {
          id: item.other_user_id,
          userId: item.other_user_id,
          name: item.other_user_name || 'Usuário',
          nickname: item.other_user_nickname || '',
          lastMessage: 'Toque para ver as mensagens',
          lastMessageTime: item.last_message_at ? new Date(item.last_message_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
          unreadCount: parseInt(item.unread_count) || 0,
          status: 'offline' as const,
          profileImage,
        };
      });
      setConversations(enriched as Conversation[]);
    } catch {
      setConversations([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { 
    loadConversations(); 
    const interval = setInterval(() => {
      loadConversations();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const filtered = conversations.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.nickname.toLowerCase().includes(search.toLowerCase())
  );

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity 
      style={styles.conversationItem} 
      activeOpacity={0.7}
      onPress={() => router.push({
        pathname: '/chat/[id]',
        params: { id: item.id, name: item.name, status: item.status, profileImage: item.profileImage }
      })}
    >
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          {item.profileImage ? (
            <CachedImage url={item.profileImage} style={{ width: 52, height: 52, borderRadius: 26 }} />
          ) : (
            <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
          )}
        </View>
        {item.status === 'online' && <View style={styles.onlineIndicator} />}
      </View>

      <View style={styles.conversationInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.conversationName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.time}>{item.lastMessageTime}</Text>
        </View>
        <View style={styles.messageRow}>
          <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage}</Text>
          {item.unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Background Glows */}
      <View style={styles.glowBlue} pointerEvents="none" />
      <View style={styles.glowPurple} pointerEvents="none" />

      {/* Search */}
      <View ref={searchRef} style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Feather name="search" size={20} color="#6366F1" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar conversas..."
            placeholderTextColor="#6366F1"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Welcome */}
      {user && (
        <View style={styles.welcomeBar}>
          <Text style={styles.welcomeText}>
            Olá, <Text style={styles.welcomeName}>{user.name || user.nickname}</Text> 👋
          </Text>
        </View>
      )}

      {/* Conversations List */}
      <View ref={listRef} style={{ flex: 1 }}>
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderConversation}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} tintColor="#00F2FE" onRefresh={() => { setRefreshing(true); loadConversations(); }} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="message-square" size={48} color="#6366F1" />
              <Text style={styles.emptyTitle}>Nenhuma conversa</Text>
              <Text style={styles.emptySubtitle}>Busque usuários para começar a conversar</Text>
            </View>
          }
        />
      </View>

      {/* FAB */}
      <TouchableOpacity ref={fabRef} style={styles.fab} activeOpacity={0.8}
        onPress={() => router.push('/(tabs)/search')}
      >
        <Feather name="edit-2" size={24} color="#000" />
      </TouchableOpacity>

      {/* Coach Marks */}
      <CoachMark
        visible={coachVisible}
        onComplete={async () => { setCoachVisible(false); await markCoachDone('chat'); }}
        steps={[
          {
            targetRef: searchRef,
            title: 'Buscar Conversas',
            description: 'Encontre rapidamente qualquer conversa digitando o nome ou apelido do contato.',
            tooltipPosition: 'bottom',
          },
          {
            targetRef: listRef,
            title: 'Suas Conversas',
            description: 'Toque em qualquer conversa para abrir o chat e enviar mensagens, áudios, fotos, vídeos e localização.',
            tooltipPosition: 'top',
          },
          {
            targetRef: listRef,
            title: 'Mensagens Não Lidas',
            description: 'O número em azul indica mensagens ainda não lidas. Nunca perca uma conversa importante!',
            tooltipPosition: 'top',
          },
          {
            targetRef: fabRef,
            title: 'Nova Conversa',
            description: 'Toque aqui para buscar usuários e iniciar uma nova conversa diretamente.',
            tooltipPosition: 'top',
          },
        ]}
      />
    </View>
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
    top: -40,
    left: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(0, 242, 254, 0.1)',
  },
  glowPurple: {
    position: 'absolute',
    bottom: -50,
    right: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(155, 81, 224, 0.1)',
  },
  searchContainer: {
    padding: Spacing.md,
    paddingBottom: Spacing.sm,
    zIndex: 10,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    paddingHorizontal: Spacing.md,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    color: '#fff',
    fontSize: FontSize.md,
  },
  welcomeBar: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    zIndex: 10,
  },
  welcomeText: {
    color: Colors.dark.textSecondary,
    fontSize: FontSize.sm,
  },
  welcomeName: {
    color: '#00F2FE',
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 80,
    paddingHorizontal: Spacing.md,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: Spacing.md,
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
    gap: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#6366F1',
  },
  avatarText: {
    color: '#fff',
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: '#060814',
  },
  conversationInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conversationName: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: '700',
    flex: 1,
  },
  time: {
    color: Colors.dark.textMuted,
    fontSize: FontSize.xs,
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    color: Colors.dark.textSecondary,
    fontSize: FontSize.sm,
    flex: 1,
  },
  badge: {
    backgroundColor: '#00F2FE',
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#000',
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: Spacing.xxl,
    gap: Spacing.sm,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: Colors.dark.textMuted,
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#00F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00F2FE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
