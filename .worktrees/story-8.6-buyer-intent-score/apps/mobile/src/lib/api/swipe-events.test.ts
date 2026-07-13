/**
 * apps/mobile/src/lib/api/swipe-events.test.ts
 *
 * Unit tests for the swipe events API client.
 * Tests postSwipeEvent — success, HTTP errors, and network errors.
 */

const mockFetch = jest.fn();
global.fetch = mockFetch;

import { postSwipeEvent } from './swipe-events';
import type { CreateSwipeEventPayload } from '@reinder/shared';

const mockPayload: CreateSwipeEventPayload = {
  listingId: 'listing-1',
  action: 'match',
};

describe('postSwipeEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends POST request with payload and auth header', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: { id: 'evt-1', ...mockPayload, buyerId: 'buyer-1', createdAt: '2026-03-22T21:00:00Z' },
          error: null,
        }),
    });

    await postSwipeEvent(mockPayload, 'my-token');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/swipe-events'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer my-token',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify(mockPayload),
      }),
    );
  });

  it('returns swipe event data on success', async () => {
    const responseData = {
      id: 'evt-1',
      listingId: 'listing-1',
      action: 'match',
      buyerId: 'buyer-1',
      createdAt: '2026-03-22T21:00:00Z',
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: responseData, error: null }),
    });

    const result = await postSwipeEvent(mockPayload, 'token');

    expect(result.data).toEqual(responseData);
    expect(result.error).toBeNull();
  });

  it('returns HTTP error code when response is not ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    });

    const result = await postSwipeEvent(mockPayload, 'bad-token');

    expect(result.data).toBeNull();
    expect(result.error?.code).toBe('HTTP_401');
    expect(result.error?.message).toContain('registrar swipe');
  });

  it('returns HTTP 500 error for server errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const result = await postSwipeEvent(mockPayload, 'token');

    expect(result.data).toBeNull();
    expect(result.error?.code).toBe('HTTP_500');
  });

  it('returns NETWORK_ERROR when fetch throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'));

    const result = await postSwipeEvent(mockPayload, 'token');

    expect(result.data).toBeNull();
    expect(result.error?.code).toBe('NETWORK_ERROR');
    expect(result.error?.message).toContain('Sin conexión');
  });

  it('handles reject action payload', async () => {
    const rejectPayload: CreateSwipeEventPayload = {
      listingId: 'listing-2',
      action: 'reject',
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: { id: 'evt-2', ...rejectPayload, buyerId: 'buyer-1', createdAt: '2026-03-22T21:05:00Z' },
          error: null,
        }),
    });

    const result = await postSwipeEvent(rejectPayload, 'token');

    expect(result.data?.action).toBe('reject');
    expect(result.error).toBeNull();
  });
});
