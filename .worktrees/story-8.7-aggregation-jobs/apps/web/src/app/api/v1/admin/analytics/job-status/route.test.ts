/**
 * Story 8.7 — ATDD Tests: GET /api/v1/admin/analytics/job-status
 *
 * Tests cover:
 * - T8.7-06: Admin job-status API returns last run info
 * - T8.7-05: Alert when job > 3h stale
 * - Auth enforcement
 *
 * Run: pnpm --filter @reinder/web test -- "job-status"
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
  sql: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { GET } from "./route";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ADMIN_USER = { id: "admin-uuid-1", email: "admin@reinder.com" };

const makeSupabaseMock = (
  user: typeof ADMIN_USER | null,
  role: string = "platform_admin"
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

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/v1/admin/analytics/job-status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Auth ─────────────────────────────────────────────────────────────

  it("returns 401 when not authenticated", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock(null) as any);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 403 for non-admin role", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(ADMIN_USER, "buyer") as any
    );

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  // ─── T8.7-06: Returns job status ──────────────────────────────────────

  it("T8.7-06: returns job status with recent run info", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(ADMIN_USER) as any
    );

    const recentTime = new Date(Date.now() - 30 * 60 * 1000); // 30 min ago

    dbSelectFromMock
      .mockResolvedValueOnce([{ maxUpdatedAt: recentTime }]) // analytics
      .mockResolvedValueOnce([{ maxUpdatedAt: recentTime }]) // intent
      .mockResolvedValueOnce([{ count: 150 }])                // analytics count
      .mockResolvedValueOnce([{ count: 45 }]);                // intent count

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.isStale).toBe(false);
    expect(body.data.readModels.listingAnalyticsHourly.rowCount).toBe(150);
    expect(body.data.readModels.buyerIntentScores.rowCount).toBe(45);
    expect(body.data.alert).toBeUndefined(); // not stale → no alert
  });

  // ─── T8.7-05: Alert when stale ───────────────────────────────────────

  it("T8.7-05: returns stale alert when job > 3h old", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(ADMIN_USER) as any
    );

    const staleTime = new Date(Date.now() - 5 * 60 * 60 * 1000); // 5 hours ago

    dbSelectFromMock
      .mockResolvedValueOnce([{ maxUpdatedAt: staleTime }])
      .mockResolvedValueOnce([{ maxUpdatedAt: staleTime }])
      .mockResolvedValueOnce([{ count: 100 }])
      .mockResolvedValueOnce([{ count: 30 }]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.isStale).toBe(true);
    expect(body.data.alert).toBeDefined();
    expect(body.data.alert.level).toBe("warning");
    expect(body.data.alert.message).toContain("stale");
  });

  it("returns stale alert when no data exists", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(ADMIN_USER) as any
    );

    dbSelectFromMock
      .mockResolvedValueOnce([{ maxUpdatedAt: null }])
      .mockResolvedValueOnce([{ maxUpdatedAt: null }])
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([{ count: 0 }]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.isStale).toBe(true);
    expect(body.data.alert.message).toContain("never run");
  });
});
