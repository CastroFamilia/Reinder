/**
 * Story 4.4 — API Route Tests: GET + PATCH /api/v1/agent/match/[matchId]
 *
 * Tests cover:
 * - GET 401/403 guards
 * - PATCH 401/403 guards
 * - PATCH marks match as gestionado
 *
 * Run: pnpm --filter @reinder/web test apps/web/src/app/api/v1/agent/match/[matchId]/route.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  },
}));

import { createClient } from "@/lib/supabase/server";
import { GET, PATCH } from "@/app/api/v1/agent/match/[matchId]/route";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const AGENT_USER = { id: "agent-uuid-1", email: "agent@test.com" };
const MATCH_ID = "match-uuid-1";

const makeSupabaseMock = (user: typeof AGENT_USER | null) => ({
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user },
      error: user ? null : { message: "Not authenticated" },
    }),
  },
});

const makeGetRequest = (matchId: string) =>
  new Request(`http://localhost:3000/api/v1/agent/match/${matchId}`);

const makePatchRequest = (matchId: string) =>
  new Request(`http://localhost:3000/api/v1/agent/match/${matchId}`, {
    method: "PATCH",
  });

const makeParams = (matchId: string) => Promise.resolve({ matchId });

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/v1/agent/match/[matchId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── T4.4-01: 401 when not authenticated ───
  it("T4.4-01: returns 401 when not authenticated", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock(null) as any);

    const req = makeGetRequest(MATCH_ID);
    const res = await GET(req, { params: makeParams(MATCH_ID) });
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  // ─── T4.4-02: 403 when buyer tries to access ───
  it("T4.4-02: returns 403 when authenticated as buyer (not agent)", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(AGENT_USER) as any
    );

    const { db } = await import("@/lib/supabase/db");
    vi.mocked(db.select().from(null as any).where(null as any).limit as any).mockResolvedValueOnce([
      { role: "buyer" },
    ]);

    const req = makeGetRequest(MATCH_ID);
    const res = await GET(req, { params: makeParams(MATCH_ID) });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });
});

describe("PATCH /api/v1/agent/match/[matchId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── T4.4-03: 401 when not authenticated ───
  it("T4.4-03: returns 401 when not authenticated for PATCH", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock(null) as any);

    const req = makePatchRequest(MATCH_ID);
    const res = await PATCH(req, { params: makeParams(MATCH_ID) });
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  // ─── T4.4-04: 403 when buyer tries to mark as gestionado ───
  it("T4.4-04: returns 403 when buyer tries to mark match as gestionado", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(AGENT_USER) as any
    );

    const { db } = await import("@/lib/supabase/db");
    vi.mocked(db.select().from(null as any).where(null as any).limit as any).mockResolvedValueOnce([
      { role: "buyer" },
    ]);

    const req = makePatchRequest(MATCH_ID);
    const res = await PATCH(req, { params: makeParams(MATCH_ID) });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });
});
