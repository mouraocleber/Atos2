import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import {
  liveTranslationService,
  TranslationState,
  TranslationResult,
} from '../../services/LiveTranslationService';

export default function ListeningScreen() {
  const { user } = useAuth();
  const { language } = useLocalization();

  // Idioma de destino do usuário extraído automaticamente do cadastro
  const userTargetLanguage = user?.preferredLanguage || language || 'pt-BR';

  const [state, setState] = useState<TranslationState>('idle');
  const [detectedLangName, setDetectedLangName] = useState<string>('Auto-Detectando...');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [history, setHistory] = useState<TranslationResult[]>([]);

  // Animação de pulso do botão central
  const pulseAnim = useRef(new Animated.Value(1)).current;
  // Animação das barras do equalizador
  const barHeight1 = useRef(new Animated.Value(15)).current;
  const barHeight2 = useRef(new Animated.Value(25)).current;
  const barHeight3 = useRef(new Animated.Value(18)).current;
  const barHeight4 = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Configura os callbacks do serviço
    liveTranslationService.setCallbacks({
      onStateChange: (newState) => setState(newState),
      onDetectedLanguage: (langName) => setDetectedLangName(langName),
      onTranslationResult: (result) => {
        setHistory((prev) => [result, ...prev.slice(0, 15)]);
      },
      onAudioLevel: (level) => {
        setAudioLevel(level);
        animateEqualizerBars(level);
      },
      onError: (msg) => {
        Alert.alert('Modo Escuta', msg);
      },
    });

    return () => {
      liveTranslationService.stopListening();
    };
  }, []);

  // Efeito da animação de pulso quando o modo escuta está ativo
  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;

    if (state === 'listening' || state === 'processing' || state === 'speaking') {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    } else {
      pulseAnim.setValue(1);
    }

    return () => {
      if (animation) animation.stop();
    };
  }, [state]);

  const animateEqualizerBars = (level: number) => {
    const factor = Math.max(0.2, level);
    Animated.parallel([
      Animated.timing(barHeight1, { toValue: 10 + factor * 35, duration: 100, useNativeDriver: false }),
      Animated.timing(barHeight2, { toValue: 15 + factor * 50, duration: 100, useNativeDriver: false }),
      Animated.timing(barHeight3, { toValue: 12 + factor * 40, duration: 100, useNativeDriver: false }),
      Animated.timing(barHeight4, { toValue: 18 + factor * 45, duration: 100, useNativeDriver: false }),
    ]).start();
  };

  const toggleListening = async () => {
    if (state === 'idle') {
      const success = await liveTranslationService.startListening(userTargetLanguage);
      if (!success) {
        Alert.alert('Erro', 'Não foi possível ativar o Modo Escuta. Verifique as permissões de áudio.');
      }
    } else {
      await liveTranslationService.stopListening();
    }
  };

  const handleTestTrigger = async () => {
    if (state === 'idle') {
      await liveTranslationService.startListening(userTargetLanguage);
    }
    // Dispara simulação de áudio captado
    await liveTranslationService.processAudioChunk('simulated_audio_uri');
  };

  const getStatusText = () => {
    switch (state) {
      case 'listening':
        return 'Escutando ambiente (Aguardando fala)...';
      case 'processing':
        return 'Frase capturada! IA traduzindo...';
      case 'speaking':
        return 'Transmitindo voz traduzida para o fone...';
      case 'error':
        return 'Erro na captação';
      default:
        return 'Toque para ativar o Modo Escuta (VAD)';
    }
  };

  const getStatusBadgeColor = () => {
    switch (state) {
      case 'listening':
        return '#10b981'; // Verde brilhante
      case 'processing':
        return '#f59e0b'; // Âmbar
      case 'speaking':
        return '#8b5cf6'; // Roxo
      case 'error':
        return '#ef4444'; // Vermelho
      default:
        return '#64748b'; // Cinza
    }
  };

  return (
    <View style={styles.container}>
      {/* Header com Informações de Idioma Automático */}
      <View style={styles.headerCard}>
        <View style={styles.langRow}>
          <View style={styles.langItem}>
            <Text style={styles.langLabel}>Origem (Voz na rua)</Text>
            <View style={styles.autoBadge}>
              <Feather name="cpu" size={14} color={Colors.primary} />
              <Text style={styles.autoBadgeText}>Auto-Detectar IA</Text>
            </View>
            {state !== 'idle' && (
              <Text style={styles.detectedText}>Detectado: {detectedLangName}</Text>
            )}
          </View>

          <View style={styles.arrowContainer}>
            <Feather name="arrow-right" size={20} color="#94a3b8" />
          </View>

          <View style={styles.langItem}>
            <Text style={styles.langLabel}>Seu Fone (Cadastro)</Text>
            <View style={styles.userLangBadge}>
              <Feather name="headphones" size={14} color="#22c55e" />
              <Text style={styles.userLangText}>
                {userTargetLanguage === 'pt-BR' ? 'Português (BR)' : userTargetLanguage}
              </Text>
            </View>
            <Text style={styles.profileSubtext}>Perfil de {user?.name?.split(' ')[0] || 'Usuário'}</Text>
          </View>
        </View>
      </View>

      {/* Área Central: Botão de Escuta e Visualizador de Áudio */}
      <View style={styles.centerSection}>
        {/* Animação de ondas de áudio */}
        <View style={styles.equalizerContainer}>
          <Animated.View style={[styles.eqBar, { height: barHeight1, backgroundColor: getStatusBadgeColor() }]} />
          <Animated.View style={[styles.eqBar, { height: barHeight2, backgroundColor: getStatusBadgeColor() }]} />
          <Animated.View style={[styles.eqBar, { height: barHeight3, backgroundColor: getStatusBadgeColor() }]} />
          <Animated.View style={[styles.eqBar, { height: barHeight4, backgroundColor: getStatusBadgeColor() }]} />
        </View>

        {/* Botão Pulsante Principal */}
        <TouchableOpacity activeOpacity={0.8} onPress={toggleListening} style={styles.buttonWrapper}>
          <Animated.View
            style={[
              styles.pulseRing,
              {
                borderColor: getStatusBadgeColor(),
                transform: [{ scale: pulseAnim }],
                opacity: state === 'idle' ? 0.3 : 0.6,
              },
            ]}
          />
          <View style={[styles.mainButton, { backgroundColor: getStatusBadgeColor() }]}>
            <Feather
              name={state === 'idle' ? 'mic-off' : 'mic'}
              size={48}
              color="#ffffff"
            />
          </View>
        </TouchableOpacity>

        <Text style={styles.statusText}>{getStatusText()}</Text>

        {/* Botão de teste rápido de áudio */}
        <TouchableOpacity style={styles.testBtn} onPress={handleTestTrigger}>
          <Feather name="play-circle" size={16} color={Colors.primary} />
          <Text style={styles.testBtnText}>Simular Captação de Voz</Text>
        </TouchableOpacity>
      </View>

      {/* Histórico das Falas Traduzidas em Tempo Real */}
      <View style={styles.historySection}>
        <View style={styles.historyHeader}>
          <Feather name="activity" size={16} color={Colors.primary} />
          <Text style={styles.historyTitle}>Transcrição em Tempo Real</Text>
        </View>

        <ScrollView style={styles.historyScroll} contentContainerStyle={styles.historyContent}>
          {history.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Feather name="headphones" size={32} color="#475569" />
              <Text style={styles.emptyText}>
                Ande na rua com seu fone de ouvido conectado. A tradução será transmitida diretamente ao seu ouvido.
              </Text>
            </View>
          ) : (
            history.map((item, index) => (
              <View key={index} style={styles.historyCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.detectedTag}>
                    <Text style={styles.detectedTagText}>Fala: {item.detectedLanguageName}</Text>
                  </View>
                  <Text style={styles.timeTag}>Agora</Text>
                </View>
                <Text style={styles.originalText}>"{item.originalText}"</Text>
                <View style={styles.translatedRow}>
                  <Feather name="volume-2" size={16} color="#22c55e" />
                  <Text style={styles.translatedText}>{item.translatedText}</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070f1e',
    padding: 16,
  },
  headerCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginTop: 8,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  langItem: {
    flex: 1,
    alignItems: 'flex-start',
  },
  langLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 6,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  autoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 200, 87, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 200, 87, 0.3)',
  },
  autoBadgeText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  detectedText: {
    fontSize: 11,
    color: '#38bdf8',
    marginTop: 4,
    fontWeight: '600',
  },
  arrowContainer: {
    paddingHorizontal: 8,
  },
  userLangBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  userLangText: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: '700',
  },
  profileSubtext: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
  },
  centerSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 24,
  },
  equalizerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    height: 60,
    marginBottom: 16,
  },
  eqBar: {
    width: 8,
    borderRadius: 4,
  },
  buttonWrapper: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
  },
  mainButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  statusText: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 20,
    textAlign: 'center',
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    backgroundColor: 'rgba(255, 200, 87, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 200, 87, 0.2)',
  },
  testBtnText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  historySection: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  historyTitle: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '700',
  },
  historyScroll: {
    flex: 1,
  },
  historyContent: {
    gap: 10,
  },
  emptyHistory: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  historyCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  detectedTag: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  detectedTagText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '600',
  },
  timeTag: {
    color: '#64748b',
    fontSize: 10,
  },
  originalText: {
    color: '#94a3b8',
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 6,
  },
  translatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  translatedText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
});
