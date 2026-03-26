/**
 * apps/mobile/src/features/swipe/screens/swipe-screen.tsx
 *
 * Pantalla principal del swipe feed.
 * Integra: useSwipeStore, SwipableCard, PropertyCard (stack), SwipeActions, MatchPayoff,
 * y el MatchRecapScreen Modal (Story 2.6).
 *
 * - Si isLoading → PropertyCardSkeleton (AC4 Story 2.2)
 * - Si currentCard → SwipableCard con gesto + SwipeActions + MatchPayoff (AC1, AC2, AC3 Story 2.3)
 * - Efecto stack: tarjeta siguiente visible detrás de la activa (AC7 Story 2.3)
 * - Si feed vacío → empty state (UX-DR12)
 * - Prefetch buffer gestionado por useSwipeStore (AC7, NFR1)
 * - MatchRecapScreen Modal: aparece tras MatchPayoff dismiss si isRecapVisible (AC1 Story 2.6)
 *
 * Source: epics.md#Story-2.3, epics.md#Story-2.6
 * Source: ux-design-specification.md#Defining-Core-Experience
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ScreenBackground } from '../../../components/layout/screen-background';
import { useSwipeStore } from '../../../stores/use-swipe-store';
import { useAuthSession } from '../../../hooks/useAuthSession';
import { PropertyCard } from '../components/property-card';
import { PropertyCardSkeleton } from '../components/property-card-skeleton';
import { SwipableCard } from '../components/swipable-card';
import { SwipeActions } from '../components/swipe-actions';
import { MatchPayoff } from '../components/match-payoff';
import { MatchRecapScreen } from './match-recap-screen';
import { Colors, Spacing, Typography } from '../../../lib/tokens';
import { supabase } from '../../../lib/supabase';

export function SwipeScreen({ testID }: { testID?: string }) {
  const { session } = useAuthSession();
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

  const [isMatchPayoffVisible, setIsMatchPayoffVisible] = useState(false);
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
  useEffect(() => {
    const token = session?.access_token ?? '';
    loadFeed(token);
  }, [loadFeed, session?.access_token]);

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
   * Handler de match — compartido por gesto de swipe Y botón de match.
   * 1. Registra el evento en el servidor (fire-and-forget, con offline queue)
   * 2. Comprueba si se debe disparar el recap (Story 2.6)
   * 3. Muestra el overlay MatchPayoff
   * El MatchPayoff se auto-cierra y llama a handleMatchDismiss.
   */
  const handleMatch = useCallback(() => {
    // Guard: si ya hay un match en curso (gesture + botón simultáneos), ignorar
    if (isMatchInFlight.current) return;
    isMatchInFlight.current = true;

    const token = session?.access_token ?? '';
    const matchedId = currentCard?.id;

    if (currentCard && matchedId) {
      void recordMatchEvent(currentCard.id, token);
      // Actualizar contador de recap ANTES de mostrar el MatchPayoff (Story 2.6 AC1)
      checkAndTriggerRecap(matchedId);
    }

    setIsMatchPayoffVisible(true);
  }, [currentCard, session?.access_token, recordMatchEvent, checkAndTriggerRecap]);

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
    // Guard: evitar double-advance por swipe + botón simultáneos.
    // El guard se resetea en el useEffect de currentCard?.id (no aquí).
    if (isRejectInFlight.current) return;
    isRejectInFlight.current = true;

    const token = session?.access_token ?? '';
    if (currentCard) {
      void recordRejectEvent(currentCard.id, token);
    }
    // El reject avanza inmediatamente — sin MatchPayoff ni setTimeout.
    // isRejectInFlight se resetea en el siguiente render (useEffect currentCard?.id).
    advanceCard(token);
  }, [currentCard, session?.access_token, recordRejectEvent, advanceCard]);

  const handleInfo = () => {
    // Story 2.5: abrirá el bottom sheet de detalle
  };

  // [DEV ONLY] Resetea el feed para volver a ver las tarjetas
  const handleDevReset = useCallback(() => {
    const token = session?.access_token ?? '';
    void resetFeed(token);
  }, [resetFeed, session?.access_token]);

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
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
