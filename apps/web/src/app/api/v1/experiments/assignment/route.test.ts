/**
 * Story 9.1 — ATDD Tests: GET /api/v1/experiments/assignment
 *
 * AC5: API de asignación de variantes para compradores autenticados.
 *
 * TDD RED PHASE: All tests use it.skip() — will fail until route is implemented.
 * Remove .skip() after implementing apps/web/src/app/api/v1/experiments/assignment/route.ts
 *
 * Run: pnpm --filter @reinder/web test apps/web/src/app/api/v1/experiments/assignment/route.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks (will be wired when route is implemented) ────────────────────────

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    onConflictDoNothing: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
  },
}));

// Provider endpoint: TODO — new endpoint, not yet implemented
/*
 * Provider Scrutiny Evidence:
 * - Handler: NEW — not yet implemented (TDD red phase)
 * - Expected from acceptance criteria:
 *   - Endpoint: GET /api/v1/experiments/assignment?listing_id={uuid}
 *   - Auth: buyer role required (401 unauthenticated, 403 non-buyer)
 *   - Status: 200 with { data: { experimentId, variant, variantContent }, error: null }
 *             200 with { data: null, error: null } when no active experiment
 *   - Response shape: ApiResponse<{ experimentId: string, variant: 'a' | 'b', variantContent: object } | null>
 */

import { createClient } from "@/lib/supabase/server";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const BUYER_USER = { id: "buyer-uuid-001", email: "buyer@test.com" };
const AGENCY_USER = { id: "agency-uuid-001", email: "agency@test.com" };

const MOCK_EXPERIMENT = {
  id: "exp-uuid-001",
  listingId: "listing-uuid-001",
  agencyId: "agency-uuid-001",
  status: "running",
  experimentType: "cover_image",
  variantA: { coverImageUrl: "https://example.com/original.jpg", coverImageIndex: 0 },
  variantB: { coverImageUrl: "https://example.com/variant.jpg", coverImageIndex: 1 },
};

const makeSupabaseMock = (user: { id: string; email: string } | null, role?: string) => ({
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user },
      error: user ? null : { message: "Not authenticated" },
    }),
  },
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: role ? { role } : null,
          error: null,
        }),
      }),
    }),
  }),
});

const makeRequest = (params: Record<string, string> = {}) => {
  const url = new URL("http://localhost:3000/api/v1/experiments/assignment");
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return new Request(url.toString());
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/v1/experiments/assignment — AC5", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── T9.1-07: Returns variant when running experiment exists ───
  it("[P0] T9.1-07: returns 200 with experimentId, variant, and variantContent for a running experiment", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(BUYER_USER, "buyer") as any
    );

    // Mock: running experiment found for the listing
    const { db } = await import("@/lib/supabase/db");
    vi.mocked(db.select().from(null as any).where(null as any).limit as any).mockResolvedValueOnce([MOCK_EXPERIMENT]);

    const { GET } = await import("@/app/api/v1/experiments/assignment/route");
    const req = makeRequest({ listing_id: "listing-uuid-001" });
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).not.toBeNull();
    expect(body.data.experimentId).toBe(MOCK_EXPERIMENT.id);
    expect(["a", "b"]).toContain(body.data.variant);
    expect(body.data.variantContent).toBeDefined();
  });

  // ─── T9.1-08: Returns null data when no active experiment ───
  it("[P0] T9.1-08: returns 200 with { data: null, error: null } when no running experiment exists", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(BUYER_USER, "buyer") as any
    );

    // Mock: no experiment found
    const { db } = await import("@/lib/supabase/db");
    vi.mocked(db.select().from(null as any).where(null as any).limit as any).mockResolvedValueOnce([]);

    const { GET } = await import("@/app/api/v1/experiments/assignment/route");
    const req = makeRequest({ listing_id: "listing-uuid-001" });
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toBeNull();
    expect(body.error).toBeNull();
  });

  // ─── T9.1-09: 401 when not authenticated ───
  it("[P0] T9.1-09: returns 401 when user is not authenticated", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(null) as any
    );

    const { GET } = await import("@/app/api/v1/experiments/assignment/route");
    const req = makeRequest({ listing_id: "listing-uuid-001" });
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  // ─── T9.1-10: 403 when user is not a buyer ───
  it("[P1] T9.1-10: returns 403 when user role is agency_admin (not buyer)", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(AGENCY_USER, "agency_admin") as any
    );

    const { GET } = await import("@/app/api/v1/experiments/assignment/route");
    const req = makeRequest({ listing_id: "listing-uuid-001" });
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBeDefined();
  });

  // ─── T9.1-11: Assignment is idempotent (same variant on repeat) ───
  it("[P0] T9.1-11: returns the same variant on repeated calls (deterministic assignment)", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(BUYER_USER, "buyer") as any
    );

    const { db } = await import("@/lib/supabase/db");
    vi.mocked(db.select().from(null as any).where(null as any).limit as any)
      .mockResolvedValue([MOCK_EXPERIMENT]);

    const { GET } = await import("@/app/api/v1/experiments/assignment/route");

    const req1 = makeRequest({ listing_id: "listing-uuid-001" });
    const res1 = await GET(req1);
    const body1 = await res1.json();

    const req2 = makeRequest({ listing_id: "listing-uuid-001" });
    const res2 = await GET(req2);
    const body2 = await res2.json();

    expect(body1.data.variant).toBe(body2.data.variant);
  });

  // ─── T9.1-12: Response time < 50ms (NFR11) ───
  it("[P1] T9.1-12: responds within 50ms (NFR11 — pre-computed assignment)", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(BUYER_USER, "buyer") as any
    );

    const { db } = await import("@/lib/supabase/db");
    vi.mocked(db.select().from(null as any).where(null as any).limit as any)
      .mockResolvedValue([MOCK_EXPERIMENT]);

    const { GET } = await import("@/app/api/v1/experiments/assignment/route");

    const start = performance.now();
    const req = makeRequest({ listing_id: "listing-uuid-001" });
    await GET(req);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(50);
  });

  // ─── T9.1-13: Missing listing_id returns 400 ───
  it("[P1] T9.1-13: returns 400 when listing_id query param is missing", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(BUYER_USER, "buyer") as any
    );

    const { GET } = await import("@/app/api/v1/experiments/assignment/route");
    const req = makeRequest({}); // no listing_id
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBeDefined();
  });
});
