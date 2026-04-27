/**
 * apps/web/src/app/api/v1/referral-tokens/route.test.ts
 *
 * ATDD — Acceptance Tests for Story 3.1: Generación de Link de Referral por el Agente
 * Tests are written in RED phase (failing) — implementation follows in Step 3.
 *
 * AC coverage:
 *   AC1 — POST generates token in referral_tokens (TTL 30 days, used: false)
 *   AC2 — Response includes referralUrl with full link
 *   AC3 — Single-use: token cannot be reused once accepted (tested via used flag)
 *   AC4 — GET returns expired tokens with status 'expired'
 *   AC5 — GET returns all agent tokens with status field
 */
import { POST, GET } from './route';
import { NextRequest } from 'next/server';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const MOCK_AGENT_ID = 'agent-uuid-001';
const MOCK_TOKEN = 'mock-referral-token-uuid';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/lib/supabase/db', () => ({
  db: {
    insert: jest.fn(),
    select: jest.fn(),
  },
}));

jest.mock('@reinder/shared/db/schema', () => ({
  referralTokens: 'referral_tokens',
  userProfiles: 'user_profiles',
}));

jest.mock('drizzle-orm', () => ({
  eq: jest.fn((a, b) => ({ type: 'eq', a, b })),
  desc: jest.fn((col) => ({ type: 'desc', col })),
}));

// Helper to create authenticated request
function makeRequest(method: 'GET' | 'POST') {
  return new NextRequest(`http://localhost/api/v1/referral-tokens`, {
    method,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ─── Setup ──────────────────────────────────────────────────────────────────

let mockCreateClient: jest.Mock;
let mockDb: { insert: jest.Mock; select: jest.Mock };

beforeEach(() => {
  jest.clearAllMocks();

  const { createClient } = require('@/lib/supabase/server');
  mockCreateClient = createClient as jest.Mock;

  const { db } = require('@/lib/supabase/db');
  mockDb = db as typeof mockDb;

  // Default: authenticated agent
  mockCreateClient.mockResolvedValue({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: MOCK_AGENT_ID, email: 'agent@test.com' } },
      }),
    },
  });

  // Default: agent role confirmed
  const mockSelect = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue([{ role: 'agent' }]),
  };
  mockDb.select.mockReturnValue(mockSelect);
});

// ─── POST /api/v1/referral-tokens ───────────────────────────────────────────

describe('POST /api/v1/referral-tokens', () => {
  it('AC1 — returns 201 and creates token with used: false and correct TTL', async () => {
    const mockInsert = {
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([
        {
          id: 'token-id-1',
          agentId: MOCK_AGENT_ID,
          token: MOCK_TOKEN,
          used: false,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
        },
      ]),
    };
    mockDb.insert.mockReturnValue(mockInsert);

    const res = await POST(makeRequest('POST'));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.token).toBeDefined();
    expect(body.data.used).toBe(false);
    expect(body.error).toBeNull();

    // Verify TTL is ~30 days from now
    const expiresAt = new Date(body.data.expiresAt).getTime();
    const expectedExpiry = Date.now() + 30 * 24 * 60 * 60 * 1000;
    expect(expiresAt).toBeGreaterThan(expectedExpiry - 60_000); // within 1 min tolerance
    expect(expiresAt).toBeLessThan(expectedExpiry + 60_000);
  });

  it('AC2 — response includes full referralUrl', async () => {
    const mockInsert = {
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([
        {
          id: 'token-id-2',
          agentId: MOCK_AGENT_ID,
          token: MOCK_TOKEN,
          used: false,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
        },
      ]),
    };
    mockDb.insert.mockReturnValue(mockInsert);

    const res = await POST(makeRequest('POST'));
    const body = await res.json();

    expect(body.data.referralUrl).toBeDefined();
    expect(body.data.referralUrl).toContain('/referral/');
    expect(body.data.referralUrl).toContain(MOCK_TOKEN);
  });

  it('AC3 — returns 401 when not authenticated', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
      },
    });

    const res = await POST(makeRequest('POST'));
    expect(res.status).toBe(401);
  });

  it('AC3 — returns 403 when authenticated as buyer (not agent)', async () => {
    const mockSelect = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([{ role: 'buyer' }]),
    };
    mockDb.select.mockReturnValue(mockSelect);

    const res = await POST(makeRequest('POST'));
    expect(res.status).toBe(403);
  });
});

// ─── GET /api/v1/referral-tokens ────────────────────────────────────────────

describe('GET /api/v1/referral-tokens', () => {
  it('AC5 — returns 200 with list of agent tokens', async () => {
    const now = new Date();
    const future = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
    const past = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

    const mockTokens = [
      { id: '1', token: 'tok-pending', used: false, expiresAt: future, buyerId: null, createdAt: now },
      { id: '2', token: 'tok-accepted', used: true, expiresAt: future, buyerId: 'buyer-1', createdAt: now },
      { id: '3', token: 'tok-expired', used: false, expiresAt: past, buyerId: null, createdAt: now },
    ];

    const mockSelectChain = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([{ role: 'agent' }]),
    };
    // First select call: role check; second: token list
    mockDb.select
      .mockReturnValueOnce(mockSelectChain)
      .mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue(mockTokens),
      });

    const res = await GET(makeRequest('GET'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBe(3);
  });

  it('AC4+5 — each token has computed status field', async () => {
    const now = new Date();
    const future = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
    const past = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

    const mockTokens = [
      { id: '1', token: 'tok-pending', used: false, expiresAt: future, buyerId: null, createdAt: now },
      { id: '2', token: 'tok-accepted', used: true, expiresAt: future, buyerId: 'buyer-1', createdAt: now },
      { id: '3', token: 'tok-expired', used: false, expiresAt: past, buyerId: null, createdAt: now },
    ];

    const mockSelectChain = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([{ role: 'agent' }]),
    };
    mockDb.select
      .mockReturnValueOnce(mockSelectChain)
      .mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue(mockTokens),
      });

    const res = await GET(makeRequest('GET'));
    const body = await res.json();
    const tokens = body.data as Array<{ token: string; status: string }>;

    const pending = tokens.find((t) => t.token === 'tok-pending');
    const accepted = tokens.find((t) => t.token === 'tok-accepted');
    const expired = tokens.find((t) => t.token === 'tok-expired');

    expect(pending?.status).toBe('pending');
    expect(accepted?.status).toBe('accepted');
    expect(expired?.status).toBe('expired');
  });

  it('returns 401 when not authenticated', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
      },
    });

    const res = await GET(makeRequest('GET'));
    expect(res.status).toBe(401);
  });
});
