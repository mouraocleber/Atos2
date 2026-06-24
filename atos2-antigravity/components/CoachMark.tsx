import React, { useEffect, useRef, useState, useCallback, RefObject } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  Dimensions, Animated, Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, FontSize, BorderRadius, Spacing } from '../constants/theme';

const { width: W, height: H } = Dimensions.get('window');
const OVERLAY_COLOR = 'rgba(0,0,0,0.78)';

export interface CoachStep {
  targetRef: RefObject<View | null>;
  title: string;
  description: string;
  tooltipPosition?: 'top' | 'bottom' | 'auto'; // auto = detecta se tem espaço abaixo
}

interface TargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Props {
  steps: CoachStep[];
  visible: boolean;
  onComplete: () => void;
  accentColor?: string;
}

export default function CoachMark({ steps, visible, onComplete, accentColor = Colors.secondary }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const tooltipAnim = useRef(new Animated.Value(0)).current;

  const measureTarget = useCallback((stepIndex: number) => {
    if (stepIndex >= steps.length) return;
    const ref = steps[stepIndex]?.targetRef?.current;
    if (!ref) {
      setTargetRect(null);
      return;
    }
    // Aguarda 1 frame para a UI estar pronta
    setTimeout(() => {
      ref.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) {
          setTargetRect({ x, y, width, height });
        } else {
          setTargetRect(null);
        }
      });
    }, 80);
  }, [steps]);

  useEffect(() => {
    if (visible) {
      setCurrentStep(0);
      measureTarget(0);
      tooltipAnim.setValue(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
    } else {
      fadeAnim.setValue(0);
      setTargetRect(null);
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      tooltipAnim.setValue(0);
      measureTarget(currentStep);
      Animated.spring(tooltipAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 9 }).start();
    }
  }, [currentStep, visible]);

  const goNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(onComplete);
    }
  };

  const skip = () => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(onComplete);
  };

  if (!visible) return null;

  const PADDING = 8; // halo ao redor do target

  // Posição do tooltip
  const getTooltipStyle = () => {
    if (!targetRect) return { top: H / 2 - 80 };

    const spaceBelow = H - (targetRect.y + targetRect.height);
    const spaceAbove = targetRect.y;
    const TOOLTIP_H = 140;
    const pref = steps[currentStep].tooltipPosition;

    // Se preferir 'top' OU se não houver espaço embaixo e houver mais espaço acima
    if (pref === 'top' || (spaceBelow < TOOLTIP_H + 40 && spaceAbove > spaceBelow)) {
      return { bottom: H - targetRect.y + PADDING + 12 };
    }
    return { top: targetRect.y + targetRect.height + PADDING + 12 };
  };

  const arrowPointsUp = () => {
    if (!targetRect) return true;
    const spaceBelow = H - (targetRect.y + targetRect.height);
    const spaceAbove = targetRect.y;
    const TOOLTIP_H = 140;
    const pref = steps[currentStep].tooltipPosition;
    
    if (pref === 'top' || (spaceBelow < TOOLTIP_H + 40 && spaceAbove > spaceBelow)) {
      return false; // tooltip acima → flecha aponta para baixo (para o alvo)
    }
    return true; // tooltip abaixo → flecha aponta para cima (para o alvo)
  };

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={skip}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>

        {targetRect ? (
          <>
            {/* Topo */}
            <View style={[styles.overlay, { top: 0, left: 0, right: 0, height: targetRect.y - PADDING }]} />
            {/* Esquerda */}
            <View style={[styles.overlay, {
              top: targetRect.y - PADDING,
              left: 0,
              width: targetRect.x - PADDING,
              height: targetRect.height + PADDING * 2,
            }]} />
            {/* Direita */}
            <View style={[styles.overlay, {
              top: targetRect.y - PADDING,
              left: targetRect.x + targetRect.width + PADDING,
              right: 0,
              height: targetRect.height + PADDING * 2,
            }]} />
            {/* Base */}
            <View style={[styles.overlay, {
              top: targetRect.y + targetRect.height + PADDING,
              left: 0,
              right: 0,
              bottom: 0,
            }]} />

            {/* Borda brilhante ao redor do alvo */}
            <View style={[styles.targetHighlight, {
              top: targetRect.y - PADDING,
              left: targetRect.x - PADDING,
              width: targetRect.width + PADDING * 2,
              height: targetRect.height + PADDING * 2,
              borderColor: accentColor,
            }]} />
          </>
        ) : (
          // Sem target → overlay completo
          <View style={[styles.overlay, StyleSheet.absoluteFill]} />
        )}

        {/* Tooltip */}
        <Animated.View
          style={[
            styles.tooltip,
            getTooltipStyle(),
            {
              opacity: tooltipAnim,
              transform: [{ scale: tooltipAnim.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) }],
            },
          ]}
        >
          {/* Seta */}
          {targetRect && (
            <View style={[
              styles.tooltipArrow,
              arrowPointsUp()
                ? { top: -8, borderBottomColor: Colors.light.surface, borderBottomWidth: 8, borderTopWidth: 0 }
                : { bottom: -8, borderTopColor: Colors.light.surface, borderTopWidth: 8, borderBottomWidth: 0 },
              { left: Math.max(16, Math.min(targetRect.x + targetRect.width / 2 - 12 - 20, W - 56)) - 20 },
            ]} />
          )}

          {/* Cabeçalho */}
          <View style={styles.tooltipHeader}>
            <Text style={[styles.tooltipTitle, { color: accentColor }]}>
              {steps[currentStep]?.title}
            </Text>
            <Text style={styles.stepCounter}>{currentStep + 1}/{steps.length}</Text>
          </View>

          <Text style={styles.tooltipDesc}>{steps[currentStep]?.description}</Text>

          {/* Ações */}
          <View style={styles.tooltipActions}>
            <TouchableOpacity onPress={skip} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.skipText}>Pular</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.nextBtn, { backgroundColor: accentColor }]} onPress={goNext}>
              <Text style={styles.nextBtnText}>
                {currentStep < steps.length - 1 ? 'Próximo' : 'Entendi!'}
              </Text>
              <Feather
                name={currentStep < steps.length - 1 ? 'arrow-right' : 'check'}
                size={15}
                color={Colors.primaryDark}
              />
            </TouchableOpacity>
          </View>

          {/* Progress dots */}
          <View style={styles.dotsRow}>
            {steps.map((_, i) => (
              <View key={i} style={[styles.dot, i === currentStep && { ...styles.dotActive, backgroundColor: accentColor }]} />
            ))}
          </View>
        </Animated.View>

      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    backgroundColor: OVERLAY_COLOR,
  },
  targetHighlight: {
    position: 'absolute',
    borderRadius: 10,
    borderWidth: 2.5,
  },
  tooltip: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: Colors.light.surface,
    borderRadius: BorderRadius.lg,
    padding: 18,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  tooltipArrow: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  tooltipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  tooltipTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    flex: 1,
  },
  stepCounter: {
    fontSize: FontSize.xs,
    color: Colors.light.textMuted,
    fontWeight: '600',
  },
  tooltipDesc: {
    color: Colors.light.textSecondary,
    fontSize: FontSize.sm,
    lineHeight: 20,
    marginBottom: 16,
  },
  tooltipActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  skipText: {
    color: Colors.light.textMuted,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: BorderRadius.full,
  },
  nextBtnText: {
    color: Colors.primaryDark,
    fontSize: FontSize.sm,
    fontWeight: '800',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.light.border,
  },
  dotActive: {
    width: 16,
    borderRadius: 3,
  },
});
