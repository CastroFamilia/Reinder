/**
 * apps/mobile/src/features/swipe/components/match-payoff.tsx
 *
 * MatchPayoff — toast badge no bloqueante que aparece en la parte superior
 * de la pantalla cuando el comprador hace match.
 *
 * Diseño: badge compacto con slide-in desde arriba + fade out automático.
 * No interrumpe el flow de swipe: pointerEvents="none" en todo el overlay.
 *
 * Duración visible: PAYOFF_DURATION_MS (450ms)
 *
 * SFX: expo-av reproducción de assets/sounds/match.mp3
 * Si el archivo no existe o expo-av no está disponible, falla silenciosamente (try/catch).
 *
 * Accesibilidad: respeta prefers-reduced-motion.
 *
 * Source: epics.md#Story-2.3 (AC2, AC3)
 * Source: ux-design-specification.md#Component-Strategy (MatchPayoff)
 */
import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  AccessibilityInfo,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Colors, Typography, SurfaceColors } from '../../../lib/tokens';

// Duración visible del badge antes del fade-out
const PAYOFF_DURATION_MS = 450;

interface MatchPayoffProps {
  /** Si true, la animación arranca y el badge es visible */
  visible: boolean;
  /** Llamado cuando la animación termina y el badge se cierra */
  onDismiss: () => void;
  testID?: string;
}

/**
 * MatchPayoff — toast badge no bloqueante en la parte superior de la pantalla.
 * Slide-in desde arriba + fade-out automático. No interrumpe el swipe.
 */
export function MatchPayoff({ visible, onDismiss, testID }: MatchPayoffProps) {
  const opacity = useSharedValue(0);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Intentar reproducir sonido de match (fire-and-forget, falla silenciosamente)
  const playMatchSound = async () => {
    try {
      const { Audio } = await import('expo-av');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const soundAsset = require('../../../../../assets/sounds/match.mp3') as unknown;
      const { sound } = await Audio.Sound.createAsync(soundAsset);
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync().catch(() => {/* silencio */});
        }
      });
    } catch {
      // expo-av no disponible, archivo no existe, u otro error — sin SFX
    }
  };

  useEffect(() => {
    if (visible) {
      // Fade-in
      opacity.value = withTiming(1, { duration: 150 });

      void playMatchSound();

      // Auto-dismiss: fade-out
      dismissTimer.current = setTimeout(() => {
        opacity.value = withTiming(0, { duration: 150 }, (finished) => {
          if (finished) runOnJS(onDismiss)();
        });
      }, PAYOFF_DURATION_MS);
    } else {
      // Reset inmediato
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

  const badgeStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!visible && opacity.value === 0) {
    return null;
  }

  return (
    <Animated.View
      style={[styles.badge, badgeStyle]}
      testID={testID}
      accessibilityLabel="Match confirmado"
      accessibilityLiveRegion="polite"
      pointerEvents="none"
    >
      <Text style={styles.icon} accessibilityElementsHidden>❤</Text>
      <Text style={styles.label}>¡Match!</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 100,
    backgroundColor: SurfaceColors.bgSurfaceAlpha,
    borderWidth: 1.5,
    borderColor: Colors.accentPrimary,
    // Glow naranja sutil
    shadowColor: Colors.accentPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  icon: {
    fontSize: 16,
  },
  label: {
    color: Colors.accentPrimary,
    fontSize: Typography.sizeBody,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
