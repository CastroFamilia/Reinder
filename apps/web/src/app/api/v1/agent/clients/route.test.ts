/**
 * Story 4.1 — API Route Tests: GET /api/v1/agent/clients
 *
 * TDD RED PHASE: These tests are intentionally failing (test.skip).
 * They define the expected behavior BEFORE implementation.
 *
 * Run: pnpm --filter @reinder/web test apps/web/src/app/api/v1/agent/clients/route.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks — these modules don't exist yet (TDD red phase)
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue([]),
  },
}));

import { createServerClient } from '@/lib/supabase/server';
import { GET } from '@/app/api/v1/agent/clients/route';

// Fixtures
const AGENT_USER = { id: 'agent-uuid-1', email: 'agent@test.com' };
const BUYER_USER_1 = { id: 'buyer-uuid-1', email: 'buyer1@test.com' };
const BUYER_USER_2 = { id: 'buyer-uuid-2', email: 'buyer2@test.com' };

const mockAgentProfile = { role: 'agent' };
const mockBuyerProfile = { role: 'buyer' };

const makeSupabaseMock = (user: typeof AGENT_USER | null, profile: typeof mockAgentProfile | null) => ({
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user },
      error: user ? null : { message: 'Not authenticated' },
    }),
  },
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: profile, error: null }),
  }),
});

const makeRequest = () => new Request('http://localhost:3000/api/v1/agent/clients');

describe('GET /api/v1/agent/clients', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── T4.1-01: RLS isolation — agent sees only their clients ───
  it.skip('T4.1-01: agent sees only their own bonded clients', async () => {
    const supabase = makeSupabaseMock(AGENT_USER, mockAgentProfile);
    vi.mocked(createServerClient).mockResolvedValue(supabase as any);

    // Mock DB returning 2 clients for this agent
    const { db } = await import('@/lib/db');
    vi.mocked(db.select().from(null as any).leftJoin(null as any).leftJoin(null as any).where(null as any).groupBy(null as any).orderBy as any).mockResolvedValue([
      {
        bondId: 'bond-1',
        buyerId: BUYER_USER_1.id,
        buyerName: 'Ana García',
        buyerAvatarUrl: null,
        bondCreatedAt: new Date('2026-04-01T00:00:00Z'),
        agentLastSeenAt: null,
        totalMatches: 3,
        lastMatchAt: new Date('2026-04-27T12:00:00Z'),
      },
    ]);

    const req = makeRequest();
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].buyerId).toBe(BUYER_USER_1.id);
    expect(body.data[0].buyerName).toBe('Ana García');
    expect(body.error).toBeNull();
  });

  // ─── T4.1-01b: Cross-agent isolation (critical security test) ───
  it.skip('T4.1-01b: agent A cannot see clients bonded to agent B', async () => {
    const AGENT_B = { id: 'agent-uuid-2', email: 'agent2@test.com' };

    // Agent A makes the request
    const supabaseAgentA = makeSupabaseMock(AGENT_USER, mockAgentProfile);
    vi.mocked(createServerClient).mockResolvedValue(supabaseAgentA as any);

    // DB mock: only returns bonds where agentId = AGENT_USER.id (no crossover)
    const { db } = await import('@/lib/db');
    vi.mocked(db.select().from(null as any).leftJoin(null as any).leftJoin(null as any).where(null as any).groupBy(null as any).orderBy as any).mockResolvedValue([
      // Only bonds for AGENT_USER, not AGENT_B's
    ]);

    const req = makeRequest();
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    // Agent A sees 0 clients from Agent B
    const agentBClients = body.data.filter((c: { bondId: string }) =>
      c.bondId.startsWith('bond-b')
    );
    expect(agentBClients).toHaveLength(0);
  });

  // ─── T4.1-01c: List ordered by lastMatchAt DESC ───
  it.skip('T4.1-01c: client list is ordered by most recent match first', async () => {
    const supabase = makeSupabaseMock(AGENT_USER, mockAgentProfile);
    vi.mocked(createServerClient).mockResolvedValue(supabase as any);

    const { db } = await import('@/lib/db');
    vi.mocked(db.select().from(null as any).leftJoin(null as any).leftJoin(null as any).where(null as any).groupBy(null as any).orderBy as any).mockResolvedValue([
      {
        bondId: 'bond-1',
        buyerId: BUYER_USER_1.id,
        buyerName: 'Ana García',
        buyerAvatarUrl: null,
        bondCreatedAt: new Date('2026-04-01T00:00:00Z'),
        agentLastSeenAt: null,
        totalMatches: 5,
        lastMatchAt: new Date('2026-04-27T15:00:00Z'), // most recent
      },
      {
        bondId: 'bond-2',
        buyerId: BUYER_USER_2.id,
        buyerName: 'Carlos Ruiz',
        buyerAvatarUrl: null,
        bondCreatedAt: new Date('2026-03-15T00:00:00Z'),
        agentLastSeenAt: null,
        totalMatches: 1,
        lastMatchAt: new Date('2026-04-10T10:00:00Z'), // older
      },
    ]);

    const req = makeRequest();
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data[0].buyerId).toBe(BUYER_USER_1.id); // most recent first
    expect(body.data[1].buyerId).toBe(BUYER_USER_2.id);
  });

  // ─── T4.1-01d: hasNewMatches flag correctly calculated ───
  it.skip('T4.1-01d: hasNewMatches is true when lastMatchAt > agentLastSeenAt', async () => {
    const supabase = makeSupabaseMock(AGENT_USER, mockAgentProfile);
    vi.mocked(createServerClient).mockResolvedValue(supabase as any);

    const agentLastSeenAt = new Date('2026-04-26T10:00:00Z');
    const lastMatchAt = new Date('2026-04-27T12:00:00Z'); // after agent last seen

    const { db } = await import('@/lib/db');
    vi.mocked(db.select().from(null as any).leftJoin(null as any).leftJoin(null as any).where(null as any).groupBy(null as any).orderBy as any).mockResolvedValue([
      {
        bondId: 'bond-1',
        buyerId: BUYER_USER_1.id,
        buyerName: 'Ana García',
        buyerAvatarUrl: null,
        bondCreatedAt: new Date('2026-04-01T00:00:00Z'),
        agentLastSeenAt,
        totalMatches: 1,
        lastMatchAt,
      },
    ]);

    const req = makeRequest();
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data[0].hasNewMatches).toBe(true);
  });

  // ─── T4.1-01e: Empty state — no clients ───
  it.skip('T4.1-01e: returns empty array when agent has no bonded clients', async () => {
    const supabase = makeSupabaseMock(AGENT_USER, mockAgentProfile);
    vi.mocked(createServerClient).mockResolvedValue(supabase as any);

    const { db } = await import('@/lib/db');
    vi.mocked(db.select().from(null as any).leftJoin(null as any).leftJoin(null as any).where(null as any).groupBy(null as any).orderBy as any).mockResolvedValue([]);

    const req = makeRequest();
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual([]);
    expect(body.error).toBeNull();
  });

  // ─── Auth: 401 when not authenticated ───
  it.skip('returns 401 when user is not authenticated', async () => {
    const supabase = makeSupabaseMock(null, null);
    vi.mocked(createServerClient).mockResolvedValue(supabase as any);

    const req = makeRequest();
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.data).toBeNull();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  // ─── Auth: 403 when buyer calls agent route ───
  it.skip('returns 403 when buyer tries to access agent clients route', async () => {
    const supabase = makeSupabaseMock(BUYER_USER_1 as any, mockBuyerProfile);
    vi.mocked(createServerClient).mockResolvedValue(supabase as any);

    const req = makeRequest();
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.data).toBeNull();
    expect(body.error.code).toBe('FORBIDDEN');
  });
});
