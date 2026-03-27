/**
 * apps/mobile/src/features/swipe/components/new-properties-badge.tsx
 *
 * Banner que aparece en la SwipeScreen cuando hay nuevas propiedades
 * desde la última visita del comprador (UX-DR15).
 *
 * Source: story 2-7-historial-matches-badge-nuevas-propiedades.md (Task 6)
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GlassPanel } from '../../../components/ui/glass-panel';
import { Colors, Typography, Spacing, Radius } from '../../../lib/tokens';

interface NewPropertiesBadgeProps {
  count: number;
  onPress: () => void;
  onDismiss: () => void;
  testID?: string;
}

export function NewPropertiesBadge({
  count,
  onPress,
  onDismiss,
  testID,
}: NewPropertiesBadgeProps) {
  if (count <= 0) return null;

  return (
    <View style={styles.wrapper} testID={testID} pointerEvents="box-none">
      <GlassPanel intensity="light" style={styles.panel}>
        <Pressable
          onPress={onPress}
          style={styles.content}
          accessibilityRole="button"
          accessibilityLabel={`${count} nuevas propiedades desde tu última visita. Pulsa para ver`}
        >
          <Text style={styles.text}>
            🏠 {count} {count === 1 ? 'nueva propiedad' : 'nuevas propiedades'} desde tu última visita
          </Text>
        </Pressable>

        <Pressable
          onPress={onDismiss}
          style={styles.dismissBtn}
          accessibilityRole="button"
          accessibilityLabel="Cerrar notificación"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.dismissText}>✕</Text>
        </Pressable>
      </GlassPanel>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.md,
    right: Spacing.md,
    zIndex: 10,
  },
  panel: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.btn,
    gap: Spacing.sm,
  },
  content: {
    flex: 1,
  },
  text: {
    fontSize: Typography.sizeCaption,
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  dismissBtn: {
    padding: 2,
  },
  dismissText: {
    fontSize: Typography.sizeCaption,
    color: Colors.textMuted,
  },
});
