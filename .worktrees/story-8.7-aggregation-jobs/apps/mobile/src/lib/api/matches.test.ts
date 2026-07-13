/**
 * apps/mobile/src/lib/api/matches.test.ts
 *
 * Unit tests for the matches API client.
 * Tests confirmMatch, discardMatch, and getMatches —
 * success, HTTP errors, and network errors for each.
 */

const mockFetch = jest.fn();
global.fetch = mockFetch;

import { confirmMatch, discardMatch, getMatches } from './matches';

describe('confirmMatch', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sends PATCH request to /matches/{id}/confirm', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { confirmed: true }, error: null }),
    });

    await confirmMatch('match-123', 'token');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/matches/match-123/confirm'),
      expect.objectContaining({
        method: 'PATCH',
        headers: expect.objectContaining({
          Authorization: 'Bearer token',
        }),
      }),
    );
  });

  it('returns confirmed:true on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { confirmed: true }, error: null }),
    });

    const result = await confirmMatch('match-1', 'token');
    expect(result.data).toEqual({ confirmed: true });
    expect(result.error).toBeNull();
  });

  it('returns HTTP error when response is not ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    const result = await confirmMatch('match-bad', 'token');
    expect(result.data).toBeNull();
    expect(result.error?.code).toBe('HTTP_404');
  });

  it('returns NETWORK_ERROR when fetch throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await confirmMatch('match-1', 'token');
    expect(result.data).toBeNull();
    expect(result.error?.code).toBe('NETWORK_ERROR');
    expect(result.error?.message).toContain('confirmar');
  });
});

describe('discardMatch', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sends DELETE request to /matches/{id}', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { deleted: true }, error: null }),
    });

    await discardMatch('match-456', 'token');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/matches/match-456'),
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({
          Authorization: 'Bearer token',
        }),
      }),
    );
  });

  it('returns deleted:true on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { deleted: true }, error: null }),
    });

    const result = await discardMatch('match-1', 'token');
    expect(result.data).toEqual({ deleted: true });
    expect(result.error).toBeNull();
  });

  it('returns HTTP error when response is not ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
    });

    const result = await discardMatch('match-1', 'token');
    expect(result.data).toBeNull();
    expect(result.error?.code).toBe('HTTP_403');
  });

  it('returns NETWORK_ERROR when fetch throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('No connection'));

    const result = await discardMatch('match-1', 'token');
    expect(result.data).toBeNull();
    expect(result.error?.code).toBe('NETWORK_ERROR');
    expect(result.error?.message).toContain('descartar');
  });
});

describe('getMatches', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sends GET request to /matches with auth header', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [], error: null }),
    });

    await getMatches('my-token');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/matches'),
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer my-token',
        }),
      }),
    );
  });

  it('returns match history array on success', async () => {
    const mockMatches = [
      {
        matchId: 'm-1',
        listingId: 'l-1',
        imageUrl: 'https://example.com/1.jpg',
        price: 300000,
        address: 'Madrid',
        listingStatus: 'active',
        matchedAt: '2026-03-22T21:00:00Z',
        confirmed: true,
      },
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: mockMatches, error: null }),
    });

    const result = await getMatches('token');
    expect(result.data).toHaveLength(1);
    expect(result.data![0].matchId).toBe('m-1');
    expect(result.error).toBeNull();
  });

  it('returns HTTP error when response is not ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    });

    const result = await getMatches('bad-token');
    expect(result.data).toBeNull();
    expect(result.error?.code).toBe('HTTP_401');
  });

  it('returns NETWORK_ERROR when fetch throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Offline'));

    const result = await getMatches('token');
    expect(result.data).toBeNull();
    expect(result.error?.code).toBe('NETWORK_ERROR');
    expect(result.error?.message).toContain('historial');
  });
});
