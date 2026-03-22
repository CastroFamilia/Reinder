/**
 * apps/mobile/src/features/swipe/screens/swipe-screen.tsx
 *
 * Pantalla principal del swipe feed.
 * Integra: useSwipeStore, PropertyCard, PropertyCardSkeleton, SwipeActions.
 *
 * - Si isLoading → PropertyCardSkeleton (AC4)
 * - Si currentCard → PropertyCard + SwipeActions (AC1, AC5)
 * - Si feed vacío → empty state (UX-DR12)
 * - Prefetch buffer gestionado por useSwipeStore (AC7, NFR1)
 *
 * NOTA: onReject/onInfo/onMatch son stubs en esta story.
 * La lógica de animación swipe viene en Stories 2.3/2.4.
 * La vista de detalle (bottom sheet) viene en Story 2.5.
 *
 * Source: epics.md#Story-2.2, UX-DR10
 */
import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { ScreenBackground } from '../../../components/layout/screen-background';
import { useSwipeStore } from '../../../stores/use-swipe-store';
import { useAuthSession } from '../../../hooks/useAuthSession';
import { PropertyCard } from '../components/property-card';
import { PropertyCardSkeleton } from '../components/property-card-skeleton';
import { SwipeActions } from '../components/swipe-actions';
import { Colors, Spacing, Typography } from '../../../lib/tokens';

export function SwipeScreen({ testID }: { testID?: string }) {
  const { session } = useAuthSession();
  const { currentCard, prefetchQueue, isLoading, loadFeed, advanceCard, resetFeed } = useSwipeStore();

  // Carga el feed al montar la pantalla — usa el token de sesión de Supabase
  useEffect(() => {
    const token = session?.access_token ?? '';
    loadFeed(token);
  }, [loadFeed, session?.access_token]);

  // Handler stubs — la lógica real se implementa en Stories 2.3, 2.4, 2.5
  const handleMatch = () => {
    const token = session?.access_token ?? '';
    advanceCard(token);
  };

  const handleReject = () => {
    const token = session?.access_token ?? '';
    advanceCard(token);
  };

  const handleInfo = () => {
    // Story 2.5: abrirá el bottom sheet de detalle
  };

  // [DEV ONLY] — Eliminar antes de producción (ver CLAUDE.md#Dev Temporals)
  const handleReset = () => {
    const token = session?.access_token ?? '';
    resetFeed(token);
  };

  return (
    <ScreenBackground>
      <View style={styles.container} testID={testID}>
        {/* Estado de carga: skeleton glassmorphism */}
        {isLoading && (
          <View style={styles.cardWrapper}>
            <PropertyCardSkeleton testID="swipe-skeleton" />
          </View>
        )}

        {/* Feed activo: tarjeta de propiedad + acciones */}
        {!isLoading && currentCard && (
          <>
            <View style={styles.cardWrapper}>
              <PropertyCard
                listing={currentCard}
                testID="swipe-card"
              />
            </View>
            <View style={styles.actionsWrapper}>
              <SwipeActions
                onReject={handleReject}
                onInfo={handleInfo}
                onMatch={handleMatch}
                testID="swipe-actions"
              />
            </View>
          </>
        )}

        {/* Empty state: feed agotado (UX-DR12) — botón Reiniciar solo para testing [DEV ONLY] */}
        {!isLoading && !currentCard && prefetchQueue.length === 0 && (
          <View style={styles.emptyState} testID="swipe-empty">
            <Text style={styles.emptyTitle}>Reinder</Text>
            <Text style={styles.emptyText}>
              Has visto todas las propiedades de hoy — vuelve mañana
            </Text>
            {/* [DEV ONLY] Eliminar antes de producción — ver CLAUDE.md#Dev Temporals */}
            <Pressable onPress={handleReset} style={styles.devResetBtn}>
              <Text style={styles.devResetText}>🔄 Reiniciar (dev)</Text>
            </Pressable>
          </View>
        )}
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cardWrapper: {
    flex: 1,
    margin: Spacing.md,
    marginBottom: 0,
  },
  actionsWrapper: {
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyTitle: {
    color: Colors.accentPrimary,
    fontSize: Typography.sizeDisplay,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: Typography.sizeBody,
    textAlign: 'center',
    lineHeight: 24,
  },
  // [DEV ONLY] — Eliminar antes de producción (ver CLAUDE.md#Dev Temporals)
  devResetBtn: {
    marginTop: 24,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  devResetText: {
    color: Colors.textMuted,
    fontSize: 13,
  },
});
