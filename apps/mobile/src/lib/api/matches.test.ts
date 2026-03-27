/**
 * apps/mobile/src/lib/api/matches.test.ts
 *
 * Tests for the matches API client (confirmMatch, discardMatch, getMatches).
 * Story 2.6 — Task 6 | Story 2.7 — Task 2
 */
import { confirmMatch, discardMatch, getMatches } from './matches';

// Mock global fetch for this test module
const mockFetch = jest.fn();
Object.assign(globalThis, { fetch: mockFetch });


describe('matches API client', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('confirmMatch', () => {
    it('retorna {confirmed: true} si el servidor responde 200', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { confirmed: true }, error: null }),
      });

      const result = await confirmMatch('match-1', 'mock-token');

      expect(result.error).toBeNull();
      expect(result.data).toEqual({ confirmed: true });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/matches/match-1/confirm'),
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token',
          }),
        }),
      );
    });

    it('retorna error si el servidor responde 403', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      });

      const result = await confirmMatch('match-1', 'bad-token');

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('HTTP_403');
    });

    it('retorna NETWORK_ERROR si fetch lanza excepción', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      const result = await confirmMatch('match-1', 'mock-token');

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('NETWORK_ERROR');
    });
  });

  describe('discardMatch', () => {
    it('retorna {deleted: true} si el servidor responde 200', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { deleted: true }, error: null }),
      });

      const result = await discardMatch('match-2', 'mock-token');

      expect(result.error).toBeNull();
      expect(result.data).toEqual({ deleted: true });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/matches/match-2'),
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token',
          }),
        }),
      );
    });

    it('retorna error si el servidor responde 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const result = await discardMatch('match-999', 'mock-token');

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('HTTP_404');
    });

    it('retorna NETWORK_ERROR si fetch lanza excepción', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      const result = await discardMatch('match-2', 'mock-token');

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('NETWORK_ERROR');
    });
  });

  describe('getMatches', () => {
    it('retorna array de MatchHistoryItem si el servidor responde 200', async () => {
      const mockMatches = [
        {
          matchId: 'match-1',
          listingId: 'listing-1',
          imageUrl: 'https://example.com/photo.jpg',
          price: 250000,
          address: 'Calle Gran Vía 1, Madrid',
          listingStatus: 'active',
          matchedAt: '2026-03-25T10:00:00Z',
          confirmed: true,
        },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockMatches, error: null }),
      });

      const result = await getMatches('mock-token');

      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockMatches);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/matches'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token',
          }),
        }),
      );
    });

    it('retorna error si el servidor responde 401', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      const result = await getMatches('bad-token');

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('HTTP_401');
    });

    it('retorna NETWORK_ERROR si fetch lanza excepción', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      const result = await getMatches('mock-token');

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('NETWORK_ERROR');
    });
  });
});
