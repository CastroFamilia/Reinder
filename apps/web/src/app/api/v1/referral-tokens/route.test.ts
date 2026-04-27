/**
 * apps/web/src/app/api/v1/referral-tokens/route.test.ts
 *
 * ATDD — Acceptance Tests for Story 3.1: Generación de Link de Referral por el Agente
 * Using Vitest (globals: true, environment: jsdom)
 *
 * AC coverage:
 *   AC1 — POST generates token in referral_tokens (TTL 30 days, used: false)
 *   AC2 — Response includes referralUrl with full link
 *   AC3 — Returns 401 if unauthenticated; 403 if buyer role
 *   AC4 — GET returns expired tokens with status 'expired'
 *   AC5 — GET returns all agent tokens with computed status field
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const MOCK_AGENT_ID = 'agent-uuid-001';

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

// Mock DB
vi.mock('@/lib/supabase/db', () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
  },
}));

// Mock local lib to avoid env var dependency in tests
vi.mock('@/features/agent-link/lib/referral-url', () => ({
  buildReferralUrl: (token: string) => `https://reinder.app/referral/${token}`,
}));

// Mock schema (Vitest resolves imports - return plain strings)
vi.mock('@reinder/shared/db/schema', () => ({
  referralTokens: 'referral_tokens',
  userProfiles: 'user_profiles',
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a: unknown, b: unknown) => ({ type: 'eq', a, b })),
  desc: vi.fn((col: unknown) => ({ type: 'desc', col })),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(method: 'GET' | 'POST') {
  return new NextRequest(`http://localhost/api/v1/referral-tokens`, { method });
}

// ─── Setup ───────────────────────────────────────────────────────────────────

let mockCreateClient: ReturnType<typeof vi.fn>;
let mockDb: { insert: ReturnType<typeof vi.fn>; select: ReturnType<typeof vi.fn> };

beforeEach(async () => {
  vi.clearAllMocks();

  const supabaseModule = await import('@/lib/supabase/server');
  mockCreateClient = supabaseModule.createClient as ReturnType<typeof vi.fn>;

  const dbModule = await import('@/lib/supabase/db');
  mockDb = dbModule.db as unknown as typeof mockDb;

  // Default: authenticated agent
  mockCreateClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: MOCK_AGENT_ID, email: 'agent@test.com' } },
      }),
    },
  });

  // Default: agent role confirmed
  const mockSelectChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([{ role: 'agent' }]),
    orderBy: vi.fn().mockReturnThis(),
  };
  mockDb.select.mockReturnValue(mockSelectChain);
});

// ─── POST /api/v1/referral-tokens ────────────────────────────────────────────

describe('POST /api/v1/referral-tokens', () => {
  it('AC1 — returns 201 and token with used: false and correct TTL', async () => {
    const now = Date.now();
    const expiresAt = new Date(now + 30 * 24 * 60 * 60 * 1000);

    const mockInsertChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([
        {
          id: 'token-id-1',
          agentId: MOCK_AGENT_ID,
          token: 'generated-uuid',
          used: false,
          expiresAt,
          createdAt: new Date(),
        },
      ]),
    };
    mockDb.insert.mockReturnValue(mockInsertChain);

    const { POST } = await import('./route');
    const res = await POST(makeRequest('POST'));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.error).toBeNull();
    expect(typeof body.data.token).toBe('string');
    expect(body.data.token.length).toBeGreaterThan(0);
    expect(body.data.used).toBe(false);

    // TTL ≈ 30 days
    const returnedExpiry = new Date(body.data.expiresAt).getTime();
    expect(returnedExpiry).toBeGreaterThan(now + 29 * 24 * 60 * 60 * 1000);
  });

  it('AC2 — response includes referralUrl containing the token', async () => {
    const generatedToken = 'generated-uuid-for-test';
    const mockInsertChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([
        {
          id: 'token-id-2',
          agentId: MOCK_AGENT_ID,
          token: generatedToken,
          used: false,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
        },
      ]),
    };
    mockDb.insert.mockReturnValue(mockInsertChain);

    const { POST } = await import('./route');
    const res = await POST(makeRequest('POST'));
    const body = await res.json();

    expect(body.data.referralUrl).toBeDefined();
    expect(body.data.referralUrl).toContain('/referral/');
    expect(body.data.referralUrl).toContain(generatedToken);
  });

  it('AC3 — returns 401 when not authenticated', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    });

    const { POST } = await import('./route');
    const res = await POST(makeRequest('POST'));
    expect(res.status).toBe(401);
  });

  it('AC3 — returns 403 when authenticated as buyer', async () => {
    const buyerSelectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ role: 'buyer' }]),
      orderBy: vi.fn().mockReturnThis(),
    };
    mockDb.select.mockReturnValue(buyerSelectChain);

    const { POST } = await import('./route');
    const res = await POST(makeRequest('POST'));
    expect(res.status).toBe(403);
  });
});

// ─── GET /api/v1/referral-tokens ─────────────────────────────────────────────

describe('GET /api/v1/referral-tokens', () => {
  const now = new Date();
  const future = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
  const past = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

  const mockTokenRows = [
    { id: '1', agentId: MOCK_AGENT_ID, token: 'tok-pending', used: false, expiresAt: future, buyerId: null, createdAt: now },
    { id: '2', agentId: MOCK_AGENT_ID, token: 'tok-accepted', used: true, expiresAt: future, buyerId: 'buyer-1', createdAt: now },
    { id: '3', agentId: MOCK_AGENT_ID, token: 'tok-expired', used: false, expiresAt: past, buyerId: null, createdAt: now },
  ];

  beforeEach(() => {
    // First select: role check; second select: token list
    const roleChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ role: 'agent' }]),
      orderBy: vi.fn().mockReturnThis(),
    };
    const tokenChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue(mockTokenRows),
      limit: vi.fn().mockReturnThis(),
    };
    mockDb.select
      .mockReturnValueOnce(roleChain)
      .mockReturnValue(tokenChain);
  });

  it('AC5 — returns 200 with list of tokens', async () => {
    const { GET } = await import('./route');
    const res = await GET(makeRequest('GET'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBe(3);
  });

  it('AC4+5 — each token has computed status: pending / accepted / expired', async () => {
    const { GET } = await import('./route');
    const res = await GET(makeRequest('GET'));
    const body = await res.json();

    const tokens = body.data as Array<{ token: string; status: string }>;
    expect(tokens.find((t) => t.token === 'tok-pending')?.status).toBe('pending');
    expect(tokens.find((t) => t.token === 'tok-accepted')?.status).toBe('accepted');
    expect(tokens.find((t) => t.token === 'tok-expired')?.status).toBe('expired');
  });

  it('AC2 — each token has referralUrl', async () => {
    const { GET } = await import('./route');
    const res = await GET(makeRequest('GET'));
    const body = await res.json();

    for (const token of body.data) {
      expect(token.referralUrl).toContain('/referral/');
    }
  });

  it('returns 401 when not authenticated', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    });

    const { GET } = await import('./route');
    const res = await GET(makeRequest('GET'));
    expect(res.status).toBe(401);
  });
});
