/**
 * apps/mobile/src/features/swipe/components/match-recap-card.tsx
 *
 * MatchRecapCard — tarjeta de propiedad para el Match Recap Screen.
 * Muestra miniatura, precio y nombre con botones Confirmar / Descartar.
 *
 * Story 2.6 — AC2 (UX-DR5)
 * Source: epics.md#Story-2.6
 */
import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { GlassPanel } from '../../../components/ui/glass-panel';
import { Button } from '../../../components/ui/button';
import { Colors, Typography, Spacing, Radius } from '../../../lib/tokens';
import type { Listing } from '@reinder/shared';

interface MatchRecapCardProps {
  /** Listing del match a mostrar */
  listing: Listing;
  /** Llamado al pulsar "Confirmar" */
  onConfirm: (listingId: string) => void;
  /** Llamado al pulsar "Descartar" */
  onDiscard: (listingId: string) => void;
  /** En estado de carga (confirmando/descartando) */
  isProcessing?: boolean;
  testID?: string;
}

/**
 * MatchRecapCard — tarjeta compacta de un match con botones de acción.
 * Usa GlassPanel medium como contenedor (UX-DR5, UX-DR7).
 */
export function MatchRecapCard({
  listing,
  onConfirm,
  onDiscard,
  isProcessing = false,
  testID,
}: MatchRecapCardProps) {
  const formattedPrice = listing.price
    ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(
        typeof listing.price === 'string' ? parseFloat(listing.price) : listing.price
      )
    : '—';

  return (
    <GlassPanel intensity="medium" style={styles.container} testID={testID}>
      {/* Hero image */}
      <Image
        source={{ uri: listing.imageUrl }}
        style={styles.image}
        accessibilityLabel={`Foto de ${listing.title}`}
        resizeMode="cover"
      />

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.price} numberOfLines={1}>
          {formattedPrice}
        </Text>
        <Text style={styles.title} numberOfLines={2}>
          {listing.title}
        </Text>
        {listing.location ? (
          <Text style={styles.location} numberOfLines={1}>
            {listing.location}
          </Text>
        ) : null}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          variant="destructive"
          onPress={() => onDiscard(listing.id)}
          disabled={isProcessing}
          accessibilityLabel={`Descartar match con ${listing.title}`}
          testID={`recap-discard-${listing.id}`}
          style={styles.button}
        >
          Descartar
        </Button>
        <Button
          variant="primary"
          onPress={() => onConfirm(listing.id)}
          disabled={isProcessing}
          accessibilityLabel={`Confirmar match con ${listing.title}`}
          testID={`recap-confirm-${listing.id}`}
          style={styles.button}
        >
          Confirmar
        </Button>
      </View>
    </GlassPanel>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 180,
    borderTopLeftRadius: Radius.panel,
    borderTopRightRadius: Radius.panel,
  },
  info: {
    padding: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  price: {
    color: Colors.accentPrimary,
    fontSize: Typography.sizeH2,
    fontWeight: '700',
    marginBottom: 4,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: Typography.sizeBody,
    fontWeight: '500',
    marginBottom: 2,
  },
  location: {
    color: Colors.textMuted,
    fontSize: Typography.sizeSmall,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    paddingTop: Spacing.sm,
  },
  button: {
    flex: 1,
  },
});
