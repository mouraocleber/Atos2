import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Linking,
  Platform,
  Alert,
  Image,
  TextInput,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, Ionicons, FontAwesome } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';
import api, { SERVER_URL } from '../services/api';
import { getRoomDetails } from '../services/group';

import { useAuth } from '../contexts/AuthContext';
import { useLocalization } from '../contexts/LocalizationContext';

interface UserProfile {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  role?: string;
}

export const POPULAR_LANGUAGES = [
  { code: 'pt-BR', name: 'Português', flag: '🇧🇷' },
  { code: 'pt-PT', name: 'Português (PT)', flag: '🇵🇹' },
  { code: 'en-US', name: 'English', flag: '🇺🇸' },
  { code: 'en-GB', name: 'English (UK)', flag: '🇬🇧' },
  { code: 'es-ES', name: 'Español', flag: '🇪🇸' },
  { code: 'es-MX', name: 'Español (MX)', flag: '🇲🇽' },
  { code: 'fr-FR', name: 'Français', flag: '🇫🇷' },
  { code: 'de-DE', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it-IT', name: 'Italiano', flag: '🇮🇹' },
  { code: 'zh-CN', name: '中文 (简体)', flag: '🇨🇳' },
  { code: 'zh-TW', name: '中文 (繁體)', flag: '🇹🇼' },
  { code: 'ja-JP', name: '日本語', flag: '🇯🇵' },
  { code: 'ko-KR', name: '한국어', flag: '🇰🇷' },
  { code: 'ru-RU', name: 'Русский', flag: '🇷🇺' },
  { code: 'ar-SA', name: 'العربية', flag: '🇸🇦' },
  { code: 'hi-IN', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'tr-TR', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'pl-PL', name: 'Polski', flag: '🇵🇱' },
  { code: 'nl-NL', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'sv-SE', name: 'Svenska', flag: '🇸🇪' },
  { code: 'da-DK', name: 'Dansk', flag: '🇩🇰' },
  { code: 'fi-FI', name: 'Suomi', flag: '🇫🇮' },
  { code: 'nb-NO', name: 'Norsk', flag: '🇳🇴' },
  { code: 'uk-UA', name: 'Українська', flag: '🇺🇦' },
  { code: 'id-ID', name: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'ms-MY', name: 'Bahasa Melayu', flag: '🇲🇾' },
  { code: 'th-TH', name: 'ภาษาไทย', flag: '🇹🇭' },
  { code: 'vi-VN', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'he-IL', name: 'עברית', flag: '🇮🇱' },
  { code: 'cs-CZ', name: 'Čeština', flag: '🇨🇿' },
  { code: 'ro-RO', name: 'Română', flag: '🇷🇴' },
  { code: 'hu-HU', name: 'Magyar', flag: '🇭🇺' },
  { code: 'el-GR', name: 'Ελληνικά', flag: '🇬🇷' },
];

function detectVisitorLanguage(): string {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.language) {
    const nav = navigator.language.toLowerCase();
    if (nav.startsWith('ko')) return 'ko-KR';
    if (nav.startsWith('ja')) return 'ja-JP';
    if (nav.startsWith('zh-tw') || nav.startsWith('zh-hk')) return 'zh-TW';
    if (nav.startsWith('zh')) return 'zh-CN';
    if (nav.startsWith('en-gb')) return 'en-GB';
    if (nav.startsWith('en')) return 'en-US';
    if (nav.startsWith('es-mx')) return 'es-MX';
    if (nav.startsWith('es')) return 'es-ES';
    if (nav.startsWith('fr')) return 'fr-FR';
    if (nav.startsWith('de')) return 'de-DE';
    if (nav.startsWith('it')) return 'it-IT';
    if (nav.startsWith('ru')) return 'ru-RU';
    if (nav.startsWith('ar')) return 'ar-SA';
    if (nav.startsWith('hi')) return 'hi-IN';
    if (nav.startsWith('tr')) return 'tr-TR';
    if (nav.startsWith('pl')) return 'pl-PL';
    if (nav.startsWith('nl')) return 'nl-NL';
    if (nav.startsWith('sv')) return 'sv-SE';
    if (nav.startsWith('da')) return 'da-DK';
    if (nav.startsWith('fi')) return 'fi-FI';
    if (nav.startsWith('no') || nav.startsWith('nb')) return 'nb-NO';
    if (nav.startsWith('uk')) return 'uk-UA';
    if (nav.startsWith('id')) return 'id-ID';
    if (nav.startsWith('ms')) return 'ms-MY';
    if (nav.startsWith('th')) return 'th-TH';
    if (nav.startsWith('vi')) return 'vi-VN';
    if (nav.startsWith('he') || nav.startsWith('iw')) return 'he-IL';
    if (nav.startsWith('cs')) return 'cs-CZ';
    if (nav.startsWith('ro')) return 'ro-RO';
    if (nav.startsWith('hu')) return 'hu-HU';
    if (nav.startsWith('el')) return 'el-GR';
    if (nav.startsWith('pt-pt')) return 'pt-PT';
    if (nav.startsWith('pt')) return 'pt-BR';
  }
  return 'pt-BR';
}

export default function ConnectScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user: currentUser, setLinkAccess, signInAsGuest, signInWithGoogle } = useAuth();
  const { setAppLanguage } = useLocalization();

  const roomId =
    (params.room as string) ||
    (params.roomId as string) ||
    '';
  const roomNameParam = (params.name as string) || (params.roomName as string) || '';
  const roomTypeParam = (params.type as string) || 'LECTURE';

  const userId =
    (params.user as string) ||
    (params.targetId as string) ||
    (params.id as string) ||
    '';

  const isRoom = Boolean(roomId);

  const [loading, setLoading] = useState<boolean>(true);
  const [recipient, setRecipient] = useState<UserProfile | null>(null);
  const [roomDetails, setRoomDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Estados de Conexão Rápida / Zero Fricção para Visitantes
  const [guestName, setGuestName] = useState('');
  const [guestLoading, setGuestLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(detectVisitorLanguage);

  useEffect(() => {
    let isMounted = true;

    if (roomId) {
      setLinkAccess(true);
      const fetchRoom = async () => {
        try {
          setLoading(true);
          setError(null);
          const roomData = await getRoomDetails(roomId);
          if (isMounted) {
            if (roomData && roomData.name) {
              setRoomDetails(roomData);
            } else {
              setRoomDetails({
                id: roomId,
                name: roomNameParam || (roomTypeParam === 'LECTURE' ? 'Tour com Guia' : 'Grupo'),
                type: roomTypeParam,
              });
            }
          }
        } catch (e) {
          if (isMounted) {
            setRoomDetails({
              id: roomId,
              name: roomNameParam || (roomTypeParam === 'LECTURE' ? 'Tour com Guia' : 'Grupo'),
              type: roomTypeParam,
            });
          }
        } finally {
          if (isMounted) setLoading(false);
        }
      };
      fetchRoom();
      return () => { isMounted = false; };
    }

    if (userId) {
      setLinkAccess(true);
      const fetchUser = async () => {
        try {
          setLoading(true);
          setError(null);
          const { data } = await api.get(`/users/${userId}`);

          if (isMounted) {
            if (data && data.success && data.data) {
              setRecipient(data.data);
            } else if (data && data.id) {
              setRecipient(data);
            } else {
              setRecipient({
                id: userId,
                name: `Usuário ${userId.substring(0, 8)}`,
              });
            }
          }
        } catch (err) {
          console.warn('Erro ao carregar usuário via QR Code:', err);
          if (isMounted) {
            setRecipient({
              id: userId,
              name: `Usuário (${userId.substring(0, 8)}...)`,
            });
          }
        } finally {
          if (isMounted) setLoading(false);
        }
      };
      fetchUser();
      return () => { isMounted = false; };
    }

    setLoading(false);
    setError('Identificador de conexão não fornecido.');
  }, [userId, roomId]);

  
  const handleJoinRoom = () => {
    if (!roomId) return;
    const title = roomNameParam || roomDetails?.name || 'Tour com Guia';
    const returnPath = `/chat/${roomId}?name=${encodeURIComponent(title)}&isRoom=true&roomType=${roomTypeParam}`;

    if (!currentUser) {
      router.push({
        pathname: '/(auth)/login',
        params: { redirectUrl: returnPath },
      });
      return;
    }

    router.replace({
      pathname: '/chat/[id]',
      params: {
        id: roomId,
        name: title,
        isRoom: 'true',
        roomType: roomTypeParam,
      },
    });
  };

  const handleQuickGuestConnect = async () => {
    setGuestLoading(true);
    try {
      await signInAsGuest(guestName.trim() || 'Visitante', selectedLanguage);
      await setAppLanguage(selectedLanguage as any);
      if (roomId) {
        const title = roomNameParam || roomDetails?.name || 'Tour com Guia';
        router.replace({
          pathname: '/chat/[id]',
          params: {
            id: roomId,
            name: title,
            isRoom: 'true',
            roomType: roomTypeParam,
          },
        });
      } else if (userId) {
        router.replace({
          pathname: '/chat/[id]',
          params: {
            id: userId,
            name: recipient?.name || 'Contato',
          },
        });
      }
    } catch (e: any) {
      Alert.alert('Erro ao Conectar', e.message || 'Falha ao iniciar conversa rápida.');
    } finally {
      setGuestLoading(false);
    }
  };

  const handleGoogleConnect = async () => {
    setGoogleLoading(true);
    try {
      const res = await signInWithGoogle();
      if (selectedLanguage && selectedLanguage !== 'pt-BR') {
        try {
          await api.put('/users/me', { preferredLanguage: selectedLanguage });
          await setAppLanguage(selectedLanguage as any);
        } catch (e) {}
      }
      const returnPath = roomId
        ? `/chat/${roomId}?name=${encodeURIComponent(roomNameParam || roomDetails?.name || 'Tour com Guia')}&isRoom=true&roomType=${roomTypeParam}`
        : `/chat/${userId}?name=${encodeURIComponent(recipient?.name || 'Contato')}`;

      if (res?.requires2FA) {
        router.push({
          pathname: '/(auth)/verify-otp',
          params: { mode: 'new_device', redirectUrl: returnPath },
        });
        return;
      }

      if (roomId) {
        const title = roomNameParam || roomDetails?.name || 'Tour com Guia';
        router.replace({
          pathname: '/chat/[id]',
          params: {
            id: roomId,
            name: title,
            isRoom: 'true',
            roomType: roomTypeParam,
          },
        });
      } else if (userId) {
        router.replace({
          pathname: '/chat/[id]',
          params: {
            id: userId,
            name: recipient?.name || 'Contato',
          },
        });
      }
    } catch (e: any) {
      if (e.message !== 'Login cancelado') {
        Alert.alert('Google Sign-In', e.message || 'Não foi possível entrar com Google.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleStartChat = () => {
    if (!userId) return;
    if (!currentUser) {
      // Turista não logado: redireciona para login/cadastro rápido e depois abre o chat
      const returnPath = `/chat/${userId}?name=${encodeURIComponent(recipient?.name || 'Contato')}`;
      router.push({
        pathname: '/(auth)/login',
        params: { redirectUrl: returnPath },
      });
      return;
    }

    router.replace({
      pathname: '/chat/[id]',
      params: {
        id: userId,
        name: recipient?.name || 'Contato',
      },
    });
  };

  const handleSendPayment = () => {
    if (!userId) return;
    if (!currentUser) {
      router.push({
        pathname: '/(auth)/login',
        params: { redirectUrl: `/(tabs)/wallet?targetId=${userId}` },
      });
      return;
    }

    router.replace({
      pathname: '/(tabs)/wallet',
      params: { targetId: userId },
    });
  };

  const handleOpenInApp = async () => {
    const deepLinkUrl = `atos2://connect?user=${userId}`;
    try {
      const supported = await Linking.canOpenURL(deepLinkUrl);
      if (supported) {
        await Linking.openURL(deepLinkUrl);
      } else {
        if (Platform.OS === 'web') {
          Alert.alert(
            'App AtoS2',
            'Você já está navegando no AtoS2 Web. Use as opções na tela para interagir com este contato.'
          );
        } else {
          Alert.alert('AtoS2 App', 'Não foi possível abrir o app diretamente.');
        }
      }
    } catch (e) {
      console.warn('Erro ao acionar deep link:', e);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/');
            }
          }}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Conexão AtoS2</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Colors.secondary} />
            <Text style={styles.loadingText}>Buscando perfil do contato...</Text>
          </View>
        ) : error && !recipient ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={64} color={Colors.error} />
            <Text style={styles.errorTitle}>QR Code Inválido</Text>
            <Text style={styles.errorSub}>{error}</Text>
            <TouchableOpacity
              style={styles.actionBtnPrimary}
              onPress={() => router.replace('/')}
            >
              <Text style={styles.actionBtnText}>Voltar ao Início</Text>
            </TouchableOpacity>
          </View>
        ) : isRoom ? (
          <View style={styles.card}>
            {/* Avatar do Modo Guia */}
            <View style={styles.avatarContainer}>
              <View style={[styles.avatarCircle, { backgroundColor: '#0284C7' }]}>
                <Feather name="headphones" size={40} color="#fff" />
              </View>
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
              </View>
            </View>

            <Text style={styles.userName}>{roomNameParam || roomDetails?.name || 'Modo Guia'}</Text>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 6, backgroundColor: '#E0F2FE', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
              <Feather name="headphones" size={14} color="#0369A1" />
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#0369A1' }}>
                🎧 Modo Guia • Tradução Simultânea Coletiva
              </Text>
            </View>

            <Text style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', marginHorizontal: 12, marginVertical: 8, lineHeight: 18 }}>
              Todos entram na mesma conversa e cada participante recebe o áudio traduzido automaticamente para o seu idioma nativo.
            </Text>

            <View style={styles.divider} />

            {/* Seletor de Idioma Nativo para Ouvir o Guia */}
            <View style={styles.langSelectorBox}>
              <View style={styles.langSelectorHeader}>
                <Text style={styles.langSelectorTitle}>🌐 Seu Idioma Nativo:</Text>
                <Text style={styles.langSelectorActive}>
                  {POPULAR_LANGUAGES.find(l => l.code === selectedLanguage)?.flag}{' '}
                  {POPULAR_LANGUAGES.find(l => l.code === selectedLanguage)?.name}
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.langScrollContent}
              >
                {POPULAR_LANGUAGES.map((lang) => {
                  const isSelected = selectedLanguage === lang.code;
                  return (
                    <TouchableOpacity
                      key={lang.code}
                      style={[styles.langChip, isSelected && styles.langChipSelected]}
                      onPress={() => {
                        setSelectedLanguage(lang.code);
                        setAppLanguage(lang.code as any);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.langChipFlag}>{lang.flag}</Text>
                      <Text style={[styles.langChipText, isSelected && styles.langChipTextSelected]}>
                        {lang.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {currentUser ? (
              <TouchableOpacity
                style={[styles.actionBtnPrimary, { backgroundColor: '#0284C7', marginTop: 12 }]}
                onPress={handleJoinRoom}
                activeOpacity={0.8}
              >
                <Feather name="headphones" size={20} color="#fff" />
                <Text style={[styles.actionBtnText, { color: '#fff', fontWeight: '800' }]}>
                  🎧 Entrar no Modo Guia Agora
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: '100%', alignItems: 'center', marginTop: 8 }}>
                {/* Botão Google (1 Toque) */}
                <TouchableOpacity
                  style={styles.googleActionBtn}
                  onPress={handleGoogleConnect}
                  disabled={googleLoading || guestLoading}
                  activeOpacity={0.85}
                >
                  {googleLoading ? (
                    <ActivityIndicator color="#333" />
                  ) : (
                    <>
                      <FontAwesome name="google" size={18} color="#DB4437" />
                      <Text style={styles.googleActionBtnText}>Continuar com o Google (1 Toque)</Text>
                    </>
                  )}
                </TouchableOpacity>

                <View style={styles.orDivider}>
                  <View style={styles.orLine} />
                  <Text style={styles.orText}>ou entrada rápida sem cadastro</Text>
                  <View style={styles.orLine} />
                </View>

                {/* Nome Opcional do Visitante */}
                <TextInput
                  style={styles.guestInput}
                  placeholder="Seu nome ou apelido (Opcional)"
                  placeholderTextColor="#64748b"
                  value={guestName}
                  onChangeText={setGuestName}
                  maxLength={40}
                />

                <TouchableOpacity
                  style={[styles.actionBtnPrimary, { backgroundColor: '#0284C7', marginTop: 8 }]}
                  onPress={handleQuickGuestConnect}
                  disabled={guestLoading || googleLoading}
                  activeOpacity={0.85}
                >
                  {guestLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Feather name="headphones" size={20} color="#fff" />
                      <Text style={[styles.actionBtnText, { color: '#fff', fontWeight: '800' }]}>
                        🎧 Entrar no Modo Guia com 1 Toque
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={[styles.actionBtnSecondary, { borderColor: '#0284C7', marginTop: 12 }]}
              onPress={() => {
                if (!currentUser) {
                  router.push({
                    pathname: '/(auth)/login',
                    params: { redirectUrl: '/(tabs)/wallet' },
                  });
                } else {
                  router.replace('/(tabs)/wallet');
                }
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="wallet-outline" size={20} color="#0284C7" />
              <Text style={[styles.actionBtnText, { color: '#0284C7' }]}>
                💳 Pagar / Dar Gorjeta ao Guia
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            {/* Avatar & Identificação */}
            <View style={styles.avatarContainer}>
              {recipient?.avatarUrl ? (
                <Image
                  source={{
                    uri: recipient.avatarUrl.startsWith('http')
                      ? recipient.avatarUrl
                      : `${SERVER_URL}${recipient.avatarUrl}`,
                  }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>
                    {recipient?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </Text>
                </View>
              )}
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
              </View>
            </View>

            <Text style={styles.userName}>{recipient?.name || 'Usuário AtoS2'}</Text>
            {recipient?.email && (
              <Text style={styles.userEmail}>{recipient.email}</Text>
            )}
            <Text style={styles.userBadge}>
              <Feather name="shield" size={12} color={Colors.secondary} /> Conexão Segura P2P
            </Text>

            <View style={styles.divider} />

            {/* Ações principais / Zero Fricção */}
            {!currentUser ? (
              <View style={{ width: '100%', alignItems: 'center' }}>
                <Text style={styles.sectionTitle}>Conexão Instantânea Sem Fricção</Text>

                {/* Seletor de Idioma do Visitante */}
                <View style={styles.langSelectorBox}>
                  <View style={styles.langSelectorHeader}>
                    <Text style={styles.langSelectorTitle}>🌐 Seu Idioma Nativo:</Text>
                    <Text style={styles.langSelectorActive}>
                      {POPULAR_LANGUAGES.find(l => l.code === selectedLanguage)?.flag}{' '}
                      {POPULAR_LANGUAGES.find(l => l.code === selectedLanguage)?.name}
                    </Text>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.langScrollContent}
                  >
                    {POPULAR_LANGUAGES.map((lang) => {
                      const isSelected = selectedLanguage === lang.code;
                      return (
                        <TouchableOpacity
                          key={lang.code}
                          style={[styles.langChip, isSelected && styles.langChipSelected]}
                          onPress={() => {
                            setSelectedLanguage(lang.code);
                            setAppLanguage(lang.code as any);
                          }}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.langChipFlag}>{lang.flag}</Text>
                          <Text style={[styles.langChipText, isSelected && styles.langChipTextSelected]}>
                            {lang.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
                
                {/* Botão Google (1 Toque) */}
                <TouchableOpacity
                  style={styles.googleActionBtn}
                  onPress={handleGoogleConnect}
                  disabled={googleLoading || guestLoading}
                  activeOpacity={0.85}
                >
                  {googleLoading ? (
                    <ActivityIndicator color="#333" />
                  ) : (
                    <>
                      <FontAwesome name="google" size={18} color="#DB4437" />
                      <Text style={styles.googleActionBtnText}>Continuar com o Google (1 Toque)</Text>
                    </>
                  )}
                </TouchableOpacity>

                <View style={styles.orDivider}>
                  <View style={styles.orLine} />
                  <Text style={styles.orText}>ou entrar como visitante</Text>
                  <View style={styles.orLine} />
                </View>

                {/* Nome Opcional do Visitante */}
                <TextInput
                  style={styles.guestInput}
                  placeholder="Seu nome ou apelido (Opcional)"
                  placeholderTextColor="#64748b"
                  value={guestName}
                  onChangeText={setGuestName}
                  maxLength={40}
                />

                {/* Botão Conectar com 1 Clique */}
                <TouchableOpacity
                  style={[styles.actionBtnPrimary, { backgroundColor: Colors.secondary }]}
                  onPress={handleQuickGuestConnect}
                  disabled={guestLoading || googleLoading}
                  activeOpacity={0.85}
                >
                  {guestLoading ? (
                    <ActivityIndicator color="#041527" />
                  ) : (
                    <>
                      <Feather name="zap" size={20} color="#041527" />
                      <Text style={[styles.actionBtnText, { color: '#041527', fontWeight: '800' }]}>
                        ⚡ Iniciar Conversa com 1 Clique
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Link para quem já tem conta */}
                <TouchableOpacity
                  style={styles.alreadyHaveAccountBtn}
                  onPress={() => {
                    const returnPath = `/chat/${userId}?name=${encodeURIComponent(recipient?.name || 'Contato')}`;
                    router.push({
                      pathname: '/(auth)/login',
                      params: { redirectUrl: returnPath },
                    });
                  }}
                >
                  <Text style={styles.alreadyHaveAccountText}>
                    Já tem conta no AtoS2? <Text style={{ color: Colors.secondary, fontWeight: '700' }}>Entrar com E-mail</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ width: '100%', alignItems: 'center' }}>
                <Text style={styles.sectionTitle}>Conectado como {currentUser.name}</Text>

                <TouchableOpacity
                  style={[styles.actionBtnPrimary, { backgroundColor: Colors.secondary }]}
                  onPress={handleStartChat}
                >
                  <Ionicons name="chatbubbles" size={20} color="#041527" />
                  <Text style={[styles.actionBtnText, { color: '#041527' }]}>
                    Iniciar Chat com Tradução ao Vivo
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtnSecondary, { borderColor: Colors.secondary }]}
                  onPress={handleSendPayment}
                >
                  <Ionicons name="wallet-outline" size={20} color={Colors.secondary} />
                  <Text style={[styles.actionBtnText, { color: Colors.secondary }]}>
                    Enviar Pagamento / Transferência
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {Platform.OS === 'web' && (
              <TouchableOpacity
                style={styles.actionBtnGhost}
                onPress={handleOpenInApp}
              >
                <Feather name="external-link" size={18} color={Colors.dark.textMuted} />
                <Text style={styles.actionBtnGhostText}>Abrir no aplicativo AtoS2</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#041527',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#143152',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0B2039',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  loadingBox: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: FontSize.md,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#0B2039',
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#143152',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: Spacing.md,
  },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.primary,
    borderWidth: 3,
    borderColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: Colors.secondary,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 38,
    fontWeight: '800',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#0B2039',
    borderRadius: 12,
  },
  userName: {
    color: '#FFF',
    fontSize: FontSize.xl,
    fontWeight: '700',
    textAlign: 'center',
  },
  userEmail: {
    color: Colors.dark.textMuted,
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  userBadge: {
    color: Colors.secondary,
    fontSize: FontSize.xs,
    fontWeight: '600',
    marginTop: Spacing.xs,
    backgroundColor: 'rgba(255, 200, 87, 0.12)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.full,
  },
  divider: {
    height: 1,
    backgroundColor: '#143152',
    width: '100%',
    marginVertical: Spacing.lg,
  },
  sectionTitle: {
    color: '#94a3b8',
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  actionBtnPrimary: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  actionBtnSecondary: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    marginBottom: Spacing.md,
  },
  actionBtnText: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  actionBtnGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  actionBtnGhostText: {
    color: Colors.dark.textMuted,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  errorCard: {
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
  },
  errorTitle: {
    color: '#FFF',
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  errorSub: {
    color: Colors.dark.textMuted,
    fontSize: FontSize.md,
    textAlign: 'center',
  },
  guestInput: {
    width: '100%',
    backgroundColor: '#07182C',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    color: '#FFF',
    fontSize: FontSize.md,
    marginBottom: Spacing.sm,
  },
  googleActionBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: '#FFF',
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
  },
  googleActionBtnText: {
    color: '#1F2937',
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: Spacing.sm,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#1e3a5f',
  },
  orText: {
    color: '#64748b',
    fontSize: FontSize.xs,
    marginHorizontal: Spacing.sm,
  },
  alreadyHaveAccountBtn: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  alreadyHaveAccountText: {
    color: '#94a3b8',
    fontSize: FontSize.xs,
    textAlign: 'center',
  },
  langSelectorBox: {
    width: '100%',
    backgroundColor: '#07182C',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  langSelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
    paddingHorizontal: 4,
  },
  langSelectorTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  langSelectorActive: {
    color: Colors.secondary,
    fontSize: 12,
    fontWeight: '700',
  },
  langScrollContent: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  langChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0E2849',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  langChipSelected: {
    backgroundColor: 'rgba(255, 200, 87, 0.18)',
    borderColor: Colors.secondary,
  },
  langChipFlag: {
    fontSize: 15,
  },
  langChipText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  langChipTextSelected: {
    color: Colors.secondary,
    fontWeight: '800',
  },
});
