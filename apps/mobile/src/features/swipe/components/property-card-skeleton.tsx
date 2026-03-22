/**
 * apps/mobile/src/features/swipe/components/property-card-skeleton.tsx
 *
 * Skeleton de carga glassmorphism para PropertyCard.
 * Se muestra mientras el feed carga la primera tarjeta.
 * Requiere: AC4 — skeleton glassmorphism pulsante con naranja sutil en bordes.
 *
 * Source: UX-DR2 (loading state), ux-design-specification.md#Loading & Empty States
 */
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { GlassPanel } from '../../../components/ui/glass-panel';
import { Colors, Radius, Spacing } from '../../../lib/tokens';

export function PropertyCardSkeleton({ testID }: { testID?: string }) {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animación pulsante: opacity de borde naranja entre 0.2 y 0.7
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulseAnim]);

  const borderOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.7],
  });

  return (
    <View style={styles.container} testID={testID}>
      {/* Hero image placeholder */}
      <GlassPanel intensity="medium" style={styles.imagePlaceholder}>
        <Animated.View
          style={[styles.shimmer, { opacity: borderOpacity }]}
        />
      </GlassPanel>

      {/* Overlay inferior con placeholders de texto */}
      <GlassPanel intensity="medium" style={styles.overlay}>
        {/* Badge placeholder */}
        <View style={styles.badgePlaceholder} />
        {/* Precio placeholder */}
        <Animated.View
          style={[styles.pricePlaceholder, { opacity: borderOpacity }]}
        />

        {/* Nombre placeholder */}
        <View style={styles.namePlaceholder} />
        {/* Metadatos placeholder */}
        <View style={styles.metaPlaceholder} />
      </GlassPanel>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: Radius.card,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePlaceholder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: Radius.card,
    backgroundColor: Colors.bgSurface,
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: Colors.accentPrimary,
    borderRadius: Radius.card,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
    paddingBottom: Spacing.xl + Spacing.md,
    borderRadius: 0,
    borderTopLeftRadius: Radius.panel,
    borderTopRightRadius: Radius.panel,
  },
  badgePlaceholder: {
    width: 80,
    height: 22,
    borderRadius: Radius.badge,
    backgroundColor: 'rgba(255,107,0,0.2)',
    marginBottom: Spacing.sm,
  },
  pricePlaceholder: {
    width: '60%',
    height: 36,
    borderRadius: 6,
    backgroundColor: 'rgba(255,107,0,0.15)',
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.accentPrimary,
  },
  namePlaceholder: {
    width: '80%',
    height: 20,
    borderRadius: 4,
    backgroundColor: 'rgba(245,240,232,0.1)',
    marginBottom: Spacing.xs,
  },
  metaPlaceholder: {
    width: '65%',
    height: 14,
    borderRadius: 4,
    backgroundColor: 'rgba(158,144,128,0.15)',
  },
});
