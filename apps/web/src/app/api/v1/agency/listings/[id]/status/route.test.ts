/**
 * apps/web/src/app/api/v1/agency/listings/[id]/status/route.test.ts
 *
 * Tests for PATCH /api/v1/agency/listings/[id]/status
 * Story 6.1: AC4 — cache invalidation via revalidateTag
 * Story 5.4: status change lifecycle (withdraw, sold)
 */
import type { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-admin-1' } },
        error: null,
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { role: 'agency_admin', agency_id: 'agency-1' },
          }),
        }),
      }),
    }),
  }),
}));

// Mock Drizzle DB
vi.mock('@/lib/supabase/db', () => ({
  db: {
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            { id: 'listing-1', status: 'withdrawn' },
          ]),
        }),
      }),
    }),
  },
}));

// Mock next/cache revalidateTag — critical for AC4 verification
const mockRevalidateTag = vi.fn();
vi.mock('next/cache', () => ({
  revalidateTag: mockRevalidateTag,
}));

// Mock shared schema
vi.mock('@reinder/shared/db/schema', () => ({
  listings: { id: 'id', agencyId: 'agency_id', status: 'status', updatedAt: 'updated_at' },
}));

vi.mock('drizzle-orm', () => ({
  and: vi.fn((...args) => args),
  eq: vi.fn((field, value) => ({ field, value })),
}));

import { PATCH } from './route';

function makeRequest(body: Record<string, string>, listingId = 'listing-1'): NextRequest {
  return new Request(`http://localhost/api/v1/agency/listings/${listingId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}



describe('PATCH /api/v1/agency/listings/[id]/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRevalidateTag.mockClear();
  });

  it('AC4 (Story 6.1) — calls revalidateTag with listing-specific tag on status change', async () => {
    const response = await PATCH(makeRequest({ action: 'withdraw' }), { params: { id: 'listing-1' } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    // Critical: revalidateTag must be called with the listing-specific tag
    expect(mockRevalidateTag).toHaveBeenCalledWith('listings-listing-1');
    expect(mockRevalidateTag).toHaveBeenCalledWith('listings');
  });

  it('sets status to withdrawn for withdraw action', async () => {
    const response = await PATCH(makeRequest({ action: 'withdraw' }), { params: { id: 'listing-1' } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.status).toBe('withdrawn');
  });

  it('returns 400 for invalid action', async () => {
    const response = await PATCH(makeRequest({ action: 'invalid' }), { params: { id: 'listing-1' } });

    expect(response.status).toBe(400);
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });

  it('returns 401 when user is not authenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('No session') }),
      },
    } as unknown as ReturnType<typeof createClient>);

    const response = await PATCH(makeRequest({ action: 'withdraw' }), { params: { id: 'listing-1' } });

    expect(response.status).toBe(401);
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });

  it('does NOT call revalidateTag when listing not found', async () => {
    const { db } = await import('@/lib/supabase/db');
    vi.mocked(db.update).mockReturnValueOnce({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]), // empty → not found
        }),
      }),
    } as unknown as ReturnType<typeof db.update>);

    const response = await PATCH(makeRequest({ action: 'withdraw' }), { params: { id: 'non-existent' } });

    expect(response.status).toBe(404);
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });
});
