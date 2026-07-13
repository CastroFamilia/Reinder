/**
 * Story 9.5 — Tests: GET /api/v1/agency/recommendations
 *
 * AC6: API returns pending recommendations for agency_admin
 *
 * Run: pnpm --filter @reinder/web test apps/web/src/app/api/v1/agency/recommendations/route.test.ts
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
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue([]),
    limit: vi.fn().mockResolvedValue([]),
  },
}));

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/supabase/db";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const AGENCY_ADMIN_USER = { id: "admin-uuid-001", email: "admin@agency.com" };
const BUYER_USER = { id: "buyer-uuid-001", email: "buyer@test.com" };
const AGENCY_ID = "agency-uuid-001";

const MOCK_RECOMMENDATION = {
  id: "rec-uuid-001",
  listingId: "listing-uuid-001",
  listingTitle: "Ático en Eixample",
  listingImage: ["https://example.com/img1.jpg"],
  recommendedExperimentType: "cover_image",
  reasonCode: "low_avg_view_time",
  reasonDetail: "Tiempo medio 800ms — 1.5σ por debajo del promedio (2100ms)",
  underperformingMetrics: {
    avg_view_time_ms: {
      value: 800,
      agency_avg: 2100,
      platform_avg: 1800,
      z_score: -1.5,
    },
    match_rate: {
      value: 0.03,
      agency_avg: 0.06,
      platform_avg: 0.05,
      z_score: -1.2,
    },
  },
  priorityScore: "78.50",
  status: "pending",
  createdAt: new Date("2026-06-22T06:00:00Z"),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockAuth(
  user: { id: string; email: string } | null,
  profile: { role: string; agencyId: string | null } | null,
) {
  const mockSupabase = {
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
            data: profile,
            error: profile ? null : { message: "Not found" },
          }),
        }),
      }),
    }),
  };

  (createClient as any).mockResolvedValue(mockSupabase);
  return mockSupabase;
}

function mockDbQuery(recommendations: unknown[]) {
  const mockOrderBy = vi.fn().mockResolvedValue(recommendations);
  const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
  const mockInnerJoin = vi.fn().mockReturnValue({ where: mockWhere });
  const mockFrom = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin });
  const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });
  (db as any).select = mockSelect;
}

function makeGetRequest() {
  return new Request(
    "http://localhost/api/v1/agency/recommendations",
  ) as any;
}

// ─── GET /api/v1/agency/recommendations (AC6) ───

describe("GET /api/v1/agency/recommendations (AC6)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("[P0] returns 401 when not authenticated", { timeout: 15_000 }, async () => {
    mockAuth(null, null);

    const { GET } = await import("./route");
    const res = await GET(makeGetRequest());

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(body.data).toBeNull();
  });

  it("[P0] returns 403 for non agency_admin", { timeout: 15_000 }, async () => {
    mockAuth(BUYER_USER, { role: "buyer", agencyId: null });

    const { GET } = await import("./route");
    const res = await GET(makeGetRequest());

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("[P0] returns 200 with pending recommendations for agency_admin", { timeout: 15_000 }, async () => {
    mockAuth(AGENCY_ADMIN_USER, {
      role: "agency_admin",
      agencyId: AGENCY_ID,
    });
    mockDbQuery([MOCK_RECOMMENDATION]);

    const { GET } = await import("./route");
    const res = await GET(makeGetRequest());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(body.error).toBeNull();
    expect(body.data.recommendations).toHaveLength(1);
  });

  it("[P0] extracts listingImageUrl from images array", { timeout: 15_000 }, async () => {
    mockAuth(AGENCY_ADMIN_USER, {
      role: "agency_admin",
      agencyId: AGENCY_ID,
    });
    mockDbQuery([MOCK_RECOMMENDATION]);

    const { GET } = await import("./route");
    const res = await GET(makeGetRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    const rec = body.data.recommendations[0];
    // The route extracts images[0] as listingImageUrl and removes listingImage
    expect(rec.listingImageUrl).toBe("https://example.com/img1.jpg");
    expect(rec.listingImage).toBeUndefined();
  });

  it("[P0] returns empty array when no pending recommendations", { timeout: 15_000 }, async () => {
    mockAuth(AGENCY_ADMIN_USER, {
      role: "agency_admin",
      agencyId: AGENCY_ID,
    });
    mockDbQuery([]);

    const { GET } = await import("./route");
    const res = await GET(makeGetRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.recommendations).toEqual([]);
    expect(body.error).toBeNull();
  });

  it("[P1] response follows ApiResponse<T> wrapper format", { timeout: 15_000 }, async () => {
    mockAuth(AGENCY_ADMIN_USER, {
      role: "agency_admin",
      agencyId: AGENCY_ID,
    });
    mockDbQuery([]);

    const { GET } = await import("./route");
    const res = await GET(makeGetRequest());
    const body = await res.json();

    expect(body).toHaveProperty("data");
    expect(body).toHaveProperty("error");
  });

  it("[P1] handles null listingImage gracefully", { timeout: 15_000 }, async () => {
    mockAuth(AGENCY_ADMIN_USER, {
      role: "agency_admin",
      agencyId: AGENCY_ID,
    });
    mockDbQuery([{ ...MOCK_RECOMMENDATION, listingImage: null }]);

    const { GET } = await import("./route");
    const res = await GET(makeGetRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    const rec = body.data.recommendations[0];
    expect(rec.listingImageUrl).toBeNull();
  });

  it("[P1] handles empty listingImage array", { timeout: 15_000 }, async () => {
    mockAuth(AGENCY_ADMIN_USER, {
      role: "agency_admin",
      agencyId: AGENCY_ID,
    });
    mockDbQuery([{ ...MOCK_RECOMMENDATION, listingImage: [] }]);

    const { GET } = await import("./route");
    const res = await GET(makeGetRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    const rec = body.data.recommendations[0];
    expect(rec.listingImageUrl).toBeNull();
  });
});
