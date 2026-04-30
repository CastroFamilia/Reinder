/**
 * apps/mobile/src/features/search/components/search-onboarding-modal.tsx
 *
 * Modal fullscreen de onboarding de búsqueda — rediseñado como flujo de swipe.
 * El comprador responde a cada pregunta swipeando la tarjeta:
 *   → derecha = opción positiva / primera opción
 *   ← izquierda = opción negativa / segunda opción
 *
 * Idle >6s sin interacción → animación de mano tutorial que muestra cómo swipear.
 *
 * Usa PanResponder + Animated (no Reanimated) para evitar el warning
 * "Reading from value during component render".
 *
 * Story 2.9 — Task 8 (AC: 1, 5, 8) — Post-testing redesign
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { GlassPanel } from '../../../components/ui/glass-panel';
import { Colors, Radius, Spacing, Typography } from '../../../lib/tokens';
import type { SearchPreferences } from '@reinder/shared';

// ─── Constants ────────────────────────────────────────────────────────────────

const { width: SCREEN_W } = Dimensions.get('window');

/** Desplazamiento mínimo (px) para confirmar un swipe */
const SWIPE_THRESHOLD = SCREEN_W * 0.35;

/** Segundos de inactividad antes de mostrar el tutorial de mano */
const IDLE_SECONDS = 6;

// ─── Onboarding Steps ─────────────────────────────────────────────────────────

type OnboardingStep = {
  id: string;
  emoji: string;
  question: string;
  /** Opción al swipear → derecha */
  rightLabel: string;
  /** Opción al swipear ← izquierda */
  leftLabel: string;
  /**
   * Clave de SearchPreferences que modifica esta pregunta.
   * 'informational' = paso de UX sin mapeo directo a SearchPreferences.
   */
  key: 'informational' | 'maxPrice' | 'minRooms';
  /** Valor asignado si swipe → derecha */
  rightValue: string | number;
  /** Valor asignado si swipe ← izquierda */
  leftValue: string | number;
};

const STEPS: OnboardingStep[] = [
  {
    id: 'property-type',
    emoji: '🏠',
    question: '¿Qué tipo de propiedad buscas?',
    rightLabel: 'Casa',
    leftLabel: 'Piso',
    // Informational — no hay campo en SearchPreferences aún, se añadirá en Epic siguiente
    key: 'informational',
    rightValue: 'casa',
    leftValue: 'piso',
  },
  {
    id: 'transaction-type',
    emoji: '🔑',
    question: '¿Compra o alquiler?',
    rightLabel: 'Compra',
    leftLabel: 'Alquiler',
    // Informational — idem
    key: 'informational',
    rightValue: 'compra',
    leftValue: 'alquiler',
  },
  {
    id: 'price-range',
    emoji: '💶',
    question: '¿Cuál es tu presupuesto máximo?',
    rightLabel: 'Hasta 400.000€',
    leftLabel: 'Más de 400.000€',
    key: 'maxPrice',
    rightValue: 400000,
    leftValue: 800000,
  },
  {
    id: 'rooms',
    emoji: '🛏',
    question: '¿Cuántas habitaciones necesitas?',
    rightLabel: '2 o más hab.',
    leftLabel: 'No importa',
    key: 'minRooms',
    rightValue: 2,
    leftValue: 1,
  },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface SearchOnboardingModalProps {
  visible: boolean;
  onSave: (prefs: SearchPreferences) => void;
  onSkip: () => void;
}

// ─── Hand Tutorial Overlay ────────────────────────────────────────────────────

function HandTutorial({ visible }: { visible: boolean }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
      return;
    }

    // Fade in
    Animated.timing(opacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      // Loop: mano se mueve de izquierda a derecha y vuelve
      Animated.loop(
        Animated.sequence([
          Animated.timing(translateX, {
            toValue: 80,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(translateX, {
            toValue: -80,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(translateX, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          // Pausa
          Animated.delay(600),
        ]),
      ).start();
    });

    return () => {
      translateX.stopAnimation();
      opacity.stopAnimation();
    };
  }, [visible, translateX, opacity]);

  return (
    <Animated.View
      style={[styles.handContainer, { opacity }]}
      pointerEvents="none"
    >
      <Animated.Text style={[styles.handEmoji, { transform: [{ translateX }] }]}>
        👆
      </Animated.Text>
      <Text style={styles.handHint}>Desliza para elegir</Text>
    </Animated.View>
  );
}

// ─── Swipeable Card ───────────────────────────────────────────────────────────

interface SwipeCardProps {
  step: OnboardingStep;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  onInteraction: () => void;
}

function SwipeCard({ step, onSwipeRight, onSwipeLeft, onInteraction }: SwipeCardProps) {
  const pan = useRef(new Animated.ValueXY()).current;
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  // Reset on step change
  useEffect(() => {
    pan.setValue({ x: 0, y: 0 });
    setSwipeDirection(null);
  }, [step.id, pan]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          onInteraction();
        },
        onPanResponderMove: (_, gestureState) => {
          pan.setValue({ x: gestureState.dx, y: 0 });
          if (gestureState.dx > 20) setSwipeDirection('right');
          else if (gestureState.dx < -20) setSwipeDirection('left');
          else setSwipeDirection(null);
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx > SWIPE_THRESHOLD) {
            // Swipe right — fly out
            Animated.timing(pan, {
              toValue: { x: SCREEN_W * 1.5, y: 0 },
              duration: 250,
              useNativeDriver: true,
            }).start(() => onSwipeRight());
          } else if (gestureState.dx < -SWIPE_THRESHOLD) {
            // Swipe left — fly out
            Animated.timing(pan, {
              toValue: { x: -SCREEN_W * 1.5, y: 0 },
              duration: 250,
              useNativeDriver: true,
            }).start(() => onSwipeLeft());
          } else {
            // Spring back to center
            Animated.spring(pan, {
              toValue: { x: 0, y: 0 },
              useNativeDriver: true,
              friction: 5,
            }).start();
            setSwipeDirection(null);
          }
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [step.id],
  );

  const rotate = pan.x.interpolate({
    inputRange: [-SCREEN_W / 2, 0, SCREEN_W / 2],
    outputRange: ['-8deg', '0deg', '8deg'],
    extrapolate: 'clamp',
  });

  const rightLabelOpacity = pan.x.interpolate({
    inputRange: [20, 80],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const leftLabelOpacity = pan.x.interpolate({
    inputRange: [-80, -20],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={[
        styles.card,
        {
          transform: [{ translateX: pan.x }, { rotate }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      {/* Right label — aparece al deslizar derecha */}
      <Animated.View style={[styles.swipeLabel, styles.swipeLabelRight, { opacity: rightLabelOpacity }]}>
        <Text style={styles.swipeLabelText}>{step.rightLabel}</Text>
      </Animated.View>

      {/* Left label — aparece al deslizar izquierda */}
      <Animated.View style={[styles.swipeLabel, styles.swipeLabelLeft, { opacity: leftLabelOpacity }]}>
        <Text style={styles.swipeLabelText}>{step.leftLabel}</Text>
      </Animated.View>

      {/* Card content */}
      <Text style={styles.cardEmoji}>{step.emoji}</Text>
      <Text style={styles.cardQuestion}>{step.question}</Text>

      {/* Hints */}
      <View style={styles.hintsRow}>
        <View style={styles.hintChip}>
          <Text style={styles.hintArrow}>←</Text>
          <Text style={styles.hintText}>{step.leftLabel}</Text>
        </View>
        <View style={[styles.hintChip, styles.hintChipRight]}>
          <Text style={styles.hintText}>{step.rightLabel}</Text>
          <Text style={styles.hintArrow}>→</Text>
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Progress Dots ────────────────────────────────────────────────────────────

function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === current ? styles.dotActive : styles.dotInactive,
          ]}
        />
      ))}
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SearchOnboardingModal({
  visible,
  onSave,
  onSkip,
}: SearchOnboardingModalProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Partial<Record<'maxPrice' | 'minRooms', number>>>({});
  const [showHandTutorial, setShowHandTutorial] = useState(false);

  // Idle timer
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetIdleTimer = useCallback(() => {
    setShowHandTutorial(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setShowHandTutorial(true);
    }, IDLE_SECONDS * 1000);
  }, []);

  // Start idle timer when modal becomes visible
  useEffect(() => {
    if (visible) {
      setStepIndex(0);
      setAnswers({});
      resetIdleTimer();
    } else {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      setShowHandTutorial(false);
    }
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [visible, resetIdleTimer]);

  const handleInteraction = useCallback(() => {
    resetIdleTimer();
  }, [resetIdleTimer]);

  const recordAnswer = useCallback(
    (value: string | number) => {
      const step = STEPS[stepIndex];
      if (!step) return;

      // Solo actualizar answers si el paso tiene una clave de SearchPreferences real
      const newAnswers =
        step.key !== 'informational' && typeof value === 'number'
          ? { ...answers, [step.key]: value }
          : answers;

      setAnswers(newAnswers);
      resetIdleTimer();

      const nextIndex = stepIndex + 1;
      if (nextIndex >= STEPS.length) {
        // Todos los pasos completados — construir SearchPreferences y guardar
        const prefs: SearchPreferences = {
          zones: [], // El usuario puede refinar zonas luego desde el Perfil o ⚙️
          ...(newAnswers.maxPrice != null && { maxPrice: newAnswers.maxPrice }),
          ...(newAnswers.minRooms != null && { minRooms: newAnswers.minRooms }),
        };
        onSave(prefs);
      } else {
        setStepIndex(nextIndex);
      }
    },
    [stepIndex, answers, resetIdleTimer, onSave],
  );

  const handleSwipeRight = useCallback(() => {
    const step = STEPS[stepIndex];
    if (step) recordAnswer(step.rightValue);
  }, [stepIndex, recordAnswer]);

  const handleSwipeLeft = useCallback(() => {
    const step = STEPS[stepIndex];
    if (step) recordAnswer(step.leftValue);
  }, [stepIndex, recordAnswer]);

  const currentStep = STEPS[stepIndex];
  if (!currentStep) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
      testID="search-onboarding-modal"
    >
      <GlassPanel intensity="heavy" style={styles.background} testID="search-modal-glass">
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.brandName}>Reinder</Text>
          <Text style={styles.headerSubtitle}>Personaliza tu feed</Text>
        </View>

        {/* Progress dots */}
        <ProgressDots total={STEPS.length} current={stepIndex} />

        {/* Step counter */}
        <Text style={styles.stepCounter}>
          {stepIndex + 1} / {STEPS.length}
        </Text>

        {/* Swipe card area */}
        <View style={styles.cardArea}>
          <SwipeCard
            key={currentStep.id}
            step={currentStep}
            onSwipeRight={handleSwipeRight}
            onSwipeLeft={handleSwipeLeft}
            onInteraction={handleInteraction}
          />

          {/* Hand tutorial overlay */}
          <HandTutorial visible={showHandTutorial} />
        </View>

        {/* Manual buttons as fallback */}
        <View style={styles.buttonsRow}>
          <TouchableOpacity
            style={[styles.choiceBtn, styles.choiceBtnLeft]}
            onPress={() => {
              handleInteraction();
              handleSwipeLeft();
            }}
            accessibilityLabel={currentStep.leftLabel}
            accessibilityRole="button"
            testID={`onboarding-left-btn-${currentStep.id}`}
          >
            <Text style={styles.choiceBtnArrow}>←</Text>
            <Text style={styles.choiceBtnText}>{currentStep.leftLabel}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.choiceBtn, styles.choiceBtnRight]}
            onPress={() => {
              handleInteraction();
              handleSwipeRight();
            }}
            accessibilityLabel={currentStep.rightLabel}
            accessibilityRole="button"
            testID={`onboarding-right-btn-${currentStep.id}`}
          >
            <Text style={styles.choiceBtnText}>{currentStep.rightLabel}</Text>
            <Text style={styles.choiceBtnArrow}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Skip */}
        <TouchableOpacity
          onPress={onSkip}
          style={styles.skipBtn}
          testID="skip-button"
          accessibilityLabel="Ver todo el catálogo sin filtros"
          accessibilityRole="button"
        >
          <Text style={styles.skipText}>Ver todo el catálogo</Text>
        </TouchableOpacity>
      </GlassPanel>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  background: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },

  // Header
  headerContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  brandName: {
    fontSize: Typography.sizeDisplay,
    fontWeight: `${Typography.weightBold}`,
    color: Colors.accentPrimary,
    letterSpacing: -1,
  },
  headerSubtitle: {
    fontSize: Typography.sizeBody,
    color: Colors.textMuted,
    marginTop: 2,
  },

  // Progress dots
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: Colors.accentPrimary,
    width: 24,
  },
  dotInactive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  stepCounter: {
    fontSize: Typography.sizeSmall,
    color: Colors.textMuted,
    marginBottom: Spacing.lg,
  },

  // Card area
  cardArea: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Swipe card
  card: {
    width: SCREEN_W - Spacing.xl * 2,
    backgroundColor: 'rgba(30, 26, 21, 0.92)',
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.2)',
    padding: Spacing.xl,
    alignItems: 'center',
    // Shadow
    shadowColor: Colors.accentPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  cardEmoji: {
    fontSize: 72,
    marginBottom: Spacing.lg,
  },
  cardQuestion: {
    fontSize: Typography.sizeH2,
    fontWeight: `${Typography.weightBold}`,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 30,
    marginBottom: Spacing.xl,
  },

  // Hints inside card
  hintsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: Spacing.sm,
  },
  hintChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: Radius.btn,
    paddingVertical: 8,
    paddingHorizontal: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  hintChipRight: {
    justifyContent: 'flex-end',
    borderColor: 'rgba(255,107,0,0.25)',
  },
  hintArrow: {
    fontSize: Typography.sizeBody,
    color: Colors.accentPrimary,
    fontWeight: `${Typography.weightBold}`,
  },
  hintText: {
    fontSize: Typography.sizeSmall,
    color: Colors.textMuted,
    flex: 1,
  },

  // Swipe direction labels (appear during drag)
  swipeLabel: {
    position: 'absolute',
    top: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.btn,
    borderWidth: 2,
  },
  swipeLabelRight: {
    right: Spacing.md,
    borderColor: Colors.accentPrimary,
    backgroundColor: 'rgba(255,107,0,0.15)',
  },
  swipeLabelLeft: {
    left: Spacing.md,
    borderColor: Colors.accentReject,
    backgroundColor: 'rgba(139,58,58,0.15)',
  },
  swipeLabelText: {
    fontSize: Typography.sizeSmall,
    fontWeight: `${Typography.weightBold}`,
    color: Colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Hand tutorial
  handContainer: {
    position: 'absolute',
    bottom: -60,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  handEmoji: {
    fontSize: 48,
    transform: [{ rotate: '90deg' }],
  },
  handHint: {
    fontSize: Typography.sizeSmall,
    color: Colors.textMuted,
    marginTop: 8,
  },

  // Bottom buttons (accessibility fallback)
  buttonsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
    width: '100%',
  },
  choiceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: Radius.btn,
    borderWidth: 1.5,
    gap: 6,
  },
  choiceBtnLeft: {
    borderColor: Colors.accentReject,
    backgroundColor: 'rgba(139,58,58,0.1)',
  },
  choiceBtnRight: {
    borderColor: Colors.accentPrimary,
    backgroundColor: 'rgba(255,107,0,0.1)',
  },
  choiceBtnText: {
    fontSize: Typography.sizeSmall,
    fontWeight: `${Typography.weightMedium}`,
    color: Colors.textPrimary,
  },
  choiceBtnArrow: {
    fontSize: Typography.sizeBody,
    color: Colors.accentPrimary,
    fontWeight: `${Typography.weightBold}`,
  },

  // Skip
  skipBtn: {
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  skipText: {
    fontSize: Typography.sizeBody,
    color: Colors.textMuted,
  },
});
