/**
 * apps/mobile/src/features/matches/components/match-history-item.tsx
 *
 * Card de un ítem del historial de matches. Muestra miniatura, precio, dirección y fecha.
 * Si listingStatus === 'sold', muestra badge VENDIDA + overlay semitransparente (AC2, FR12).
 *
 * Source: story 2-7-historial-matches-badge-nuevas-propiedades.md (Task 4)
 */
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { GlassPanel } from '../../../components/ui/glass-panel';
import { PropertyBadge } from '../../../components/ui/property-badge';
import { Colors, Typography, Spacing, Radius } from '../../../lib/tokens';
import type { MatchHistoryItem } from '@reinder/shared';

/** Formatea un ISO string como fecha relativa en español */
function formatRelativeDate(isoString: string): string {
  // L1 fix: guard against future/malformed dates producing negative diffs
  const diffMs = Math.max(0, Date.now() - new Date(isoString).getTime());
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `hace ${diffMins} min`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
  const diffDays = Math.floor(diffHours / 24);
  return `hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
}

interface MatchHistoryItemProps {
  item: MatchHistoryItem;
  onPress: (item: MatchHistoryItem) => void;
  testID?: string;
}

export function MatchHistoryItemCard({ item, onPress, testID }: MatchHistoryItemProps) {
  const isSold = item.listingStatus === 'sold';

  return (
    <Pressable
      onPress={() => onPress(item)}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`Propiedad en ${item.address}, precio ${item.price.toLocaleString('es-ES')}€`}
    >
      <GlassPanel intensity="light" style={styles.card}>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.thumbnail}
            alt={`Foto de propiedad en ${item.address}`}
          />
          {isSold && (
            <>
              <View style={styles.soldOverlay} />
              <View style={styles.soldBadgeContainer}>
                <PropertyBadge type="VENDIDA" testID={`${testID}-vendida-badge`} />
              </View>
            </>
          )}
        </View>

        <View style={styles.info}>
          <Text style={styles.price} numberOfLines={1}>
            {item.price.toLocaleString('es-ES')}€
          </Text>
          <Text style={styles.address} numberOfLines={2}>
            {item.address}
          </Text>
          <Text style={styles.date}>
            {formatRelativeDate(item.matchedAt)}
          </Text>
        </View>
      </GlassPanel>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.xs,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  imageContainer: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: Radius.btn,
    overflow: 'hidden',
    flexShrink: 0,
  },
  thumbnail: {
    width: 80,
    height: 80,
  },
  soldOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  soldBadgeContainer: {
    position: 'absolute',
    bottom: 4,
    left: 4,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  price: {
    fontSize: Typography.sizeSubtitle,
    fontWeight: `${Typography.weightBold}`,
    color: Colors.textPrimary,
  },
  address: {
    fontSize: Typography.sizeCaption,
    fontWeight: `${Typography.weightRegular}`,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  date: {
    fontSize: Typography.sizeSmall,
    color: Colors.textMuted,
    textAlign: 'right',
  },
});
