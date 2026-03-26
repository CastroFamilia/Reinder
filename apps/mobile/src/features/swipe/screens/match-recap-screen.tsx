/**
 * apps/mobile/src/features/swipe/screens/match-recap-screen.tsx
 *
 * MatchRecapScreen — galería de últimos 3-5 matches para reconfirmar o descartar.
 * Aparece automáticamente tras MATCH_RECAP_MIN_COUNT matches consecutivos.
 *
 * Estados: loading, populated, empty.
 * Auto-dismiss cuando se gestionan todas las cards (AC5 Story 2.6).
 * Persistencia via zustand/persist — reaparece si se cierra la app (AC6 Story 2.6).
 *
 * Source: epics.md#Story-2.6
 * Source: ux-design-specification.md#Component-Strategy (MatchRecapScreen, UX-DR5)
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ScreenBackground } from '../../../components/layout/screen-background';
import { Button } from '../../../components/ui/button';
import { MatchRecapCard } from '../components/match-recap-card';
import { useSwipeStore } from '../../../stores/use-swipe-store';
import { useAuthSession } from '../../../hooks/useAuthSession';
import { Colors, Spacing, Typography } from '../../../lib/tokens';
import type { Listing } from '@reinder/shared';

interface MatchRecapScreenProps {
  /**
   * Listings completos de los matches del recap.
   * En la integración con SwipeScreen se pasan desde el store/prefetch buffer.
   */
  listings: Listing[];
  testID?: string;
}

/**
 * MatchRecapScreen — muestra las últimas 3-5 propiedades matcheadas para reconfirmar.
 * El dismiss automático ocurre cuando recapMatchIds queda vacío (AC5).
 */
export function MatchRecapScreen({ listings, testID }: MatchRecapScreenProps) {
  const { session } = useAuthSession();
  const { recapMatchIds, confirmRecapMatch, discardRecapMatch, dismissRecap } =
    useSwipeStore();
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Filtramos listings para mostrar solo los que aún están en recapMatchIds
  const activeListings = listings.filter((l) => recapMatchIds.includes(l.id));

  const handleConfirm = useCallback(
    async (listingId: string) => {
      if (processingId) return;
      setProcessingId(listingId);
      const token = session?.access_token ?? '';
      await confirmRecapMatch(listingId, token);
      setProcessingId(null);
      // Si no quedan más items, dismissRecap se llama desde el efecto de vaciado
    },
    [processingId, session?.access_token, confirmRecapMatch],
  );

  const handleDiscard = useCallback(
    async (listingId: string) => {
      if (processingId) return;
      setProcessingId(listingId);
      const token = session?.access_token ?? '';
      await discardRecapMatch(listingId, token);
      setProcessingId(null);
    },
    [processingId, session?.access_token, discardRecapMatch],
  );

  /**
   * Auto-dismiss cuando se gestionan todos los matches del recap (AC5 Story 2.6).
   * Se dispara cuando recapMatchIds queda vacío, con un pequeño delay para que el usuario
   * vea el estado "¡Todo gestionado!" durante 1.5s antes de cerrarse.
   * H2 fix — CR Story 2.6.
   */
  useEffect(() => {
    if (recapMatchIds.length === 0 && !processingId) {
      const timer = setTimeout(() => {
        dismissRecap();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [recapMatchIds.length, processingId, dismissRecap]);

  const isEmpty = activeListings.length === 0;

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} testID={testID}>
        <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Tus últimos matches</Text>
            <Text style={styles.subtitle}>
              Reconfirma los que más te interesan
            </Text>
          </View>

          {/* Empty state: todos gestionados */}
          {isEmpty && (
            <View style={styles.emptyState} testID="recap-empty">
              <Text style={styles.emptyIcon}>✓</Text>
              <Text style={styles.emptyTitle}>¡Todo gestionado!</Text>
              <Text style={styles.emptyText}>
                Has revisado todos tus matches. Vuelve al feed para seguir descubriendo.
              </Text>
              <Button
                variant="primary"
                onPress={dismissRecap}
                testID="recap-done-button"
              >
                Volver al feed
              </Button>
            </View>
          )}

          {/* Lista de cards de recap */}
          {!isEmpty && (
            <FlatList
              data={activeListings}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <MatchRecapCard
                  listing={item}
                  onConfirm={(id) => void handleConfirm(id)}
                  onDiscard={(id) => void handleDiscard(id)}
                  isProcessing={processingId === item.id}
                  testID={`recap-card-${item.id}`}
                />
              )}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              // Auto-dismiss cuando se gestiona la última card
              ListFooterComponent={
                activeListings.length > 0 ? (
                  <View style={styles.listFooter}>
                    <Button
                      variant="ghost"
                      onPress={dismissRecap}
                      testID="recap-skip-button"
                    >
                      Gestionar después
                    </Button>
                  </View>
                ) : null
              }
            />
          )}
        </Animated.View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: Typography.sizeH1,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: Typography.sizeCaption,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  listFooter: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
  },
  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  emptyIcon: {
    fontSize: 48,
    color: Colors.accentPrimary,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.sizeH2,
    fontWeight: '700',
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: Typography.sizeBody,
    textAlign: 'center',
    lineHeight: 24,
  },
});
