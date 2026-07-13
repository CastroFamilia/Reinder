/**
 * Story 9.5 — ATDD Tests: Recommendations API
 *
 * AC6: GET /api/v1/agency/recommendations
 *   - Returns pending recommendations sorted by priority_score DESC
 *   - Only agency_admin can access (403 for others)
 *   - JOIN with listings for title + image
 *
 * AC7: PATCH /api/v1/agency/recommendations/:id
 *   - Dismiss → status = dismissed
 *   - Accept + experimentId → status = accepted, accepted_experiment_id linked
 *   - 409 when recommendation is not pending
 *   - Validates ownership (agency_admin can only patch own agency's recommendations)
 *
 * Test Design IDs: T9.5-14, T9.5-15, T9.5-16, T9.5-17, T9.5-18
 *
 * TDD RED PHASE: Tests will fail until API routes are implemented.
 *
 * Run: pnpm --filter @reinder/web test apps/web/src/app/api/v1/agency/recommendations
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: () => mockGetUser(),
    },
    from: (...args: unknown[]) => {
      mockFrom(...args);
      return {
        select: (...sArgs: unknown[]) => {
          mockSelect(...sArgs);
          return {
            eq: (...eArgs: unknown[]) => {
              mockEq(...eArgs);
              return {
                single: () => mockSingle(),
              };
            },
          };
        },
      };
    },
  }),
}));

vi.mock("@/lib/supabase/db", () => {
  const defaultSelectChain = () => ({
    from: vi.fn().mockReturnValue({
      innerJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([]),
        }),
      }),
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
      }),
    }),
  });

  const defaultUpdateChain = () => ({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
  });

  return {
    db: {
      select: vi.fn().mockImplementation(() => defaultSelectChain()),
      update: vi.fn().mockImplementation(() => defaultUpdateChain()),
    },
  };
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const AGENCY_ADMIN_USER = { id: "admin-uuid-001", email: "admin@agency.com" };
const BUYER_USER = { id: "buyer-uuid-001", email: "buyer@test.com" };
const AGENT_USER = { id: "agent-uuid-001", email: "agent@test.com" };

const MOCK_RECOMMENDATIONS = [
  {
    id: "rec-uuid-001",
    listingId: "listing-uuid-001",
    listingTitle: "Piso en Malasaña",
    listingImage: ["https://example.com/photo1.jpg", "https://example.com/photo2.jpg"],
    recommendedExperimentType: "cover_image",
    reasonCode: "low_avg_view_time",
    reasonDetail: "Tiempo medio 1200ms — 2.1σ por debajo del promedio (4500ms)",
    underperformingMetrics: {
      match_rate: { value: 0.02, agency_avg: 0.065, platform_avg: 0.055, z_score: -2.25 },
      avg_view_time_ms: { value: 1200, agency_avg: 4500, platform_avg: 4000, z_score: -2.75 },
    },
    priorityScore: "85.50",
    status: "pending",
    createdAt: "2026-06-22T10:00:00Z",
  },
  {
    id: "rec-uuid-002",
    listingId: "listing-uuid-002",
    listingTitle: "Ático en Chamberí",
    listingImage: ["https://example.com/photo3.jpg"],
    recommendedExperimentType: "title",
    reasonCode: "low_match_rate",
    reasonDetail: "Match rate 1.5% — 1.9σ por debajo del promedio (6.5%)",
    underperformingMetrics: {
      match_rate: { value: 0.015, agency_avg: 0.065, platform_avg: 0.055, z_score: -2.5 },
    },
    priorityScore: "72.30",
    status: "pending",
    createdAt: "2026-06-22T10:05:00Z",
  },
];

// ─── Helper functions ─────────────────────────────────────────────────────────

function setupAuth(
  user: { id: string; email: string } | null,
  role?: string,
  agencyId?: string
) {
  if (user) {
    mockGetUser.mockResolvedValue({ data: { user }, error: null });
  } else {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });
  }

  if (role) {
    mockSingle.mockResolvedValue({
      data: { role, agencyId: agencyId || "agency-uuid-001" },
      error: null,
    });
  }
}

function makeGetRequest() {
  return new Request("http://localhost:3000/api/v1/agency/recommendations", {
    method: "GET",
  });
}

function makePatchRequest(id: string, body: object) {
  return new Request(
    `http://localhost:3000/api/v1/agency/recommendations/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

// ─── Tests: GET /api/v1/agency/recommendations (AC6) ────────────────────────

describe("GET /api/v1/agency/recommendations — AC6", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── T9.5-14: Returns pending recommendations sorted by priority_score DESC ───

  it("[P0] T9.5-14: returns pending recommendations sorted by priority_score DESC", { timeout: 15_000 }, async () => {
    setupAuth(AGENCY_ADMIN_USER, "agency_admin", "agency-uuid-001");

    const { db } = await import("@/lib/supabase/db");
    // Mock the full query chain to return recommendations
    vi.mocked(db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(MOCK_RECOMMENDATIONS),
          }),
        }),
      }),
    });

    const { GET } = await import(
      "@/app/api/v1/agency/recommendations/route"
    );
    const req = makeGetRequest();
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.recommendations).toBeDefined();
    expect(Array.isArray(body.data.recommendations)).toBe(true);
    expect(body.data.recommendations.length).toBeGreaterThanOrEqual(1);

    // Verify sorted by priority_score DESC
    if (body.data.recommendations.length >= 2) {
      const scores = body.data.recommendations.map(
        (r: any) => parseFloat(r.priorityScore)
      );
      for (let i = 0; i < scores.length - 1; i++) {
        expect(scores[i]).toBeGreaterThanOrEqual(scores[i + 1]);
      }
    }
  });

  // ─── T9.5-14b: Each recommendation includes listing info from JOIN ───

  it("[P0] T9.5-14b: each recommendation includes listing title and image from JOIN", async () => {
    setupAuth(AGENCY_ADMIN_USER, "agency_admin", "agency-uuid-001");

    const { db } = await import("@/lib/supabase/db");
    vi.mocked(db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(MOCK_RECOMMENDATIONS),
          }),
        }),
      }),
    });

    const { GET } = await import(
      "@/app/api/v1/agency/recommendations/route"
    );
    const res = await GET(makeGetRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    const rec = body.data.recommendations[0];
    expect(rec).toHaveProperty("listingTitle");
    expect(rec).toHaveProperty("recommendedExperimentType");
    expect(rec).toHaveProperty("reasonDetail");
    expect(rec).toHaveProperty("priorityScore");
    expect(rec).toHaveProperty("status");
    // AC6: listing info comes from JOIN — verify thumbnail extraction
    expect(rec).toHaveProperty("listingImageUrl");
    // listingImage raw array should be removed from response
    expect(rec.listingImage).toBeUndefined();
  });

  // ─── T9.5-15: Non-agency_admin → 403 ───

  it("[P0] T9.5-15: returns 403 when user role is buyer", async () => {
    setupAuth(BUYER_USER, "buyer");

    const { GET } = await import(
      "@/app/api/v1/agency/recommendations/route"
    );
    const res = await GET(makeGetRequest());

    expect(res.status).toBe(403);
  });

  it("[P0] T9.5-15b: returns 403 when user role is agent", async () => {
    setupAuth(AGENT_USER, "agent");

    const { GET } = await import(
      "@/app/api/v1/agency/recommendations/route"
    );
    const res = await GET(makeGetRequest());

    expect(res.status).toBe(403);
  });

  // ─── T9.5-15c: Unauthenticated → 401 ───

  it("[P0] T9.5-15c: returns 401 when user is not authenticated", async () => {
    setupAuth(null);

    const { GET } = await import(
      "@/app/api/v1/agency/recommendations/route"
    );
    const res = await GET(makeGetRequest());
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  // ─── T9.5-14c: Returns empty array when no pending recommendations ───

  it("[P1] T9.5-14c: returns empty recommendations array when none pending", async () => {
    setupAuth(AGENCY_ADMIN_USER, "agency_admin", "agency-uuid-001");

    const { db } = await import("@/lib/supabase/db");
    vi.mocked(db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    });

    const { GET } = await import(
      "@/app/api/v1/agency/recommendations/route"
    );
    const res = await GET(makeGetRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.recommendations).toEqual([]);
  });

  // ─── T9.5-14d: Response follows ApiResponse wrapper format ───

  it("[P1] T9.5-14d: response follows ApiResponse<T> wrapper format", async () => {
    setupAuth(AGENCY_ADMIN_USER, "agency_admin", "agency-uuid-001");

    const { db } = await import("@/lib/supabase/db");
    vi.mocked(db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    });

    const { GET } = await import(
      "@/app/api/v1/agency/recommendations/route"
    );
    const res = await GET(makeGetRequest());
    const body = await res.json();

    // ApiResponse<T> format: { data: T | null, error: ErrorObject | null }
    expect(body).toHaveProperty("data");
    expect(body).toHaveProperty("error");
  });
});

// ─── Tests: PATCH /api/v1/agency/recommendations/:id (AC7) ─────────────────

describe("PATCH /api/v1/agency/recommendations/:id — AC7", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── T9.5-16: Dismiss → status = dismissed ───

  it("[P1] T9.5-16: updates recommendation to 'dismissed' when action is 'dismiss'", async () => {
    setupAuth(AGENCY_ADMIN_USER, "agency_admin", "agency-uuid-001");

    const recId = "rec-uuid-001";
    const { db } = await import("@/lib/supabase/db");

    // Mock: recommendation exists, is pending, belongs to user's agency
    vi.mocked(db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              id: recId,
              agencyId: "agency-uuid-001",
              status: "pending",
            },
          ]),
        }),
      }),
    });

    vi.mocked(db.update as any).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: recId,
              status: "dismissed",
              agencyId: "agency-uuid-001",
            },
          ]),
        }),
      }),
    });

    const { PATCH } = await import(
      "@/app/api/v1/agency/recommendations/[id]/route"
    );
    const req = makePatchRequest(recId, { action: "dismiss" });
    const res = await PATCH(req, { params: { id: recId } });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.recommendation.status).toBe("dismissed");
  });

  // ─── T9.5-17: Accept + experimentId → status = accepted ───

  it("[P1] T9.5-17: updates recommendation to 'accepted' and links experimentId when action is 'accept'", async () => {
    setupAuth(AGENCY_ADMIN_USER, "agency_admin", "agency-uuid-001");

    const recId = "rec-uuid-002";
    const experimentId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    const { db } = await import("@/lib/supabase/db");

    vi.mocked(db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              id: recId,
              agencyId: "agency-uuid-001",
              status: "pending",
            },
          ]),
        }),
      }),
    });

    vi.mocked(db.update as any).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: recId,
              status: "accepted",
              acceptedExperimentId: experimentId,
              agencyId: "agency-uuid-001",
            },
          ]),
        }),
      }),
    });

    const { PATCH } = await import(
      "@/app/api/v1/agency/recommendations/[id]/route"
    );
    const req = makePatchRequest(recId, {
      action: "accept",
      experimentId,
    });
    const res = await PATCH(req, { params: { id: recId } });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.recommendation.status).toBe("accepted");
    expect(body.data.recommendation.acceptedExperimentId).toBe(experimentId);
  });

  // ─── T9.5-17b: Accept without experimentId → 400 ───

  it("[P1] T9.5-17b: returns 400 when action is 'accept' but experimentId is missing", async () => {
    setupAuth(AGENCY_ADMIN_USER, "agency_admin", "agency-uuid-001");

    const { PATCH } = await import(
      "@/app/api/v1/agency/recommendations/[id]/route"
    );
    const req = makePatchRequest("rec-uuid-001", { action: "accept" }); // No experimentId
    const res = await PATCH(req, { params: { id: "rec-uuid-001" } });

    expect(res.status).toBe(400);
  });

  // ─── T9.5-10 (AC7): PATCH on non-pending recommendation → 409 ───

  it("[P0] T9.5-10: returns 409 RECOMMENDATION_NOT_PENDING when recommendation is not pending", async () => {
    setupAuth(AGENCY_ADMIN_USER, "agency_admin", "agency-uuid-001");

    const recId = "rec-uuid-dismissed";
    const { db } = await import("@/lib/supabase/db");

    vi.mocked(db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              id: recId,
              agencyId: "agency-uuid-001",
              status: "dismissed", // Not pending!
            },
          ]),
        }),
      }),
    });

    const { PATCH } = await import(
      "@/app/api/v1/agency/recommendations/[id]/route"
    );
    const req = makePatchRequest(recId, { action: "dismiss" });
    const res = await PATCH(req, { params: { id: recId } });
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error.code).toBe("RECOMMENDATION_NOT_PENDING");
  });

  // ─── T9.5-10b: PATCH on expired recommendation → 409 ───

  it("[P1] T9.5-10b: returns 409 when recommendation status is 'expired'", async () => {
    setupAuth(AGENCY_ADMIN_USER, "agency_admin", "agency-uuid-001");

    const recId = "rec-uuid-expired";
    const { db } = await import("@/lib/supabase/db");

    vi.mocked(db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              id: recId,
              agencyId: "agency-uuid-001",
              status: "expired",
            },
          ]),
        }),
      }),
    });

    const { PATCH } = await import(
      "@/app/api/v1/agency/recommendations/[id]/route"
    );
    const req = makePatchRequest(recId, { action: "dismiss" });
    const res = await PATCH(req, { params: { id: recId } });

    expect(res.status).toBe(409);
  });

  // ─── T9.5-10c: PATCH on already-accepted recommendation → 409 ───

  it("[P1] T9.5-10c: returns 409 when recommendation status is 'accepted'", async () => {
    setupAuth(AGENCY_ADMIN_USER, "agency_admin", "agency-uuid-001");

    const recId = "rec-uuid-accepted";
    const { db } = await import("@/lib/supabase/db");

    vi.mocked(db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              id: recId,
              agencyId: "agency-uuid-001",
              status: "accepted",
            },
          ]),
        }),
      }),
    });

    const { PATCH } = await import(
      "@/app/api/v1/agency/recommendations/[id]/route"
    );
    const req = makePatchRequest(recId, { action: "dismiss" });
    const res = await PATCH(req, { params: { id: recId } });

    expect(res.status).toBe(409);
  });

  // ─── T9.5-18: Agency admin can only patch own agency's recommendations ───

  it("[P0] T9.5-18: returns 404 when recommendation belongs to a different agency", async () => {
    setupAuth(AGENCY_ADMIN_USER, "agency_admin", "agency-uuid-001");

    const recId = "rec-uuid-other-agency";
    const { db } = await import("@/lib/supabase/db");

    // Recommendation belongs to a different agency
    vi.mocked(db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              id: recId,
              agencyId: "other-agency-uuid", // Different agency!
              status: "pending",
            },
          ]),
        }),
      }),
    });

    const { PATCH } = await import(
      "@/app/api/v1/agency/recommendations/[id]/route"
    );
    const req = makePatchRequest(recId, { action: "dismiss" });
    const res = await PATCH(req, { params: { id: recId } });

    // Implementation returns 404 to avoid leaking info about other agencies' recommendations
    expect(res.status).toBe(404);
  });

  // ─── PATCH: Invalid action → 400 ───

  it("[P1] T9.5-16b: returns 400 when action is invalid", async () => {
    setupAuth(AGENCY_ADMIN_USER, "agency_admin", "agency-uuid-001");

    const { PATCH } = await import(
      "@/app/api/v1/agency/recommendations/[id]/route"
    );
    const req = makePatchRequest("rec-uuid-001", { action: "invalid_action" });
    const res = await PATCH(req, { params: { id: "rec-uuid-001" } });

    expect(res.status).toBe(400);
  });

  // ─── PATCH: Unauthenticated → 401 ───

  it("[P0] PATCH: returns 401 when user is not authenticated", async () => {
    setupAuth(null);

    const { PATCH } = await import(
      "@/app/api/v1/agency/recommendations/[id]/route"
    );
    const req = makePatchRequest("rec-uuid-001", { action: "dismiss" });
    const res = await PATCH(req, { params: { id: "rec-uuid-001" } });

    expect(res.status).toBe(401);
  });

  // ─── PATCH: Non-agency_admin → 403 ───

  it("[P0] PATCH: returns 403 when user role is buyer", async () => {
    setupAuth(BUYER_USER, "buyer");

    const { PATCH } = await import(
      "@/app/api/v1/agency/recommendations/[id]/route"
    );
    const req = makePatchRequest("rec-uuid-001", { action: "dismiss" });
    const res = await PATCH(req, { params: { id: "rec-uuid-001" } });

    expect(res.status).toBe(403);
  });

  // ─── PATCH: Recommendation not found → 404 ───

  it("[P0] PATCH: returns 404 when recommendation does not exist", async () => {
    setupAuth(AGENCY_ADMIN_USER, "agency_admin", "agency-uuid-001");

    const { db } = await import("@/lib/supabase/db");

    // Recommendation lookup returns empty array
    vi.mocked(db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    const { PATCH } = await import(
      "@/app/api/v1/agency/recommendations/[id]/route"
    );
    const req = makePatchRequest("non-existent-uuid", { action: "dismiss" });
    const res = await PATCH(req, { params: { id: "non-existent-uuid" } });

    expect(res.status).toBe(404);
  });
});
