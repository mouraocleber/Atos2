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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';
import api, { SERVER_URL } from '../services/api';

interface UserProfile {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  role?: string;
}

export default function ConnectScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const userId =
    (params.user as string) ||
    (params.targetId as string) ||
    (params.id as string) ||
    '';

  const [loading, setLoading] = useState<boolean>(true);
  const [recipient, setRecipient] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setError('Identificador de usuário não fornecido.');
      return;
    }

    let isMounted = true;

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
            // Fallback com o ID recebido
            setRecipient({
              id: userId,
              name: `Usuário ${userId.substring(0, 8)}`,
            });
          }
        }
      } catch (err) {
        console.warn('Erro ao carregar usuário via QR Code:', err);
        if (isMounted) {
          // Permite prosseguir usando o próprio ID caso a busca direta falhe
          setRecipient({
            id: userId,
            name: `Usuário (${userId.substring(0, 8)}...)`,
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchUser();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const handleStartChat = () => {
    if (!userId) return;
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

            {/* Ações principais */}
            <Text style={styles.sectionTitle}>O que você deseja fazer?</Text>

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
});
