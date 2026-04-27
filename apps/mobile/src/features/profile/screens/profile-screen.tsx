/**
 * apps/mobile/src/features/profile/screens/profile-screen.tsx
 *
 * Pantalla de Perfil del comprador — placeholder para Story 2.8.
 * Contenido completo se implementará en stories posteriores (Epic 3+).
 *
 * Story 2.8 — Task 1 (AC: 1)
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScreenBackground } from '../../../components/layout/screen-background';
import { Colors, Typography, Spacing } from '../../../lib/tokens';

export function ProfileScreen() {
  return (
    <ScreenBackground testID="profile-screen">
      <View style={styles.container}>
        <Text style={styles.title} testID="profile-title">
          Perfil
        </Text>
        <Text style={styles.subtitle}>
          Tu perfil estará disponible próximamente
        </Text>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  title: {
    fontSize: Typography.sizeH1,
    fontWeight: `${Typography.weightBold}`,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.sizeBody,
    fontWeight: `${Typography.weightRegular}`,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
