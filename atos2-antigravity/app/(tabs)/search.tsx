import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Alert, ActivityIndicator
} from 'react-native';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import api, { SERVER_URL } from '../../services/api';
import CachedImage from '../../components/CachedImage';
import { useOnboarding } from '../../contexts/OnboardingContext';
import CoachMark from '../../components/CoachMark';

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
  const { isCoachDone, markCoachDone } = useOnboarding();
  const [coachVisible, setCoachVisible] = useState(false);

  // Refs para os alvos do tutorial
  const searchFieldRef  = useRef<View>(null);
  const radiusToggleRef = useRef<View>(null);
  const userListRef     = useRef<View>(null);

  useFocusEffect(
    React.useCallback(() => {
      if (!isCoachDone('search')) {
        const t = setTimeout(() => setCoachVisible(true), 500);
        return () => clearTimeout(t);
      }
    }, [isCoachDone])
  );

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
      {/* Background Glows */}
      <View style={styles.glowBlue} pointerEvents="none" />
      <View style={styles.glowPurple} pointerEvents="none" />

      <View ref={searchFieldRef} style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Nome, apelido, email..."
          placeholderTextColor="#6366F1"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Feather name="search" size={20} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Filtro de Distância */}
      <View ref={radiusToggleRef} style={styles.radiusToggleContainer}>
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

      <View ref={userListRef} style={{ flex: 1 }}>
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderUser}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            searched ? (
              <View style={styles.emptyContainer}>
                <Feather name="search" size={48} color="#6366F1" />
                <Text style={styles.emptyTitle}>Nenhum resultado</Text>
                <Text style={styles.emptySubtitle}>Tente buscar por outro nome ou apelido</Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Feather name="users" size={48} color="#6366F1" />
                <Text style={styles.emptyTitle}>Buscar Usuários</Text>
                <Text style={styles.emptySubtitle}>Encontre pessoas por nome, apelido ou email</Text>
              </View>
            )
          }
        />
      </View>

      {/* Coach Marks */}
      <CoachMark
        visible={coachVisible}
        onComplete={async () => { setCoachVisible(false); await markCoachDone('search'); }}
        steps={[
          {
            targetRef: searchFieldRef,
            title: 'Buscar Usuários',
            description: 'Encontre qualquer usuário Atos2 digitando seu nome, apelido ou e-mail.',
            tooltipPosition: 'bottom',
          },
          {
            targetRef: radiusToggleRef,
            title: 'Filtro de Distância',
            description: "Filtre os resultados por 'Próximos (20km)' para encontrar pessoas perto de você ou busque globalmente.",
            tooltipPosition: 'bottom',
          },
          {
            targetRef: userListRef,
            title: 'Resultados da Busca',
            description: 'Toque em qualquer usuário encontrado para abrir a tela de mensagens e iniciar um chat diretamente.',
            tooltipPosition: 'top',
          },
          {
            targetRef: userListRef,
            title: 'Identificação PF/PJ',
            description: 'Identifique facilmente se o perfil é de Pessoa Física (PF) ou Pessoa Jurídica/Empresa (PJ) pelo selo correspondente.',
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
    top: -50,
    left: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(0, 242, 254, 0.12)',
  },
  glowPurple: {
    position: 'absolute',
    bottom: 100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(155, 81, 224, 0.12)',
  },
  searchRow: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.sm,
    zIndex: 10,
  },
  searchInput: {
    flex: 1,
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.full,
    padding: Spacing.md,
    paddingHorizontal: Spacing.lg,
    color: '#fff',
    fontSize: FontSize.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  searchBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#00F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtnText: { fontSize: 20 },
  radiusToggleContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    zIndex: 10,
  },
  radiusToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
  },
  radiusToggleBtnActive: {
    backgroundColor: '#00F2FE',
    borderColor: '#00F2FE',
  },
  radiusToggleText: {
    fontSize: FontSize.sm,
    color: Colors.dark.textSecondary,
    fontWeight: '500',
  },
  radiusToggleTextActive: {
    color: '#000',
  },
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
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  avatarText: { color: '#fff', fontSize: FontSize.xl, fontWeight: '700' },
  userInfo: { flex: 1 },
  userName: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
  userNickname: { color: Colors.dark.textSecondary, fontSize: FontSize.sm },
  userLocation: { color: Colors.dark.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  typeBadge: {
    backgroundColor: 'rgba(155, 81, 224, 0.15)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  typeBadgeText: { color: '#A5B4FC', fontSize: FontSize.xs, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', padding: Spacing.xxl, gap: Spacing.sm },
  emptyTitle: { color: '#fff', fontSize: FontSize.lg, fontWeight: '700' },
  emptySubtitle: { color: Colors.dark.textMuted, fontSize: FontSize.sm, textAlign: 'center' },
});
