/**
 * apps/mobile/src/stores/use-swipe-store.test.ts
 *
 * Tests unitarios para useSwipeStore.
 * Verifica: advanceCard, recordRejectEvent, y lógica de Match Recap (Story 2.6).
 *
 * Source: epics.md#Story-2.2 AC7, architecture.md#Structure Patterns (tests co-located)
 */
import { renderHook, act } from '@testing-library/react-native';
import { useSwipeStore } from './use-swipe-store';
import type { Listing } from '@reinder/shared';

// Mock persist middleware para evitar AsyncStorage en tests
jest.mock('zustand/middleware', () => ({
  persist: (fn: unknown) => fn,
  createJSONStorage: () => ({}),
}));

// Mock del módulo API para no hacer fetch reales en tests
jest.mock('../lib/api/listings', () => ({
  fetchListings: jest.fn(),
  MOCK_LISTINGS: [
    {
      id: 'test-1',
      title: 'Test Listing 1',
      price: 100000,
      location: 'Madrid',
      rooms: 2,
      squareMeters: 60,
      imageUrl: 'https://example.com/1.jpg',
      status: 'active',
      agencyId: 'agency-1',
      createdAt: '2026-03-20T10:00:00Z',
    } as Listing,
    {
      id: 'test-2',
      title: 'Test Listing 2',
      price: 200000,
      location: 'Barcelona',
      rooms: 3,
      squareMeters: 80,
      imageUrl: 'https://example.com/2.jpg',
      status: 'active',
      agencyId: 'agency-1',
      createdAt: '2026-03-19T10:00:00Z',
    } as Listing,
    {
      id: 'test-3',
      title: 'Test Listing 3',
      price: 300000,
      location: 'Valencia',
      rooms: 4,
      squareMeters: 100,
      imageUrl: 'https://example.com/3.jpg',
      status: 'active',
      agencyId: 'agency-2',
      createdAt: '2026-03-18T10:00:00Z',
    } as Listing,
  ],
}));

// Mock del cliente API de swipe-events
jest.mock('../lib/api/swipe-events', () => ({
  postSwipeEvent: jest.fn(),
}));

// Mock del cliente API de matches (Story 2.6)
jest.mock('../lib/api/matches', () => ({
  confirmMatch: jest.fn(),
  discardMatch: jest.fn(),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

const mockListings: Listing[] = [
  {
    id: 'listing-a',
    title: 'Piso A',
    price: 150000,
    location: 'Madrid',
    rooms: 2,
    squareMeters: 55,
    imageUrl: 'https://example.com/a.jpg',
    status: 'active',
    agencyId: 'agency-1',
    createdAt: '2026-03-20T10:00:00Z',
  },
  {
    id: 'listing-b',
    title: 'Piso B',
    price: 250000,
    location: 'Barcelona',
    rooms: 3,
    squareMeters: 75,
    imageUrl: 'https://example.com/b.jpg',
    status: 'active',
    agencyId: 'agency-1',
    createdAt: '2026-03-19T10:00:00Z',
  },
  {
    id: 'listing-c',
    title: 'Piso C',
    price: 350000,
    location: 'Sevilla',
    rooms: 4,
    squareMeters: 95,
    imageUrl: 'https://example.com/c.jpg',
    status: 'active',
    agencyId: 'agency-2',
    createdAt: '2026-03-18T10:00:00Z',
  },
];

describe('useSwipeStore', () => {
  beforeEach(() => {
    // Resetear el store entre tests
    useSwipeStore.setState({
      currentCard: null,
      prefetchQueue: [],
      isLoading: false,
      isFetching: false,
      error: null,
      cursor: undefined,
      pendingEvents: [],
      consecutiveMatchCount: 0,
      pendingRecapIds: [],
      recapMatchIds: [],
      isRecapVisible: false,
    });
  });

  describe('advanceCard', () => {
    it('mueve el primer item del prefetchQueue a currentCard', () => {
      useSwipeStore.setState({
        currentCard: mockListings[0]!,
        prefetchQueue: [mockListings[1]!, mockListings[2]!],
      });

      act(() => {
        useSwipeStore.getState().advanceCard('mock-token');
      });

      const state = useSwipeStore.getState();
      expect(state.currentCard?.id).toBe('listing-b');
      expect(state.prefetchQueue).toHaveLength(1);
      expect(state.prefetchQueue[0]?.id).toBe('listing-c');
    });

    it('cae al fallback de mock cuando el prefetchQueue está vacío (dev behavior)', () => {
      useSwipeStore.setState({
        currentCard: mockListings[0]!,
        prefetchQueue: [],
      });

      act(() => {
        useSwipeStore.getState().advanceCard('mock-token');
      });

      // En desarrollo, advanceCard usa MOCK_LISTINGS como fallback cuando el queue está vacío
      const state = useSwipeStore.getState();
      expect(state.currentCard).not.toBeNull();
      expect(state.currentCard?.id).toBe('test-1');
    });

    it('mantiene el orden del prefetchQueue al avanzar', () => {
      useSwipeStore.setState({
        currentCard: null,
        prefetchQueue: [...mockListings],
      });

      act(() => {
        useSwipeStore.getState().advanceCard('mock-token');
      });

      const state = useSwipeStore.getState();
      expect(state.currentCard?.id).toBe('listing-a');
      expect(state.prefetchQueue.map((l) => l.id)).toEqual(['listing-b', 'listing-c']);
    });
  });

  describe('estado inicial', () => {
    it('inicia con estado limpio', () => {
      const state = useSwipeStore.getState();
      expect(state.currentCard).toBeNull();
      expect(state.prefetchQueue).toHaveLength(0);
      expect(state.isLoading).toBe(false);
      expect(state.isFetching).toBe(false);
      expect(state.error).toBeNull();
    });

    it('inicia el estado de recap en cero', () => {
      const state = useSwipeStore.getState();
      expect(state.consecutiveMatchCount).toBe(0);
      expect(state.pendingRecapIds).toHaveLength(0);
      expect(state.recapMatchIds).toHaveLength(0);
      expect(state.isRecapVisible).toBe(false);
    });
  });

  describe('recordRejectEvent', () => {
    beforeEach(() => {
      useSwipeStore.setState({ pendingEvents: [] });
    });

    it('no modifica el estado si el servidor responde correctamente', async () => {
      const { postSwipeEvent } = jest.requireMock('../lib/api/swipe-events') as {
        postSwipeEvent: jest.Mock;
      };
      postSwipeEvent.mockResolvedValueOnce({ data: { id: 'evt-1', action: 'reject', listingId: 'listing-1', buyerId: 'buyer-1', createdAt: '2026-03-22T21:00:00Z' }, error: null });

      await act(async () => {
        await useSwipeStore.getState().recordRejectEvent('listing-1', 'mock-token');
      });

      const { pendingEvents } = useSwipeStore.getState();
      expect(pendingEvents).toHaveLength(0);
    });

    it('encola el evento en pendingEvents si falla la red', async () => {
      const { postSwipeEvent } = jest.requireMock('../lib/api/swipe-events') as {
        postSwipeEvent: jest.Mock;
      };
      postSwipeEvent.mockResolvedValueOnce({
        data: null,
        error: { code: 'NETWORK_ERROR', message: 'Sin conexión' },
      });

      await act(async () => {
        await useSwipeStore.getState().recordRejectEvent('listing-1', 'mock-token');
      });

      const { pendingEvents } = useSwipeStore.getState();
      expect(pendingEvents).toHaveLength(1);
      expect(pendingEvents[0]!.action).toBe('reject');
      expect(pendingEvents[0]!.listingId).toBe('listing-1');
    });

    it('encola múltiples eventos de reject offline', async () => {
      const { postSwipeEvent } = jest.requireMock('../lib/api/swipe-events') as {
        postSwipeEvent: jest.Mock;
      };
      postSwipeEvent
        .mockResolvedValueOnce({ data: null, error: { code: 'NETWORK_ERROR', message: 'Sin conexión' } })
        .mockResolvedValueOnce({ data: null, error: { code: 'NETWORK_ERROR', message: 'Sin conexión' } });

      await act(async () => {
        await useSwipeStore.getState().recordRejectEvent('listing-1', 'mock-token');
        await useSwipeStore.getState().recordRejectEvent('listing-2', 'mock-token');
      });

      const { pendingEvents } = useSwipeStore.getState();
      expect(pendingEvents).toHaveLength(2);
      expect(pendingEvents[0]!.action).toBe('reject');
      expect(pendingEvents[1]!.action).toBe('reject');
    });
  });

  // ─── Match Recap Tests (Story 2.6) ────────────────────────────────────────

  describe('checkAndTriggerRecap', () => {
    it('incrementa el contador sin disparar recap antes del umbral (2 matches)', () => {
      act(() => {
        useSwipeStore.getState().checkAndTriggerRecap('listing-a');
        useSwipeStore.getState().checkAndTriggerRecap('listing-b');
      });

      const state = useSwipeStore.getState();
      expect(state.consecutiveMatchCount).toBe(2);
      expect(state.isRecapVisible).toBe(false);
      expect(state.pendingRecapIds).toEqual(['listing-a', 'listing-b']);
    });

    it('dispara el recap en el 3er match consecutivo (MATCH_RECAP_MIN_COUNT=3)', () => {
      act(() => {
        useSwipeStore.getState().checkAndTriggerRecap('listing-a');
        useSwipeStore.getState().checkAndTriggerRecap('listing-b');
        useSwipeStore.getState().checkAndTriggerRecap('listing-c');
      });

      const state = useSwipeStore.getState();
      expect(state.isRecapVisible).toBe(true);
      expect(state.recapMatchIds).toEqual(['listing-a', 'listing-b', 'listing-c']);
      expect(state.consecutiveMatchCount).toBe(0); // Reiniciado tras el trigger
    });

    it('resetea el contador a 0 tras disparar el recap', () => {
      act(() => {
        useSwipeStore.getState().checkAndTriggerRecap('listing-a');
        useSwipeStore.getState().checkAndTriggerRecap('listing-b');
        useSwipeStore.getState().checkAndTriggerRecap('listing-c');
      });

      expect(useSwipeStore.getState().consecutiveMatchCount).toBe(0);
    });
  });

  describe('dismissRecap', () => {
    it('limpia todo el estado de recap al llamar dismissRecap', () => {
      useSwipeStore.setState({
        isRecapVisible: true,
        recapMatchIds: ['listing-a', 'listing-b'],
        pendingRecapIds: ['listing-a', 'listing-b'],
        consecutiveMatchCount: 0,
      });

      act(() => {
        useSwipeStore.getState().dismissRecap();
      });

      const state = useSwipeStore.getState();
      expect(state.isRecapVisible).toBe(false);
      expect(state.recapMatchIds).toHaveLength(0);
      expect(state.pendingRecapIds).toHaveLength(0);
      expect(state.consecutiveMatchCount).toBe(0);
    });
  });

  describe('confirmRecapMatch', () => {
    beforeEach(() => {
      useSwipeStore.setState({
        recapMatchIds: ['match-a', 'match-b'],
        pendingRecapIds: ['match-a', 'match-b'],
        isRecapVisible: true,
      });
    });

    it('elimina el matchId de recapMatchIds tras confirmar', async () => {
      const { confirmMatch } = jest.requireMock('../lib/api/matches') as {
        confirmMatch: jest.Mock;
      };
      confirmMatch.mockResolvedValueOnce({ data: { confirmed: true }, error: null });

      await act(async () => {
        await useSwipeStore.getState().confirmRecapMatch('match-a', 'mock-token');
      });

      const state = useSwipeStore.getState();
      expect(state.recapMatchIds).toEqual(['match-b']);
    });

    it('llama a confirmMatch con el matchId y token correctos', async () => {
      const { confirmMatch } = jest.requireMock('../lib/api/matches') as {
        confirmMatch: jest.Mock;
      };
      confirmMatch.mockResolvedValueOnce({ data: { confirmed: true }, error: null });

      await act(async () => {
        await useSwipeStore.getState().confirmRecapMatch('match-a', 'my-token');
      });

      expect(confirmMatch).toHaveBeenCalledWith('match-a', 'my-token');
    });

    // Optimistic UI: matchId se elimina de recapMatchIds INCLUSO si la API falla
    it('elimina el matchId optimisticamente aunque confirmMatch devuelva error', async () => {
      const { confirmMatch } = jest.requireMock('../lib/api/matches') as {
        confirmMatch: jest.Mock;
      };
      confirmMatch.mockResolvedValueOnce({
        data: null,
        error: { code: 'NETWORK_ERROR', message: 'Sin conexión' },
      });

      await act(async () => {
        await useSwipeStore.getState().confirmRecapMatch('match-a', 'mock-token');
      });

      const state = useSwipeStore.getState();
      // Optimistic: se elimina de UI aunque el servidor falle (Epic 3 añadirá rollback)
      expect(state.recapMatchIds).toEqual(['match-b']);
    });
  });

  describe('discardRecapMatch', () => {
    beforeEach(() => {
      useSwipeStore.setState({
        recapMatchIds: ['match-a', 'match-b'],
        pendingRecapIds: ['match-a', 'match-b'],
        isRecapVisible: true,
      });
    });

    it('elimina el matchId de recapMatchIds y pendingRecapIds tras descartar', async () => {
      const { discardMatch } = jest.requireMock('../lib/api/matches') as {
        discardMatch: jest.Mock;
      };
      discardMatch.mockResolvedValueOnce({ data: { deleted: true }, error: null });

      await act(async () => {
        await useSwipeStore.getState().discardRecapMatch('match-b', 'mock-token');
      });

      const state = useSwipeStore.getState();
      expect(state.recapMatchIds).toEqual(['match-a']);
      expect(state.pendingRecapIds).toEqual(['match-a']);
    });

    it('llama a discardMatch con el matchId y token correctos', async () => {
      const { discardMatch } = jest.requireMock('../lib/api/matches') as {
        discardMatch: jest.Mock;
      };
      discardMatch.mockResolvedValueOnce({ data: { deleted: true }, error: null });

      await act(async () => {
        await useSwipeStore.getState().discardRecapMatch('match-b', 'my-token');
      });

      expect(discardMatch).toHaveBeenCalledWith('match-b', 'my-token');
    });

    // Optimistic UI: matchId se elimina de recapMatchIds INCLUSO si la API falla
    it('elimina el matchId optimisticamente aunque discardMatch devuelva error', async () => {
      const { discardMatch } = jest.requireMock('../lib/api/matches') as {
        discardMatch: jest.Mock;
      };
      discardMatch.mockResolvedValueOnce({
        data: null,
        error: { code: 'NETWORK_ERROR', message: 'Sin conexión' },
      });

      await act(async () => {
        await useSwipeStore.getState().discardRecapMatch('match-b', 'mock-token');
      });

      const state = useSwipeStore.getState();
      // Optimistic: se elimina de UI aunque el servidor falle (Epic 3 añadirá rollback)
      expect(state.recapMatchIds).toEqual(['match-a']);
      expect(state.pendingRecapIds).toEqual(['match-a']);
    });
  });
});
