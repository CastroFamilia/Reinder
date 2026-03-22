/**
 * apps/mobile/src/features/swipe/components/match-payoff.tsx
 *
 * MatchPayoff — overlay de celebración que aparece cuando el comprador hace match.
 * Animación naranja expansiva + auto-cierre en 1.5s (UX-DR4).
 *
 * Estados: appear → celebrating → dismiss
 * Curva: withSpring con damping:8, stiffness:120 (~ease-spring UX token)
 * Duración visible: PAYOFF_AUTOHIDE_MS (1500ms)
 *
 * SFX: expo-av reproducción de assets/sounds/match.mp3
 * Si el archivo no existe o expo-av no está disponible, falla silenciosamente (try/catch).
 *
 * Accesibilidad: respeta prefers-reduced-motion (Animated.loop desactivado).
 *
 * Source: epics.md#Story-2.3 (AC2, AC3)
 * Source: ux-design-specification.md#Component-Strategy (MatchPayoff)
 * Source: ux-design-specification.md#UX-Consistency-Patterns (animation tokens)
 */
import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  AccessibilityInfo,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Colors, Typography, SurfaceColors } from '../../../lib/tokens';
import { PAYOFF_AUTOHIDE_MS } from '@reinder/shared';

// Spring config que aproxima el --ease-spring UX token: cubic-bezier(0.34, 1.56, 0.64, 1)
const SPRING_CONFIG = {
  damping: 8,
  stiffness: 120,
} as const;

interface MatchPayoffProps {
  /** Si true, la animación arranca y el overlay es visible */
  visible: boolean;
  /** Llamado cuando la animación termina y el overlay se cierra */
  onDismiss: () => void;
  testID?: string;
}

/**
 * MatchPayoff — overlay full-screen de celebración de match.
 * Se monta siempre, pero sólo es visible cuando {visible} es true.
 */
export function MatchPayoff({ visible, onDismiss, testID }: MatchPayoffProps) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Intentar reducir animaciones si el sistema lo solicita (accesibilidad)
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      reducedMotionRef.current = reduced;
    });
  }, []);

  // Intentar reproducir sonido de match (fire-and-forget, falla silenciosamente)
  const playMatchSound = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Audio } = require('expo-av') as typeof import('expo-av');
      const { sound } = await Audio.Sound.createAsync(
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('../../../../../assets/sounds/match.mp3') as number,
      );
      await sound.playAsync();
      // Liberar memoria cuando termina
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync().catch(() => {/* silencio */});
        }
      });
    } catch {
      // expo-av no disponible o archivo no existe — sin SFX, sin error visible
    }
  };

  useEffect(() => {
    if (visible) {
      const reduced = reducedMotionRef.current;

      if (reduced) {
        // Reduced motion: aparecer/desaparecer sin animación de escala
        opacity.value = withTiming(1, { duration: 100 });
        scale.value = 1;
      } else {
        // Animación completa: escala spring + fade in
        scale.value = withSpring(1, SPRING_CONFIG);
        opacity.value = withTiming(1, { duration: 150 });
      }

      // SFX asíncrono
      void playMatchSound();

      // Auto-dismiss tras PAYOFF_AUTOHIDE_MS
      dismissTimer.current = setTimeout(() => {
        if (reduced) {
          opacity.value = withTiming(0, { duration: 100 }, (finished) => {
            if (finished) runOnJS(onDismiss)();
          });
        } else {
          opacity.value = withTiming(0, { duration: 300 }, (finished) => {
            if (finished) runOnJS(onDismiss)();
          });
          scale.value = withTiming(1.1, { duration: 300 });
        }
      }, PAYOFF_AUTOHIDE_MS);
    } else {
      // Ocultar inmediatamente al resetear
      scale.value = 0;
      opacity.value = 0;
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
        dismissTimer.current = null;
      }
    }

    return () => {
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
        dismissTimer.current = null;
      }
    };
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (!visible && scale.value === 0) {
    // Optimización: no renderizar nada si no es visible y la animación terminó
    return null;
  }

  return (
    <Animated.View
      style={[styles.overlay, overlayStyle]}
      testID={testID}
      accessibilityLabel="Match confirmado"
      accessibilityLiveRegion="polite"
    >
      <View style={styles.background} />
      <Animated.View style={[styles.card, cardStyle]}>
        <Text style={styles.icon} accessibilityElementsHidden>❤</Text>
        <Text style={styles.title}>¡Match!</Text>
        <Text style={styles.subtitle}>Propiedad guardada en tus matches</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 107, 0, 0.15)', // naranja traslúcido expansivo
  },
  card: {
    backgroundColor: SurfaceColors.bgSurfaceAlpha,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: Colors.accentPrimary,
    paddingVertical: 32,
    paddingHorizontal: 48,
    alignItems: 'center',
    // Glow naranja
    shadowColor: Colors.accentPrimary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  },
  icon: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    color: Colors.accentPrimary,
    fontSize: Typography.sizeDisplay,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: Typography.sizeBody,
    textAlign: 'center',
  },
});
