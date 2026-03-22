/**
 * apps/mobile/src/features/swipe/components/swipe-actions.tsx
 *
 * Botones de acción del swipe: reject / info / match.
 * Implementa UX-DR3: labels ARIA, soporte teclado, glow naranja en match.
 *
 * Tamaños: reject/match = 54×54px, info = 46×46px — supera mínimo WCAG AA de 44×44px.
 *
 * Source: UX-DR3, epics.md#Story-2.2 AC5-AC6
 */
import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Colors, Radius, Spacing, SurfaceColors } from '../../../lib/tokens';

interface SwipeActionsProps {
  onReject: () => void;
  onInfo: () => void;
  onMatch: () => void;
  disabled?: boolean;
  testID?: string;
}

export function SwipeActions({
  onReject,
  onInfo,
  onMatch,
  disabled = false,
  testID,
}: SwipeActionsProps) {
  return (
    <View style={styles.container} testID={testID}>
      {/* Botón Reject (✗) — Destructive */}
      <Pressable
        onPress={onReject}
        disabled={disabled}
        accessibilityLabel="No me interesa"
        accessibilityRole="button"
        accessibilityHint="Descarta esta propiedad y pasa a la siguiente"
        style={({ pressed }) => [
          styles.button,
          styles.rejectButton,
          pressed && styles.pressed,
          disabled && styles.disabled,
        ]}
        testID={testID ? `${testID}-reject` : undefined}
      >
        <Text style={styles.rejectIcon} allowFontScaling={false}>✕</Text>
      </Pressable>

      {/* Botón Info (ⓘ) — Secondary */}
      <Pressable
        onPress={onInfo}
        disabled={disabled}
        accessibilityLabel="Ver detalle"
        accessibilityRole="button"
        accessibilityHint="Abre el detalle completo de esta propiedad"
        style={({ pressed }) => [
          styles.button,
          styles.infoButton,
          pressed && styles.pressed,
          disabled && styles.disabled,
        ]}
        testID={testID ? `${testID}-info` : undefined}
      >
        <Text style={styles.infoIcon} allowFontScaling={false}>ⓘ</Text>
      </Pressable>

      {/* Botón Match (♥) — Primary naranja con glow */}
      <Pressable
        onPress={onMatch}
        disabled={disabled}
        accessibilityLabel="Me interesa"
        accessibilityRole="button"
        accessibilityHint="Hace match con esta propiedad y guarda en tu historial"
        style={({ pressed }) => [
          styles.button,
          styles.matchButton,
          styles.matchGlow,
          pressed && styles.pressed,
          disabled && styles.disabled,
        ]}
        testID={testID ? `${testID}-match` : undefined}
      >
        <Text style={styles.matchIcon} allowFontScaling={false}>♥</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.lg,
    paddingVertical: Spacing.md,
  },

  // Base button style (shared)
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radius.pill,
    borderWidth: 1.5,
  },

  // Reject (✗) — glass + borde accent-reject (UX-DR11: Destructive)
  rejectButton: {
    width: 54,
    height: 54,
    backgroundColor: SurfaceColors.bgSurfaceOverlay,
    borderColor: Colors.accentReject,
  },
  rejectIcon: {
    color: Colors.accentReject,
    fontSize: 22,
    fontWeight: '600',
  },

  // Info (ⓘ) — glass + borde naranja translúcido (UX-DR11: Secondary)
  infoButton: {
    width: 46,
    height: 46,
    backgroundColor: SurfaceColors.bgSurfaceOverlay,
    borderColor: SurfaceColors.accentSoft,
  },
  infoIcon: {
    color: Colors.textPrimary,
    fontSize: 18,
  },

  // Match (♥) — naranja sólido + glow naranja (UX-DR11: Primary)
  matchButton: {
    width: 54,
    height: 54,
    backgroundColor: Colors.accentPrimary,
    borderColor: Colors.accentPrimary,
  },
  matchGlow: {
    shadowColor: Colors.accentPrimary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  matchIcon: {
    color: Colors.textPrimary,
    fontSize: 24,
  },

  // Estados compartidos
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.4,
  },
});
