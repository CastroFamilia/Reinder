/**
 * apps/mobile/src/stores/use-swipe-store.test.ts
 *
 * Tests unitarios para useSwipeStore.
 * Verifica: advanceCard popula currentCard correctamente desde el prefetchQueue.
 *
 * Source: epics.md#Story-2.2 AC7, architecture.md#Structure Patterns (tests co-located)
 */
import { renderHook, act } from '@testing-library/react-native';
import { useSwipeStore } from './use-swipe-store';
import type { Listing } from '@reinder/shared';

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

// Mock del cliente API de swipe-events para tests de recordMatchEvent / recordRejectEvent
jest.mock('../lib/api/swipe-events', () => ({
  postSwipeEvent: jest.fn(),
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
      // (evita que el feed quede en blanco durante el desarrollo sin backend).
      // El currentCard se rellena con el primer mock en lugar de quedar null.
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
  });

  describe('recordRejectEvent', () => {
    beforeEach(() => {
      // Limpiar pendingEvents entre tests
      useSwipeStore.setState({ pendingEvents: [] });
    });

    it('no modifica el estado si el servidor responde correctamente', async () => {
      // Mock: postSwipeEvent retorna éxito
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
});
