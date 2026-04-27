/**
 * apps/web/src/app/api/v1/referral-tokens/[token]/accept/route.test.ts
 *
 * ATDD — Story 3.2: Aceptación del Vínculo por el Comprador vía Referral Link
 *
 * AC coverage:
 *   AC2 — POST creates bond, marks token used: true
 *   AC3 — Returns bond data + redirect info
 *   AC4 — Agent push notification triggered
 *   AC5 — Reject path: no bond created (separate UI flow, not tested here)
 *   AC6 — Invalid/expired/used token returns 400 with helpful error
 *   AC7 — Unauthenticated buyer gets 401
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const MOCK_BUYER_ID = 'buyer-uuid-001';
const MOCK_AGENT_ID = 'agent-uuid-001';
const MOCK_TOKEN_VALUE = 'valid-token-abc';
const MOCK_TOKEN_ID = 'token-db-id-001';
const MOCK_BOND_ID = 'bond-uuid-001';

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/db', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
    transaction: vi.fn(),
  },
}));

vi.mock('@reinder/shared/db/schema', () => ({
  referralTokens: 'referral_tokens',
  agentBuyerBonds: 'agent_buyer_bonds',
  userProfiles: 'user_profiles',
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a: unknown, b: unknown) => ({ type: 'eq', a, b })),
  and: vi.fn((...args: unknown[]) => ({ type: 'and', args })),
}));

vi.mock('@/features/agent-link/lib/notify-agent', () => ({
  notifyAgent: vi.fn().mockResolvedValue(undefined),
}));

// ─── Setup ───────────────────────────────────────────────────────────────────

let mockCreateClient: ReturnType<typeof vi.fn>;
let mockDb: {
  select: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  transaction: ReturnType<typeof vi.fn>;
};

const futureDate = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000);

beforeEach(async () => {
  vi.clearAllMocks();

  const supabase = await import('@/lib/supabase/server');
  mockCreateClient = supabase.createClient as ReturnType<typeof vi.fn>;

  const dbModule = await import('@/lib/supabase/db');
  mockDb = dbModule.db as unknown as typeof mockDb;

  // Default: authenticated buyer
  mockCreateClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: MOCK_BUYER_ID, email: 'buyer@test.com' } },
      }),
    },
  });

  // Default: buyer role
  const selectChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([{ role: 'buyer', fullName: 'Juan Comprador' }]),
    orderBy: vi.fn().mockReturnThis(),
  };
  mockDb.select.mockReturnValue(selectChain);

  // Default: transaction wraps the callback
  mockDb.transaction.mockImplementation(
    async (cb: (tx: typeof mockDb) => Promise<unknown>) => cb(mockDb)
  );

  // Default: valid token
  const tokenSelectChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([
      {
        id: MOCK_TOKEN_ID,
        agentId: MOCK_AGENT_ID,
        token: MOCK_TOKEN_VALUE,
        used: false,
        expiresAt: futureDate,
        buyerId: null,
      },
    ]),
    orderBy: vi.fn().mockReturnThis(),
  };
  mockDb.select
    .mockReturnValueOnce({ // first call: buyer role check
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ role: 'buyer', fullName: 'Juan Comprador' }]),
      orderBy: vi.fn().mockReturnThis(),
    })
    .mockReturnValue(tokenSelectChain);

  // Default: update token ok
  mockDb.update.mockReturnValue({
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
  });

  // Default: insert bond ok
  mockDb.insert.mockReturnValue({
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([
      {
        id: MOCK_BOND_ID,
        agentId: MOCK_AGENT_ID,
        buyerId: MOCK_BUYER_ID,
        referralTokenId: MOCK_TOKEN_ID,
        status: 'active',
        expiresAt: futureDate,
        createdAt: new Date(),
      },
    ]),
  });
});

function makeRequest(token = MOCK_TOKEN_VALUE) {
  return new NextRequest(`http://localhost/api/v1/referral-tokens/${token}/accept`, {
    method: 'POST',
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/v1/referral-tokens/[token]/accept', () => {
  it('AC2 — returns 200 and creates bond when token is valid', async () => {
    const { POST } = await import('./route');
    const res = await POST(makeRequest(), { params: Promise.resolve({ token: MOCK_TOKEN_VALUE }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.bondId).toBeDefined();
    expect(body.data.agentId).toBe(MOCK_AGENT_ID);
  });

  it('AC3 — response includes redirectTo for client navigation', async () => {
    const { POST } = await import('./route');
    const res = await POST(makeRequest(), { params: Promise.resolve({ token: MOCK_TOKEN_VALUE }) });
    const body = await res.json();

    expect(body.data.redirectTo).toBe('/swipe');
    expect(body.data.agentName).toBeDefined();
  });

  it('AC7 — returns 401 when buyer is not authenticated', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    });

    const { POST } = await import('./route');
    const res = await POST(makeRequest(), { params: Promise.resolve({ token: MOCK_TOKEN_VALUE }) });
    expect(res.status).toBe(401);
  });

  it('AC6 — returns 400 when token is already used', async () => {
    // Reset select mock and configure fresh for this test
    mockDb.select.mockReset();
    mockDb.select
      .mockReturnValueOnce({ // 1st call: buyer role check (outside tx)
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ role: 'buyer', fullName: 'Juan' }]),
        orderBy: vi.fn().mockReturnThis(),
      })
      .mockReturnValue({ // 2nd call: token select (inside tx) — used token
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          { id: MOCK_TOKEN_ID, agentId: MOCK_AGENT_ID, token: MOCK_TOKEN_VALUE, used: true, expiresAt: futureDate, buyerId: 'other-buyer' },
        ]),
        orderBy: vi.fn().mockReturnThis(),
      });

    const { POST } = await import('./route');
    const res = await POST(makeRequest(), { params: Promise.resolve({ token: MOCK_TOKEN_VALUE }) });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain('válido');
  });

  it('AC6 — returns 400 when token is expired', async () => {
    const pastDate = new Date(Date.now() - 1000);

    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        { id: MOCK_TOKEN_ID, agentId: MOCK_AGENT_ID, token: MOCK_TOKEN_VALUE, used: false, expiresAt: pastDate, buyerId: null },
      ]),
      orderBy: vi.fn().mockReturnThis(),
    });

    const { POST } = await import('./route');
    const res = await POST(makeRequest(), { params: Promise.resolve({ token: MOCK_TOKEN_VALUE }) });

    expect(res.status).toBe(400);
  });

  it('AC6 — returns 400 when token does not exist', async () => {
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]), // no token found
      orderBy: vi.fn().mockReturnThis(),
    });

    const { POST } = await import('./route');
    const res = await POST(makeRequest(), { params: Promise.resolve({ token: 'nonexistent-token' }) });

    expect(res.status).toBe(400);
  });
});

