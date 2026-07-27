/**
 * Story 10.2 — Tests: computeListingFitScore() Logic
 *
 * AC2: DimensionScores structure (all 6 dimensions)
 * AC3: Calculation logic — priceScore, sizeScore, bedroomScore,
 *       locationScore, photoAffinityScore, engagementDepthScore
 * AC9: Type exports from @reinder/shared
 *
 * Run: npx vitest run src/personalization/compute-listing-fit-score.test.ts
 */

import { describe, expect, test } from "vitest";
import { computeListingFitScore } from "./compute-listing-fit-score";
import { FIT_SCORE_WEIGHTS, FIT_SCORE_VERSION } from "./fit-score-types";

// ─── Test Fixtures ────────────────────────────────────────────────────────────

/**
 * Creates a complete BuyerPreferenceVector for testing.
 * Mirrors the structure from Story 10.1 types.ts.
 */
function createMockVector(overrides: Record<string, any> = {}) {
  return {
    priceAffinity: {
      mean: 300000,
      stddev: 50000,
      rangeMin: 200000,
      rangeMax: 400000,
    },
    sizeAffinity: {
      mean: 100,
      stddev: 20,
    },
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
      preferredPhotoIndices: [0, 2, 4],
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

/**
 * Creates a complete listing data object for testing.
 * Matches the ListingDataForScore interface expected by AC3.
 */
function createMockListing(overrides: Record<string, any> = {}) {
  return {
    id: "listing-001",
    price: 280000,
    sizeSqm: 95,
    bedrooms: 3,
    city: "Madrid",
    latitude: 40.42,
    longitude: -3.71,
    images: ["img1.jpg", "img2.jpg", "img3.jpg", "img4.jpg", "img5.jpg"],
    status: "active",
    ...overrides,
  };
}

// ─── AC9: Type Exports ────────────────────────────────────────────────────────

describe("Story 10.2 — AC9: Type Exports from @reinder/shared", () => {
  test("[P0] T10.2-01: exports ListingFitScore interface", async () => {
    const mod = await import("./index");
    expect(mod).toHaveProperty("computeListingFitScore");
    expect(typeof mod.computeListingFitScore).toBe("function");
  });

  test("[P0] T10.2-02: exports DimensionScores interface", () => {
    const vector = createMockVector();
    const listing = createMockListing();
    const result = computeListingFitScore(vector, listing);

    expect(result.dimensionScores).toHaveProperty("priceScore");
    expect(result.dimensionScores).toHaveProperty("sizeScore");
    expect(result.dimensionScores).toHaveProperty("bedroomScore");
    expect(result.dimensionScores).toHaveProperty("locationScore");
    expect(result.dimensionScores).toHaveProperty("photoAffinityScore");
    expect(result.dimensionScores).toHaveProperty("engagementDepthScore");
  });

  test("[P0] T10.2-03: exports FIT_SCORE_WEIGHTS constant", () => {
    expect(FIT_SCORE_WEIGHTS).toBeDefined();
    expect(FIT_SCORE_WEIGHTS.priceScore).toBe(0.3);
    expect(FIT_SCORE_WEIGHTS.locationScore).toBe(0.25);
    expect(FIT_SCORE_WEIGHTS.sizeScore).toBe(0.15);
    expect(FIT_SCORE_WEIGHTS.bedroomScore).toBe(0.15);
    expect(FIT_SCORE_WEIGHTS.photoAffinityScore).toBe(0.1);
    expect(FIT_SCORE_WEIGHTS.engagementDepthScore).toBe(0.05);
  });

  test("[P0] T10.2-04: exports FIT_SCORE_VERSION constant", () => {
    expect(FIT_SCORE_VERSION).toBeDefined();
    expect(typeof FIT_SCORE_VERSION).toBe("number");
    expect(FIT_SCORE_VERSION).toBeGreaterThanOrEqual(1);
  });

  test(
    "[P1] T10.2-05: exports ListingFitScoreRow type via module",
    async () => {
      const mod = await import("./index");
      expect(mod.computeListingFitScore).toBeDefined();
      expect(mod.FIT_SCORE_WEIGHTS).toBeDefined();
      expect(mod.FIT_SCORE_VERSION).toBeDefined();
    }
  );
});

// ─── AC2: DimensionScores Structure ───────────────────────────────────────────

describe("Story 10.2 — AC2: DimensionScores Structure", () => {
  test(
    "[P0] T10.2-06: dimension_scores contains all 6 required dimensions",
    () => {
      const vector = createMockVector();
      const listing = createMockListing();
      const result = computeListingFitScore(vector, listing);

      const ds = result.dimensionScores;
      expect(ds).toHaveProperty("priceScore");
      expect(ds).toHaveProperty("sizeScore");
      expect(ds).toHaveProperty("bedroomScore");
      expect(ds).toHaveProperty("locationScore");
      expect(ds).toHaveProperty("photoAffinityScore");
      expect(ds).toHaveProperty("engagementDepthScore");

      // Exactly 6 keys — no extras
      expect(Object.keys(ds)).toHaveLength(6);
    }
  );

  test(
    "[P0] T10.2-07: all dimension scores are numbers in [0, 1]",
    () => {
      const vector = createMockVector();
      const listing = createMockListing();
      const result = computeListingFitScore(vector, listing);

      const ds = result.dimensionScores;
      for (const [, value] of Object.entries(ds)) {
        expect(typeof value).toBe("number");
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
        // AC2: all scores are finite (no NaN nor Infinity)
        expect(Number.isFinite(value)).toBe(true);
      }
    }
  );

  test(
    "[P0] T10.2-08: overall_score is weighted mean of dimensions",
    () => {
      const vector = createMockVector();
      const listing = createMockListing();
      const result = computeListingFitScore(vector, listing);

      const ds = result.dimensionScores;
      const expectedOverall =
        ds.priceScore * FIT_SCORE_WEIGHTS.priceScore +
        ds.locationScore * FIT_SCORE_WEIGHTS.locationScore +
        ds.sizeScore * FIT_SCORE_WEIGHTS.sizeScore +
        ds.bedroomScore * FIT_SCORE_WEIGHTS.bedroomScore +
        ds.photoAffinityScore * FIT_SCORE_WEIGHTS.photoAffinityScore +
        ds.engagementDepthScore * FIT_SCORE_WEIGHTS.engagementDepthScore;

      expect(result.overallScore).toBeCloseTo(expectedOverall, 4);
    }
  );

  test(
    "[P0] T10.2-09: overall_score is in [0, 1] range",
    () => {
      const vector = createMockVector();
      const listing = createMockListing();
      const result = computeListingFitScore(vector, listing);

      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(1);
      expect(Number.isFinite(result.overallScore)).toBe(true);
    }
  );

  test(
    "[P1] T10.2-10: recommendedPhotoIndex is computed (Story 10.3)",
    () => {
      const vector = createMockVector();
      const listing = createMockListing();
      const result = computeListingFitScore(vector, listing);

      // Story 10.3: recommendedPhotoIndex is now computed from preferredPhotoIndices
      // Mock vector has preferredPhotoIndices: [0, 2, 4], listing has images → returns 0
      expect(result.recommendedPhotoIndex).toBe(0);
    }
  );
});

// ─── AC3: priceScore Calculation ──────────────────────────────────────────────

describe("Story 10.2 — AC3: priceScore Calculation", () => {
  test(
    "[P0] T10.2-11: priceScore = 1.0 when listing price within buyer range",
    () => {
      const vector = createMockVector({
        priceAffinity: {
          mean: 300000,
          stddev: 50000,
          rangeMin: 200000,
          rangeMax: 400000,
        },
      });
      // Price 300000 is within [200000, 400000]
      const listing = createMockListing({ price: 300000 });
      const result = computeListingFitScore(vector, listing);

      expect(result.dimensionScores.priceScore).toBe(1.0);
    }
  );

  test(
    "[P0] T10.2-12: priceScore = 1.0 at range boundary (rangeMin)",
    () => {
      const vector = createMockVector({
        priceAffinity: {
          mean: 300000,
          stddev: 50000,
          rangeMin: 200000,
          rangeMax: 400000,
        },
      });
      const listing = createMockListing({ price: 200000 });
      const result = computeListingFitScore(vector, listing);

      expect(result.dimensionScores.priceScore).toBe(1.0);
    }
  );

  test(
    "[P0] T10.2-13: priceScore = 1.0 at range boundary (rangeMax)",
    () => {
      const vector = createMockVector({
        priceAffinity: {
          mean: 300000,
          stddev: 50000,
          rangeMin: 200000,
          rangeMax: 400000,
        },
      });
      const listing = createMockListing({ price: 400000 });
      const result = computeListingFitScore(vector, listing);

      expect(result.dimensionScores.priceScore).toBe(1.0);
    }
  );

  test(
    "[P0] T10.2-14: priceScore decays exponentially outside range",
    () => {
      const vector = createMockVector({
        priceAffinity: {
          mean: 300000,
          stddev: 50000,
          rangeMin: 200000,
          rangeMax: 400000,
        },
      });
      // Price 500000 is 100k outside range (2 stddev)
      const listing = createMockListing({ price: 500000 });
      const result = computeListingFitScore(vector, listing);

      expect(result.dimensionScores.priceScore).toBeGreaterThan(0);
      expect(result.dimensionScores.priceScore).toBeLessThan(1.0);
    }
  );

  test(
    "[P1] T10.2-15: priceScore decreases as distance from range increases",
    () => {
      const vector = createMockVector({
        priceAffinity: {
          mean: 300000,
          stddev: 50000,
          rangeMin: 200000,
          rangeMax: 400000,
        },
      });

      const listing1sd = createMockListing({ price: 450000 }); // 1 stddev out
      const listing2sd = createMockListing({ price: 500000 }); // 2 stddev out

      const result1 = computeListingFitScore(vector, listing1sd);
      const result2 = computeListingFitScore(vector, listing2sd);

      expect(result1.dimensionScores.priceScore).toBeGreaterThan(
        result2.dimensionScores.priceScore
      );
    }
  );

  test(
    "[P1] T10.2-16: priceScore minimum is 0.0",
    () => {
      const vector = createMockVector({
        priceAffinity: {
          mean: 300000,
          stddev: 50000,
          rangeMin: 200000,
          rangeMax: 400000,
        },
      });
      // Extremely far away — 10M price
      const listing = createMockListing({ price: 10000000 });
      const result = computeListingFitScore(vector, listing);

      expect(result.dimensionScores.priceScore).toBeGreaterThanOrEqual(0);
    }
  );
});

// ─── AC3: sizeScore Calculation ───────────────────────────────────────────────

describe("Story 10.2 — AC3: sizeScore Calculation", () => {
  test(
    "[P0] T10.2-17: sizeScore uses gaussian distance from mean",
    () => {
      const vector = createMockVector({
        sizeAffinity: { mean: 100, stddev: 20 },
      });
      // Exact match = score should be 1.0
      const listing = createMockListing({ sizeSqm: 100 });
      const result = computeListingFitScore(vector, listing);

      // exp(-0.5 * ((100 - 100) / 20)^2) = exp(0) = 1.0
      expect(result.dimensionScores.sizeScore).toBeCloseTo(1.0, 4);
    }
  );

  test(
    "[P0] T10.2-18: sizeScore = exp(-0.5 * ((sizeSqm - mean) / stddev)^2)",
    () => {
      const vector = createMockVector({
        sizeAffinity: { mean: 100, stddev: 20 },
      });
      // 1 stddev away: exp(-0.5 * 1^2) = exp(-0.5) ≈ 0.6065
      const listing = createMockListing({ sizeSqm: 120 });
      const result = computeListingFitScore(vector, listing);

      const expected = Math.exp(-0.5 * Math.pow((120 - 100) / 20, 2));
      expect(result.dimensionScores.sizeScore).toBeCloseTo(expected, 4);
    }
  );

  test(
    "[P1] T10.2-19: sizeScore when stddev = 0 → exact match = 1.0, else 0.5",
    () => {
      // stddev = 0, exact match
      const vector = createMockVector({
        sizeAffinity: { mean: 100, stddev: 0 },
      });
      const listingExact = createMockListing({ sizeSqm: 100 });
      const resultExact = computeListingFitScore(vector, listingExact);
      expect(resultExact.dimensionScores.sizeScore).toBe(1.0);

      // stddev = 0, no match
      const listingDiff = createMockListing({ sizeSqm: 120 });
      const resultDiff = computeListingFitScore(vector, listingDiff);
      expect(resultDiff.dimensionScores.sizeScore).toBe(0.5);
    }
  );
});

// ─── AC3: bedroomScore Calculation ────────────────────────────────────────────

describe("Story 10.2 — AC3: bedroomScore Calculation", () => {
  test(
    "[P0] T10.2-20: bedroomScore from distribution lookup",
    () => {
      const vector = createMockVector({
        bedroomAffinity: {
          mode: 3,
          distribution: {
            "1": 0.1,
            "2": 0.3,
            "3": 0.4,
            "4": 0.15,
            "5": 0.05,
          },
        },
      });
      // Listing has 3 bedrooms → distribution["3"] = 0.4
      const listing = createMockListing({ bedrooms: 3 });
      const result = computeListingFitScore(vector, listing);

      expect(result.dimensionScores.bedroomScore).toBe(0.4);
    }
  );

  test(
    "[P0] T10.2-21: bedroomScore = 0.1 when bedrooms not in distribution",
    () => {
      const vector = createMockVector({
        bedroomAffinity: {
          mode: 3,
          distribution: { "2": 0.3, "3": 0.4 },
        },
      });
      // Listing has 6 bedrooms — not in distribution
      const listing = createMockListing({ bedrooms: 6 });
      const result = computeListingFitScore(vector, listing);

      expect(result.dimensionScores.bedroomScore).toBe(0.1);
    }
  );
});

// ─── AC3: locationScore Calculation ───────────────────────────────────────────

describe("Story 10.2 — AC3: locationScore Calculation", () => {
  test(
    "[P0] T10.2-22: locationScore = 1.0 for first preferredCity",
    () => {
      const vector = createMockVector({
        locationAffinity: {
          preferredCities: ["Madrid", "Barcelona", "Valencia"],
          geoCentroid: { lat: 40.4168, lng: -3.7038 },
        },
      });
      const listing = createMockListing({ city: "Madrid" });
      const result = computeListingFitScore(vector, listing);

      expect(result.dimensionScores.locationScore).toBe(1.0);
    }
  );

  test(
    "[P0] T10.2-23: locationScore = 0.8 for second preferredCity",
    () => {
      const vector = createMockVector({
        locationAffinity: {
          preferredCities: ["Madrid", "Barcelona", "Valencia"],
          geoCentroid: { lat: 40.4168, lng: -3.7038 },
        },
      });
      const listing = createMockListing({ city: "Barcelona" });
      const result = computeListingFitScore(vector, listing);

      expect(result.dimensionScores.locationScore).toBe(0.8);
    }
  );

  test(
    "[P0] T10.2-24: locationScore = 0.6 for third preferredCity",
    () => {
      const vector = createMockVector({
        locationAffinity: {
          preferredCities: ["Madrid", "Barcelona", "Valencia"],
          geoCentroid: { lat: 40.4168, lng: -3.7038 },
        },
      });
      const listing = createMockListing({ city: "Valencia" });
      const result = computeListingFitScore(vector, listing);

      expect(result.dimensionScores.locationScore).toBe(0.6);
    }
  );

  test(
    "[P0] T10.2-25: locationScore minimum is 0.3 for cities in preferredCities",
    () => {
      // 5+ cities to test the minimum
      const vector = createMockVector({
        locationAffinity: {
          preferredCities: [
            "Madrid",
            "Barcelona",
            "Valencia",
            "Seville",
            "Bilbao",
            "Malaga",
          ],
          geoCentroid: { lat: 40.4168, lng: -3.7038 },
        },
      });
      const listing = createMockListing({ city: "Malaga" });
      const result = computeListingFitScore(vector, listing);

      expect(result.dimensionScores.locationScore).toBeGreaterThanOrEqual(0.3);
    }
  );

  test(
    "[P0] T10.2-26: locationScore uses haversine decay when city not in preferredCities but geoCentroid exists",
    () => {
      const vector = createMockVector({
        locationAffinity: {
          preferredCities: ["Madrid"],
          geoCentroid: { lat: 40.4168, lng: -3.7038 }, // Madrid centroid
        },
      });
      // Listing in a city NOT in preferred — using Lisbon coordinates (~500km)
      const listing = createMockListing({
        city: "Lisbon",
        latitude: 38.7223,
        longitude: -9.1393,
      });
      const result = computeListingFitScore(vector, listing);

      // Should decay based on haversine distance
      expect(result.dimensionScores.locationScore).toBeGreaterThan(0);
      expect(result.dimensionScores.locationScore).toBeLessThan(1.0);
    }
  );

  test(
    "[P1] T10.2-27: locationScore = 0.5 at ~100km from geoCentroid",
    () => {
      const vector = createMockVector({
        locationAffinity: {
          preferredCities: [],
          geoCentroid: { lat: 40.4168, lng: -3.7038 },
        },
      });
      // ~100km away from Madrid (approximate)
      const listing = createMockListing({
        city: "Toledo",
        latitude: 39.8628,
        longitude: -4.0273,
      });
      const result = computeListingFitScore(vector, listing);

      expect(result.dimensionScores.locationScore).toBeCloseTo(0.5, 1);
    }
  );

  test(
    "[P1] T10.2-28: locationScore = 0.1 when no match and no geoCentroid",
    () => {
      const vector = createMockVector({
        locationAffinity: {
          preferredCities: ["Madrid"],
          geoCentroid: null,
        },
      });
      const listing = createMockListing({ city: "Zaragoza" });
      const result = computeListingFitScore(vector, listing);

      expect(result.dimensionScores.locationScore).toBe(0.1);
    }
  );
});

// ─── AC3: photoAffinityScore Calculation ──────────────────────────────────────

describe("Story 10.2 — AC3: photoAffinityScore Calculation", () => {
  test(
    "[P0] T10.2-29: photoAffinityScore > 0.5 when listing has preferred photo indices",
    () => {
      const vector = createMockVector({
        photoEngagement: {
          avgViewTimeMs: 3500,
          preferredPhotoIndices: [0, 2, 4],
        },
      });
      // Listing has 5 images — indices 0, 2, 4 overlap with preferred
      const listing = createMockListing({
        images: ["a.jpg", "b.jpg", "c.jpg", "d.jpg", "e.jpg"],
      });
      const result = computeListingFitScore(vector, listing);

      expect(result.dimensionScores.photoAffinityScore).toBeGreaterThan(0.5);
    }
  );

  test(
    "[P0] T10.2-30: photoAffinityScore = 0.5 (neutral) with no engagement data",
    () => {
      const vector = createMockVector({
        photoEngagement: {
          avgViewTimeMs: 0,
          preferredPhotoIndices: [],
        },
      });
      const listing = createMockListing();
      const result = computeListingFitScore(vector, listing);

      expect(result.dimensionScores.photoAffinityScore).toBe(0.5);
    }
  );
});

// ─── AC3: engagementDepthScore Calculation ────────────────────────────────────

describe("Story 10.2 — AC3: engagementDepthScore Calculation", () => {
  test(
    "[P0] T10.2-31: engagementDepthScore = 1.0 for high engagement buyer",
    () => {
      // avgScrollDepthPct > 70% AND avgDetailViewMs > 5000ms → 1.0
      const vector = createMockVector({
        engagementDepth: {
          avgScrollDepthPct: 0.85,
          avgDetailViewMs: 7000,
        },
      });
      const listing = createMockListing();
      const result = computeListingFitScore(vector, listing);

      expect(result.dimensionScores.engagementDepthScore).toBe(1.0);
    }
  );

  test(
    "[P0] T10.2-32: engagementDepthScore scales linearly between 0.3 and 1.0",
    () => {
      // Low engagement
      const vectorLow = createMockVector({
        engagementDepth: {
          avgScrollDepthPct: 0.3,
          avgDetailViewMs: 1000,
        },
      });
      // Medium engagement
      const vectorMed = createMockVector({
        engagementDepth: {
          avgScrollDepthPct: 0.5,
          avgDetailViewMs: 3000,
        },
      });
      const listing = createMockListing();

      const resultLow = computeListingFitScore(vectorLow, listing);
      const resultMed = computeListingFitScore(vectorMed, listing);

      expect(
        resultLow.dimensionScores.engagementDepthScore
      ).toBeGreaterThanOrEqual(0.3);
      expect(
        resultMed.dimensionScores.engagementDepthScore
      ).toBeGreaterThan(resultLow.dimensionScores.engagementDepthScore);
      expect(
        resultMed.dimensionScores.engagementDepthScore
      ).toBeLessThanOrEqual(1.0);
    }
  );
});

// ─── AC3: Incomplete Data Handling ────────────────────────────────────────────

describe("Story 10.2 — AC3: Incomplete Data Handling", () => {
  test(
    "[P0] T10.2-33: listing with null price → priceScore = 0.5 (neutral)",
    () => {
      const vector = createMockVector();
      const listing = createMockListing({ price: null });
      const result = computeListingFitScore(vector, listing);

      expect(result.dimensionScores.priceScore).toBe(0.5);
    }
  );

  test(
    "[P0] T10.2-34: listing with null coordinates → locationScore = 0.5 (neutral)",
    () => {
      const vector = createMockVector();
      const listing = createMockListing({
        city: "UnknownCity",
        latitude: null,
        longitude: null,
      });
      // City not in preferredCities and no coordinates → should get neutral
      const result = computeListingFitScore(vector, listing);

      // With no city match AND no coords, locationScore fallback to neutral
      expect(result.dimensionScores.locationScore).toBe(0.5);
    }
  );

  test(
    "[P0] T10.2-35: listing with null sizeSqm → sizeScore = 0.5 (neutral)",
    () => {
      const vector = createMockVector();
      const listing = createMockListing({ sizeSqm: null });
      const result = computeListingFitScore(vector, listing);

      expect(result.dimensionScores.sizeScore).toBe(0.5);
    }
  );

  test(
    "[P0] T10.2-36: listing with null bedrooms → bedroomScore = 0.5 (neutral)",
    () => {
      const vector = createMockVector();
      const listing = createMockListing({ bedrooms: null });
      const result = computeListingFitScore(vector, listing);

      expect(result.dimensionScores.bedroomScore).toBe(0.5);
    }
  );

  test(
    "[P0] T10.2-37: overall_score valid when all numeric dimensions have null data (neutral fallback)",
    () => {
      const vector = createMockVector();
      // All numeric fields null — price, size, bedroom, location get 0.5 neutral
      const listing = createMockListing({
        price: null,
        sizeSqm: null,
        bedrooms: null,
        city: null,
        latitude: null,
        longitude: null,
      });
      const result = computeListingFitScore(vector, listing);

      // All 4 missing-data dimensions should be neutral (0.5)
      expect(result.dimensionScores.priceScore).toBe(0.5);
      expect(result.dimensionScores.sizeScore).toBe(0.5);
      expect(result.dimensionScores.bedroomScore).toBe(0.5);
      expect(result.dimensionScores.locationScore).toBe(0.5);

      // Score should still be valid and in [0, 1]
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(1);
      expect(Number.isFinite(result.overallScore)).toBe(true);
    }
  );

  test(
    "[P1] T10.2-38: incomplete dimensions get 0.5 neutral, overall redistributes available weights",
    () => {
      const vector = createMockVector();
      // Only price is null — the rest should compute normally
      const listing = createMockListing({ price: null });
      const result = computeListingFitScore(vector, listing);

      // priceScore should be 0.5
      expect(result.dimensionScores.priceScore).toBe(0.5);

      // Overall score should re-weight excluding the missing dimension (price)
      const ds = result.dimensionScores;
      const availableWeight =
        FIT_SCORE_WEIGHTS.locationScore +
        FIT_SCORE_WEIGHTS.sizeScore +
        FIT_SCORE_WEIGHTS.bedroomScore +
        FIT_SCORE_WEIGHTS.photoAffinityScore +
        FIT_SCORE_WEIGHTS.engagementDepthScore;
        
      const expectedOverall = (
        ds.locationScore * FIT_SCORE_WEIGHTS.locationScore +
        ds.sizeScore * FIT_SCORE_WEIGHTS.sizeScore +
        ds.bedroomScore * FIT_SCORE_WEIGHTS.bedroomScore +
        ds.photoAffinityScore * FIT_SCORE_WEIGHTS.photoAffinityScore +
        ds.engagementDepthScore * FIT_SCORE_WEIGHTS.engagementDepthScore
      ) / availableWeight;
      
      expect(result.overallScore).toBeCloseTo(expectedOverall, 4);
    }
  );
});

// ─── AC3: Function Signature & Return Shape ───────────────────────────────────

describe("Story 10.2 — AC3: Function Signature & Return Shape", () => {
  test(
    "[P0] T10.2-39: computeListingFitScore is synchronous (pure, no I/O)",
    () => {
      const vector = createMockVector();
      const listing = createMockListing();

      // The function should return directly — not a Promise
      const result = computeListingFitScore(vector, listing);
      expect(result).toBeDefined();
      // Verify it's not a Promise
      expect(result).not.toBeInstanceOf(Promise);
    }
  );

  test(
    "[P0] T10.2-40: return shape is { overallScore, dimensionScores, recommendedPhotoIndex }",
    () => {
      const vector = createMockVector();
      const listing = createMockListing();
      const result = computeListingFitScore(vector, listing);

      expect(result).toHaveProperty("overallScore");
      expect(result).toHaveProperty("dimensionScores");
      expect(result).toHaveProperty("recommendedPhotoIndex");
      expect(Object.keys(result)).toHaveLength(3);
    }
  );
});

// ─── AC3: Edge Cases ──────────────────────────────────────────────────────────

describe("Story 10.2 — AC3: Edge Cases", () => {
  test(
    "[P1] T10.2-41: perfect match listing produces overallScore close to 1.0",
    () => {
      // Vector that perfectly matches the listing
      const vector = createMockVector({
        priceAffinity: {
          mean: 300000,
          stddev: 50000,
          rangeMin: 200000,
          rangeMax: 400000,
        },
        sizeAffinity: { mean: 100, stddev: 20 },
        bedroomAffinity: { mode: 3, distribution: { "3": 1.0 } },
        locationAffinity: {
          preferredCities: ["Madrid"],
          geoCentroid: { lat: 40.42, lng: -3.71 },
        },
        engagementDepth: {
          avgScrollDepthPct: 0.85,
          avgDetailViewMs: 7000,
        },
      });
      const listing = createMockListing({
        price: 300000,
        sizeSqm: 100,
        bedrooms: 3,
        city: "Madrid",
      });
      const result = computeListingFitScore(vector, listing);

      // Should be very high — close to 1.0
      expect(result.overallScore).toBeGreaterThan(0.8);
    }
  );

  test(
    "[P1] T10.2-42: completely mismatched listing produces low overallScore",
    () => {
      const vector = createMockVector({
        priceAffinity: {
          mean: 100000,
          stddev: 10000,
          rangeMin: 80000,
          rangeMax: 120000,
        },
        sizeAffinity: { mean: 40, stddev: 5 },
        bedroomAffinity: { mode: 1, distribution: { "1": 0.9, "2": 0.1 } },
        locationAffinity: {
          preferredCities: ["Bilbao"],
          geoCentroid: { lat: 43.263, lng: -2.935 },
        },
        engagementDepth: {
          avgScrollDepthPct: 0.2,
          avgDetailViewMs: 1000,
        },
      });
      const listing = createMockListing({
        price: 5000000,
        sizeSqm: 500,
        bedrooms: 8,
        city: "Malaga",
        latitude: 36.721,
        longitude: -4.421,
      });
      const result = computeListingFitScore(vector, listing);

      expect(result.overallScore).toBeLessThan(0.4);
    }
  );

  test(
    "[P2] T10.2-43: deterministic — same inputs always produce same output",
    () => {
      const vector = createMockVector();
      const listing = createMockListing();

      const result1 = computeListingFitScore(vector, listing);
      const result2 = computeListingFitScore(vector, listing);

      expect(result1.overallScore).toBe(result2.overallScore);
      expect(result1.dimensionScores).toEqual(result2.dimensionScores);
    }
  );
});
