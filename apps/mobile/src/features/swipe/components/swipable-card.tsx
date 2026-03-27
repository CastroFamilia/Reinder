/**
 * apps/mobile/src/features/swipe/components/swipable-card.tsx
 *
 * Wrapper que combina GestureDetector + Animated.View + PropertyCard.
 * Gestiona el gesto de swipe con animaciones en el UI thread (Reanimated 3 worklets — NFR2).
 * Muestra un overlay verde (match) o rojo (reject) proporcional al desplazamiento.
 *
 * Story 2.5: añadido TapGesture (maxDistance 5px) compuesto con Race para abrir el
 * bottom sheet de detalle al hacer tap sin interferir con el swipe.
 *
 * Source: epics.md#Story-2.3 (AC1, AC7), epics.md#Story-2.5 (AC1)
 * Source: architecture.md#Frontend Architecture (Reanimated 3 worklets)
 */
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, interpolate, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { Listing } from '@reinder/shared';
import { PropertyCard } from './property-card';
import { useSwipeGesture } from '../hooks/use-swipe-gesture';
import { Colors } from '../../../lib/tokens';

interface SwipableCardProps {
  listing: Listing;
  onMatch: () => void;
  onReject: () => void;
  /** Callback para abrir el bottom sheet de detalle (Story 2.5). */
  onInfo?: () => void;
  testID?: string;
}

/**
 * SwipableCard — tarjeta de propiedad con gesto de swipe y tap para detalle.
 *
 * • Swipe derecho / soltar con velocidad → llama onMatch()
 * • Swipe izquierdo / soltar con velocidad → llama onReject()
 * • Tap (< 5px movimiento) → llama onInfo() si se proporciona (Story 2.5)
 * • Menos del umbral de swipe → vuelve al centro con spring
 *
 * La tarjeta ocupa todo el espacio disponible del contenedor padre.
 */
export function SwipableCard({ listing, onMatch, onReject, onInfo, testID }: SwipableCardProps) {
  const { panGesture, animatedCardStyle, translateX } = useSwipeGesture({
    onMatch,
    onReject,
  });

  /**
   * TapGesture para abrir el detalle (Story 2.5 AC1).
   * maxDistance: 5px — el tap sólo se activa si el dedo no se mueve.
   * Si el usuario mueve más de 5px, el PanGesture (Race) gana y el tap se cancela.
   * runOnJS necesario porque onInfo es una función JS normal (no worklet).
   */
  const tapGesture = Gesture.Tap()
    .maxDistance(5)
    .onEnd(() => {
      'worklet';
      if (onInfo) {
        runOnJS(onInfo)();
      }
    });

  /**
   * Gesture.Race: el primero en activarse cancela al otro.
   * Si el usuario mueve el dedo (pan), el tap se cancela.
   * Si el usuario levanta el dedo sin moverse (tap), el pan no se activa.
   */
  const composed = Gesture.Race(panGesture, tapGesture);

  // Overlay verde para swipe derecho (match)
  const matchOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, 80, 150], [0, 0.3, 0.7], 'clamp'),
  }));

  // Overlay rojo para swipe izquierdo (reject)
  const rejectOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-150, -80, 0], [0.7, 0.3, 0], 'clamp'),
  }));

  // Etiqueta "❤️ MATCH" visible al hacer swipe derecho
  const matchLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [20, 60], [0, 1], 'clamp'),
  }));

  // Etiqueta "✕ PASS" visible al hacer swipe izquierdo
  const rejectLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-60, -20], [1, 0], 'clamp'),
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[styles.container, animatedCardStyle]} testID={testID}>
        {/* Tarjeta de propiedad */}
        <PropertyCard listing={listing} />

        {/* Overlay verde — match (swipe derecho) */}
        <Animated.View
          style={[styles.overlay, styles.matchOverlay, matchOverlayStyle]}
          pointerEvents="none"
          accessibilityElementsHidden
        />

        {/* Overlay rojo — reject (swipe izquierdo) */}
        <Animated.View
          style={[styles.overlay, styles.rejectOverlay, rejectOverlayStyle]}
          pointerEvents="none"
          accessibilityElementsHidden
        />

        {/* Etiqueta MATCH */}
        <Animated.View style={[styles.label, styles.matchLabel, matchLabelStyle]} pointerEvents="none">
          <Text style={styles.matchLabelText}>❤️ MATCH</Text>
        </Animated.View>

        {/* Etiqueta PASS */}
        <Animated.View style={[styles.label, styles.rejectLabel, rejectLabelStyle]} pointerEvents="none">
          <Text style={styles.rejectLabelText}>✕ PASS</Text>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
  },
  matchOverlay: {
    backgroundColor: '#22C55E', // verde match
  },
  rejectOverlay: {
    backgroundColor: Colors.accentReject, // '--accent-reject: #8B3A3A' (UX-DR3)
  },
  label: {
    position: 'absolute',
    top: 48,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 3,
  },
  matchLabel: {
    left: 24,
    borderColor: '#22C55E',
    transform: [{ rotate: '-15deg' }],
  },
  rejectLabel: {
    right: 24,
    borderColor: Colors.accentReject, // '--accent-reject: #8B3A3A' (UX-DR3)
    transform: [{ rotate: '15deg' }],
  },
  matchLabelText: {
    color: '#22C55E',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
  rejectLabelText: {
    color: Colors.accentReject, // '--accent-reject: #8B3A3A' (UX-DR3)
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
