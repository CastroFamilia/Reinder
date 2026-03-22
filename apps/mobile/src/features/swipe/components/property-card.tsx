/**
 * apps/mobile/src/features/swipe/components/property-card.tsx
 *
 * Tarjeta de propiedad full-screen glassmorphism para el swipe feed.
 * Implementa UX-DR2: hero image, precio Clash Display 32px/700, nombre, metadatos, badge.
 *
 * Estados: default (active), sold (overlay + badge VENDIDA forzado)
 * Accesibilidad: alt text en imagen, accessibilityLabel en precio/nombre
 *
 * Source: UX-DR2, epics.md#Story-2.2 AC1-AC3
 */
import React from 'react';
import { Image, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { GlassPanel } from '../../../components/ui/glass-panel';
import { PropertyBadge } from '../../../components/ui/property-badge';
import { Colors, Radius, Spacing, Typography } from '../../../lib/tokens';
import type { Listing } from '@reinder/shared';

interface PropertyCardProps {
  listing: Listing;
  style?: ViewStyle;
  testID?: string;
}

/**
 * Formatea el precio en formato EUR español: €485.000
 */
function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(price);
}

/**
 * Genera la línea de metadatos: "3 hab · 95 m² · Malasaña, Madrid"
 */
function formatMeta(listing: Listing): string {
  const parts: string[] = [];
  parts.push(`${listing.rooms} hab`);
  parts.push(`${listing.squareMeters} m²`);
  if (listing.floor) {
    parts.push(listing.floor);
  }
  parts.push(listing.location);
  return parts.join(' · ');
}

/**
 * Determina el badge a mostrar.
 * Si el listing está vendido, el badge VENDIDA es prioritario.
 */
function resolveBadge(listing: Listing): Listing['badge'] {
  if (listing.status === 'sold') return 'VENDIDA';
  return listing.badge;
}

export function PropertyCard({ listing, style, testID }: PropertyCardProps) {
  const badge = resolveBadge(listing);
  const isSold = listing.status === 'sold';

  const accessibleLabel = `${listing.title} en ${listing.location}, ${formatPrice(listing.price)}`;

  return (
    <View
      style={[styles.container, style]}
      testID={testID}
      accessible
      accessibilityRole="none"
      accessibilityLabel={accessibleLabel}
    >
      {/* Hero image — ocupa el 100% del fondo */}
      <Image
        source={{ uri: listing.imageUrl }}
        style={styles.heroImage}
        resizeMode="cover"
        accessibilityLabel={listing.imageAlt ?? `${listing.title} en ${listing.location}`}
        testID={testID ? `${testID}-image` : undefined}
      />

      {/* Overlay semitransparente para listings vendidos */}
      {isSold && <View style={styles.soldOverlay} />}

      {/* Overlay inferior glassmorphism con info de la propiedad */}
      <GlassPanel intensity="medium" style={styles.infoOverlay}>
        {/* Badge de estado (EXCLUSIVA / NUEVA / VENDIDA) */}
        {badge && (
          <View style={styles.badgeWrapper}>
            <PropertyBadge
              type={badge}
              testID={testID ? `${testID}-badge` : undefined}
            />
          </View>
        )}

        {/* Precio — Clash Display 32px/700 naranja (UX-DR2) */}
        <Text
          style={styles.price}
          accessibilityLabel={`Precio: ${formatPrice(listing.price)}`}
          testID={testID ? `${testID}-price` : undefined}
        >
          {formatPrice(listing.price)}
        </Text>

        {/* Nombre de la propiedad */}
        <Text
          style={styles.title}
          numberOfLines={1}
          testID={testID ? `${testID}-title` : undefined}
        >
          {listing.title}
        </Text>

        {/* Metadatos: habitaciones, m², planta?, ubicación */}
        <Text
          style={styles.meta}
          numberOfLines={1}
          testID={testID ? `${testID}-meta` : undefined}
        >
          {formatMeta(listing)}
        </Text>
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
    backgroundColor: Colors.bgSurface, // Fallback si imagen no carga
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  soldOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  infoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
    paddingBottom: Spacing.xl + Spacing.lg, // Espacio para SwipeActions
    borderRadius: 0,
    // No radius en la parte inferior — se alinea con el borde del card
    borderTopLeftRadius: Radius.panel,
    borderTopRightRadius: Radius.panel,
  },
  badgeWrapper: {
    marginBottom: Spacing.sm,
  },
  price: {
    color: Colors.accentPrimary,
    fontSize: Typography.sizeDisplay, // 32
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: Spacing.xs,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: Typography.sizeH2, // 20
    fontWeight: '400',
    marginBottom: Spacing.xs,
  },
  meta: {
    color: Colors.textMuted,
    fontSize: Typography.sizeSmall, // 13
    fontWeight: '400',
  },
});
