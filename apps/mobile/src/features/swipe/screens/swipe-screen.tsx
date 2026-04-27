/**
 * apps/mobile/src/features/swipe/screens/swipe-screen.tsx
 *
 * Pantalla principal del swipe feed.
 * Integra: useSwipeStore, SwipableCard, PropertyCard (stack), SwipeActions, MatchPayoff,
 * el MatchRecapScreen Modal (Story 2.6), el badge de nuevas propiedades (Story 2.7),
 * el PropertyDetailSheet (Story 2.5),
 * y el SearchOnboardingModal + SearchFiltersModal (Story 2.9).
 *
 * Story 2.9:
 * - SearchOnboardingModal: aparece la primera vez (AC1)
 * - Botón ⚙️ en header: abre SearchFiltersModal para editar filtros (AC4)
 * - loadFeed se llama con las preferencias del store (AC3)
 * - Si isLoading → PropertyCardSkeleton (AC4 Story 2.2)
 * - Si currentCard → SwipableCard con gesto + SwipeActions + MatchPayoff (AC1, AC2, AC3 Story 2.3)
 * - Efecto stack: tarjeta siguiente visible detrás de la activa (AC7 Story 2.3)
 * - Si feed vacío → empty state (UX-DR12)
 * - Prefetch buffer gestionado por useSwipeStore (AC7, NFR1)
 * - MatchRecapScreen Modal: aparece tras MatchPayoff dismiss si isRecapVisible (AC1 Story 2.6)
 * - NewPropertiesBadge: visible si newMatchesSinceLastVisit > 0 (Story 2.7 AC4)
 * - PropertyDetailSheet: bottom sheet de detalle abierto por botón ⓘ o tap en tarjeta (Story 2.5)
 *
 * Source: epics.md#Story-2.3, epics.md#Story-2.5, epics.md#Story-2.6, epics.md#Story-2.7
 * Source: ux-design-specification.md#Defining-Core-Experience
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ScreenBackground } from '../../../components/layout/screen-background';
import { useSwipeStore } from '../../../stores/use-swipe-store';
import { useMatchHistoryStore } from '../../../stores/use-match-history-store';
import { useAuthSession } from '../../../hooks/useAuthSession';
import { PropertyCard } from '../components/property-card';
import { PropertyCardSkeleton } from '../components/property-card-skeleton';
import { SwipableCard } from '../components/swipable-card';
import { SwipeActions } from '../components/swipe-actions';
import { MatchPayoff } from '../components/match-payoff';
import { MatchRecapScreen } from './match-recap-screen';
import { NewPropertiesBadge } from '../components/new-properties-badge';
import { PropertyDetailSheet } from '../components/property-detail-sheet';
import { Colors, Spacing, Typography } from '../../../lib/tokens';
import { supabase } from '../../../lib/supabase';
import { useSearchStore } from '../../../stores/use-search-store';
import { SearchOnboardingModal } from '../../search/components/search-onboarding-modal';
import { SearchFiltersModal } from '../../search/components/search-filters-modal';
import type { SearchPreferences } from '@reinder/shared';

export function SwipeScreen({
  testID,
  onNavigateToMatches,
}: {
  testID?: string;
  /** Callback para ir a la tab de Matches desde el badge (Story 2.7) */
  onNavigateToMatches?: () => void;
}) {
  const { session } = useAuthSession();
  const newMatchesSinceLastVisit = useMatchHistoryStore(
    (s) => s.newMatchesSinceLastVisit,
  );
  // M1 fix: dismiss state lives in store (survives SwipeScreen re-mounts across tab navigation)
  const isBadgeDismissed = useMatchHistoryStore((s) => s.isBadgeDismissed);
  const dismissBadge = useMatchHistoryStore((s) => s.dismissBadge);
  const {
    currentCard,
    prefetchQueue,
    isLoading,
    loadFeed,
    advanceCard,
    recordMatchEvent,
    recordRejectEvent,
    resetFeed,
    checkAndTriggerRecap,
    isRecapVisible,
    recapMatchIds,
    dismissRecap,
  } = useSwipeStore();

  // Story 2.9: search preferences store
  const { preferences, hasCompletedOnboarding, setPreferences, markOnboardingDone } = useSearchStore();
  const [isFiltersModalVisible, setIsFiltersModalVisible] = useState(false);

  const [isMatchPayoffVisible, setIsMatchPayoffVisible] = useState(false);
  /**
   * Estado del bottom sheet de detalle de propiedad (Story 2.5).
   * Se abre al pulsar el botón ⓘ o al hacer tap en la tarjeta.
   */
  const [isDetailSheetVisible, setIsDetailSheetVisible] = useState(false);
  /**
   * Guard contra double-advance en match (H1 code review Story 2.3):
   * Si el gesto y el botón se activan simultáneamente, sólo el primero debe ejecutar el match.
   * RESET: solo en handleMatchDismiss (tras la animación de 450ms+).
   */
  const isMatchInFlight = useRef(false);
  /**
   * Guard contra double-advance en reject (H1 code review Story 2.4):
   * Si el gesto y el botón se activan simultáneamente, sólo el primero avanza la tarjeta.
   * RESET: en el effect de cambio de tarjeta (cuando currentCard cambia tras advanceCard),
   * NO sincrónicamente dentro del mismo callback (ese patrón no ofrece ninguna protección).
   */
  const isRejectInFlight = useRef(false);

  // Carga el feed al montar la pantalla — usa el token de sesión de Supabase
  // Story 2.9: pasa los filtros activos al loadFeed (AC3)
  useEffect(() => {
    const token = session?.access_token ?? '';
    loadFeed(token, preferences ?? undefined);
  }, [loadFeed, session?.access_token, preferences]);

  /**
   * Libera el guard de reject cuando cambia la tarjeta actual.
   * Necesario porque advanceCard es sincrona y el cambio de currentCard
   * ocurre en el siguiente render — el guard debe durar hasta ese render
   * para bloquear el tap del botón mientras el gesto ya disparó el advance.
   * CR Story 2.4 H1 fix.
   */
  useEffect(() => {
    isRejectInFlight.current = false;
  }, [currentCard?.id]);

  /**
   * Cierra el detail sheet si la tarjeta activa desaparece mientras el sheet está abierto.
   * Ocurre cuando advanceCard se activa (ej. desde un gesto de swipe rápido con el sheet abierto).
   * CR Story 2.5 M1 fix.
   */
  useEffect(() => {
    if (!currentCard) {
      setIsDetailSheetVisible(false);
    }
  }, [currentCard]);

  /**
   * Handler de match — compartido por gesto de swipe Y botón de match.
   * 1. Registra el evento en el servidor (fire-and-forget, con offline queue)
   * 2. Comprueba si se debe disparar el recap (Story 2.6)
   * 3. Muestra el overlay MatchPayoff
   * El MatchPayoff se auto-cierra y llama a handleMatchDismiss.
   */
  const handleMatch = useCallback(() => {
    if (isMatchInFlight.current) return;
    isMatchInFlight.current = true;

    const token = session?.access_token ?? '';
    const matchedId = currentCard?.id;

    if (currentCard && matchedId) {
      void recordMatchEvent(currentCard.id, token);
      checkAndTriggerRecap(matchedId);
    }

    // Descartar badge al hacer swipe (Story 2.7 AC4)
    dismissBadge();
    setIsMatchPayoffVisible(true);
  }, [currentCard, session?.access_token, recordMatchEvent, checkAndTriggerRecap, dismissBadge]);

  /**
   * Llamado cuando MatchPayoff termina su animación de cierre.
   * Avanza a la siguiente tarjeta, luego muestra el recap si isRecapVisible.
   * Story 2.6: el recap aparece DESPUÉS del MatchPayoff dismiss (no durante).
   */
  const handleMatchDismiss = useCallback(() => {
    setIsMatchPayoffVisible(false);
    isMatchInFlight.current = false; // Liberar el guard para el próximo match
    const token = session?.access_token ?? '';
    advanceCard(token);
    // isRecapVisible en el store controla el Modal — si ya era true, el Modal se abre en el
    // siguiente render automáticamente (sin setTimeout frágil).
  }, [advanceCard, session?.access_token]);

  /**
   * Handler de reject — registra el evento y avanza directamente (sin MatchPayoff).
   * Fire-and-forget: recordRejectEvent no bloquea el advance de la tarjeta.
   * Story 2.4 — AC1, AC2, AC3, AC4.
   */
  const handleReject = useCallback(() => {
    if (isRejectInFlight.current) return;
    isRejectInFlight.current = true;

    // Descartar badge al hacer swipe (Story 2.7 AC4)
    dismissBadge();

    const token = session?.access_token ?? '';
    if (currentCard) {
      void recordRejectEvent(currentCard.id, token);
    }
    advanceCard(token);
  }, [currentCard, session?.access_token, recordRejectEvent, advanceCard, dismissBadge]);

  const handleInfo = useCallback(() => {
    // CR Story 2.5 M2: no abrir el sheet mientras MatchPayoff está animando
    if (isMatchPayoffVisible) return;
    setIsDetailSheetVisible(true);
  }, [isMatchPayoffVisible]);

  /** Cierra el detail sheet sin registrar ninguna acción (AC4). */
  const handleDetailClose = useCallback(() => {
    setIsDetailSheetVisible(false);
  }, []);

  /**
   * Match desde dentro del detail sheet:
   * Cierra el sheet y reutiliza el handler existente (con guards, badge dismiss, recap).
   */
  const handleDetailMatch = useCallback(() => {
    setIsDetailSheetVisible(false);
    handleMatch();
  }, [handleMatch]);

  /**
   * Reject desde dentro del detail sheet:
   * Cierra el sheet y reutiliza el handler existente (con guard isRejectInFlight).
   */
  const handleDetailReject = useCallback(() => {
    setIsDetailSheetVisible(false);
    handleReject();
  }, [handleReject]);

  // Story 2.9: guardar preferencias desde onboarding o filtros
  const handleSavePreferences = useCallback(
    async (prefs: SearchPreferences) => {
      const token = session?.access_token ?? '';
      await setPreferences(prefs, token);
      setIsFiltersModalVisible(false);
    },
    [setPreferences, session?.access_token],
  );

  const handleSkipOnboarding = useCallback(() => {
    markOnboardingDone();
  }, [markOnboardingDone]);

  // [DEV ONLY] Resetea el feed para volver a ver las tarjetas
  const handleDevReset = useCallback(() => {
    const token = session?.access_token ?? '';
    void resetFeed(token, preferences ?? undefined);
  }, [resetFeed, session?.access_token, preferences]);

  // [DEV ONLY] Cierra sesión
  const handleDevLogout = useCallback(() => {
    void supabase.auth.signOut();
  }, []);

  // Reconstruir los listings del recap desde el prefetchQueue + currentCard combo
  // (usa los listings ya en memoria para construir la lista del recap sin fetch adicional)
  const recapListings = [...(currentCard ? [currentCard] : []), ...prefetchQueue].filter((l) =>
    recapMatchIds.includes(l.id),
  );

  return (
    <ScreenBackground>
      <View style={styles.container} testID={testID}>

        {/* Story 2.9: botón ⚙️ para editar filtros (AC4) */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => setIsFiltersModalVisible(true)}
            style={styles.filterBtn}
            testID="filter-settings-btn"
          >
            <Text style={styles.filterBtnText}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* Badge de nuevas propiedades (Story 2.7 AC4 / UX-DR15) */}
        {!isBadgeDismissed && newMatchesSinceLastVisit > 0 && (
          <NewPropertiesBadge
            count={newMatchesSinceLastVisit}
            onPress={() => {
              dismissBadge();
              onNavigateToMatches?.();
            }}
            onDismiss={dismissBadge}
            testID="new-properties-badge"
          />
        )}

        {/* Estado de carga: skeleton glassmorphism */}
        {isLoading && (
          <View style={styles.deckContainer}>
            <PropertyCardSkeleton testID="swipe-skeleton" />
          </View>
        )}

        {/* Feed activo: deck de tarjetas + acciones */}
        {!isLoading && currentCard && (
          <>
            {/* Deck: tarjeta siguiente (fija, detrás) + tarjeta activa (gesturable, arriba) */}
            <View style={styles.deckContainer}>
              {/* Tarjeta siguiente — fija detrás, ligeramente más pequeña */}
              {prefetchQueue[0] && (
                <View style={styles.backCard}>
                  <PropertyCard listing={prefetchQueue[0]} />
                </View>
              )}
              {/* Tarjeta activa — gesturable. key=listing.id fuerza remount en cada tarjeta
                  nueva: los shared values (translateX, cardOpacity) arrancan frescos a 0/1
                  sin frame intermedio, eliminando el flash. */}
              <SwipableCard
                key={currentCard.id}
                listing={currentCard}
                onMatch={handleMatch}
                onReject={handleReject}
                onInfo={handleInfo}
                testID="swipe-card"
              />
            </View>

            {/* Botones de acción (alternativa al gesto) */}
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

        {/* Empty state: feed agotado (UX-DR12) */}
        {!isLoading && !currentCard && prefetchQueue.length === 0 && (
          <View style={styles.emptyState} testID="swipe-empty">
            <Text style={styles.emptyTitle}>Reinder</Text>
            <Text style={styles.emptyText}>
              Has visto todas las propiedades de hoy — vuelve mañana
            </Text>
            {/* [DEV ONLY] Botón para reiniciar el feed */}
            <View style={styles.devTools}>
              <TouchableOpacity style={styles.devButton} onPress={handleDevReset}>
                <Text style={styles.devButtonText}>🔄 Reiniciar feed</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.devButton, styles.devButtonDanger]} onPress={handleDevLogout}>
                <Text style={styles.devButtonText}>🚪 Cerrar sesión</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* [DEV ONLY] Panel flotante — accesible siempre, esquina inferior izquierda */}
        {!isLoading && currentCard && (
          <View style={styles.devFloating}>
            <TouchableOpacity style={styles.devButtonSmall} onPress={handleDevReset}>
              <Text style={styles.devButtonSmallText}>🔄</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.devButtonSmall} onPress={handleDevLogout}>
              <Text style={styles.devButtonSmallText}>🚪</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* MatchPayoff overlay — fuera del container principal para estar al z-index más alto */}
      <MatchPayoff
        visible={isMatchPayoffVisible}
        onDismiss={handleMatchDismiss}
        testID="match-payoff"
      />

      {/* MatchRecapScreen Modal — aparece tras el MatchPayoff dismiss si isRecapVisible (Story 2.6) */}
      <Modal
        visible={isRecapVisible && !isMatchPayoffVisible}
        animationType="fade"
        transparent={false}
        onRequestClose={dismissRecap}
        testID="match-recap-modal"
      >
        <MatchRecapScreen
          listings={recapListings}
          testID="match-recap-screen"
        />
      </Modal>

      {/* PropertyDetailSheet — bottom sheet de detalle (Story 2.5) */}
      <PropertyDetailSheet
        visible={isDetailSheetVisible}
        listing={currentCard ?? null}
        onClose={handleDetailClose}
        onMatch={handleDetailMatch}
        onReject={handleDetailReject}
        testID="property-detail-sheet"
      />

      {/* Story 2.9: Onboarding modal — primera vez del comprador (AC1, AC5) */}
      <SearchOnboardingModal
        visible={!hasCompletedOnboarding}
        onSave={handleSavePreferences}
        onSkip={handleSkipOnboarding}
      />

      {/* Story 2.9: Filtros modal — edición de preferencias (AC4) */}
      <SearchFiltersModal
        visible={isFiltersModalVisible}
        currentPreferences={preferences}
        onSave={handleSavePreferences}
        onClose={() => setIsFiltersModalVisible(false)}
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    position: 'absolute',
    top: 48,
    right: Spacing.md,
    zIndex: 10,
  },
  filterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBtnText: {
    fontSize: 18,
  },
  deckContainer: {
    flex: 1,
    margin: Spacing.md,
    marginBottom: 0,
    position: 'relative',
  },
  backCard: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: 0,
    borderRadius: 24,
    overflow: 'hidden',
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
    marginBottom: Spacing.xl,
  },
  // [DEV ONLY] — Eliminar antes de producción
  devTools: {
    gap: Spacing.sm,
    width: '100%',
    alignItems: 'center',
  },
  devButton: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 24,
    width: '80%',
    alignItems: 'center',
  },
  devButtonDanger: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  devButtonText: {
    color: Colors.textMuted,
    fontSize: Typography.sizeSmall,
    fontWeight: '500',
  },
  devFloating: {
    position: 'absolute',
    bottom: Spacing.sm,
    left: Spacing.md,
    flexDirection: 'row',
    gap: 6,
    zIndex: 50,
  },
  devButtonSmall: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 20,
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  devButtonSmallText: {
    fontSize: 16,
  },
});
