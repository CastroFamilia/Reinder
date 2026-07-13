/**
 * Story 9.5 — Tests: PATCH /api/v1/agency/recommendations/:id
 *
 * AC7: Dismiss and accept recommendations
 *
 * Tests: T9.5-16, T9.5-17, T9.5-18 per test-design-epic-9
 *
 * Run: pnpm --filter @reinder/web test apps/web/src/app/api/v1/agency/recommendations/[id]/route.test.ts
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
    returning: vi.fn().mockResolvedValue([]),
  },
}));

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/supabase/db";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const AGENCY_ADMIN_USER = { id: "admin-uuid-001", email: "admin@agency.com" };
const BUYER_USER = { id: "buyer-uuid-001", email: "buyer@test.com" };
const AGENCY_ID = "agency-uuid-001";

const PENDING_RECOMMENDATION = {
  id: "rec-uuid-001",
  agencyId: AGENCY_ID,
  listingId: "listing-uuid-001",
  recommendedExperimentType: "cover_image",
  reasonCode: "low_avg_view_time",
  reasonDetail: "Tiempo medio 800ms — 1.5σ por debajo del promedio (2100ms)",
  priorityScore: "78.50",
  status: "pending",
  acceptedExperimentId: null,
  weekGenerated: "2026-W25",
  createdAt: new Date("2026-06-22T06:00:00Z"),
  updatedAt: new Date("2026-06-22T06:00:00Z"),
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

function mockDbRecommendation(rec: Record<string, unknown> | null) {
  const mockLimit = vi.fn().mockResolvedValue(rec ? [rec] : []);
  const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
  const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
  const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });
  (db as any).select = mockSelect;
}

function mockDbUpdate(updatedRec: Record<string, unknown>) {
  const mockReturning = vi.fn().mockResolvedValue([updatedRec]);
  const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
  const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
  const mockFrom = vi.fn().mockReturnValue({ set: mockSet });
  (db as any).update = vi.fn().mockReturnValue({ set: mockSet });
  // Still need select for the recommendation lookup
  return { mockSet, mockReturning };
}

function makePatchRequest(id: string, body: object) {
  return new Request(
    `http://localhost:3000/api/v1/agency/recommendations/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  ) as any;
}

// ─── AC7: PATCH dismiss ──────────────────────────────────────────────────────

describe("PATCH /api/v1/agency/recommendations/:id — Dismiss (AC7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("[P1] T9.5-16: dismiss action sets status to 'dismissed'", { timeout: 15_000 }, async () => {
    mockAuth(AGENCY_ADMIN_USER, { role: "agency_admin", agencyId: AGENCY_ID });
    mockDbRecommendation(PENDING_RECOMMENDATION);
    mockDbUpdate({ ...PENDING_RECOMMENDATION, status: "dismissed" });

    const { PATCH } = await import("./route");
    const req = makePatchRequest("rec-uuid-001", { action: "dismiss" });
    const res = await PATCH(req, { params: { id: "rec-uuid-001" } });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.recommendation.status).toBe("dismissed");
  });

  it("[P1] T9.5-16b: dismiss does NOT set acceptedExperimentId", { timeout: 15_000 }, async () => {
    mockAuth(AGENCY_ADMIN_USER, { role: "agency_admin", agencyId: AGENCY_ID });
    mockDbRecommendation(PENDING_RECOMMENDATION);
    mockDbUpdate({
      ...PENDING_RECOMMENDATION,
      status: "dismissed",
      acceptedExperimentId: null,
    });

    const { PATCH } = await import("./route");
    const req = makePatchRequest("rec-uuid-001", { action: "dismiss" });
    const res = await PATCH(req, { params: { id: "rec-uuid-001" } });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.recommendation.acceptedExperimentId).toBeNull();
  });
});

// ─── AC7: PATCH accept ───────────────────────────────────────────────────────

describe("PATCH /api/v1/agency/recommendations/:id — Accept (AC7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("[P1] T9.5-17: accept action sets status to 'accepted' and links experimentId", { timeout: 15_000 }, async () => {
    const experimentId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    mockAuth(AGENCY_ADMIN_USER, { role: "agency_admin", agencyId: AGENCY_ID });
    mockDbRecommendation(PENDING_RECOMMENDATION);
    mockDbUpdate({
      ...PENDING_RECOMMENDATION,
      status: "accepted",
      acceptedExperimentId: experimentId,
    });

    const { PATCH } = await import("./route");
    const req = makePatchRequest("rec-uuid-001", {
      action: "accept",
      experimentId,
    });
    const res = await PATCH(req, { params: { id: "rec-uuid-001" } });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.recommendation.status).toBe("accepted");
    expect(body.data.recommendation.acceptedExperimentId).toBe(experimentId);
  });

  it("[P1] T9.5-17b: accept without experimentId returns 400", { timeout: 15_000 }, async () => {
    mockAuth(AGENCY_ADMIN_USER, { role: "agency_admin", agencyId: AGENCY_ID });

    const { PATCH } = await import("./route");
    const req = makePatchRequest("rec-uuid-001", { action: "accept" });
    const res = await PATCH(req, { params: { id: "rec-uuid-001" } });

    expect(res.status).toBe(400);
  });

  it("[P1] T9.5-17c: accept with non-UUID experimentId returns 400", { timeout: 15_000 }, async () => {
    mockAuth(AGENCY_ADMIN_USER, { role: "agency_admin", agencyId: AGENCY_ID });

    const { PATCH } = await import("./route");
    const req = makePatchRequest("rec-uuid-001", {
      action: "accept",
      experimentId: "not-a-uuid",
    });
    const res = await PATCH(req, { params: { id: "rec-uuid-001" } });

    expect(res.status).toBe(400);
  });
});

// ─── AC7: Non-pending → 409 ──────────────────────────────────────────────────

describe("PATCH /api/v1/agency/recommendations/:id — Conflict (AC7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("[P0] T9.5-18-conflict: returns 409 RECOMMENDATION_NOT_PENDING for dismissed recommendation", { timeout: 15_000 }, async () => {
    mockAuth(AGENCY_ADMIN_USER, { role: "agency_admin", agencyId: AGENCY_ID });
    mockDbRecommendation({ ...PENDING_RECOMMENDATION, status: "dismissed" });

    const { PATCH } = await import("./route");
    const req = makePatchRequest("rec-uuid-001", { action: "dismiss" });
    const res = await PATCH(req, { params: { id: "rec-uuid-001" } });
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error.code).toBe("RECOMMENDATION_NOT_PENDING");
  });

  it("[P0] T9.5-18b-conflict: returns 409 for already accepted recommendation", { timeout: 15_000 }, async () => {
    mockAuth(AGENCY_ADMIN_USER, { role: "agency_admin", agencyId: AGENCY_ID });
    mockDbRecommendation({
      ...PENDING_RECOMMENDATION,
      status: "accepted",
      acceptedExperimentId: "exp-uuid-001",
    });

    const { PATCH } = await import("./route");
    const req = makePatchRequest("rec-uuid-001", { action: "dismiss" });
    const res = await PATCH(req, { params: { id: "rec-uuid-001" } });

    expect(res.status).toBe(409);
  });

  it("[P0] T9.5-18c-conflict: returns 409 for expired recommendation", { timeout: 15_000 }, async () => {
    mockAuth(AGENCY_ADMIN_USER, { role: "agency_admin", agencyId: AGENCY_ID });
    mockDbRecommendation({ ...PENDING_RECOMMENDATION, status: "expired" });

    const { PATCH } = await import("./route");
    const req = makePatchRequest("rec-uuid-001", { action: "dismiss" });
    const res = await PATCH(req, { params: { id: "rec-uuid-001" } });

    expect(res.status).toBe(409);
  });
});

// ─── Auth guards ──────────────────────────────────────────────────────────────

describe("PATCH /api/v1/agency/recommendations/:id — Auth Guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("[P0] returns 401 when not authenticated", { timeout: 15_000 }, async () => {
    mockAuth(null, null);

    const { PATCH } = await import("./route");
    const req = makePatchRequest("rec-uuid-001", { action: "dismiss" });
    const res = await PATCH(req, { params: { id: "rec-uuid-001" } });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("[P0] returns 403 for non agency_admin role", { timeout: 15_000 }, async () => {
    mockAuth(BUYER_USER, { role: "buyer", agencyId: null });

    const { PATCH } = await import("./route");
    const req = makePatchRequest("rec-uuid-001", { action: "dismiss" });
    const res = await PATCH(req, { params: { id: "rec-uuid-001" } });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("[P0] returns 404 if recommendation belongs to different agency", { timeout: 15_000 }, async () => {
    mockAuth(AGENCY_ADMIN_USER, { role: "agency_admin", agencyId: AGENCY_ID });
    mockDbRecommendation({
      ...PENDING_RECOMMENDATION,
      agencyId: "other-agency-uuid",
    });

    const { PATCH } = await import("./route");
    const req = makePatchRequest("rec-uuid-001", { action: "dismiss" });
    const res = await PATCH(req, { params: { id: "rec-uuid-001" } });

    expect(res.status).toBe(404);
  });

  it("[P0] returns 404 when recommendation does not exist", { timeout: 15_000 }, async () => {
    mockAuth(AGENCY_ADMIN_USER, { role: "agency_admin", agencyId: AGENCY_ID });
    mockDbRecommendation(null);

    const { PATCH } = await import("./route");
    const req = makePatchRequest("non-existent-uuid", { action: "dismiss" });
    const res = await PATCH(req, { params: { id: "non-existent-uuid" } });

    expect(res.status).toBe(404);
  });
});

// ─── Body validation ──────────────────────────────────────────────────────────

describe("PATCH body validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("[P1] rejects invalid action value", { timeout: 15_000 }, async () => {
    mockAuth(AGENCY_ADMIN_USER, { role: "agency_admin", agencyId: AGENCY_ID });

    const { PATCH } = await import("./route");
    const req = makePatchRequest("rec-uuid-001", { action: "delete" });
    const res = await PATCH(req, { params: { id: "rec-uuid-001" } });

    expect(res.status).toBe(400);
  });

  it("[P1] rejects empty body", { timeout: 15_000 }, async () => {
    mockAuth(AGENCY_ADMIN_USER, { role: "agency_admin", agencyId: AGENCY_ID });

    const { PATCH } = await import("./route");
    const req = makePatchRequest("rec-uuid-001", {});
    const res = await PATCH(req, { params: { id: "rec-uuid-001" } });

    expect(res.status).toBe(400);
  });
});
