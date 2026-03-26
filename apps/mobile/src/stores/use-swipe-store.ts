/**
 * apps/mobile/src/stores/use-swipe-store.ts
 *
 * Zustand store para el swipe feed — gestión del prefetch buffer de tarjetas
 * y lógica del Match Recap Screen (Story 2.6).
 *
 * Implementa el patrón de prefetch de 10 tarjetas (MAX_SWIPE_PREFETCH) para ≤1s de carga en 4G (NFR1).
 * Persistencia de estado de recap via zustand/persist + AsyncStorage (AC6 Story 2.6).
 *
 * Source: architecture.md#Communication Patterns (Zustand stores — un store por dominio)
 * Source: story 2-6-match-recap-screen.md
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Listing, SwipeEvent } from '@reinder/shared';
import { MAX_SWIPE_PREFETCH, MATCH_RECAP_MIN_COUNT } from '@reinder/shared';
import { fetchListings, MOCK_LISTINGS } from '../lib/api/listings';
import { postSwipeEvent } from '../lib/api/swipe-events';
import { confirmMatch, discardMatch } from '../lib/api/matches';

/**
 * Estado e interfaz del SwipeStore.
 * Regla: prefijo 'is' en todos los booleanos de estado (arch.md#Process Patterns)
 */
interface SwipeStore {
  /** Tarjeta actualmente en pantalla */
  currentCard: Listing | null;
  /** Buffer de tarjetas precargadas */
  prefetchQueue: Listing[];
  /** Carga inicial (muestra skeleton) */
  isLoading: boolean;
  /** Fetch de background para rellenar buffer */
  isFetching: boolean;
  /** Error en la carga (mensaje para el usuario) */
  error: string | null;
  /** Cursor de paginación para cargar más listings */
  cursor: string | undefined;
  /**
   * Cola de eventos de swipe pendientes de sincronizar (offline queue).
   * Story 2.3: se registran aquí cuando el POST /api/v1/swipe-events falla por red.
   */
  pendingEvents: SwipeEvent[];

  // ─── Match Recap State (Story 2.6) ────────────────────────────────────────

  /**
   * Número de matches consecutivos desde el último recap.
   * Se incrementa con cada match y se resetea cuando se dispara el recap.
   * PERSISTIDO: la sesión se preserva entre arranques.
   */
  consecutiveMatchCount: number;
  /**
   * IDs de los listings de los matches pendientes de mostrar en el recap.
   * Se acumulan hasta llegar a MATCH_RECAP_MIN_COUNT, luego se transfieren a recapMatchIds.
   * PERSISTIDO: si la app se cierra durante el conteo, no se pierde la cuenta.
   */
  pendingRecapIds: string[];
  /**
   * IDs de matches actualmente mostrados en MatchRecapScreen.
   * NO persistido: se reconstruye desde pendingRecapIds al reabrir.
   */
  recapMatchIds: string[];
  /**
   * Controla si MatchRecapScreen está visible.
   * PERSISTIDO: si la app se cierra durante el recap, reaparece al reabrir (AC6).
   */
  isRecapVisible: boolean;

  /** Carga el feed inicial con el token de sesión del usuario */
  loadFeed: (token: string) => Promise<void>;
  /** Avanza a la siguiente tarjeta del buffer */
  advanceCard: (token: string) => void;
  /** Fetch de más listings para mantener el buffer (no bloquea UI) */
  loadMore: (token: string) => Promise<void>;
  /**
   * Registra un evento de match en el servidor.
   * Si falla (sin conexión), encola el evento en pendingEvents para retry posterior.
   * Story 2.3 — AC4.
   */
  recordMatchEvent: (listingId: string, token: string) => Promise<void>;
  /**
   * Registra un evento de descarte en el servidor.
   * Si falla (sin conexión), encola el evento en pendingEvents para retry posterior.
   * Story 2.4 — AC3.
   */
  recordRejectEvent: (listingId: string, token: string) => Promise<void>;

  // ─── Match Recap Actions (Story 2.6) ──────────────────────────────────────

  /**
   * Incrementa el contador de matches consecutivos y dispara el recap
   * cuando se alcanza MATCH_RECAP_MIN_COUNT (3) matches.
   * Story 2.6 — AC1.
   */
  checkAndTriggerRecap: (matchedListingId: string) => void;
  /**
   * Cierra el MatchRecapScreen y limpia el estado de recap.
   * Story 2.6 — AC5.
   */
  dismissRecap: () => void;
  /**
   * Confirma un match del recap (marca como reforzado, notifica al agente).
   * Story 2.6 — AC3.
   */
  confirmRecapMatch: (matchId: string, token: string) => Promise<void>;
  /**
   * Descarta un match del recap (lo elimina del historial del comprador).
   * Story 2.6 — AC4.
   */
  discardRecapMatch: (matchId: string, token: string) => Promise<void>;

  /** [DEV ONLY] Resetea el feed al estado inicial para volver a ver las tarjetas */
  resetFeed: (token: string) => Promise<void>;
}

export const useSwipeStore = create<SwipeStore>()(
  persist(
    (set, get) => ({
      currentCard: null,
      prefetchQueue: [],
      isLoading: false,
      isFetching: false,
      error: null,
      cursor: undefined,
      pendingEvents: [],

      // Match Recap initial state
      consecutiveMatchCount: 0,
      pendingRecapIds: [],
      recapMatchIds: [],
      isRecapVisible: false,

      loadFeed: async (token: string) => {
        set({ isLoading: true, error: null });

        try {
          const result = await fetchListings(token);

          if (result.error) {
            // Fallback a mock data si el backend no está disponible
            // [DEV] Los mocks se repiten para que el feed sea infinito durante el desarrollo
            const mocks = [...MOCK_LISTINGS, ...MOCK_LISTINGS].slice(0, MAX_SWIPE_PREFETCH);
            set({
              currentCard: mocks[0] ?? null,
              prefetchQueue: mocks.slice(1),
              isLoading: false,
              error: null,
              cursor: undefined,
            });
            return;
          }

          const listings = result.data ?? [];
          set({
            currentCard: listings[0] ?? null,
            prefetchQueue: listings.slice(1),
            isLoading: false,
            error: null,
          });
        } catch {
          // Fallback a mock data en caso de cualquier error
          // [DEV] Los mocks se repiten para que el feed sea infinito durante el desarrollo
          const mocks = [...MOCK_LISTINGS, ...MOCK_LISTINGS].slice(0, MAX_SWIPE_PREFETCH);
          set({
            currentCard: mocks[0] ?? null,
            prefetchQueue: mocks.slice(1),
            isLoading: false,
            error: null,
            cursor: undefined,
          });
        }
      },

      advanceCard: (token: string) => {
        const { prefetchQueue, loadMore } = get();
        const [next, ...rest] = prefetchQueue;

        // [DEV] Si el buffer se agota y no hay backend, rellenar con mocks ciclados
        if (!next && rest.length === 0) {
          const mocks = [...MOCK_LISTINGS, ...MOCK_LISTINGS];
          set({
            currentCard: mocks[0] ?? null,
            prefetchQueue: mocks.slice(1),
          });
          return;
        }

        set({
          currentCard: next ?? null,
          prefetchQueue: rest,
        });

        // Rellenar buffer si quedan ≤5 tarjetas (sin bloquear la UI)
        if (rest.length <= 5) {
          loadMore(token);
        }
      },

      loadMore: async (token: string) => {
        const { isFetching, cursor } = get();
        if (isFetching) return; // Evitar fetch doble

        set({ isFetching: true });
        try {
          const result = await fetchListings(token, cursor);
          if (result.data && result.data.length > 0) {
            // TODO (paginación): actualizar `cursor` con el cursor de la respuesta del API
            // cuando el endpoint soporte paginación cursor-based. Sin este update,
            // loadMore siempre pide la primera página. Ver architecture.md#API Patterns.
            set((state) => ({
              prefetchQueue: [...state.prefetchQueue, ...(result.data ?? [])],
              isFetching: false,
            }));
          } else {
            set({ isFetching: false });
          }
        } catch {
          set({ isFetching: false });
        }
      },

      recordMatchEvent: async (listingId: string, token: string) => {
        const result = await postSwipeEvent(
          { action: 'match', listingId },
          token,
        );

        if (result.error) {
          // Offline o error de red — encolar para sincronización futura
          const pendingEvent: SwipeEvent = {
            id: `pending-${Date.now()}`,
            action: 'match',
            listingId,
            buyerId: 'pending-sync',
            createdAt: new Date().toISOString(),
          };
          set((state) => ({
            pendingEvents: [...state.pendingEvents, pendingEvent],
          }));
        }
        // Si tiene éxito, no se necesita actualizar el estado (el evento ya está en el servidor)
      },

      recordRejectEvent: async (listingId: string, token: string) => {
        const result = await postSwipeEvent(
          { action: 'reject', listingId },
          token,
        );

        if (result.error) {
          // Offline o error de red — encolar para sincronización futura
          const pendingEvent: SwipeEvent = {
            id: `pending-${Date.now()}`,
            action: 'reject',
            listingId,
            buyerId: 'pending-sync',
            createdAt: new Date().toISOString(),
          };
          set((state) => ({
            pendingEvents: [...state.pendingEvents, pendingEvent],
          }));
        }
        // Si tiene éxito, no se necesita actualizar el estado
      },

      // ─── Match Recap Actions ───────────────────────────────────────────────

      checkAndTriggerRecap: (matchedListingId: string) => {
        const { consecutiveMatchCount, pendingRecapIds } = get();
        const newCount = consecutiveMatchCount + 1;
        const newPendingIds = [...pendingRecapIds, matchedListingId];

        if (newCount >= MATCH_RECAP_MIN_COUNT) {
          // Trigger recap: activar pantalla con las últimas N propiedades
          set({
            consecutiveMatchCount: 0,
            pendingRecapIds: newPendingIds,
            recapMatchIds: newPendingIds,
            isRecapVisible: true,
          });
        } else {
          // Todavía no se alcanzó el umbral — acumular
          set({
            consecutiveMatchCount: newCount,
            pendingRecapIds: newPendingIds,
          });
        }
      },

      dismissRecap: () => {
        set({
          isRecapVisible: false,
          recapMatchIds: [],
          pendingRecapIds: [],
          consecutiveMatchCount: 0,
        });
      },

      confirmRecapMatch: async (matchId: string, token: string) => {
        const result = await confirmMatch(matchId, token);
        if (result.error) {
          // No eliminar del recap — el usuario puede reintentar (H1 fix: CR Story 2.6)
          // TODO (Epic 3): encolar para reintentar cuando la conexión se recupere
          return;
        }
        // Solo eliminar si el servidor confirmó correctamente
        set((state) => ({
          recapMatchIds: state.recapMatchIds.filter((id) => id !== matchId),
        }));
      },

      discardRecapMatch: async (matchId: string, token: string) => {
        const result = await discardMatch(matchId, token);
        if (result.error) {
          // No eliminar del recap — el usuario puede reintentar (H1 fix: CR Story 2.6)
          return;
        }
        // Solo eliminar si el servidor confirmó el descarte
        set((state) => ({
          recapMatchIds: state.recapMatchIds.filter((id) => id !== matchId),
          pendingRecapIds: state.pendingRecapIds.filter((id) => id !== matchId),
        }));
      },

      // [DEV ONLY] — Eliminar antes de producción (ver CLAUDE.md#Dev Temporals)
      resetFeed: async (token: string) => {
        set({ currentCard: null, prefetchQueue: [], cursor: undefined });
        await get().loadFeed(token);
      },
    }),
    {
      name: 'swipe-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Solo persistir el estado de recap — el feed se recarga desde el servidor
      partialize: (state) => ({
        consecutiveMatchCount: state.consecutiveMatchCount,
        pendingRecapIds: state.pendingRecapIds,
        isRecapVisible: state.isRecapVisible,
      }),
    }
  )
);
