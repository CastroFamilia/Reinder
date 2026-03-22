/**
 * apps/mobile/src/stores/use-swipe-store.ts
 *
 * Zustand store para el swipe feed — gestión del prefetch buffer de tarjetas.
 * Implementa el patrón de prefetch de 10 tarjetas (MAX_SWIPE_PREFETCH) para ≤1s de carga en 4G (NFR1).
 *
 * Source: architecture.md#Communication Patterns (Zustand stores — un store por dominio)
 */
import { create } from 'zustand';
import type { Listing } from '@reinder/shared';
import { MAX_SWIPE_PREFETCH } from '@reinder/shared';
import { fetchListings, MOCK_LISTINGS } from '../lib/api/listings';

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

  /** Carga el feed inicial con el token de sesión del usuario */
  loadFeed: (token: string) => Promise<void>;
  /** Avanza a la siguiente tarjeta del buffer */
  advanceCard: (token: string) => void;
  /** Fetch de más listings para mantener el buffer (no bloquea UI) */
  loadMore: (token: string) => Promise<void>;
  /** [DEV ONLY] Resetea el feed al estado inicial para volver a ver las tarjetas */
  resetFeed: (token: string) => Promise<void>;
}

export const useSwipeStore = create<SwipeStore>((set, get) => ({
  currentCard: null,
  prefetchQueue: [],
  isLoading: false,
  isFetching: false,
  error: null,
  cursor: undefined,

  loadFeed: async (token: string) => {
    set({ isLoading: true, error: null });

    try {
      const result = await fetchListings(token);

      if (result.error) {
        // Fallback a mock data si el backend no está disponible
        const mocks = MOCK_LISTINGS.slice(0, MAX_SWIPE_PREFETCH);
        set({
          currentCard: mocks[0] ?? null,
          prefetchQueue: mocks.slice(1),
          isLoading: false,
          error: null, // No mostrar error si hay fallback
          cursor: undefined, // Reset cursor — evita que loadMore use un cursor obsoleto
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
      const mocks = MOCK_LISTINGS.slice(0, MAX_SWIPE_PREFETCH);
      set({
        currentCard: mocks[0] ?? null,
        prefetchQueue: mocks.slice(1),
        isLoading: false,
        error: null,
        cursor: undefined, // Reset cursor — evita que loadMore use un cursor obsoleto
      });
    }
  },

  advanceCard: (token: string) => {
    const { prefetchQueue, loadMore } = get();
    const [next, ...rest] = prefetchQueue;

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

  // [DEV ONLY] — Eliminar antes de producción (ver CLAUDE.md#Dev Temporals)
  resetFeed: async (token: string) => {
    set({ currentCard: null, prefetchQueue: [], cursor: undefined });
    await get().loadFeed(token);
  },
}));
