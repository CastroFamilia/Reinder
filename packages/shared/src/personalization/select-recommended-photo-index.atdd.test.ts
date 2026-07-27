/**
 * Story 10.3 — ATDD: selectRecommendedPhotoIndex()
 *
 * TDD RED PHASE — All tests use test.skip() and will FAIL until implementation.
 *
 * AC1: Cálculo de recommendedPhotoIndex en computeListingFitScore()
 * AC8: Tests unitarios del cálculo de recommendedPhotoIndex
 *
 * The selectRecommendedPhotoIndex() function is the core pure helper that
 * picks the best cover photo index for a buyer based on their engagement.
 *
 * Algorithm: Pick the first preferredPhotoIndex that exists in the
 * listing's image array. Falls back to 0 (agency default).
 *
 * Run: npx vitest run src/personalization/select-recommended-photo-index.atdd.test.ts
 */

import { describe, expect, test } from "vitest";

// NOTE: This import will fail until the function is implemented and exported.
// That is intentional — TDD red phase.
// import { selectRecommendedPhotoIndex } from "./compute-listing-fit-score";

// ─── Placeholder for the function under test ──────────────────────────────────
// Once implemented, replace this with the actual import above.
// The function signature per the story spec:
//   selectRecommendedPhotoIndex(preferredIndices: number[], imageCount: number): number | null

// ─── AC1 + AC8: selectRecommendedPhotoIndex() unit tests ──────────────────────

describe("Story 10.3 — AC1/AC8: selectRecommendedPhotoIndex()", () => {
  // ─── AC1 Scenario 1: Valid preferredPhotoIndices ──────────────────────────

  test.skip("[P0] T10.3-01: selects first valid index from preferredPhotoIndices", () => {
    // Given: buyer with preferredPhotoIndices [2, 0, 4] and listing with 6 images
    // When: selectRecommendedPhotoIndex([2, 0, 4], 6)
    // Then: returns 2 (first valid index)
    const { selectRecommendedPhotoIndex } = require("./compute-listing-fit-score");
    const result = selectRecommendedPhotoIndex([2, 0, 4], 6);
    expect(result).toBe(2);
  });

  test.skip("[P0] T10.3-02: skips out-of-range indices and selects first valid", () => {
    // Given: buyer with preferredPhotoIndices [5, 3, 1] and listing with 4 images
    // When: selectRecommendedPhotoIndex([5, 3, 1], 4)
    // Then: returns 3 (first index < imageCount)
    const { selectRecommendedPhotoIndex } = require("./compute-listing-fit-score");
    const result = selectRecommendedPhotoIndex([5, 3, 1], 4);
    expect(result).toBe(3);
  });

  // ─── AC1 Scenario 2: Empty preferredPhotoIndices ──────────────────────────

  test.skip("[P0] T10.3-03: returns 0 (fallback) when preferredPhotoIndices is empty", () => {
    // Given: buyer with preferredPhotoIndices = []
    // When: selectRecommendedPhotoIndex([], 6)
    // Then: returns 0 (agency default)
    const { selectRecommendedPhotoIndex } = require("./compute-listing-fit-score");
    const result = selectRecommendedPhotoIndex([], 6);
    expect(result).toBe(0);
  });

  // ─── AC1 Scenario 3: Listing with no images ──────────────────────────────

  test.skip("[P0] T10.3-04: returns null when imageCount is 0", () => {
    // Given: listing with images null or empty (imageCount = 0)
    // When: selectRecommendedPhotoIndex([2, 0, 4], 0)
    // Then: returns null
    const { selectRecommendedPhotoIndex } = require("./compute-listing-fit-score");
    const result = selectRecommendedPhotoIndex([2, 0, 4], 0);
    expect(result).toBeNull();
  });

  test.skip("[P0] T10.3-05: returns null when preferredIndices is empty and imageCount is 0", () => {
    const { selectRecommendedPhotoIndex } = require("./compute-listing-fit-score");
    const result = selectRecommendedPhotoIndex([], 0);
    expect(result).toBeNull();
  });

  // ─── AC1 Scenario 4: All indices out of range ────────────────────────────

  test.skip("[P0] T10.3-06: returns 0 (fallback) when all indices >= imageCount", () => {
    // Given: buyer with preferredPhotoIndices all >= images.length
    // When: selectRecommendedPhotoIndex([10, 8, 6], 5)
    // Then: returns 0 (fallback: first photo)
    const { selectRecommendedPhotoIndex } = require("./compute-listing-fit-score");
    const result = selectRecommendedPhotoIndex([10, 8, 6], 5);
    expect(result).toBe(0);
  });

  // ─── AC8: Additional edge cases ──────────────────────────────────────────

  test.skip("[P1] T10.3-07: listing with 1 photo always returns 0", () => {
    // AC8: Listing con 1 sola foto → siempre 0
    const { selectRecommendedPhotoIndex } = require("./compute-listing-fit-score");
    const result = selectRecommendedPhotoIndex([0, 2, 4], 1);
    expect(result).toBe(0);
  });

  test.skip("[P1] T10.3-08: listing with 1 photo and empty prefs returns 0", () => {
    const { selectRecommendedPhotoIndex } = require("./compute-listing-fit-score");
    const result = selectRecommendedPhotoIndex([], 1);
    expect(result).toBe(0);
  });

  test.skip("[P1] T10.3-09: selects index 0 when it is the only valid one", () => {
    const { selectRecommendedPhotoIndex } = require("./compute-listing-fit-score");
    const result = selectRecommendedPhotoIndex([5, 0, 3], 1);
    expect(result).toBe(0);
  });

  test.skip("[P2] T10.3-10: handles large preferredPhotoIndices arrays", () => {
    const { selectRecommendedPhotoIndex } = require("./compute-listing-fit-score");
    const largePrefs = Array.from({ length: 100 }, (_, i) => 50 + i); // [50, 51, ..., 149]
    largePrefs.push(3); // Add one valid index at end
    const result = selectRecommendedPhotoIndex(largePrefs, 10);
    expect(result).toBe(3);
  });

  test.skip("[P2] T10.3-11: handles preferredPhotoIndices with duplicates", () => {
    const { selectRecommendedPhotoIndex } = require("./compute-listing-fit-score");
    const result = selectRecommendedPhotoIndex([2, 2, 2], 5);
    expect(result).toBe(2);
  });
});
