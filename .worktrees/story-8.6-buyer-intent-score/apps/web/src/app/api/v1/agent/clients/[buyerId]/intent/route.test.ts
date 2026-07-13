/**
 * Story 8.6 — ATDD Tests: GET /api/v1/agent/clients/{buyerId}/intent
 *
 * Tests cover:
 * - T8.6-01: Returns intent score with level classification
 * - T8.6-02: Default score when not yet calculated
 * - T8.6-03: 401 for unauthenticated
 * - T8.6-04: 403 for non-agent roles
 * - T8.6-05: 403 when no active bond with buyer
 *
 * Run: pnpm --filter @reinder/web test -- "intent"
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const dbSelectLimitMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/db", () => ({
  db: {
    select: vi.fn().mockImplementation(() => ({
      from: vi.fn().mockImplementation(() => ({
        where: vi.fn().mockImplementation(() => ({
          limit: dbSelectLimitMock,
        })),
      })),
    })),
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  and: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { GET } from "./route";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const AGENT_USER = { id: "agent-uuid-1", email: "agent@test.com" };
const BUYER_ID = "buyer-uuid-1";

const makeSupabaseMock = (
  user: typeof AGENT_USER | null,
  role: string = "agent"
) => ({
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user },
      error: user ? null : { message: "Not authenticated" },
    }),
  },
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: user ? { role } : null,
          error: null,
        }),
      }),
    }),
  }),
});

const makeRequest = () =>
  new Request(`http://localhost:3000/api/v1/agent/clients/${BUYER_ID}/intent`, {
    method: "GET",
  });

const makeParams = (buyerId: string) => ({
  params: Promise.resolve({ buyerId }),
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/v1/agent/clients/{buyerId}/intent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── T8.6-03: 401 for unauthenticated ────────────────────────────────

  it("T8.6-03: returns 401 when not authenticated", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock(null) as any);

    const res = await GET(makeRequest(), makeParams(BUYER_ID));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  // ─── T8.6-04: 403 for non-agent roles ────────────────────────────────

  it("T8.6-04: returns 403 for buyer role", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock(AGENT_USER, "buyer") as any);

    const res = await GET(makeRequest(), makeParams(BUYER_ID));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  // ─── T8.6-05: 403 when no active bond ────────────────────────────────

  it("T8.6-05: returns 403 when agent has no active bond with buyer", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock(AGENT_USER) as any);

    // No bond found
    dbSelectLimitMock.mockResolvedValueOnce([]);

    const res = await GET(makeRequest(), makeParams(BUYER_ID));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.message).toContain("No active bond");
  });

  // ─── T8.6-01: Returns intent score with level ────────────────────────

  it("T8.6-01: returns high intent score (>=70)", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock(AGENT_USER) as any);

    // Bond exists
    dbSelectLimitMock
      .mockResolvedValueOnce([{ agentId: AGENT_USER.id, buyerId: BUYER_ID, status: "active" }])
      // Intent score exists
      .mockResolvedValueOnce([{
        buyerId: BUYER_ID,
        score: 85,
        scoreBreakdown: {
          matchCount: 12,
          reaffirmRatio: 0.75,
          avgViewTimeVsGlobal: 1.3,
          preferenceConsistency: 0.9,
        },
        lastCalculatedAt: new Date("2026-05-17T10:00:00Z"),
      }]);

    const res = await GET(makeRequest(), makeParams(BUYER_ID));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.score).toBe(85);
    expect(body.data.intentLevel).toBe("high");
    expect(body.data.scoreBreakdown.matchCount).toBe(12);
  });

  it("T8.6-01b: returns medium intent level (40-69)", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock(AGENT_USER) as any);

    dbSelectLimitMock
      .mockResolvedValueOnce([{ agentId: AGENT_USER.id, buyerId: BUYER_ID, status: "active" }])
      .mockResolvedValueOnce([{
        buyerId: BUYER_ID,
        score: 55,
        scoreBreakdown: null,
        lastCalculatedAt: new Date(),
      }]);

    const res = await GET(makeRequest(), makeParams(BUYER_ID));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.intentLevel).toBe("medium");
  });

  it("T8.6-01c: returns low intent level (<40)", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock(AGENT_USER) as any);

    dbSelectLimitMock
      .mockResolvedValueOnce([{ agentId: AGENT_USER.id, buyerId: BUYER_ID, status: "active" }])
      .mockResolvedValueOnce([{
        buyerId: BUYER_ID,
        score: 15,
        scoreBreakdown: null,
        lastCalculatedAt: new Date(),
      }]);

    const res = await GET(makeRequest(), makeParams(BUYER_ID));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.intentLevel).toBe("low");
  });

  // ─── T8.6-02: Default score when not calculated ──────────────────────

  it("T8.6-02: returns default score 0 when not yet calculated", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock(AGENT_USER) as any);

    // Bond exists
    dbSelectLimitMock
      .mockResolvedValueOnce([{ agentId: AGENT_USER.id, buyerId: BUYER_ID, status: "active" }])
      // No intent score
      .mockResolvedValueOnce([]);

    const res = await GET(makeRequest(), makeParams(BUYER_ID));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.score).toBe(0);
    expect(body.data.intentLevel).toBe("low");
    expect(body.data.message).toContain("pendiente");
  });
});
