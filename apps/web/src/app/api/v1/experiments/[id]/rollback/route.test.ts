/**
 * Story 9.4 — Tests: POST /api/v1/experiments/:id/rollback
 *
 * AC8: Rollback API endpoint
 * - 401 if not authenticated
 * - 403 if not agency_admin of the owning agency
 * - 409 if experiment status != winner_promoted
 * - 200 restores original content (variant_a), sets status to completed,
 *   creates audit log with promoted_by = 'rollback_agency_admin'
 *
 * Source: story 9-4, AC8, Task 8
 *
 * Tests call the actual POST handler with mocked dependencies.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

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
    leftJoin: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
    transaction: vi.fn(),
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => args),
  and: vi.fn((...args: unknown[]) => args),
  sql: vi.fn(),
}));

vi.mock("@reinder/shared/db/schema", () => ({
  listings: { id: "id", images: "images", title: "title", description: "description" },
  listingExperiments: {
    id: "id",
    agencyId: "agencyId",
    status: "status",
    listingId: "listingId",
  },
  experimentPromotionLogs: {},
}));

import { createClient } from "@/lib/supabase/server";

// ─── Test data ────────────────────────────────────────────────────────────────

const EXPERIMENT_ID = "exp-rollback-001";

const makePromotedExperiment = () => ({
  id: EXPERIMENT_ID,
  listingId: "listing-001",
  agencyId: "agency-001",
  name: "Cover Image A/B Test",
  status: "winner_promoted",
  experimentType: "title",
  variantA: { title: "Original Title" },
  variantB: { title: "Winning Title" },
  winnerVariant: "b",
  startedAt: new Date("2026-06-01T00:00:00Z"),
  completedAt: new Date("2026-06-15T00:00:00Z"),
  minSampleSize: 100,
  targetPValue: "0.050",
  createdAt: new Date("2026-05-15T00:00:00Z"),
  updatedAt: new Date("2026-06-15T00:00:00Z"),
});

const makeListing = () => ({
  id: "listing-001",
  title: "Winning Title",
  description: "Some description",
  images: ["img-a.jpg", "img-b.jpg"],
});

const makeSupabaseMock = (
  user: { id: string; email: string } | null,
  role?: string,
  agencyId?: string
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
        single: vi.fn().mockResolvedValue({
          data: role ? { role, agencyId: agencyId || "agency-001" } : null,
          error: null,
        }),
      }),
    }),
  }),
});

function makeRequest(): NextRequest {
  return new NextRequest(
    `http://localhost:3000/api/v1/experiments/${EXPERIMENT_ID}/rollback`,
    { method: "POST" }
  );
}

function makeParams(id: string = EXPERIMENT_ID) {
  return { params: Promise.resolve({ id }) };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/v1/experiments/:id/rollback — AC8", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  // ─── Auth: 401 ────────────────────────────────────────────────────────────

  it("AC8: unauthenticated request → 401", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(null) as any
    );

    const { POST } = await import(
      "@/app/api/v1/experiments/[id]/rollback/route"
    );
    const res = await POST(makeRequest(), makeParams());
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.data).toBeNull();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  // ─── Auth: 403 (wrong role) ───────────────────────────────────────────────

  it("AC8: non-agency_admin user → 403", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(
        { id: "user-buyer-001", email: "buyer@test.com" },
        "buyer"
      ) as any
    );

    const { POST } = await import(
      "@/app/api/v1/experiments/[id]/rollback/route"
    );
    const res = await POST(makeRequest(), makeParams());
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.data).toBeNull();
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("AC8: agency_admin with no profile → 403", async () => {
    const mock = makeSupabaseMock(
      { id: "user-admin-001", email: "admin@test.com" }
    );
    // Override to return null profile
    mock.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      }),
    });

    vi.mocked(createClient).mockResolvedValue(mock as any);

    const { POST } = await import(
      "@/app/api/v1/experiments/[id]/rollback/route"
    );
    const res = await POST(makeRequest(), makeParams());
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.data).toBeNull();
  });

  // ─── State: 409 (wrong experiment status) ─────────────────────────────────

  it("AC8: experiment status 'completed' (not winner_promoted) → 409 INVALID_STATE_FOR_ROLLBACK", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(
        { id: "user-admin-001", email: "admin@test.com" },
        "agency_admin",
        "agency-001"
      ) as any
    );

    const { db } = await import("@/lib/supabase/db");
    const completedExperiment = { ...makePromotedExperiment(), status: "completed" };
    vi.mocked(db.select().from(null as any).where(null as any).limit as any)
      .mockResolvedValueOnce([completedExperiment]);

    const { POST } = await import(
      "@/app/api/v1/experiments/[id]/rollback/route"
    );
    const res = await POST(makeRequest(), makeParams());
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.data).toBeNull();
    expect(body.error.code).toBe("INVALID_STATE_FOR_ROLLBACK");
  });

  it("AC8: experiment status 'running' → 409", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(
        { id: "user-admin-001", email: "admin@test.com" },
        "agency_admin",
        "agency-001"
      ) as any
    );

    const { db } = await import("@/lib/supabase/db");
    const runningExperiment = { ...makePromotedExperiment(), status: "running" };
    vi.mocked(db.select().from(null as any).where(null as any).limit as any)
      .mockResolvedValueOnce([runningExperiment]);

    const { POST } = await import(
      "@/app/api/v1/experiments/[id]/rollback/route"
    );
    const res = await POST(makeRequest(), makeParams());
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error.code).toBe("INVALID_STATE_FOR_ROLLBACK");
  });

  it("AC8: experiment not found → 404", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(
        { id: "user-admin-001", email: "admin@test.com" },
        "agency_admin",
        "agency-001"
      ) as any
    );

    const { db } = await import("@/lib/supabase/db");
    vi.mocked(db.select().from(null as any).where(null as any).limit as any)
      .mockResolvedValueOnce([]); // experiment not found

    const { POST } = await import(
      "@/app/api/v1/experiments/[id]/rollback/route"
    );
    const res = await POST(makeRequest(), makeParams());
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.data).toBeNull();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  // ─── Success: 200 ────────────────────────────────────────────────────────

  it("AC8: valid rollback → 200 + restores original content + status completed", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(
        { id: "user-admin-001", email: "admin@test.com" },
        "agency_admin",
        "agency-001"
      ) as any
    );

    const { db } = await import("@/lib/supabase/db");
    const experiment = makePromotedExperiment();
    const listing = makeListing();

    vi.mocked(db.select().from(null as any).where(null as any).limit as any)
      .mockResolvedValueOnce([experiment]) // experiment lookup
      .mockResolvedValueOnce([listing]); // listing lookup

    vi.mocked(db.transaction as any).mockImplementation(async (fn: any) => {
      await fn({
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockResolvedValue(undefined),
        }),
      });
    });

    const { POST } = await import(
      "@/app/api/v1/experiments/[id]/rollback/route"
    );
    const res = await POST(makeRequest(), makeParams());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.experiment.status).toBe("completed");
    expect(body.data.experiment.id).toBe(EXPERIMENT_ID);
    // Title should be restored to variant_a's title
    expect(body.data.listing.title).toBe("Original Title");
  });

  it("AC8: rollback creates audit log entry in transaction", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(
        { id: "user-admin-001", email: "admin@test.com" },
        "agency_admin",
        "agency-001"
      ) as any
    );

    const { db } = await import("@/lib/supabase/db");
    const experiment = makePromotedExperiment();
    const listing = makeListing();

    vi.mocked(db.select().from(null as any).where(null as any).limit as any)
      .mockResolvedValueOnce([experiment])
      .mockResolvedValueOnce([listing]);

    const insertMock = vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });

    vi.mocked(db.transaction as any).mockImplementation(async (fn: any) => {
      await fn({
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          }),
        }),
        insert: insertMock,
      });
    });

    const { POST } = await import(
      "@/app/api/v1/experiments/[id]/rollback/route"
    );
    const res = await POST(makeRequest(), makeParams());

    expect(res.status).toBe(200);
    // Verify that insert was called (audit log creation)
    expect(insertMock).toHaveBeenCalled();
  });

  // ─── Response shape ──────────────────────────────────────────────────────

  it("AC8: response shape matches ApiResponse<{ experiment, listing }>", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(
        { id: "user-admin-001", email: "admin@test.com" },
        "agency_admin",
        "agency-001"
      ) as any
    );

    const { db } = await import("@/lib/supabase/db");
    const experiment = makePromotedExperiment();
    const listing = makeListing();

    vi.mocked(db.select().from(null as any).where(null as any).limit as any)
      .mockResolvedValueOnce([experiment])
      .mockResolvedValueOnce([listing]);

    vi.mocked(db.transaction as any).mockImplementation(async (fn: any) => {
      await fn({
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockResolvedValue(undefined),
        }),
      });
    });

    const { POST } = await import(
      "@/app/api/v1/experiments/[id]/rollback/route"
    );
    const res = await POST(makeRequest(), makeParams());
    const body = await res.json();

    expect(res.status).toBe(200);
    // Response shape: { data: { experiment, listing }, error: null }
    expect(body).toHaveProperty("data");
    expect(body).toHaveProperty("error");
    expect(body.error).toBeNull();
    expect(body.data).toHaveProperty("experiment");
    expect(body.data).toHaveProperty("listing");
    expect(body.data.experiment).toHaveProperty("id");
    expect(body.data.experiment).toHaveProperty("status");
    expect(body.data.listing).toHaveProperty("id");
  });

  // ─── Ownership: 404 (different agency) ──────────────────────────────────

  it("AC8: agency_admin from different agency → 404 (ownership filter)", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(
        { id: "user-admin-002", email: "other-admin@test.com" },
        "agency_admin",
        "agency-OTHER" // different agency than experiment's agency-001
      ) as any
    );

    const { db } = await import("@/lib/supabase/db");
    // The query filters by agency_id, so experiment won't be found
    vi.mocked(db.select().from(null as any).where(null as any).limit as any)
      .mockResolvedValueOnce([]); // no experiment found for this agency

    const { POST } = await import(
      "@/app/api/v1/experiments/[id]/rollback/route"
    );
    const res = await POST(makeRequest(), makeParams());
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.data).toBeNull();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  // ─── Internal error: 500 ──────────────────────────────────────────────

  it("AC8: transaction failure → 500 INTERNAL_ERROR", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(
        { id: "user-admin-001", email: "admin@test.com" },
        "agency_admin",
        "agency-001"
      ) as any
    );

    const { db } = await import("@/lib/supabase/db");
    const experiment = makePromotedExperiment();
    const listing = makeListing();

    vi.mocked(db.select().from(null as any).where(null as any).limit as any)
      .mockResolvedValueOnce([experiment])
      .mockResolvedValueOnce([listing]);

    // Simulate transaction failure
    vi.mocked(db.transaction as any).mockRejectedValue(
      new Error("Database connection lost")
    );

    const { POST } = await import(
      "@/app/api/v1/experiments/[id]/rollback/route"
    );

    // Suppress console.error from the route handler's catch block
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(makeRequest(), makeParams());
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.data).toBeNull();
    expect(body.error.code).toBe("INTERNAL_ERROR");

    consoleSpy.mockRestore();
  });
});
