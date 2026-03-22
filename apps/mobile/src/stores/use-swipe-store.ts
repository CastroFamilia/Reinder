/**
 * apps/mobile/src/stores/use-swipe-store.ts
 *
 * Zustand store para el swipe feed — gestión del prefetch buffer de tarjetas.
 * Implementa el patrón de prefetch de 10 tarjetas (MAX_SWIPE_PREFETCH) para ≤1s de carga en 4G (NFR1).
 *
 * Source: architecture.md#Communication Patterns (Zustand stores — un store por dominio)
 */
import { create } from 'zustand';
import type { Listing, SwipeEvent } from '@reinder/shared';
import { MAX_SWIPE_PREFETCH } from '@reinder/shared';
import { fetchListings, MOCK_LISTINGS } from '../lib/api/listings';
import { postSwipeEvent } from '../lib/api/swipe-events';

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
  pendingEvents: [],

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

  // [DEV ONLY] — Eliminar antes de producción (ver CLAUDE.md#Dev Temporals)
  resetFeed: async (token: string) => {
    set({ currentCard: null, prefetchQueue: [], cursor: undefined });
    await get().loadFeed(token);
  },
}));
