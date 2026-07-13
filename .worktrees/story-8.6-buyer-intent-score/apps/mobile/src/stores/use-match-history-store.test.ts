/**
 * apps/mobile/src/stores/use-match-history-store.test.ts
 *
 * Tests for useMatchHistoryStore — fetchMatches, markVisited, newMatchesSinceLastVisit.
 * Story 2.7 — Task 3
 */
import { act } from '@testing-library/react-native';
import { useMatchHistoryStore } from './use-match-history-store';

jest.mock('../lib/api/matches', () => ({
  getMatches: jest.fn(),
}));

import { getMatches } from '../lib/api/matches';
const mockGetMatches = getMatches as jest.Mock;

jest.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
  },
}));

const MOCK_MATCHES = [
  {
    matchId: 'match-1',
    listingId: 'listing-1',
    imageUrl: 'https://example.com/1.jpg',
    price: 285000,
    address: 'Calle Gran Vía 45, Madrid',
    listingStatus: 'active' as const,
    matchedAt: '2026-03-27T10:00:00Z',
    confirmed: true,
  },
  {
    matchId: 'match-2',
    listingId: 'listing-2',
    imageUrl: 'https://example.com/2.jpg',
    price: 420000,
    address: 'Castellana 120, Madrid',
    listingStatus: 'sold' as const,
    matchedAt: '2026-03-25T10:00:00Z',
    confirmed: true,
  },
];

describe('useMatchHistoryStore', () => {
  beforeEach(() => {
    useMatchHistoryStore.setState({
      matches: [],
      isLoading: false,
      lastVisitAt: null,
      newMatchesSinceLastVisit: 0,
    });
    mockGetMatches.mockReset();
  });

  describe('fetchMatches', () => {
    it('carga matches y actualiza el estado', async () => {
      mockGetMatches.mockResolvedValueOnce({ data: MOCK_MATCHES, error: null });

      await act(async () => {
        await useMatchHistoryStore.getState().fetchMatches('mock-token');
      });

      const state = useMatchHistoryStore.getState();
      expect(state.matches).toHaveLength(2);
      expect(state.isLoading).toBe(false);
      expect(state.matches[0]!.matchId).toBe('match-1');
    });

    it('no actualiza matches si hay error de API', async () => {
      mockGetMatches.mockResolvedValueOnce({
        data: null,
        error: { code: 'NETWORK_ERROR', message: 'Sin conexión' },
      });

      await act(async () => {
        await useMatchHistoryStore.getState().fetchMatches('bad-token');
      });

      const state = useMatchHistoryStore.getState();
      expect(state.matches).toHaveLength(0);
      expect(state.isLoading).toBe(false);
    });

    it('calcula newMatchesSinceLastVisit correctamente cuando hay lastVisitAt', async () => {
      useMatchHistoryStore.setState({ lastVisitAt: '2026-03-26T00:00:00Z' });
      mockGetMatches.mockResolvedValueOnce({ data: MOCK_MATCHES, error: null });

      await act(async () => {
        await useMatchHistoryStore.getState().fetchMatches('mock-token');
      });

      // Solo match-1 es nuevo (matchedAt 2026-03-27 > lastVisitAt 2026-03-26)
      expect(useMatchHistoryStore.getState().newMatchesSinceLastVisit).toBe(1);
    });

    it('newMatchesSinceLastVisit es 0 cuando lastVisitAt es null', async () => {
      useMatchHistoryStore.setState({ lastVisitAt: null });
      mockGetMatches.mockResolvedValueOnce({ data: MOCK_MATCHES, error: null });

      await act(async () => {
        await useMatchHistoryStore.getState().fetchMatches('mock-token');
      });

      expect(useMatchHistoryStore.getState().newMatchesSinceLastVisit).toBe(0);
    });
  });

  describe('markVisited', () => {
    it('actualiza lastVisitAt a la fecha actual', () => {
      const before = new Date().toISOString();
      useMatchHistoryStore.getState().markVisited();
      const { lastVisitAt } = useMatchHistoryStore.getState();
      const after = new Date().toISOString();

      expect(lastVisitAt).not.toBeNull();
      expect(lastVisitAt! >= before).toBe(true);
      expect(lastVisitAt! <= after).toBe(true);
    });

    it('resetea newMatchesSinceLastVisit a 0', () => {
      useMatchHistoryStore.setState({ newMatchesSinceLastVisit: 5 });
      useMatchHistoryStore.getState().markVisited();
      expect(useMatchHistoryStore.getState().newMatchesSinceLastVisit).toBe(0);
    });
  });

  describe('dismissBadge', () => {
    it('establece isBadgeDismissed a true', () => {
      useMatchHistoryStore.setState({ isBadgeDismissed: false });
      useMatchHistoryStore.getState().dismissBadge();
      expect(useMatchHistoryStore.getState().isBadgeDismissed).toBe(true);
    });

    it('markVisited resetea isBadgeDismissed a false', () => {
      useMatchHistoryStore.setState({ isBadgeDismissed: true });
      useMatchHistoryStore.getState().markVisited();
      expect(useMatchHistoryStore.getState().isBadgeDismissed).toBe(false);
    });

    it('fetchMatches resetea isBadgeDismissed cuando hay nuevos matches', async () => {
      useMatchHistoryStore.setState({
        lastVisitAt: '2026-03-26T00:00:00Z',
        isBadgeDismissed: true,
      });
      mockGetMatches.mockResolvedValueOnce({ data: MOCK_MATCHES, error: null });

      await act(async () => {
        await useMatchHistoryStore.getState().fetchMatches('mock-token');
      });

      // match-1 (2026-03-27) > lastVisitAt (2026-03-26) → newCount=1 → resetear badge
      expect(useMatchHistoryStore.getState().isBadgeDismissed).toBe(false);
    });
  });
});
