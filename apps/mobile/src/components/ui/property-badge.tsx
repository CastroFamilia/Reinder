/**
 * apps/mobile/src/components/ui/property-badge.tsx
 *
 * Chips de estado de propiedad: EXCLUSIVA, VENDIDA, NUEVA. (UX-DR6)
 *
 * Reglas de accesibilidad:
 * - Siempre texto + color (nunca solo color) → WCAG AA
 * - accessibilityRole="text" con accessibilityLabel explícito
 */
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Typography } from '../../lib/tokens';

export type BadgeType = 'EXCLUSIVA' | 'VENDIDA' | 'NUEVA';

interface PropertyBadgeProps {
  type: BadgeType;
  testID?: string;
}

type BadgeConfig = {
  bg: string;
  textColor: string;
  label: string;
  borderColor?: string;
};

const BADGE_CONFIG: Record<BadgeType, BadgeConfig> = {
  EXCLUSIVA: {
    bg: Colors.accentPrimary,   // #FF6B00 naranja
    textColor: Colors.textPrimary,
    label: 'EXCLUSIVA',
  },
  VENDIDA: {
    bg: Colors.accentSold,      // #6B4E00 ámbar oscuro
    textColor: Colors.textPrimary,
    label: 'VENDIDA',
  },
  NUEVA: {
    bg: Colors.border,          // #2E2820 oscuro
    textColor: Colors.accentPrimary,
    label: 'NUEVA',
    borderColor: Colors.accentPrimary, // borde naranja
  },
};

export function PropertyBadge({ type, testID }: PropertyBadgeProps) {
  const config = BADGE_CONFIG[type];

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.bg },
        config.borderColor != null
          ? { borderWidth: 1, borderColor: config.borderColor }
          : null,
      ]}
      testID={testID}
      accessible
      accessibilityRole="text"
      accessibilityLabel={config.label}
    >
      <Text style={[styles.label, { color: config.textColor }]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.badge,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: Typography.sizeSmall, // 13
    fontWeight: '400',
    letterSpacing: 0.5,
  },
});
