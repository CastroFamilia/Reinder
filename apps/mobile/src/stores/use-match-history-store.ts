/**
 * apps/mobile/src/stores/use-match-history-store.ts
 *
 * Zustand store para el historial de matches del comprador y el badge de "nuevas propiedades".
 *
 * - fetchMatches: carga matches desde API, calcula cuántos son nuevos desde lastVisitAt
 * - markVisited: actualiza lastVisitAt (persiste) y resetea newMatchesSinceLastVisit
 * - lastVisitAt persiste en AsyncStorage via zustand/persist
 * - newMatchesSinceLastVisit: calculado en runtime (no persistido)
 *
 * Source: story 2-7-historial-matches-badge-nuevas-propiedades.md (Task 3)
 * Source: use-swipe-store.ts (patrón safeAsyncStorage + partialize)
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { MatchHistoryItem } from '@reinder/shared';
import { getMatches } from '../lib/api/matches';

/**
 * Safe AsyncStorage wrapper — igual que en use-swipe-store.ts.
 * Evita crash "Native module is null" en Expo Go / web / tests.
 */
function safeAsyncStorage() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const AS = require('@react-native-async-storage/async-storage').default as {
    getItem: (key: string) => Promise<string | null>;
    setItem: (key: string, value: string) => Promise<void>;
    removeItem: (key: string) => Promise<void>;
  };
  const memoryStore: Record<string, string> = {};
  const wrap = <T>(fn: () => Promise<T>, fallback: T): Promise<T> =>
    fn().catch(() => fallback);
  return {
    getItem: (key: string) => wrap(() => AS.getItem(key), memoryStore[key] ?? null),
    setItem: (key: string, value: string) => {
      memoryStore[key] = value;
      return wrap(() => AS.setItem(key, value), undefined as void);
    },
    removeItem: (key: string) => {
      delete memoryStore[key];
      return wrap(() => AS.removeItem(key), undefined as void);
    },
  };
}

interface MatchHistoryStore {
  /** Historial completo de matches (no persistido — recargado desde API) */
  matches: MatchHistoryItem[];
  /** True mientras se cargan los matches */
  isLoading: boolean;
  /** ISO string de la última vez que el comprador visitó la tab Matches (persistido) */
  lastVisitAt: string | null;
  /** Número de matches nuevos desde lastVisitAt (calculado en runtime, no persistido) */
  newMatchesSinceLastVisit: number;
  /**
   * True si el usuario cerró el badge manualmente en esta sesión de SwipeScreen.
   * Guardado en el store (no local state) para sobrevivir re-mounts de la tab (M1 fix).
   * Se resetea a false cuando fetchMatches detecta nuevos matches.
   */
  isBadgeDismissed: boolean;

  /** Carga el historial desde la API y calcula nuevos matches */
  fetchMatches: (token: string) => Promise<void>;
  /** Actualiza lastVisitAt a ahora y resetea el contador de nuevos */
  markVisited: () => void;
  /** Marca el badge como descartado por el usuario (sobrevive re-mounts) */
  dismissBadge: () => void;
}

export const useMatchHistoryStore = create<MatchHistoryStore>()(
  persist(
    (set, get) => ({
      matches: [],
      isLoading: false,
      lastVisitAt: null,
      newMatchesSinceLastVisit: 0,
      isBadgeDismissed: false,

      fetchMatches: async (token: string) => {
        set({ isLoading: true });
        const result = await getMatches(token);

        if (result.error) {
          // Fallback: construir historial desde los listings en memoria del swipe store.
          // Esto muestra todos los matches de la sesión aunque el backend no esté disponible.
          try {
            const { useSwipeStore } = require('./use-swipe-store') as {
              useSwipeStore: { getState: () => { pendingRecapIds: string[]; recapMatchIds: string[]; prefetchQueue: import('@reinder/shared').Listing[]; currentCard: import('@reinder/shared').Listing | null } };
            };
            const swipeState = useSwipeStore.getState();

            // Reunir todos los listing IDs que han tenido match (pendingRecapIds incluye todos)
            const matchedIds = Array.from(
              new Set([...swipeState.pendingRecapIds, ...swipeState.recapMatchIds]),
            );

            if (matchedIds.length > 0) {
              // Construir el pool de listings disponibles en memoria
              const allListings = [
                ...(swipeState.currentCard ? [swipeState.currentCard] : []),
                ...swipeState.prefetchQueue,
              ];

              // Para cada ID matcheado, buscar el listing en memoria y convertirlo
              const fallbackMatches: import('@reinder/shared').MatchHistoryItem[] = matchedIds
                .map((id, idx) => {
                  const listing = allListings.find((l) => l.id === id);
                  if (!listing) return null;
                  return {
                    matchId: id,
                    listingId: id,
                    imageUrl: listing.imageUrl,
                    price: listing.price,
                    address: `${listing.title} — ${listing.location}`,
                    listingStatus: listing.status as 'active' | 'sold' | 'withdrawn',
                    matchedAt: new Date(Date.now() - idx * 60000).toISOString(),
                    confirmed: false,
                  };
                })
                .filter((x): x is import('@reinder/shared').MatchHistoryItem => x !== null);

              if (fallbackMatches.length > 0) {
                set({ matches: fallbackMatches, isLoading: false, newMatchesSinceLastVisit: fallbackMatches.length });
                return;
              }
            }
          } catch {
            // useSwipeStore puede no estar disponible (tests) — silenciar
          }

          set({ isLoading: false });
          return;
        }

        const matches = result.data ?? [];
        const { lastVisitAt } = get();

        // Calcular cuántos matches son nuevos desde la última visita
        const newCount =
          lastVisitAt !== null
            ? matches.filter((m) => m.matchedAt > lastVisitAt).length
            : 0;

        set({
          matches,
          isLoading: false,
          newMatchesSinceLastVisit: newCount,
          // M1 fix: resetear el dismiss si hay nuevos matches, para que el badge vuelva a aparecer
          isBadgeDismissed: newCount > 0 ? false : get().isBadgeDismissed,
        });
      },

      markVisited: () => {
        set({
          lastVisitAt: new Date().toISOString(),
          newMatchesSinceLastVisit: 0,
          isBadgeDismissed: false,
        });
      },

      dismissBadge: () => {
        set({ isBadgeDismissed: true });
      },
    }),
    {
      name: 'match-history-store',
      storage: createJSONStorage(safeAsyncStorage),
      // Solo persistir lastVisitAt — el resto se recalcula en runtime
      partialize: (state) => ({ lastVisitAt: state.lastVisitAt }),
    },
  ),
);
