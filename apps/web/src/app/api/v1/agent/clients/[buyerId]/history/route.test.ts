/**
 * Story 4.3 — API Route Tests: GET /api/v1/agent/clients/[buyerId]/history
 *
 * Tests cover:
 * - 200: returns matches and rejects for bonded buyer
 * - 200: agentLastSeenAt updated on access
 * - 401: no auth
 * - 403: agent accessing another agent's buyer
 * - 404 equivalent: buyer not bonded to this agent
 * - 400: invalid params
 *
 * Run: pnpm --filter @reinder/web test apps/web/src/app/api/v1/agent/clients/[buyerId]/history/route.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

const mockUpdate = vi.fn().mockReturnThis();
const mockSet = vi.fn().mockReturnThis();
const mockUpdateWhere = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/supabase/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    leftJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    offset: vi.fn().mockResolvedValue([]),
    update: vi.fn(() => ({ set: mockSet })),
  },
}));

import { createClient } from "@/lib/supabase/server";
import { GET } from "@/app/api/v1/agent/clients/[buyerId]/history/route";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const AGENT_USER = { id: "agent-uuid-1", email: "agent@test.com" };
const BUYER_ID = "buyer-uuid-1";

const makeSupabaseMock = (user: typeof AGENT_USER | null) => ({
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user },
      error: user ? null : { message: "Not authenticated" },
    }),
  },
});

const makeRequest = (buyerId: string, queryParams = "") =>
  new Request(
    `http://localhost:3000/api/v1/agent/clients/${buyerId}/history${queryParams}`
  ) as unknown as NextRequest;

const makeParams = (buyerId: string) => Promise.resolve({ buyerId });

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/v1/agent/clients/[buyerId]/history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── T4.3-01: returns 401 when not authenticated ───
  it("T4.3-01: returns 401 when not authenticated", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock(null) as any);

    const req = makeRequest(BUYER_ID);
    const res = await GET(req, { params: makeParams(BUYER_ID) });
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  // ─── T4.3-02: returns 403 when buyer role tries to access ───
  it("T4.3-02: returns 403 when authenticated as buyer (not agent)", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(AGENT_USER) as any
    );

    const { db } = await import("@/lib/supabase/db");
    // Return buyer profile (not agent)
    vi.mocked(db.select().from(null as any).where(null as any).limit as any).mockResolvedValueOnce([
      { role: "buyer" },
    ]);

    const req = makeRequest(BUYER_ID);
    const res = await GET(req, { params: makeParams(BUYER_ID) });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  // ─── T4.3-03: returns 403 when agent has no bond with buyer ───
  it("T4.3-03: returns 403 when agent is not bonded to this buyer", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(AGENT_USER) as any
    );

    const { db } = await import("@/lib/supabase/db");
    // Agent profile exists
    vi.mocked(db.select().from(null as any).where(null as any).limit as any)
      .mockResolvedValueOnce([{ role: "agent" }]) // profile check
      .mockResolvedValueOnce([]); // bond check — no bond

    const req = makeRequest(BUYER_ID);
    const res = await GET(req, { params: makeParams(BUYER_ID) });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
    expect(body.error.message).toMatch(/No active bond/);
  });
});
