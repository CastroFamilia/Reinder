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

    it('set currentCard a null cuando el prefetchQueue está vacío', () => {
      useSwipeStore.setState({
        currentCard: mockListings[0]!,
        prefetchQueue: [],
      });

      act(() => {
        useSwipeStore.getState().advanceCard('mock-token');
      });

      expect(useSwipeStore.getState().currentCard).toBeNull();
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
});
