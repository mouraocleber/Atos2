import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import api from '../../services/api';

interface UserResult {
  id: string;
  name: string;
  nickname: string;
  personType: 'PF' | 'PJ';
  city?: string;
  state?: string;
  status?: string;
}

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      // Backend aceita params separados: name, nickname, email
      const q = query.trim();
      const response = await api.get(`/users/search`, {
        params: { name: q, nickname: q }
      });
      // O backend retorna { data: { users: [...] } }
      const raw = response.data.data;
      setResults(raw?.users || raw || []);
    } catch (e: any) {
      Alert.alert('Erro', e?.response?.data?.message || 'Não foi possível buscar usuários.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  const renderUser = ({ item }: { item: UserResult }) => (
    <TouchableOpacity
      style={styles.userCard}
      activeOpacity={0.7}
      onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.id, name: item.name, status: 'offline' } })}
    >
      <View style={styles.userAvatar}>
        <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userNickname}>@{item.nickname}</Text>
        {item.city && (
          <Text style={styles.userLocation}>📍 {item.city}, {item.state}</Text>
        )}
      </View>
      <View style={styles.typeBadge}>
        <Text style={styles.typeBadgeText}>{item.personType}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Nome, apelido, email..."
          placeholderTextColor={Colors.dark.textMuted}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Feather name="search" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={renderUser}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          searched ? (
            <View style={styles.emptyContainer}>
              <Feather name="search" size={48} color={Colors.dark.textMuted} />
              <Text style={styles.emptyTitle}>Nenhum resultado</Text>
              <Text style={styles.emptySubtitle}>Tente buscar por outro nome ou apelido</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Feather name="users" size={48} color={Colors.dark.textMuted} />
              <Text style={styles.emptyTitle}>Buscar Usuários</Text>
              <Text style={styles.emptySubtitle}>Encontre pessoas por nome, apelido ou email</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  searchRow: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.full,
    padding: Spacing.md,
    paddingHorizontal: Spacing.lg,
    color: Colors.dark.text,
    fontSize: FontSize.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  searchBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtnText: { fontSize: 20 },
  listContent: { padding: Spacing.md, gap: Spacing.sm },
  userCard: {
    flexDirection: 'row',
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.info,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: FontSize.xl, fontWeight: '700' },
  userInfo: { flex: 1 },
  userName: { color: Colors.dark.text, fontSize: FontSize.md, fontWeight: '600' },
  userNickname: { color: Colors.dark.textMuted, fontSize: FontSize.sm },
  userLocation: { color: Colors.dark.textSecondary, fontSize: FontSize.xs, marginTop: 2 },
  typeBadge: {
    backgroundColor: Colors.secondary + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  typeBadgeText: { color: Colors.secondary, fontSize: FontSize.xs, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', padding: Spacing.xxl, gap: Spacing.sm },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { color: Colors.dark.text, fontSize: FontSize.lg, fontWeight: '700' },
  emptySubtitle: { color: Colors.dark.textSecondary, fontSize: FontSize.sm, textAlign: 'center' },
});
