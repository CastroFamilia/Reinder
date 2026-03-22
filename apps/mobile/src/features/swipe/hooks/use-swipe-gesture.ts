/**
 * apps/mobile/src/features/swipe/hooks/use-swipe-gesture.ts
 *
 * Hook que gestiona el gesto de swipe con React Native Gesture Handler + Reanimated 3.
 * Todo el procesamiento de animación ocurre en el UI thread (worklets) — NFR2: ≥60fps.
 *
 * REGLAS CRÍTICAS:
 * - Los callbacks .onUpdate() y .onEnd() SON worklets — se ejecutan en el UI thread.
 * - Cualquier callback JS externo (onMatch, onReject) DEBE ir dentro de runOnJS().
 * - NUNCA referenciar estado de React dentro de un worklet.
 *
 * Source: architecture.md#Frontend Architecture (Reanimated 3 worklets)
 * Source: epics.md#Story-2.3 (AC1, AC5, AC6, AC7)
 * Source: ux-design-specification.md#Defining-Core-Experience
 */
import { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS } from 'react-native-reanimated';
import { Gesture } from 'react-native-gesture-handler';
import { SWIPE_THRESHOLD } from '@reinder/shared';

/** Parámetros del hook */
export interface SwipeGestureHandlers {
  /** Llamado cuando el swipe supera SWIPE_THRESHOLD hacia la derecha */
  onMatch: () => void;
  /** Llamado cuando el swipe supera SWIPE_THRESHOLD hacia la izquierda */
  onReject: () => void;
}

/** Configuración de spring para retorno al centro (ease-spring UX-DR) */
const SPRING_CONFIG = {
  damping: 12,
  stiffness: 150,
} as const;

/**
 * Hook que construye el PanGesture de swipe y los estilos animados de la tarjeta.
 *
 * @returns panGesture - el gesto a pasar a <GestureDetector>
 * @returns animatedCardStyle - el estilo animado a aplicar al Animated.View de la tarjeta
 * @returns overlayOpacity - shared value para el overlay naranja/rojo (0..1)
 * @returns resetCard - función para reiniciar posición sin animar (útil al cambiar de tarjeta)
 */
export function useSwipeGesture({ onMatch, onReject }: SwipeGestureHandlers) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(0);
  const overlayOpacity = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      'worklet';
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.3; // movimiento vertical reducido para mantener UX limpia
      // Rotación suave: máx ±10 grados según desplazamiento horizontal
      rotation.value = (translateX.value / 15);
      // Opacidad del overlay (0 en centro, 1 en los extremos)
      overlayOpacity.value = Math.min(Math.abs(translateX.value) / 150, 0.85);
    })
    .onEnd((event) => {
      'worklet';
      if (event.translationX > SWIPE_THRESHOLD) {
        // Swipe derecho → MATCH: sale volando a la derecha
        translateX.value = withTiming(600, { duration: 280 });
        translateY.value = withTiming(event.translationY * 0.3, { duration: 280 });
        runOnJS(onMatch)();
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        // Swipe izquierdo → REJECT: sale volando a la izquierda
        translateX.value = withTiming(-600, { duration: 280 });
        translateY.value = withTiming(event.translationY * 0.3, { duration: 280 });
        runOnJS(onReject)();
      } else {
        // No supera el threshold → volver al centro con spring
        translateX.value = withSpring(0, SPRING_CONFIG);
        translateY.value = withSpring(0, SPRING_CONFIG);
        rotation.value = withSpring(0, SPRING_CONFIG);
        overlayOpacity.value = withTiming(0, { duration: 200 });
      }
    });

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  /**
   * Reinicia los valores animados instantáneamente (sin animación).
   * Llamar tras avanzar la tarjeta para preparar la siguiente.
   */
  const resetCard = () => {
    'worklet';
    translateX.value = 0;
    translateY.value = 0;
    rotation.value = 0;
    overlayOpacity.value = 0;
  };

  return { panGesture, animatedCardStyle, overlayOpacity, resetCard };
}
