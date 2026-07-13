/**
 * apps/web/src/app/api/v1/agent-bonds/route.test.ts
 *
 * ATDD — Story 3.3: Reconfirmación Periódica y Desvinculación Voluntaria
 *
 * AC coverage:
 *   GET  — returns active bond with isExpiring flag
 *   DELETE — marks bond revoked, notifies agent
 *   POST /renew — extends TTL (tested in renew/route.test.ts)
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const MOCK_BUYER_ID = 'buyer-001';
const MOCK_AGENT_ID = 'agent-001';
const MOCK_BOND_ID = 'bond-001';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/supabase/db', () => ({
  db: { select: vi.fn(), update: vi.fn(), insert: vi.fn() },
}));
vi.mock('@reinder/shared/db/schema', () => ({
  agentBuyerBonds: 'agent_buyer_bonds',
  userProfiles: 'user_profiles',
  referralTokens: 'referral_tokens',
}));
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a: unknown, b: unknown) => ({ a, b })),
  and: vi.fn((...a: unknown[]) => ({ and: a })),
}));
vi.mock('@/features/agent-link/lib/notify-agent', () => ({
  notifyAgent: vi.fn().mockResolvedValue(undefined),
}));

let mockCreateClient: ReturnType<typeof vi.fn>;
let mockDb: { select: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
const futureDate = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000);
const soonDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // < 7 days

beforeEach(async () => {
  vi.clearAllMocks();
  const { createClient } = await import('@/lib/supabase/server');
  mockCreateClient = createClient as ReturnType<typeof vi.fn>;
  const { db } = await import('@/lib/supabase/db');
  mockDb = db as unknown as typeof mockDb;

  mockCreateClient.mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: MOCK_BUYER_ID } } }) },
  });

  // Default: buyer role
  mockDb.select.mockReturnValue({
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([{ role: 'buyer', fullName: 'Juan' }]),
    orderBy: vi.fn().mockReturnThis(),
  });

  mockDb.update.mockReturnValue({
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
  });
});

function req(method: 'GET' | 'DELETE') {
  return new NextRequest('http://localhost/api/v1/agent-bonds', { method });
}

describe('GET /api/v1/agent-bonds', () => {
  it('returns null data when buyer has no active bond', async () => {
    mockDb.select
      .mockReturnValueOnce({ from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue([{ role: 'buyer', fullName: 'Juan' }]), orderBy: vi.fn().mockReturnThis() })
      .mockReturnValue({ from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue([]), orderBy: vi.fn().mockReturnThis() });

    const { GET } = await import('./route');
    const res = await GET(req('GET'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toBeNull();
  });

  it('returns bond with isExpiring: false when far from expiry', async () => {
    mockDb.select
      .mockReturnValueOnce({ from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue([{ role: 'buyer', fullName: 'Juan' }]), orderBy: vi.fn().mockReturnThis() })
      .mockReturnValueOnce({ from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue([{ id: MOCK_BOND_ID, agentId: MOCK_AGENT_ID, status: 'active', expiresAt: futureDate, createdAt: new Date() }]), orderBy: vi.fn().mockReturnThis() })
      .mockReturnValue({ from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue([{ fullName: 'Elena', avatarUrl: null }]), orderBy: vi.fn().mockReturnThis() });

    const { GET } = await import('./route');
    const res = await GET(req('GET'));
    const body = await res.json();

    expect(body.data.isExpiring).toBe(false);
    expect(body.data.agentName).toBe('Elena');
  });

  it('returns bond with isExpiring: true when expiry < 7 days', async () => {
    mockDb.select
      .mockReturnValueOnce({ from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue([{ role: 'buyer', fullName: 'Juan' }]), orderBy: vi.fn().mockReturnThis() })
      .mockReturnValueOnce({ from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue([{ id: MOCK_BOND_ID, agentId: MOCK_AGENT_ID, status: 'active', expiresAt: soonDate, createdAt: new Date() }]), orderBy: vi.fn().mockReturnThis() })
      .mockReturnValue({ from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue([{ fullName: 'Elena', avatarUrl: null }]), orderBy: vi.fn().mockReturnThis() });

    const { GET } = await import('./route');
    const res = await GET(req('GET'));
    const body = await res.json();

    expect(body.data.isExpiring).toBe(true);
  });

  it('returns 401 for unauthenticated user', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    });
    const { GET } = await import('./route');
    const res = await GET(req('GET'));
    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/v1/agent-bonds', () => {
  it('returns 200 and unlinked: true on success', async () => {
    mockDb.select
      .mockReturnValueOnce({ from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue([{ role: 'buyer', fullName: 'Juan' }]), orderBy: vi.fn().mockReturnThis() })
      .mockReturnValue({ from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue([{ id: MOCK_BOND_ID, agentId: MOCK_AGENT_ID, status: 'active', expiresAt: futureDate, buyerId: MOCK_BUYER_ID, referralTokenId: 'tok-1' }]), orderBy: vi.fn().mockReturnThis() });

    const { DELETE } = await import('./route');
    const res = await DELETE(req('DELETE'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.unlinked).toBe(true);
  });

  it('returns 404 when no active bond', async () => {
    mockDb.select
      .mockReturnValueOnce({ from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue([{ role: 'buyer', fullName: 'Juan' }]), orderBy: vi.fn().mockReturnThis() })
      .mockReturnValue({ from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue([]), orderBy: vi.fn().mockReturnThis() });

    const { DELETE } = await import('./route');
    const res = await DELETE(req('DELETE'));
    expect(res.status).toBe(404);
  });
});
