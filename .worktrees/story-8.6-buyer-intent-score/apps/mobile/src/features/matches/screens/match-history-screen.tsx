/**
 * apps/mobile/src/features/matches/screens/match-history-screen.tsx
 *
 * Pantalla de historial de matches del comprador.
 * - FlatList de MatchHistoryItemCard ordenados por fecha descendente
 * - Loading: skeleton glassmorphism
 * - Empty: emoji 🏠 + texto + CTA al feed
 * - Item tap: Modal de detalle simplificado (stub de Story 2.5)
 * - Al montar: fetchMatches; al desmontar: markVisited
 *
 * Source: story 2-7-historial-matches-badge-nuevas-propiedades.md (Task 5)
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenBackground } from '../../../components/layout/screen-background';
import { GlassPanel } from '../../../components/ui/glass-panel';
import { MatchHistoryItemCard } from '../components/match-history-item';
import { useMatchHistoryStore } from '../../../stores/use-match-history-store';
import { Colors, Typography, Spacing, Radius } from '../../../lib/tokens';
import type { MatchHistoryItem } from '@reinder/shared';

interface MatchHistoryScreenProps {
  token: string;
  onGoToSwipe?: () => void;
}

function MatchItemSkeleton() {
  return (
    <GlassPanel intensity="light" style={styles.skeletonCard}>
      <View style={styles.skeletonThumbnail} />
      <View style={styles.skeletonInfo}>
        <View style={[styles.skeletonLine, { width: '40%' }]} />
        <View style={[styles.skeletonLine, { width: '70%', marginTop: 4 }]} />
        <View style={[styles.skeletonLine, { width: '30%', marginTop: 4 }]} />
      </View>
    </GlassPanel>
  );
}

function DetailModal({
  item,
  onClose,
}: {
  item: MatchHistoryItem | null;
  onClose: () => void;
}) {
  if (!item) return null;
  return (
    <Modal
      visible={!!item}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <GlassPanel intensity="heavy" style={styles.modalContent}>
          <Text style={styles.modalTitle} numberOfLines={2}>{item.address}</Text>
          <Text style={styles.modalPrice}>{item.price.toLocaleString('es-ES')}€</Text>
          <Text style={styles.modalNote}>(Detalle completo disponible en Story 2.5)</Text>
          <Pressable
            onPress={onClose}
            style={styles.modalCloseBtn}
            accessibilityRole="button"
            accessibilityLabel="Cerrar detalle"
          >
            <Text style={styles.modalCloseBtnText}>Cerrar</Text>
          </Pressable>
        </GlassPanel>
      </View>
    </Modal>
  );
}

export function MatchHistoryScreen({ token, onGoToSwipe }: MatchHistoryScreenProps) {
  const { matches, isLoading, fetchMatches, markVisited } = useMatchHistoryStore();
  const [selectedItem, setSelectedItem] = useState<MatchHistoryItem | null>(null);
  /**
   * M2 fix: track whether data has loaded before calling markVisited on unmount.
   * If the component unmounts before fetchMatches resolves (e.g. rapid back navigation),
   * we should NOT update lastVisitAt — the user didn't actually see any matches.
   */
  const dataLoadedRef = useRef(false);

  useEffect(() => {
    dataLoadedRef.current = false;
    void fetchMatches(token).then(() => {
      dataLoadedRef.current = true;
    });
    return () => {
      if (dataLoadedRef.current) {
        markVisited();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleItemPress = useCallback((item: MatchHistoryItem) => {
    setSelectedItem(item);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedItem(null);
  }, []);

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <Text style={styles.header}>Mis Matches</Text>

        {/* Loading skeleton */}
        {isLoading && (
          <View testID="match-history-loading">
            {[1, 2, 3].map((key) => (
              <MatchItemSkeleton key={key} />
            ))}
          </View>
        )}

        {/* Populated list */}
        {!isLoading && matches.length > 0 && (
          <FlatList
            data={matches}
            keyExtractor={(item) => item.matchId}
            renderItem={({ item }) => (
              <MatchHistoryItemCard
                item={item}
                onPress={handleItemPress}
                testID={`match-item-${item.matchId}`}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            testID="match-history-list"
          />
        )}

        {/* Empty state */}
        {!isLoading && matches.length === 0 && (
          <View style={styles.emptyState} testID="match-history-empty">
            <Text style={styles.emptyEmoji}>🏠</Text>
            <Text style={styles.emptyText}>Swipea para empezar a matchear</Text>
            {onGoToSwipe && (
              <Pressable
                onPress={onGoToSwipe}
                style={styles.emptyBtn}
                accessibilityRole="button"
                accessibilityLabel="Ir al feed de swipe"
              >
                <Text style={styles.emptyBtnText}>Ir al feed</Text>
              </Pressable>
            )}
          </View>
        )}

        <DetailModal item={selectedItem} onClose={handleCloseDetail} />
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: Spacing.xl },
  header: {
    fontSize: 22,
    fontWeight: `${Typography.weightBold}`,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  listContent: { paddingBottom: Spacing.xl },
  skeletonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.xs,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  skeletonThumbnail: {
    width: 80,
    height: 80,
    borderRadius: Radius.btn,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
  },
  skeletonInfo: { flex: 1 },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 107, 0, 0.08)',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  emptyEmoji: { fontSize: 60 },
  emptyText: {
    fontSize: Typography.sizeBody,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  emptyBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  emptyBtnText: {
    fontSize: Typography.sizeBody,
    color: Colors.accentPrimary,
    fontWeight: `${Typography.weightMedium}`,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  modalContent: {
    width: '100%',
    padding: Spacing.lg,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: Typography.sizeBody,
    fontWeight: `${Typography.weightMedium}`,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  modalPrice: {
    fontSize: Typography.sizeH1,
    fontWeight: `${Typography.weightBold}`,
    color: Colors.accentPrimary,
  },
  modalNote: {
    fontSize: Typography.sizeSmall,
    color: Colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  modalCloseBtn: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  modalCloseBtnText: {
    fontSize: Typography.sizeBody,
    color: Colors.accentPrimary,
    fontWeight: `${Typography.weightMedium}`,
  },
});
