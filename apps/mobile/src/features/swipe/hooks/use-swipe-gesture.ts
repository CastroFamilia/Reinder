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
 * - Guardia de borde izquierdo (AC5 Story 2.4): gestos con event.x < 20px se ignoran
 *   para reservar el área al back-gesture del sistema iOS. Requiere RNGH >= 2.x para event.x.
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

/** M1 CR 2.4: evitar spam de warning en caso de RNGH sin event.x */
let _edgeGuardWarnedOnce = false;
const warnEdgeGuardInactive = () => {
  if (!_edgeGuardWarnedOnce) {
    _edgeGuardWarnedOnce = true;
    console.warn('[SwipeGesture] event.x undefined: left-edge guard (AC5) inactive. Upgrade RNGH to 2.x+');
  }
};

/**
 * Hook que construye el PanGesture de swipe y los estilos animados de la tarjeta.
 *
 * @returns panGesture - el gesto a pasar a <GestureDetector>
 * @returns animatedCardStyle - el estilo animado a aplicar al Animated.View de la tarjeta
 * @returns translateX - shared value con el desplazamiento horizontal actual (para overlays por dirección)
 * @returns overlayOpacity - shared value para el overlay naranja/rojo (0..1)
 * @returns resetCard - función para reiniciar posición sin animar (útil al cambiar de tarjeta)
 */
export function useSwipeGesture({ onMatch, onReject }: SwipeGestureHandlers) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(0);
  const overlayOpacity = useSharedValue(0);
  // Opacidad de la tarjeta en sí — se pone a 0 en el worklet tras la animación de salida
  // para evitar el flash de la tarjeta antigua antes de que React aplique el nuevo listing.
  const cardOpacity = useSharedValue(1);

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
      // Guardia de borde izquierdo: si el gesto empezó en los primeros 20px,
      // ignorarlo — reservado para el back-gesture del sistema iOS (UX-DR10, AC5 Story 2.4).
      // event.x es la posición X de inicio del gesto (no la translación) — disponible en RNGH 2.x.
      // Usa ?? 999 como fallback: si event.x es undefined (RNGH < 2.x), la guardia queda inactiva.
      if (__DEV__ && event.x === undefined) {
        // M1 CR 2.4: avisar via runOnJS para poder usar console desde un worklet
        runOnJS(warnEdgeGuardInactive)();
      }
      if ((event.x ?? 999) < 20) {
        translateX.value = withSpring(0, SPRING_CONFIG);
        translateY.value = withSpring(0, SPRING_CONFIG);
        rotation.value = withSpring(0, SPRING_CONFIG);
        overlayOpacity.value = withTiming(0, { duration: 200 });
        return;
      }

      if (event.translationX > SWIPE_THRESHOLD) {
        // Swipe derecho → MATCH: animar la tarjeta fuera de pantalla y notificar JS.
        // NO reseteamos los valores aquí — la tarjeta se queda fuera de pantalla
        // hasta que SwipableCard recibe el nuevo listing.id y llama resetCard().
        // Esto evita el flash de la tarjeta antigua volviendo a posición 0.
        translateX.value = withTiming(600, { duration: 280 }, (finished) => {
          'worklet';
          if (finished) {
            cardOpacity.value = 0; // ocultar instantáneamente en el UI thread
            runOnJS(onMatch)();
          }
        });
        translateY.value = withTiming(event.translationY * 0.3, { duration: 280 });
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        // Swipe izquierdo → REJECT: misma estrategia
        translateX.value = withTiming(-600, { duration: 280 }, (finished) => {
          'worklet';
          if (finished) {
            cardOpacity.value = 0; // ocultar instantáneamente en el UI thread
            runOnJS(onReject)();
          }
        });
        translateY.value = withTiming(event.translationY * 0.3, { duration: 280 });
      } else {
        // No supera el threshold → volver al centro con spring
        translateX.value = withSpring(0, SPRING_CONFIG);
        translateY.value = withSpring(0, SPRING_CONFIG);
        rotation.value = withSpring(0, SPRING_CONFIG);
        overlayOpacity.value = withTiming(0, { duration: 200 });
      }
    });

  const animatedCardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  /**
   * Reinicia los valores animados instantáneamente (sin animación).
   * Llamar tras avanzar la tarjeta para preparar la siguiente.
   * Nota: se ejecuta en el JS thread, no en el UI thread.
   */
  const resetCard = () => {
    translateX.value = 0;
    translateY.value = 0;
    rotation.value = 0;
    overlayOpacity.value = 0;
    cardOpacity.value = 1; // restaurar visibilidad con el nuevo listing ya montado
  };

  return { panGesture, animatedCardStyle, overlayOpacity, translateX, resetCard };
}
