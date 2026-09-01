import React, { useRef, useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  Dimensions, Animated, FlatList, Platform, StatusBar,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, FontSize, BorderRadius, Spacing } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

const { width: W, height: H } = Dimensions.get('window');

interface Slide {
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  gradientColors: readonly [string, string];
  title: string;
  subtitle: string;
  highlight: string; // palavra em destaque
}

const SLIDES: Slide[] = [
  {
    icon: 'globe',
    iconColor: '#fff',
    gradientColors: ['#0D2C54', '#143152'],
    title: 'Bem-vindo ao Atos2',
    subtitle: 'A plataforma que conecta pessoas e negócios com Moeda Local e Dólar Digital',
    highlight: 'USDC',
  },
  {
    icon: 'message-circle',
    iconColor: '#fff',
    gradientColors: ['#143152', '#1a4070'],
    title: 'Conecte, Converse\ne Negocie',
    subtitle: 'Chat seguro, Vitrine de produtos e reservas com pagamento rápido em',
    highlight: 'USDC',
  },
  {
    icon: 'credit-card',
    iconColor: '#fff',
    gradientColors: ['#1a4070', '#0D2C54'],
    title: 'Sua Carteira Digital',
    subtitle: 'Saldo em Moeda Local, USDC, PIX, transferências e pagamentos — tudo com',
    highlight: 'segurança',
  },
];

interface Props {
  visible: boolean;
  onDone: () => void;
}

export default function WelcomeShowcase({ visible, onDone }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      setCurrentIndex(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    }
  }, [visible]);

  const goNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      const next = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
      setCurrentIndex(next);
    } else {
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(onDone);
    }
  };

  const skip = () => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(onDone);
  };

  const renderSlide = ({ item }: { item: Slide }) => (
    <View style={styles.slide}>
      <LinearGradient colors={item.gradientColors} style={StyleSheet.absoluteFill} />

      {/* Círculo do ícone */}
      <View style={styles.iconWrapper}>
        <View style={styles.iconOuterRing} />
        <View style={styles.iconInnerRing} />
        <View style={styles.iconCircle}>
          <Feather name={item.icon} size={52} color={item.iconColor} />
        </View>
      </View>

      {/* Texto */}
      <View style={styles.textArea}>
        <Text style={styles.slideTitle}>{item.title}</Text>
        <Text style={styles.slideSubtitle}>
          {item.subtitle}{' '}
          <Text style={styles.slideHighlight}>{item.highlight}</Text>
          {'.'}
        </Text>
      </View>
    </View>
  );

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent={false} animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        {/* Botão pular */}
        <TouchableOpacity style={styles.skipBtn} onPress={skip}>
          <Text style={styles.skipText}>Pular</Text>
        </TouchableOpacity>

        {/* Slides */}
        <FlatList
          ref={flatListRef}
          data={SLIDES}
          renderItem={renderSlide}
          keyExtractor={(_, i) => String(i)}
          horizontal
          pagingEnabled
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          style={{ flex: 1 }}
        />

        {/* Footer com dots + botão */}
        <View style={styles.footer}>
          {/* Dots */}
          <View style={styles.dotsRow}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === currentIndex && styles.dotActive]}
              />
            ))}
          </View>

          {/* Botão avançar / começar */}
          <TouchableOpacity style={styles.nextBtn} onPress={goNext} activeOpacity={0.85}>
            <Text style={styles.nextBtnText}>
              {currentIndex < SLIDES.length - 1 ? 'Próximo' : 'Começar'}
            </Text>
            <Feather
              name={currentIndex < SLIDES.length - 1 ? 'arrow-right' : 'check'}
              size={18}
              color="#fff"
            />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  slide: {
    width: W,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: (StatusBar.currentHeight || 44) + 40,
    paddingBottom: 32,
  },
  // Ícone com anéis decorativos
  iconWrapper: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48,
  },
  iconOuterRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 80,
    borderWidth: 1.5,
    borderColor: 'rgba(255,200,87,0.2)',
  },
  iconInnerRing: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1.5,
    borderColor: 'rgba(255,200,87,0.35)',
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,200,87,0.18)',
    borderWidth: 2,
    borderColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Textos
  textArea: {
    alignItems: 'center',
    gap: 16,
  },
  slideTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  slideSubtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 24,
  },
  slideHighlight: {
    color: Colors.secondary,
    fontWeight: '800',
  },
  // Skip
  skipBtn: {
    position: 'absolute',
    top: (StatusBar.currentHeight || 44) + 8,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  skipText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  // Footer
  footer: {
    paddingHorizontal: 32,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    gap: 24,
    alignItems: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.secondary,
    borderRadius: 4,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.secondary,
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
    width: W - 64,
    justifyContent: 'center',
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  nextBtnText: {
    color: Colors.primaryDark,
    fontSize: FontSize.md,
    fontWeight: '800',
  },
});
