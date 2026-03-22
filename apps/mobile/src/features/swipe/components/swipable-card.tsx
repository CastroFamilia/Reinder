/**
 * apps/mobile/src/features/swipe/components/swipable-card.tsx
 *
 * Wrapper que combina GestureDetector + Animated.View + PropertyCard.
 * Gestiona el gesto de swipe con animaciones en el UI thread (Reanimated 3 worklets — NFR2).
 * Muestra un overlay naranja (match) o rojo (reject) proporcional al desplazamiento.
 *
 * Source: epics.md#Story-2.3 (AC1, AC7)
 * Source: architecture.md#Frontend Architecture (Reanimated 3 worklets)
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { GestureDetector } from 'react-native-gesture-handler';
import type { Listing } from '@reinder/shared';
import { PropertyCard } from './property-card';
import { useSwipeGesture } from '../hooks/use-swipe-gesture';
import { Colors } from '../../../lib/tokens';

interface SwipableCardProps {
  listing: Listing;
  onMatch: () => void;
  onReject: () => void;
  testID?: string;
}

/**
 * SwipableCard — tarjeta de propiedad con gesto de swipe.
 *
 * • Swipe derecho / soltar con velocidad → llama onMatch()
 * • Swipe izquierdo / soltar con velocidad → llama onReject()
 * • Menos del umbral → vuelve al centro con spring
 *
 * La tarjeta ocupa todo el espacio disponible del contenedor padre.
 */
export function SwipableCard({ listing, onMatch, onReject, testID }: SwipableCardProps) {
  const { panGesture, animatedCardStyle, overlayOpacity } = useSwipeGesture({
    onMatch,
    onReject,
  });

  // Overlay color: naranja si va hacia la derecha (match), rojo si va hacia la izquierda (reject)
  // El color se decide en función de la dirección del translateX — necesitamos un valor derivado.
  // Usamos un color naranja de match para ambas direcciones por ahora — Story 2.4 añadirá el rojo.
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.container, animatedCardStyle]} testID={testID}>
        {/* Tarjeta de propiedad */}
        <PropertyCard listing={listing} />

        {/* Overlay naranja que crece al hacer swipe derecho */}
        <Animated.View
          style={[styles.overlay, overlayStyle]}
          pointerEvents="none"
          accessibilityElementsHidden
        />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // La tarjeta es full-screen dentro de su contenedor
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.accentPrimary, // '#FF6B00'
    borderRadius: 24, // Radius.card
    // Story 2.4 distinguirá naranja (match) vs rojo (reject) usando la dirección del gesto
  },
});
