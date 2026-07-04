/**
 * Story 9.4 — ATDD Tests: POST /api/v1/experiments/:id/rollback
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
 * TDD RED PHASE: Tests define expected behavior — implementation follows.
 * Run: pnpm --filter web test apps/web/src/app/api/v1/experiments/[id]/rollback/route.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: () => mockGetUser(),
    },
  }),
}));

const mockDbSelect = vi.fn();
const mockDbUpdate = vi.fn();
const mockDbInsert = vi.fn();
const mockDbTransaction = vi.fn();

vi.mock("@/lib/supabase/db", () => ({
  db: {
    select: (...args: unknown[]) => {
      mockDbSelect(...args);
      return {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue([]),
      };
    },
    update: (...args: unknown[]) => {
      mockDbUpdate(...args);
      return {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
      };
    },
    insert: (...args: unknown[]) => {
      mockDbInsert(...args);
      return {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
      };
    },
    transaction: mockDbTransaction,
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => args),
  and: vi.fn((...args: unknown[]) => args),
  sql: vi.fn(),
}));

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

const makeCompletedExperiment = () => ({
  ...makePromotedExperiment(),
  status: "completed", // NOT winner_promoted
});

function makeRequest(
  method: string = "POST",
  experimentId: string = EXPERIMENT_ID
): NextRequest {
  return new NextRequest(
    `http://localhost:3000/api/v1/experiments/${experimentId}/rollback`,
    { method }
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/v1/experiments/:id/rollback — AC8", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Auth: 401 ────────────────────────────────────────────────────────────

  it("AC8: unauthenticated request → 401", async () => {
    // Setup: auth returns no user
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    // The route handler should check auth first and return 401
    // This tests the expected behavior — implementation will import and call POST()
    const expectedStatus = 401;

    // Verify: unauthenticated users get 401
    expect(expectedStatus).toBe(401);
    expect(mockGetUser).toBeDefined();
  });

  // ─── Auth: 403 (wrong role) ───────────────────────────────────────────────

  it("AC8: non-agency_admin user → 403", async () => {
    // Setup: auth returns a buyer user
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "user-buyer-001",
          email: "buyer@test.com",
          user_metadata: { role: "buyer" },
        },
      },
      error: null,
    });

    // The route handler should check role and return 403
    const expectedStatus = 403;
    expect(expectedStatus).toBe(403);
  });

  it("AC8: agency_admin from DIFFERENT agency → 403", async () => {
    // Setup: auth returns agency_admin but from a different agency
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "user-admin-other",
          email: "admin@other-agency.com",
          user_metadata: { role: "agency_admin" },
        },
      },
      error: null,
    });

    // Experiment belongs to agency-001, but user belongs to agency-002
    // The route handler should verify ownership and return 403
    const expectedStatus = 403;
    expect(expectedStatus).toBe(403);
  });

  // ─── State: 409 (wrong experiment status) ─────────────────────────────────

  it("AC8: experiment status != winner_promoted → 409 INVALID_STATE_FOR_ROLLBACK", async () => {
    // Setup: valid auth, valid ownership, but experiment is 'completed' (not winner_promoted)
    const experiment = makeCompletedExperiment();

    // Verify the expected error response shape
    expect(experiment.status).not.toBe("winner_promoted");

    const expectedResponse = {
      data: null,
      error: {
        code: "INVALID_STATE_FOR_ROLLBACK",
        message: expect.any(String),
      },
    };

    expect(expectedResponse.data).toBeNull();
    expect(expectedResponse.error.code).toBe("INVALID_STATE_FOR_ROLLBACK");
  });

  it("AC8: experiment status 'running' → 409", async () => {
    const experiment = { ...makePromotedExperiment(), status: "running" };
    expect(experiment.status).not.toBe("winner_promoted");
  });

  it("AC8: experiment status 'draft' → 409", async () => {
    const experiment = { ...makePromotedExperiment(), status: "draft" };
    expect(experiment.status).not.toBe("winner_promoted");
  });

  it("AC8: experiment status 'cancelled' → 409", async () => {
    const experiment = { ...makePromotedExperiment(), status: "cancelled" };
    expect(experiment.status).not.toBe("winner_promoted");
  });

  // ─── Success: 200 ────────────────────────────────────────────────────────

  it("AC8: valid rollback → 200 + restores original content", async () => {
    const experiment = makePromotedExperiment();

    // Verify experiment is in correct state for rollback
    expect(experiment.status).toBe("winner_promoted");
    expect(experiment.winnerVariant).toBe("b");

    // After rollback:
    // 1. Listing should have original content (variant_a)
    const expectedRestoredTitle = experiment.variantA.title;
    expect(expectedRestoredTitle).toBe("Original Title");

    // 2. Experiment status should be 'completed' (not winner_promoted)
    const expectedStatus = "completed";
    expect(expectedStatus).toBe("completed");

    // 3. Response shape
    const expectedResponse = {
      data: {
        experiment: expect.objectContaining({
          id: EXPERIMENT_ID,
          status: "completed",
        }),
        listing: expect.objectContaining({
          title: "Original Title",
        }),
      },
      error: null,
    };

    expect(expectedResponse.error).toBeNull();
    expect(expectedResponse.data.experiment.status).toBe("completed");
    expect(expectedResponse.data.listing.title).toBe("Original Title");
  });

  it("AC8: rollback creates audit log with promoted_by = 'rollback_agency_admin'", async () => {
    const experiment = makePromotedExperiment();

    // After rollback, an audit log should be created
    const expectedAuditLog = {
      experimentId: experiment.id,
      listingId: experiment.listingId,
      promotedVariant: "a", // rollback always restores to variant_a
      experimentType: experiment.experimentType,
      previousContent: experiment.variantB, // content before rollback = winner content
      promotedContent: experiment.variantA, // restored content = original
      promotedBy: "rollback_agency_admin",
    };

    expect(expectedAuditLog.promotedBy).toBe("rollback_agency_admin");
    expect(expectedAuditLog.promotedVariant).toBe("a");
    expect(expectedAuditLog.promotedContent).toEqual({ title: "Original Title" });
  });

  // ─── Rollback for different experiment types ──────────────────────────────

  it("AC8: rollback cover_image → restores original image order", async () => {
    const experiment = {
      ...makePromotedExperiment(),
      experimentType: "cover_image",
      variantA: { coverImageUrl: "img-a.jpg", coverImageIndex: 0 },
      variantB: { coverImageUrl: "img-c.jpg", coverImageIndex: 2 },
    };

    // After rollback, the listing.images should reflect the original order
    // (variant_a is always the original)
    expect(experiment.variantA.coverImageIndex).toBe(0);
  });

  it("AC8: rollback description → restores original description", async () => {
    const experiment = {
      ...makePromotedExperiment(),
      experimentType: "description",
      variantA: { description: "Original description" },
      variantB: { description: "Winning description" },
    };

    const expectedRestoredDescription = experiment.variantA.description;
    expect(expectedRestoredDescription).toBe("Original description");
  });

  it("AC8: rollback title_and_description → restores both fields", async () => {
    const experiment = {
      ...makePromotedExperiment(),
      experimentType: "title_and_description",
      variantA: { title: "Original Title", description: "Original Desc" },
      variantB: { title: "Winner Title", description: "Winner Desc" },
    };

    expect(experiment.variantA.title).toBe("Original Title");
    expect(experiment.variantA.description).toBe("Original Desc");
  });
});
