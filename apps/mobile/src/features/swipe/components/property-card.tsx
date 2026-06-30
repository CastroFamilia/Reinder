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
import { PropertyBadge } from '../../../components/ui/property-badge';
import { Colors, Radius, Spacing, Typography } from '../../../lib/tokens';
import type { Listing } from '@reinder/shared';
import { MOCK_IMAGES } from '../../../lib/mock-images';

interface PropertyCardProps {
  listing: Listing;
  style?: ViewStyle;
  testID?: string;
  viewMode?: 'cover' | 'detail';
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

export function PropertyCard({ listing, style, testID, viewMode = 'cover' }: PropertyCardProps) {
  const badge = resolveBadge(listing);
  const isSold = listing.status === 'sold';

  const accessibleLabel = `${listing.title} en ${listing.location}, ${formatPrice(listing.price)}`;

  /* ─── Detail mode ─── */
  if (viewMode === 'detail') {
    return (
      <View
        style={[styles.container, style]}
        testID={testID}
        accessible
        accessibilityRole="none"
        accessibilityLabel={accessibleLabel}
      >
        {/* Top ~55% — Imagen con badge y overlay vendido */}
        <View style={styles.detail_imageSection}>
          <Image
            source={MOCK_IMAGES[listing.id] ?? { uri: listing.imageUrl }}
            style={styles.detail_image}
            resizeMode="cover"
          />
          {isSold && <View style={styles.detail_soldOverlay} />}
          {badge && (
            <View style={styles.detail_badgeWrapper}>
              <PropertyBadge
                type={badge}
                testID={testID ? `${testID}-badge` : undefined}
              />
            </View>
          )}
        </View>

        {/* Bottom ~45% — Panel de datos */}
        <View style={styles.detail_dataPanel}>
          {/* Precio */}
          <Text
            style={styles.price}
            accessibilityLabel={`Precio: ${formatPrice(listing.price)}`}
            testID={testID ? `${testID}-price` : undefined}
          >
            {formatPrice(listing.price)}
          </Text>

          {/* Título — hasta 2 líneas en detail */}
          <Text
            style={styles.title}
            numberOfLines={2}
            testID={testID ? `${testID}-title` : undefined}
          >
            {listing.title}
          </Text>

          {/* Metadatos */}
          <Text
            style={styles.meta}
            numberOfLines={1}
            testID={testID ? `${testID}-meta` : undefined}
          >
            {formatMeta(listing)}
          </Text>

          {/* Descripción (si existe) */}
          {listing.description ? (
            <Text
              style={styles.detail_description}
              numberOfLines={3}
              testID={testID ? `${testID}-description` : undefined}
            >
              {listing.description}
            </Text>
          ) : null}

          {/* Tag de garaje */}
          {listing.garage === true && (
            <View style={styles.detail_garageTag}>
              <Text style={styles.detail_garageText}>🅿️ Garaje</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  /* ─── Cover mode (🖼️) — Landscape photo + expanded info ─── */
  return (
    <View
      style={[styles.container, style]}
      testID={testID}
      accessible
      accessibilityRole="none"
      accessibilityLabel={accessibleLabel}
    >
      {/* Top — Landscape image with badge */}
      <View style={styles.cover_imageSection}>
        <Image
          source={MOCK_IMAGES[listing.id] ?? { uri: listing.imageUrl }}
          style={styles.cover_image}
          resizeMode="cover"
        />
        {isSold && <View style={styles.cover_soldOverlay} />}
        {badge && (
          <View style={styles.cover_badgeWrapper}>
            <PropertyBadge
              type={badge}
              testID={testID ? `${testID}-badge` : undefined}
            />
          </View>
        )}
      </View>

      {/* Bottom — Expanded info panel */}
      <View style={styles.cover_dataPanel}>
        {/* Price + Location row */}
        <View style={styles.cover_priceRow}>
          <Text
            style={styles.price}
            accessibilityLabel={`Precio: ${formatPrice(listing.price)}`}
            testID={testID ? `${testID}-price` : undefined}
          >
            {formatPrice(listing.price)}
          </Text>
          <Text style={styles.cover_location} numberOfLines={1}>
            📍 {listing.location}
          </Text>
        </View>

        {/* Title */}
        <Text
          style={styles.title}
          numberOfLines={2}
          testID={testID ? `${testID}-title` : undefined}
        >
          {listing.title}
        </Text>

        {/* Metadata chips */}
        <View style={styles.cover_chipsRow}>
          <View style={styles.cover_chip}>
            <Text style={styles.cover_chipText}>{listing.rooms} hab</Text>
          </View>
          <View style={styles.cover_chip}>
            <Text style={styles.cover_chipText}>{listing.squareMeters} m²</Text>
          </View>
          {listing.floor && (
            <View style={styles.cover_chip}>
              <Text style={styles.cover_chipText}>{listing.floor}</Text>
            </View>
          )}
          {listing.garage === true && (
            <View style={[styles.cover_chip, styles.cover_chipAccent]}>
              <Text style={styles.cover_chipAccentText}>🅿️ Garaje</Text>
            </View>
          )}
        </View>

        {/* Description */}
        {listing.description ? (
          <Text
            style={styles.cover_description}
            numberOfLines={4}
            testID={testID ? `${testID}-description` : undefined}
          >
            {listing.description}
          </Text>
        ) : null}
      </View>
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
  /* ─── Cover mode (🖼️) styles ─── */
  cover_imageSection: {
    height: '40%',
    position: 'relative',
    overflow: 'hidden',
  },
  cover_image: {
    width: '100%',
    height: '100%',
  },
  cover_soldOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  cover_badgeWrapper: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
  },
  cover_dataPanel: {
    flex: 1,
    backgroundColor: Colors.bgSurface,
    padding: Spacing.md,
    paddingBottom: Spacing.xl + Spacing.lg, // Space for SwipeActions
  },
  cover_priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: Spacing.xs,
  },
  cover_location: {
    color: Colors.textMuted,
    fontSize: Typography.sizeSmall, // 13
    fontWeight: '400',
    flexShrink: 1,
    marginLeft: Spacing.sm,
  },
  cover_chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  cover_chip: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: Radius.badge,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cover_chipText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  cover_chipAccent: {
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
    borderColor: 'rgba(255, 107, 0, 0.2)',
  },
  cover_chipAccentText: {
    color: Colors.accentPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  cover_description: {
    color: Colors.textMuted,
    fontSize: Typography.sizeCaption, // 14
    fontWeight: '400',
    lineHeight: 20,
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

  /* ─── Detail mode styles ─── */
  detail_imageSection: {
    flex: 0.55,
    position: 'relative',
    overflow: 'hidden',
  },
  detail_image: {
    width: '100%',
    height: '100%',
  },
  detail_soldOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  detail_badgeWrapper: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
  },
  detail_dataPanel: {
    flex: 0.45,
    backgroundColor: Colors.bgSurface,
    padding: Spacing.md,
  },
  detail_description: {
    color: Colors.textMuted,
    fontSize: Typography.sizeSmall, // 13
    fontWeight: '400',
    marginTop: Spacing.sm,
    lineHeight: Typography.sizeSmall * 1.4,
  },
  detail_garageTag: {
    alignSelf: 'flex-start',
    marginTop: Spacing.sm,
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
    borderRadius: Radius.panel / 2,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  detail_garageText: {
    color: Colors.accentPrimary,
    fontSize: Typography.sizeSmall,
    fontWeight: '600',
  },
});
