import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Alert, ActivityIndicator
} from 'react-native';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import api, { SERVER_URL } from '../../services/api';
import CachedImage from '../../components/CachedImage';

interface UserResult {
  id: string;
  name: string;
  nickname: string;
  personType: 'PF' | 'PJ';
  city?: string;
  state?: string;
  status?: string;
  profileImage?: string;
}

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [searchRadius, setSearchRadius] = useState<'20' | 'all'>('all');

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permission to access location was denied');
        return;
      }
      let loc = await Location.getLastKnownPositionAsync({});
      if (loc) setLocation(loc);
      
      loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);

      // Salva localização no servidor para habilitar busca por proximidade
      try {
        await api.put('/users/location', {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      } catch (e) {
        console.log('Não foi possível salvar localização no servidor:', e);
      }
    })();
  }, []);

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const q = query.trim();
      const params: any = { query: q };
      if (location && searchRadius === '20') {
        params.lat = location.coords.latitude;
        params.lon = location.coords.longitude;
        params.radius = 20;
      }
      
      const response = await api.get(`/users/search`, { params });
      const raw = response.data.data;
      const found = raw?.users || raw || [];

      // Se busca próxima não retornou resultados, sugere busca global
      if (found.length === 0 && searchRadius === '20') {
        setResults([]);
        Alert.alert(
          'Nenhum usuário próximo',
          'Não encontramos usuários em até 20km. Deseja buscar globalmente?',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Buscar Global', onPress: () => { setSearchRadius('all'); } },
          ]
        );
      } else {
        const normalized = found.map((u: any) => {
          if (u.profileImage && !u.profileImage.startsWith('http')) {
            return { ...u, profileImage: `${SERVER_URL}${u.profileImage}` };
          }
          return u;
        });
        setResults(normalized);
      }
    } catch (e: any) {
      Alert.alert('Erro', e?.response?.data?.message || 'Não foi possível buscar usuários.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  const renderUser = ({ item, index }: { item: UserResult, index: number }) => {
    // Patrocínio (usando a prop isPromoted ou o primeiro resultado como default de busca paga caso a engine esteja rodando)
    const isPromoted = (item as any).isPromoted || index === 0;

    return (
    <TouchableOpacity
      style={[styles.userCard, isPromoted && { borderColor: Colors.secondary, backgroundColor: Colors.secondary + '05', borderWidth: 2 }]}
      activeOpacity={0.7}
      onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.id, name: item.name, status: 'offline', profileImage: item.profileImage } })}
    >
      <View style={[styles.userAvatar, isPromoted && { backgroundColor: Colors.secondary }]}>
        {item.profileImage ? (
          <CachedImage url={item.profileImage} style={{ width: 48, height: 48, borderRadius: 24 }} />
        ) : (
          <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
        )}
      </View>
      <View style={styles.userInfo}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
          <Text style={styles.userName}>{item.name}</Text>
          {isPromoted && (
             <View style={{backgroundColor: Colors.secondary + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: BorderRadius.sm}}>
               <Text style={{color: Colors.secondaryDark, fontSize: 10, fontWeight: '800'}}>💎 Patrocinado</Text>
             </View>
          )}
        </View>
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
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Nome, apelido, email..."
          placeholderTextColor={Colors.light.textMuted}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Feather name="search" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Filtro de Distância */}
      <View style={styles.radiusToggleContainer}>
        <TouchableOpacity 
          style={[styles.radiusToggleBtn, searchRadius === '20' && styles.radiusToggleBtnActive]} 
          onPress={() => setSearchRadius('20')}
        >
          <Text style={[styles.radiusToggleText, searchRadius === '20' && styles.radiusToggleTextActive]}>
            Próximos (Até 20km)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.radiusToggleBtn, searchRadius === 'all' && styles.radiusToggleBtnActive]} 
          onPress={() => setSearchRadius('all')}
        >
          <Text style={[styles.radiusToggleText, searchRadius === 'all' && styles.radiusToggleTextActive]}>
            Todos (Global)
          </Text>
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
              <Feather name="search" size={48} color={Colors.light.textMuted} />
              <Text style={styles.emptyTitle}>Nenhum resultado</Text>
              <Text style={styles.emptySubtitle}>Tente buscar por outro nome ou apelido</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Feather name="users" size={48} color={Colors.light.textMuted} />
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
  container: { flex: 1, backgroundColor: Colors.light.background },
  searchRow: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    backgroundColor: Colors.light.surface,
    borderRadius: BorderRadius.full,
    padding: Spacing.md,
    paddingHorizontal: Spacing.lg,
    color: Colors.light.text,
    fontSize: FontSize.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
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
  radiusToggleContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  radiusToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.light.border,
    alignItems: 'center',
    backgroundColor: Colors.light.surface,
  },
  radiusToggleBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  radiusToggleText: {
    fontSize: FontSize.sm,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  radiusToggleTextActive: {
    color: '#fff',
  },
  listContent: { padding: Spacing.md, gap: Spacing.sm },
  userCard: {
    flexDirection: 'row',
    backgroundColor: Colors.light.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
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
  userName: { color: Colors.light.text, fontSize: FontSize.md, fontWeight: '600' },
  userNickname: { color: Colors.light.textMuted, fontSize: FontSize.sm },
  userLocation: { color: Colors.light.textSecondary, fontSize: FontSize.xs, marginTop: 2 },
  typeBadge: {
    backgroundColor: Colors.secondary + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  typeBadgeText: { color: Colors.secondary, fontSize: FontSize.xs, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', padding: Spacing.xxl, gap: Spacing.sm },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { color: Colors.light.text, fontSize: FontSize.lg, fontWeight: '700' },
  emptySubtitle: { color: Colors.light.textSecondary, fontSize: FontSize.sm, textAlign: 'center' },
});
