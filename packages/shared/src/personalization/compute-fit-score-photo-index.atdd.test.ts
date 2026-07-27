/**
 * Story 10.3 — ATDD: computeListingFitScore() recommendedPhotoIndex integration
 *
 * AC1: computeListingFitScore() now returns a computed recommendedPhotoIndex
 *      (instead of hardcoded null).
 * AC2: Batch job persists the recommendedPhotoIndex in the UPSERT.
 *
 * These tests verify that the function INTEGRATES selectRecommendedPhotoIndex()
 * into its return value, using the buyer's photoEngagement.preferredPhotoIndices.
 *
 * Run: npx vitest run src/personalization/compute-fit-score-photo-index.atdd.test.ts
 */

import { describe, expect, test } from "vitest";
import { computeListingFitScore } from "./compute-listing-fit-score";

// ─── Test Fixtures ────────────────────────────────────────────────────────────

function createMockVector(overrides: Record<string, any> = {}) {
  return {
    priceAffinity: {
      mean: 300000,
      stddev: 50000,
      rangeMin: 200000,
      rangeMax: 400000,
    },
    sizeAffinity: { mean: 100, stddev: 20 },
    bedroomAffinity: {
      mode: 3,
      distribution: { "1": 0.1, "2": 0.3, "3": 0.4, "4": 0.15, "5": 0.05 },
    },
    locationAffinity: {
      preferredCities: ["Madrid", "Barcelona", "Valencia"],
      geoCentroid: { lat: 40.4168, lng: -3.7038 },
    },
    photoEngagement: {
      avgViewTimeMs: 3500,
      preferredPhotoIndices: [2, 0, 4],
    },
    engagementDepth: {
      avgScrollDepthPct: 0.75,
      avgDetailViewMs: 6000,
    },
    matchRate: 0.45,
    reaffirmRate: 0.1,
    ...overrides,
  };
}

function createMockListing(overrides: Record<string, any> = {}) {
  return {
    id: "listing-001",
    price: 280000,
    sizeSqm: 95,
    bedrooms: 3,
    city: "Madrid",
    latitude: 40.42,
    longitude: -3.71,
    images: ["img0.jpg", "img1.jpg", "img2.jpg", "img3.jpg", "img4.jpg", "img5.jpg"],
    status: "active",
    ...overrides,
  };
}

// ─── AC1: recommendedPhotoIndex in computeListingFitScore() ─────────────────

describe("Story 10.3 — AC1: computeListingFitScore() returns computed recommendedPhotoIndex", () => {
  test(
    "[P0] T10.3-12: returns recommendedPhotoIndex=2 for buyer with preferredPhotoIndices [2,0,4] and listing with 6 images",
    () => {
      // AC1 scenario 1: preferredPhotoIndices = [2, 0, 4], images.length = 6
      const vector = createMockVector({
        photoEngagement: { avgViewTimeMs: 3500, preferredPhotoIndices: [2, 0, 4] },
      });
      const listing = createMockListing({
        images: ["img0.jpg", "img1.jpg", "img2.jpg", "img3.jpg", "img4.jpg", "img5.jpg"],
      });

      const result = computeListingFitScore(vector, listing);

      // Story 10.3 changes: no longer null, now computed
      expect(result.recommendedPhotoIndex).toBe(2);
    }
  );

  test(
    "[P0] T10.3-13: returns recommendedPhotoIndex=3 when first indices are out of range",
    () => {
      // AC1 scenario 1 variant: preferredPhotoIndices = [5, 3, 1], images.length = 4
      const vector = createMockVector({
        photoEngagement: { avgViewTimeMs: 3500, preferredPhotoIndices: [5, 3, 1] },
      });
      const listing = createMockListing({
        images: ["img0.jpg", "img1.jpg", "img2.jpg", "img3.jpg"],
      });

      const result = computeListingFitScore(vector, listing);

      expect(result.recommendedPhotoIndex).toBe(3);
    }
  );

  test(
    "[P0] T10.3-14: returns recommendedPhotoIndex=0 when preferredPhotoIndices is empty",
    () => {
      // AC1 scenario 2: empty preferredPhotoIndices → fallback 0
      const vector = createMockVector({
        photoEngagement: { avgViewTimeMs: 3500, preferredPhotoIndices: [] },
      });
      const listing = createMockListing();

      const result = computeListingFitScore(vector, listing);

      expect(result.recommendedPhotoIndex).toBe(0);
    }
  );

  test(
    "[P0] T10.3-15: returns recommendedPhotoIndex=null when listing has no images",
    () => {
      // AC1 scenario 3: images null → null
      const vector = createMockVector();
      const listing = createMockListing({ images: null });

      const result = computeListingFitScore(vector, listing);

      expect(result.recommendedPhotoIndex).toBeNull();
    }
  );

  test(
    "[P0] T10.3-16: returns recommendedPhotoIndex=null when listing has empty images array",
    () => {
      // AC1 scenario 3 variant: images = [] → null
      const vector = createMockVector();
      const listing = createMockListing({ images: [] });

      const result = computeListingFitScore(vector, listing);

      expect(result.recommendedPhotoIndex).toBeNull();
    }
  );

  test(
    "[P0] T10.3-17: returns recommendedPhotoIndex=0 when all preferred indices are out of range",
    () => {
      // AC1 scenario 4: all indices >= images.length → fallback 0
      const vector = createMockVector({
        photoEngagement: { avgViewTimeMs: 3500, preferredPhotoIndices: [10, 8, 6] },
      });
      const listing = createMockListing({
        images: ["img0.jpg", "img1.jpg", "img2.jpg"],
      });

      const result = computeListingFitScore(vector, listing);

      expect(result.recommendedPhotoIndex).toBe(0);
    }
  );

  test(
    "[P1] T10.3-18: overall score and dimension scores remain unchanged by photo index logic",
    () => {
      // Verify the addition of selectRecommendedPhotoIndex does NOT alter existing score computation
      const vector = createMockVector();
      const listing = createMockListing();

      const result = computeListingFitScore(vector, listing);

      // overallScore should still be a valid number in [0, 1]
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(1);
      // dimensionScores shape should be intact
      expect(result.dimensionScores).toHaveProperty("priceScore");
      expect(result.dimensionScores).toHaveProperty("sizeScore");
      expect(result.dimensionScores).toHaveProperty("bedroomScore");
      expect(result.dimensionScores).toHaveProperty("locationScore");
      expect(result.dimensionScores).toHaveProperty("photoAffinityScore");
      expect(result.dimensionScores).toHaveProperty("engagementDepthScore");
      // recommendedPhotoIndex should now be computed (not null for listings with images)
      expect(result.recommendedPhotoIndex).not.toBeNull();
    }
  );
});
