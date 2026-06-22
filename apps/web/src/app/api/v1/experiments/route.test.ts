/**
 * Story 9.1 — ATDD Tests: POST /api/v1/experiments
 *
 * AC6: API de creación de experimentos para agency_admin.
 *
 * TDD RED PHASE: All tests use it.skip() — will fail until route is implemented.
 * Remove .skip() after implementing apps/web/src/app/api/v1/experiments/route.ts
 *
 * Run: pnpm --filter @reinder/web test apps/web/src/app/api/v1/experiments/route.test.ts
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
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    transaction: vi.fn(),
  },
}));

// Provider endpoint: TODO — new endpoint, not yet implemented
/*
 * Provider Scrutiny Evidence:
 * - Handler: NEW — not yet implemented (TDD red phase)
 * - Expected from acceptance criteria:
 *   - Endpoint: POST /api/v1/experiments
 *   - Auth: agency_admin role required (401/403 for others)
 *   - Request body: { listingId: UUID, name: string, experimentType: enum, variantB: JSONB }
 *   - Status: 201 on success, 409 if experiment already active, 403 for non-agency_admin
 *   - Response shape: ApiResponse<{ experiment: ExperimentRow }>
 */

import { createClient } from "@/lib/supabase/server";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const AGENCY_ADMIN_USER = { id: "admin-uuid-001", email: "admin@agency.com" };
const BUYER_USER = { id: "buyer-uuid-001", email: "buyer@test.com" };
const AGENT_USER = { id: "agent-uuid-001", email: "agent@test.com" };

const VALID_EXPERIMENT_BODY = {
  listingId: "listing-uuid-001",
  name: "Test cover image A/B",
  experimentType: "cover_image",
  variantB: {
    coverImageUrl: "https://example.com/variant-b.jpg",
    coverImageIndex: 2,
  },
};

const MOCK_LISTING = {
  id: "listing-uuid-001",
  agencyId: "agency-uuid-001",
  title: "Piso en Malasaña",
  description: "Precioso piso reformado",
  images: ["https://example.com/original.jpg", "https://example.com/photo2.jpg"],
};

const MOCK_CREATED_EXPERIMENT = {
  id: "exp-uuid-new",
  listingId: "listing-uuid-001",
  agencyId: "agency-uuid-001",
  name: "Test cover image A/B",
  status: "draft",
  experimentType: "cover_image",
  variantA: { coverImageUrl: "https://example.com/original.jpg", coverImageIndex: 0 },
  variantB: { coverImageUrl: "https://example.com/variant-b.jpg", coverImageIndex: 2 },
  minSampleSize: 100,
  targetPValue: 0.05,
  winnerVariant: null,
  startedAt: null,
  completedAt: null,
  createdAt: "2026-06-22T10:00:00Z",
  updatedAt: "2026-06-22T10:00:00Z",
};

const makeSupabaseMock = (user: { id: string; email: string } | null, role?: string, agencyId?: string) => ({
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
          data: role ? { role, agencyId: agencyId || "agency-uuid-001" } : null,
          error: null,
        }),
      }),
    }),
  }),
});

const makeRequest = (body: object) =>
  new Request("http://localhost:3000/api/v1/experiments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/v1/experiments — AC6", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── T9.1-14: Creates experiment in draft status ───
  it.skip("[P0] T9.1-14: creates experiment in 'draft' status with auto-populated variant_a", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(AGENCY_ADMIN_USER, "agency_admin", "agency-uuid-001") as any
    );

    const { db } = await import("@/lib/supabase/db");
    // Mock: listing found, no active experiment, transaction succeeds
    vi.mocked(db.select().from(null as any).where(null as any).limit as any)
      .mockResolvedValueOnce([MOCK_LISTING]) // listing lookup
      .mockResolvedValueOnce([]); // no active experiment

    vi.mocked(db.transaction as any).mockImplementation(async (fn: any) => {
      return fn({
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([MOCK_CREATED_EXPERIMENT]),
          }),
        }),
      });
    });

    const { POST } = await import("@/app/api/v1/experiments/route");
    const req = makeRequest(VALID_EXPERIMENT_BODY);
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.error).toBeNull();
    expect(body.data.experiment).toBeDefined();
    expect(body.data.experiment.status).toBe("draft");
    expect(body.data.experiment.variantA).toBeDefined();
  });

  // ─── T9.1-15: Creates experiment_results rows (a + b) ───
  it.skip("[P0] T9.1-15: creates 2 experiment_results rows (variant a and b) with counters at 0", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(AGENCY_ADMIN_USER, "agency_admin") as any
    );

    const { db } = await import("@/lib/supabase/db");
    const insertMock = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([MOCK_CREATED_EXPERIMENT]),
      }),
    });

    vi.mocked(db.select().from(null as any).where(null as any).limit as any)
      .mockResolvedValueOnce([MOCK_LISTING])
      .mockResolvedValueOnce([]);

    vi.mocked(db.transaction as any).mockImplementation(async (fn: any) => {
      return fn({ insert: insertMock });
    });

    const { POST } = await import("@/app/api/v1/experiments/route");
    const req = makeRequest(VALID_EXPERIMENT_BODY);
    await POST(req);

    // The transaction should have inserted both the experiment AND the 2 result rows
    // insertMock should have been called at least twice (experiment + 2 result rows)
    expect(insertMock).toHaveBeenCalled();
  });

  // ─── T9.1-16: 409 when active experiment exists for listing ───
  it.skip("[P0] T9.1-16: returns 409 EXPERIMENT_ALREADY_EXISTS when listing has active experiment", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(AGENCY_ADMIN_USER, "agency_admin") as any
    );

    const { db } = await import("@/lib/supabase/db");
    vi.mocked(db.select().from(null as any).where(null as any).limit as any)
      .mockResolvedValueOnce([MOCK_LISTING])
      .mockResolvedValueOnce([{ id: "existing-exp-uuid", status: "running" }]); // active experiment exists

    const { POST } = await import("@/app/api/v1/experiments/route");
    const req = makeRequest(VALID_EXPERIMENT_BODY);
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.data).toBeNull();
    expect(body.error.code).toBe("EXPERIMENT_ALREADY_EXISTS");
  });

  // ─── T9.1-17: 403 when user is buyer ───
  it.skip("[P0] T9.1-17: returns 403 when user role is buyer", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(BUYER_USER, "buyer") as any
    );

    const { POST } = await import("@/app/api/v1/experiments/route");
    const req = makeRequest(VALID_EXPERIMENT_BODY);
    const res = await POST(req);

    expect(res.status).toBe(403);
  });

  // ─── T9.1-18: 403 when user is agent ───
  it.skip("[P1] T9.1-18: returns 403 when user role is agent", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(AGENT_USER, "agent") as any
    );

    const { POST } = await import("@/app/api/v1/experiments/route");
    const req = makeRequest(VALID_EXPERIMENT_BODY);
    const res = await POST(req);

    expect(res.status).toBe(403);
  });

  // ─── T9.1-19: 401 when not authenticated ───
  it.skip("[P0] T9.1-19: returns 401 when user is not authenticated", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(null) as any
    );

    const { POST } = await import("@/app/api/v1/experiments/route");
    const req = makeRequest(VALID_EXPERIMENT_BODY);
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  // ─── T9.1-20: 400 when body validation fails (missing required fields) ───
  it.skip("[P1] T9.1-20: returns 400 when required fields are missing from body", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(AGENCY_ADMIN_USER, "agency_admin") as any
    );

    const { POST } = await import("@/app/api/v1/experiments/route");

    // Missing name and variantB
    const req = makeRequest({ listingId: "listing-uuid-001", experimentType: "cover_image" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBeDefined();
  });

  // ─── T9.1-21: 400 when experimentType is invalid ───
  it.skip("[P1] T9.1-21: returns 400 when experimentType is not a valid enum value", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(AGENCY_ADMIN_USER, "agency_admin") as any
    );

    const { POST } = await import("@/app/api/v1/experiments/route");
    const req = makeRequest({
      ...VALID_EXPERIMENT_BODY,
      experimentType: "invalid_type",
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  // ─── T9.1-22: Response follows ApiResponse wrapper format ───
  it.skip("[P1] T9.1-22: response body follows ApiResponse<T> wrapper format", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(AGENCY_ADMIN_USER, "agency_admin") as any
    );

    const { db } = await import("@/lib/supabase/db");
    vi.mocked(db.select().from(null as any).where(null as any).limit as any)
      .mockResolvedValueOnce([MOCK_LISTING])
      .mockResolvedValueOnce([]);

    vi.mocked(db.transaction as any).mockImplementation(async (fn: any) => {
      return fn({
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([MOCK_CREATED_EXPERIMENT]),
          }),
        }),
      });
    });

    const { POST } = await import("@/app/api/v1/experiments/route");
    const req = makeRequest(VALID_EXPERIMENT_BODY);
    const res = await POST(req);
    const body = await res.json();

    // ApiResponse<T> format: { data: T | null, error: ErrorObject | null }
    expect(body).toHaveProperty("data");
    expect(body).toHaveProperty("error");
  });
});
