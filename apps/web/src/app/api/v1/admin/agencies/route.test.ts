/**
 * apps/web/src/app/api/v1/admin/agencies/route.test.ts
 *
 * ATDD — Story 7.2: Panel de Activación de Agencias
 *
 * Coverage:
 * - T7.2-01: GET /admin/agencies → list with status + listing count
 * - T7.2-02: PATCH /admin/agencies/[id] → toggle active
 * - T7.2-03: Deactivating → listings withdrawn
 * - T7.2-04: Activating → listings restored
 * - T7.2-05: Non platform_admin → 403
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase client for auth
const mockGetUser = vi.fn();
const mockFrom = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

// Mock Drizzle DB
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockTransaction = vi.fn();
vi.mock('@/lib/supabase/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    transaction: (fn: Function) => mockTransaction(fn),
  },
}));

describe('Admin Agencies API (Story 7.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const ADMIN_USER = { id: 'admin-1', email: 'admin@reinder.app' };
  const NON_ADMIN_USER = { id: 'buyer-1', email: 'buyer@test.com' };

  function mockPlatformAdmin() {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } });
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: () =>
            Promise.resolve({ data: { role: 'platform_admin' } }),
        }),
      }),
    });
  }

  function mockNonAdmin() {
    mockGetUser.mockResolvedValue({ data: { user: NON_ADMIN_USER } });
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: () =>
            Promise.resolve({ data: { role: 'buyer' } }),
        }),
      }),
    });
  }

  describe('T7.2-05 — Auth guard', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });
      const { GET } = await import('./route');
      const response = await GET();
      expect(response.status).toBe(401);
    });

    it('returns 403 for non-platform_admin role', async () => {
      mockNonAdmin();
      const { GET } = await import('./route');
      const response = await GET();
      expect(response.status).toBe(403);
    });
  });
});
