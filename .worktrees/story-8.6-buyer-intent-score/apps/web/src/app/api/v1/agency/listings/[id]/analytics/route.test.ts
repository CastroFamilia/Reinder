/**
 * Story 8.5 — ATDD Tests: GET /api/v1/agency/listings/{id}/analytics
 *
 * Tests cover:
 * - T8.5-01: Returns aggregated analytics for agency listing
 * - T8.5-02: Insufficient data message when < 10 views
 * - T8.5-03: 401 for unauthenticated
 * - T8.5-04: 403 for non-agency_admin roles
 * - T8.5-05: Photo engagement ranking sorted by avg duration
 *
 * Run: pnpm --filter @reinder/web test -- "agency/listings"
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const dbSelectFromMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/db", () => ({
  db: {
    select: vi.fn().mockImplementation(() => ({
      from: dbSelectFromMock,
    })),
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  and: vi.fn(),
  gte: vi.fn(),
  sql: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { GET } from "./route";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const AGENCY_ADMIN = { id: "admin-uuid-1", email: "admin@agency.com" };
const LISTING_ID = "listing-uuid-1";

const makeSupabaseMock = (
  user: typeof AGENCY_ADMIN | null,
  role: string = "agency_admin"
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

const makeRequest = (period?: string) => {
  const url = `http://localhost:3000/api/v1/agency/listings/${LISTING_ID}/analytics${
    period ? `?period=${period}` : ""
  }`;
  return new Request(url, { method: "GET" });
};

const makeParams = (id: string) => ({
  params: Promise.resolve({ id }),
});

// Sample analytics rows
const sampleAnalyticsRows = [
  {
    id: "a-1",
    listingId: LISTING_ID,
    bucketHour: new Date("2026-05-17T10:00:00Z"),
    totalViews: 15,
    avgPhotoViewMs: 2500,
    avgScrollDepthPct: 60,
    matchCount: 3,
    rejectCount: 5,
    reaffirmCount: 1,
    photoEngagement: [
      { photo_index: 0, avg_duration_ms: 3000, view_count: 10 },
      { photo_index: 1, avg_duration_ms: 1500, view_count: 8 },
    ],
    updatedAt: new Date(),
  },
  {
    id: "a-2",
    listingId: LISTING_ID,
    bucketHour: new Date("2026-05-17T11:00:00Z"),
    totalViews: 10,
    avgPhotoViewMs: 2000,
    avgScrollDepthPct: 40,
    matchCount: 2,
    rejectCount: 4,
    reaffirmCount: 1,
    photoEngagement: [
      { photo_index: 0, avg_duration_ms: 2500, view_count: 5 },
      { photo_index: 2, avg_duration_ms: 4000, view_count: 3 },
    ],
    updatedAt: new Date(),
  },
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/v1/agency/listings/{id}/analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── T8.5-03: 401 for unauthenticated ────────────────────────────────

  it("T8.5-03: returns 401 when not authenticated", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock(null) as any);

    const res = await GET(makeRequest(), makeParams(LISTING_ID));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  // ─── T8.5-04: 403 for non-agency_admin ────────────────────────────────

  it("T8.5-04: returns 403 for buyer role", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock(AGENCY_ADMIN, "buyer") as any);

    const res = await GET(makeRequest(), makeParams(LISTING_ID));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("T8.5-04b: returns 403 for agent role", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock(AGENCY_ADMIN, "agent") as any);

    const res = await GET(makeRequest(), makeParams(LISTING_ID));
    const body = await res.json();

    expect(res.status).toBe(403);
  });

  // ─── T8.5-01: Returns aggregated analytics ───────────────────────────

  it("T8.5-01: returns aggregated analytics for a listing", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock(AGENCY_ADMIN) as any);

    // First call: listing lookup → found
    // Second call: analytics rows
    const whereMock = vi.fn()
      .mockReturnValueOnce({ limit: vi.fn().mockResolvedValue([{ id: LISTING_ID, agencyId: "agency-1" }]) })
      .mockResolvedValueOnce(sampleAnalyticsRows);

    dbSelectFromMock.mockReturnValue({ where: whereMock });

    const res = await GET(makeRequest("30"), makeParams(LISTING_ID));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.listingId).toBe(LISTING_ID);
    expect(body.data.insufficientData).toBe(false);
    expect(body.data.metrics.totalViews).toBe(25); // 15 + 10
    expect(body.data.metrics.totalMatches).toBe(5); // 3 + 2
    expect(body.data.metrics.totalRejects).toBe(9); // 5 + 4
    expect(body.data.metrics.totalReaffirms).toBe(2); // 1 + 1
  });

  // ─── T8.5-02: Insufficient data message ──────────────────────────────

  it("T8.5-02: returns insufficientData when views < 10", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock(AGENCY_ADMIN) as any);

    const lowViewsRows = [
      {
        ...sampleAnalyticsRows[0],
        totalViews: 3,
        matchCount: 1,
        rejectCount: 1,
        reaffirmCount: 0,
        photoEngagement: [],
      },
    ];

    const whereMock = vi.fn()
      .mockReturnValueOnce({ limit: vi.fn().mockResolvedValue([{ id: LISTING_ID }]) })
      .mockResolvedValueOnce(lowViewsRows);

    dbSelectFromMock.mockReturnValue({ where: whereMock });

    const res = await GET(makeRequest(), makeParams(LISTING_ID));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.insufficientData).toBe(true);
    expect(body.data.message).toContain("insuficientes");
  });

  // ─── T8.5-05: Photo ranking sorted by avg duration ───────────────────

  it("T8.5-05: returns photo ranking sorted by avg duration desc", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock(AGENCY_ADMIN) as any);

    const whereMock = vi.fn()
      .mockReturnValueOnce({ limit: vi.fn().mockResolvedValue([{ id: LISTING_ID }]) })
      .mockResolvedValueOnce(sampleAnalyticsRows);

    dbSelectFromMock.mockReturnValue({ where: whereMock });

    const res = await GET(makeRequest(), makeParams(LISTING_ID));
    const body = await res.json();

    const ranking = body.data.photoRanking;
    expect(ranking.length).toBeGreaterThan(0);
    // Should be sorted by avg_duration_ms descending
    for (let i = 1; i < ranking.length; i++) {
      expect(ranking[i - 1].avg_duration_ms).toBeGreaterThanOrEqual(ranking[i].avg_duration_ms);
    }
  });

  // ─── Listing not found ────────────────────────────────────────────────

  it("returns 404 when listing does not exist", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock(AGENCY_ADMIN) as any);

    const whereMock = vi.fn()
      .mockReturnValueOnce({ limit: vi.fn().mockResolvedValue([]) });

    dbSelectFromMock.mockReturnValue({ where: whereMock });

    const res = await GET(makeRequest(), makeParams("nonexistent"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });
});
