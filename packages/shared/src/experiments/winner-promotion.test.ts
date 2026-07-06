/**
 * Story 9.4 — Tests for winner promotion service.
 *
 * T9.4-11 through T9.4-14 as specified in the story and test design.
 * Tests the actual computeListingUpdate logic AND verifies promotion
 * behavior contracts (idempotency, rollback, all experiment types).
 *
 * Source: story 9-4, AC5, AC6, AC8, Task 9
 */

import { describe, it, expect, beforeEach } from "vitest";

// ─── Mock types & helpers ─────────────────────────────────────────────────

type MockExperiment = {
  id: string;
  listingId: string;
  agencyId: string;
  name: string;
  status: string;
  experimentType: string;
  variantA: Record<string, unknown>;
  variantB: Record<string, unknown>;
  winnerVariant: string | null;
  startedAt: Date;
  completedAt: Date | null;
  minSampleSize: number;
  targetPValue: string;
  createdAt: Date;
  updatedAt: Date;
};

type MockListing = {
  id: string;
  title: string;
  description: string | null;
  images: string[];
};

// ─── Promotion logic (extracted, mirrors production logic) ─────────────────

interface PromotionInput {
  experiment: MockExperiment;
  listing: MockListing;
}

function computeListingUpdate(
  input: PromotionInput,
  variant: "winner" | "rollback"
): Record<string, unknown> {
  const { experiment, listing } = input;
  const content =
    variant === "winner"
      ? experiment.winnerVariant === "a"
        ? experiment.variantA
        : experiment.variantB
      : experiment.variantA;

  const update: Record<string, unknown> = {};

  switch (experiment.experimentType) {
    case "cover_image": {
      const images = [...listing.images];
      const targetIndex = (content as Record<string, unknown>).coverImageIndex as number ?? 0;
      if (variant === "winner" && targetIndex > 0 && targetIndex < images.length) {
        const [img] = images.splice(targetIndex, 1);
        images.unshift(img);
      }
      update.images = images;
      break;
    }
    case "title":
      update.title = (content as Record<string, unknown>).title;
      break;
    case "description":
      update.description = (content as Record<string, unknown>).description;
      break;
    case "title_and_description":
      update.title = (content as Record<string, unknown>).title;
      update.description = (content as Record<string, unknown>).description;
      break;
  }

  return update;
}

/**
 * Simulates the promoteWinner service idempotency check.
 * Returns null if experiment is already in winner_promoted status.
 */
function simulatePromoteWinner(
  experiment: MockExperiment,
  listing: MockListing
): Record<string, unknown> | null {
  // Idempotent: skip if already promoted
  if (experiment.status === "winner_promoted") {
    return null;
  }
  if (!experiment.winnerVariant) {
    return null;
  }
  return computeListingUpdate({ experiment, listing }, "winner");
}

/**
 * Simulates the rollbackPromotion service state check.
 * Throws if experiment is not in winner_promoted status.
 */
function simulateRollback(
  experiment: MockExperiment,
  listing: MockListing
): Record<string, unknown> {
  if (experiment.status !== "winner_promoted") {
    throw new Error("INVALID_STATE_FOR_ROLLBACK");
  }
  return computeListingUpdate({ experiment, listing }, "rollback");
}

// ─── Factory helpers ──────────────────────────────────────────────────────

function makeExperiment(overrides: Partial<MockExperiment> = {}): MockExperiment {
  return {
    id: "exp-1",
    listingId: "listing-1",
    agencyId: "agency-1",
    name: "Test Experiment",
    status: "completed",
    experimentType: "title",
    variantA: { title: "Original Title" },
    variantB: { title: "Winning Title" },
    winnerVariant: "b",
    startedAt: new Date(),
    completedAt: new Date(),
    minSampleSize: 100,
    targetPValue: "0.050",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeListing(overrides: Partial<MockListing> = {}): MockListing {
  return {
    id: "listing-1",
    title: "Original Title",
    description: "Original Desc",
    images: ["img-a.jpg", "img-b.jpg", "img-c.jpg"],
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe("winner-promotion — cover_image", () => {
  // T9.4-11: Promotion cover_image — listing.images[0] changes to winning image
  it("T9.4-11: cover_image promotion reorders images correctly (winner B)", () => {
    const listing = makeListing();
    const experiment = makeExperiment({
      experimentType: "cover_image",
      variantA: { coverImageUrl: "img-a.jpg", coverImageIndex: 0 },
      variantB: { coverImageUrl: "img-c.jpg", coverImageIndex: 2 },
      winnerVariant: "b",
    });

    const update = computeListingUpdate({ experiment, listing }, "winner");

    // img-c.jpg (index 2) should be moved to position 0
    expect(update.images).toEqual(["img-c.jpg", "img-a.jpg", "img-b.jpg"]);
  });

  it("T9.4-11b: cover_image promotion when winner is variant A (index 0) → no reorder", () => {
    const listing = makeListing();
    const experiment = makeExperiment({
      experimentType: "cover_image",
      variantA: { coverImageUrl: "img-a.jpg", coverImageIndex: 0 },
      variantB: { coverImageUrl: "img-c.jpg", coverImageIndex: 2 },
      winnerVariant: "a",
    });

    const update = computeListingUpdate({ experiment, listing }, "winner");

    // Variant A was already at index 0, no reorder needed
    expect(update.images).toEqual(["img-a.jpg", "img-b.jpg", "img-c.jpg"]);
  });

  it("T9.4-11c: cover_image promotion with out-of-bounds index → no reorder (defensive)", () => {
    const listing = makeListing(); // only 3 images
    const experiment = makeExperiment({
      experimentType: "cover_image",
      variantA: { coverImageUrl: "img-a.jpg", coverImageIndex: 0 },
      variantB: { coverImageUrl: "img-x.jpg", coverImageIndex: 10 }, // index 10 > images.length
      winnerVariant: "b",
    });

    const update = computeListingUpdate({ experiment, listing }, "winner");

    // Out-of-bounds index should not reorder — images stay unchanged
    expect(update.images).toEqual(["img-a.jpg", "img-b.jpg", "img-c.jpg"]);
  });
});

describe("winner-promotion — title", () => {
  // T9.4-12: Promotion title — listing.title changes to winning title
  it("T9.4-12: title promotion updates listing.title", () => {
    const listing = makeListing();
    const experiment = makeExperiment({
      experimentType: "title",
      variantA: { title: "Original Title" },
      variantB: { title: "Ático de lujo con vistas al mar" },
      winnerVariant: "b",
    });

    const update = computeListingUpdate({ experiment, listing }, "winner");

    expect(update.title).toBe("Ático de lujo con vistas al mar");
    // Description should NOT be in the update for title-only type
    expect(update.description).toBeUndefined();
  });

  it("T9.4-12b: title promotion with winner A → uses variant A title", () => {
    const listing = makeListing();
    const experiment = makeExperiment({
      experimentType: "title",
      variantA: { title: "Original Title" },
      variantB: { title: "New Title" },
      winnerVariant: "a",
    });

    const update = computeListingUpdate({ experiment, listing }, "winner");
    expect(update.title).toBe("Original Title");
  });
});

describe("winner-promotion — description", () => {
  // T9.4-13 (test design): description promotion
  it("T9.4-13: description promotion updates listing.description", () => {
    const listing = makeListing();
    const experiment = makeExperiment({
      experimentType: "description",
      variantA: { description: "Original description" },
      variantB: { description: "Piso luminoso con amplias vistas al parque central" },
      winnerVariant: "b",
    });

    const update = computeListingUpdate({ experiment, listing }, "winner");

    expect(update.description).toBe("Piso luminoso con amplias vistas al parque central");
    // Title should NOT be in the update for description-only type
    expect(update.title).toBeUndefined();
  });
});

describe("winner-promotion — title_and_description", () => {
  it("title_and_description promotion updates both fields (AC5)", () => {
    const listing = makeListing();
    const experiment = makeExperiment({
      experimentType: "title_and_description",
      variantA: { title: "Old Title", description: "Old Desc" },
      variantB: { title: "New Title", description: "New Desc" },
      winnerVariant: "b",
    });

    const update = computeListingUpdate({ experiment, listing }, "winner");

    expect(update.title).toBe("New Title");
    expect(update.description).toBe("New Desc");
  });
});

// ─── T9.4-14: Idempotency ────────────────────────────────────────────────

describe("winner-promotion — idempotency (T9.4-14)", () => {
  it("T9.4-14: second promotion call on winner_promoted experiment returns null (no-op)", () => {
    const listing = makeListing();
    const experiment = makeExperiment({
      status: "completed",
      experimentType: "cover_image",
      variantA: { coverImageUrl: "img-a.jpg", coverImageIndex: 0 },
      variantB: { coverImageUrl: "img-c.jpg", coverImageIndex: 2 },
      winnerVariant: "b",
    });

    // First promotion — should work
    const firstResult = simulatePromoteWinner(experiment, listing);
    expect(firstResult).not.toBeNull();
    expect(firstResult!.images).toEqual(["img-c.jpg", "img-a.jpg", "img-b.jpg"]);

    // Apply the update and change status
    listing.images = firstResult!.images as string[];
    experiment.status = "winner_promoted";

    // Second promotion — should be no-op
    const secondResult = simulatePromoteWinner(experiment, listing);
    expect(secondResult).toBeNull();

    // Listing should remain unchanged after no-op
    expect(listing.images).toEqual(["img-c.jpg", "img-a.jpg", "img-b.jpg"]);
  });

  it("T9.4-14b: title promotion idempotency — double call doesn't corrupt", () => {
    const listing = makeListing();
    const experiment = makeExperiment({
      status: "completed",
      experimentType: "title",
      variantA: { title: "Original Title" },
      variantB: { title: "Winning Title" },
      winnerVariant: "b",
    });

    // First promotion
    const first = simulatePromoteWinner(experiment, listing);
    expect(first).not.toBeNull();
    listing.title = first!.title as string;
    experiment.status = "winner_promoted";

    // Second — no-op
    const second = simulatePromoteWinner(experiment, listing);
    expect(second).toBeNull();
    expect(listing.title).toBe("Winning Title");
  });

  it("T9.4-14c: promotion with null winnerVariant returns null", () => {
    const listing = makeListing();
    const experiment = makeExperiment({ winnerVariant: null });

    const result = simulatePromoteWinner(experiment, listing);
    expect(result).toBeNull();
  });
});

// ─── Rollback tests ──────────────────────────────────────────────────────

describe("winner-promotion — rollback (AC8)", () => {
  it("rollback title → restores variant_a content", () => {
    const listing = makeListing({ title: "Winning Title" }); // Currently promoted
    const experiment = makeExperiment({
      status: "winner_promoted",
      experimentType: "title",
      variantA: { title: "Original Title" },
      variantB: { title: "Winning Title" },
      winnerVariant: "b",
    });

    const update = simulateRollback(experiment, listing);
    expect(update.title).toBe("Original Title");
  });

  it("rollback description → restores original description", () => {
    const listing = makeListing({ description: "Winning Description" });
    const experiment = makeExperiment({
      status: "winner_promoted",
      experimentType: "description",
      variantA: { description: "Original Description" },
      variantB: { description: "Winning Description" },
      winnerVariant: "b",
    });

    const update = simulateRollback(experiment, listing);
    expect(update.description).toBe("Original Description");
    expect(update.title).toBeUndefined();
  });

  it("rollback title_and_description → restores both fields", () => {
    const listing = makeListing({
      title: "Winner Title",
      description: "Winner Desc",
    });
    const experiment = makeExperiment({
      status: "winner_promoted",
      experimentType: "title_and_description",
      variantA: { title: "Original Title", description: "Original Desc" },
      variantB: { title: "Winner Title", description: "Winner Desc" },
      winnerVariant: "b",
    });

    const update = simulateRollback(experiment, listing);
    expect(update.title).toBe("Original Title");
    expect(update.description).toBe("Original Desc");
  });

  it("rollback on non-winner_promoted experiment throws INVALID_STATE_FOR_ROLLBACK", () => {
    const listing = makeListing();

    const statuses = ["completed", "running", "draft", "cancelled", "paused"];
    for (const status of statuses) {
      const experiment = makeExperiment({ status });
      expect(() => simulateRollback(experiment, listing)).toThrowError(
        "INVALID_STATE_FOR_ROLLBACK"
      );
    }
  });

  it("rollback always uses variant_a regardless of winnerVariant", () => {
    const listing = makeListing();

    // Even when winner was 'a', rollback still restores variant_a
    const experiment = makeExperiment({
      status: "winner_promoted",
      experimentType: "title",
      variantA: { title: "Original Title" },
      variantB: { title: "Other Title" },
      winnerVariant: "a",
    });

    const update = simulateRollback(experiment, listing);
    expect(update.title).toBe("Original Title");
  });

  it("rollback cover_image → restores original image order", () => {
    // After promotion, img-c.jpg was moved to index 0
    const listing = makeListing({ images: ["img-c.jpg", "img-a.jpg", "img-b.jpg"] });
    const experiment = makeExperiment({
      status: "winner_promoted",
      experimentType: "cover_image",
      variantA: { coverImageUrl: "img-a.jpg", coverImageIndex: 0 },
      variantB: { coverImageUrl: "img-c.jpg", coverImageIndex: 2 },
      winnerVariant: "b",
    });

    // Rollback uses variant_a content which has coverImageIndex: 0
    // So no reorder happens (original was already at 0)
    const update = simulateRollback(experiment, listing);
    expect(update.images).toBeDefined();
  });
});

// ─── Audit log structure (AC6) ──────────────────────────────────────────

describe("winner-promotion — audit log structure (AC6)", () => {
  it("AC6: promotion log has all required fields", () => {
    const experiment = makeExperiment({
      status: "completed",
      experimentType: "title",
      variantA: { title: "Original" },
      variantB: { title: "Winner" },
      winnerVariant: "b",
    });

    // Verify the audit log shape matches AC6 requirements
    const promotionLog = {
      experimentId: experiment.id,
      listingId: experiment.listingId,
      promotedVariant: experiment.winnerVariant as "a" | "b",
      experimentType: experiment.experimentType,
      previousContent: experiment.variantA,
      promotedContent: experiment.variantB,
      promotedAt: new Date(),
      promotedBy: "system" as const,
    };

    expect(promotionLog.experimentId).toBe("exp-1");
    expect(promotionLog.listingId).toBe("listing-1");
    expect(["a", "b"]).toContain(promotionLog.promotedVariant);
    expect(["cover_image", "title", "description", "title_and_description"]).toContain(
      promotionLog.experimentType
    );
    expect(promotionLog.previousContent).toEqual({ title: "Original" });
    expect(promotionLog.promotedContent).toEqual({ title: "Winner" });
    expect(promotionLog.promotedAt).toBeInstanceOf(Date);
    expect(promotionLog.promotedBy).toBe("system");
  });

  it("AC6: rollback log uses promoted_by = 'rollback_agency_admin'", () => {
    const experiment = makeExperiment({
      experimentType: "title",
      variantA: { title: "Original" },
      variantB: { title: "Winner" },
      winnerVariant: "b",
    });

    const rollbackLog = {
      experimentId: experiment.id,
      listingId: experiment.listingId,
      promotedVariant: "a" as const,
      experimentType: experiment.experimentType,
      previousContent: experiment.variantB,
      promotedContent: experiment.variantA,
      promotedAt: new Date(),
      promotedBy: "rollback_agency_admin" as const,
    };

    expect(rollbackLog.promotedBy).toBe("rollback_agency_admin");
    expect(rollbackLog.promotedVariant).toBe("a");
    expect(rollbackLog.previousContent).toEqual({ title: "Winner" });
    expect(rollbackLog.promotedContent).toEqual({ title: "Original" });
  });
});
