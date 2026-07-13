/**
 * apps/mobile/src/lib/api/listings.test.ts
 *
 * Unit tests for the listings API client.
 * Tests fetchListings and saveSearchPreferences — success, HTTP errors,
 * network errors, filter params, and abort timeout.
 */

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock AbortController
const mockAbort = jest.fn();
jest.spyOn(global, 'AbortController').mockImplementation(
  () =>
    ({
      signal: 'mock-signal',
      abort: mockAbort,
    }) as unknown as AbortController,
);

import { fetchListings, saveSearchPreferences } from './listings';
import type { SearchPreferences } from '@reinder/shared';

describe('fetchListings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns listings on successful response', async () => {
    const mockData = [{ id: 'listing-1', title: 'Test' }];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: mockData, error: null }),
    });

    const result = await fetchListings('test-token');
    expect(result).toEqual({ data: mockData, error: null });
  });

  it('sends Authorization header with bearer token', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [], error: null }),
    });

    await fetchListings('my-jwt-token');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer my-jwt-token',
        }),
      }),
    );
  });

  it('appends cursor query param when provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [], error: null }),
    });

    await fetchListings('token', 'cursor-abc');

    const calledUrl = mockFetch.mock.calls[0]![0] as string;
    expect(calledUrl).toContain('cursor=cursor-abc');
  });

  it('appends filter query params when SearchPreferences are provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [], error: null }),
    });

    const filters: SearchPreferences = {
      zones: ['Malasaña', 'Chamberí'],
      maxPrice: 400000,
      minRooms: 2,
      minSqm: 60,
    };

    await fetchListings('token', undefined, filters);

    const calledUrl = mockFetch.mock.calls[0]![0] as string;
    expect(calledUrl).toContain('zone=Malasa%C3%B1a');
    expect(calledUrl).toContain('zone=Chamber%C3%AD');
    expect(calledUrl).toContain('max_price=400000');
    expect(calledUrl).toContain('min_rooms=2');
    expect(calledUrl).toContain('min_sqm=60');
  });

  it('does not append optional filter params when undefined', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [], error: null }),
    });

    const filters: SearchPreferences = { zones: ['Madrid'] };
    await fetchListings('token', undefined, filters);

    const calledUrl = mockFetch.mock.calls[0]![0] as string;
    expect(calledUrl).toContain('zone=Madrid');
    expect(calledUrl).not.toContain('max_price');
    expect(calledUrl).not.toContain('min_rooms');
    expect(calledUrl).not.toContain('min_sqm');
  });

  it('returns HTTP error when response is not ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const result = await fetchListings('token');

    expect(result.data).toBeNull();
    expect(result.error?.code).toBe('HTTP_500');
  });

  it('returns NETWORK_ERROR when fetch throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'));

    const result = await fetchListings('token');

    expect(result.data).toBeNull();
    expect(result.error?.code).toBe('NETWORK_ERROR');
  });
});

describe('saveSearchPreferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('sends PATCH request with preferences body', async () => {
    const prefs: SearchPreferences = { zones: ['Madrid'], maxPrice: 300000 };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: prefs, error: null }),
    });

    await saveSearchPreferences(prefs, 'token');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/buyer/preferences'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify(prefs),
      }),
    );
  });

  it('returns saved preferences on success', async () => {
    const prefs: SearchPreferences = { zones: ['Barcelona'] };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: prefs, error: null }),
    });

    const result = await saveSearchPreferences(prefs, 'token');
    expect(result.data).toEqual(prefs);
    expect(result.error).toBeNull();
  });

  it('returns HTTP error when response is not ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
    });

    const result = await saveSearchPreferences({ zones: [] }, 'token');

    expect(result.data).toBeNull();
    expect(result.error?.code).toBe('HTTP_400');
  });

  it('returns NETWORK_ERROR when fetch throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await saveSearchPreferences({ zones: ['Madrid'] }, 'token');

    expect(result.data).toBeNull();
    expect(result.error?.code).toBe('NETWORK_ERROR');
  });
});
