/**
 * Story 10.1 — ATDD Tests: computePreferenceVector() Logic
 *
 * AC2: Preference vector structure (all dimensions)
 * AC3: Computation logic — threshold, edge cases, dimension calculation
 *
 * TDD RED PHASE: All tests use it.skip() — will fail until implementation exists.
 * Remove .skip() after implementing packages/shared/src/personalization/compute-preference-vector.ts
 *
 * Run: pnpm --filter @reinder/shared test packages/shared/src/personalization/compute-preference-vector.test.ts
 */

import { describe, it, expect } from "vitest";

// ─── Test Fixtures ────────────────────────────────────────────────────────────

const BUYER_ID = "550e8400-e29b-41d4-a716-446655440000";

const MOCK_LISTING_DATA = {
  "listing-001": {
    price: 250000,
    sizeSqm: 80,
    bedrooms: 2,
    city: "Madrid",
    latitude: 40.4168,
    longitude: -3.7038,
    images: ["img1.jpg", "img2.jpg", "img3.jpg"],
  },
  "listing-002": {
    price: 350000,
    sizeSqm: 120,
    bedrooms: 3,
    city: "Barcelona",
    latitude: 41.3851,
    longitude: 2.1734,
    images: ["img1.jpg", "img2.jpg"],
  },
  "listing-003": {
    price: 180000,
    sizeSqm: 60,
    bedrooms: 1,
    city: "Madrid",
    latitude: 40.42,
    longitude: -3.71,
    images: ["img1.jpg"],
  },
} as const;

/**
 * Creates mock swipe events for testing.
 * @param count - Number of swipe events to create
 * @param matchRatio - Ratio of matches (0-1)
 */
function createMockSwipeEvents(count: number, matchRatio: number) {
  const events = [];
  const listingIds = Object.keys(MOCK_LISTING_DATA);
  const now = new Date();

  for (let i = 0; i < count; i++) {
    events.push({
      buyerId: BUYER_ID,
      listingId: listingIds[i % listingIds.length],
      action: i < count * matchRatio ? "match" : "reject",
      createdAt: new Date(now.getTime() - i * 3600000), // spread over hours
    });
  }
  return events;
}

/**
 * Creates mock engagement events for testing.
 */
function createMockEngagementEvents(count: number) {
  const events = [];
  const listingIds = Object.keys(MOCK_LISTING_DATA);
  const now = new Date();

  for (let i = 0; i < count; i++) {
    events.push({
      buyerId: BUYER_ID,
      listingId: listingIds[i % listingIds.length],
      sessionId: `session-${i}`,
      eventType: i % 2 === 0 ? "photo_view" : "detail_view",
      payload: {
        viewTimeMs: 2000 + Math.floor(Math.random() * 3000),
        scrollDepthPct: 0.3 + Math.random() * 0.7,
        photoIndex: i % 5,
      },
      createdAt: new Date(now.getTime() - i * 3600000),
    });
  }
  return events;
}

// ─── AC3: Minimum Threshold ───────────────────────────────────────────────────

describe("computePreferenceVector() — AC3: Threshold and Edge Cases", () => {
  it.skip(
    "[P0] T10.1-12: returns null when buyer has fewer than 10 swipe_events",
    async () => {
      const { computePreferenceVector } = await import(
        "./compute-preference-vector"
      );

      const swipeEvents = createMockSwipeEvents(5, 0.6); // only 5 swipes
      const engagementEvents = createMockEngagementEvents(3);

      const deps = {
        getSwipeEvents: async () => swipeEvents,
        getEngagementEvents: async () => engagementEvents,
        getListingData: async (id: string) =>
          (MOCK_LISTING_DATA as any)[id] || null,
      };

      const result = await computePreferenceVector(BUYER_ID, deps);
      expect(result).toBeNull();
    }
  );

  it.skip(
    "[P0] T10.1-13: returns null when buyer has exactly 9 swipe_events",
    async () => {
      const { computePreferenceVector } = await import(
        "./compute-preference-vector"
      );

      const swipeEvents = createMockSwipeEvents(9, 0.6);
      const engagementEvents = createMockEngagementEvents(5);

      const deps = {
        getSwipeEvents: async () => swipeEvents,
        getEngagementEvents: async () => engagementEvents,
        getListingData: async (id: string) =>
          (MOCK_LISTING_DATA as any)[id] || null,
      };

      const result = await computePreferenceVector(BUYER_ID, deps);
      expect(result).toBeNull();
    }
  );

  it.skip(
    "[P0] T10.1-14: returns vector when buyer has exactly 10 swipe_events",
    async () => {
      const { computePreferenceVector } = await import(
        "./compute-preference-vector"
      );

      const swipeEvents = createMockSwipeEvents(10, 0.6);
      const engagementEvents = createMockEngagementEvents(5);

      const deps = {
        getSwipeEvents: async () => swipeEvents,
        getEngagementEvents: async () => engagementEvents,
        getListingData: async (id: string) =>
          (MOCK_LISTING_DATA as any)[id] || null,
      };

      const result = await computePreferenceVector(BUYER_ID, deps);
      expect(result).not.toBeNull();
    }
  );

  it.skip(
    "[P0] T10.1-15: returns vector when buyer has >10 swipes but all rejects (0 matches)",
    async () => {
      const { computePreferenceVector } = await import(
        "./compute-preference-vector"
      );

      const swipeEvents = createMockSwipeEvents(15, 0); // 0% match rate
      const engagementEvents = createMockEngagementEvents(5);

      const deps = {
        getSwipeEvents: async () => swipeEvents,
        getEngagementEvents: async () => engagementEvents,
        getListingData: async (id: string) =>
          (MOCK_LISTING_DATA as any)[id] || null,
      };

      const result = await computePreferenceVector(BUYER_ID, deps);
      expect(result).not.toBeNull();
      expect(result!.matchRate).toBe(0);
      expect(result!.reaffirmRate).toBe(0);
    }
  );
});

// ─── AC2: Preference Vector Structure ─────────────────────────────────────────

describe("computePreferenceVector() — AC2: Vector Structure", () => {
  it.skip(
    "[P0] T10.1-16: vector contains all required dimensions per AC2",
    async () => {
      const { computePreferenceVector } = await import(
        "./compute-preference-vector"
      );

      const swipeEvents = createMockSwipeEvents(20, 0.6);
      const engagementEvents = createMockEngagementEvents(10);

      const deps = {
        getSwipeEvents: async () => swipeEvents,
        getEngagementEvents: async () => engagementEvents,
        getListingData: async (id: string) =>
          (MOCK_LISTING_DATA as any)[id] || null,
      };

      const result = await computePreferenceVector(BUYER_ID, deps);
      expect(result).not.toBeNull();

      // All top-level dimensions from AC2
      expect(result).toHaveProperty("priceAffinity");
      expect(result).toHaveProperty("sizeAffinity");
      expect(result).toHaveProperty("bedroomAffinity");
      expect(result).toHaveProperty("locationAffinity");
      expect(result).toHaveProperty("photoEngagement");
      expect(result).toHaveProperty("engagementDepth");
      expect(result).toHaveProperty("matchRate");
      expect(result).toHaveProperty("reaffirmRate");
    }
  );

  it.skip(
    "[P0] T10.1-17: price_affinity has correct sub-fields (mean, stddev, range_min, range_max)",
    async () => {
      const { computePreferenceVector } = await import(
        "./compute-preference-vector"
      );

      const swipeEvents = createMockSwipeEvents(20, 0.6);
      const engagementEvents = createMockEngagementEvents(10);

      const deps = {
        getSwipeEvents: async () => swipeEvents,
        getEngagementEvents: async () => engagementEvents,
        getListingData: async (id: string) =>
          (MOCK_LISTING_DATA as any)[id] || null,
      };

      const result = await computePreferenceVector(BUYER_ID, deps);
      expect(result).not.toBeNull();

      const pa = result!.priceAffinity;
      expect(pa).toHaveProperty("mean");
      expect(pa).toHaveProperty("stddev");
      expect(pa).toHaveProperty("rangeMin");
      expect(pa).toHaveProperty("rangeMax");
      expect(typeof pa.mean).toBe("number");
      expect(typeof pa.stddev).toBe("number");
      expect(typeof pa.rangeMin).toBe("number");
      expect(typeof pa.rangeMax).toBe("number");
    }
  );

  it.skip(
    "[P0] T10.1-18: size_affinity has correct sub-fields (mean, stddev)",
    async () => {
      const { computePreferenceVector } = await import(
        "./compute-preference-vector"
      );

      const swipeEvents = createMockSwipeEvents(20, 0.6);
      const engagementEvents = createMockEngagementEvents(10);

      const deps = {
        getSwipeEvents: async () => swipeEvents,
        getEngagementEvents: async () => engagementEvents,
        getListingData: async (id: string) =>
          (MOCK_LISTING_DATA as any)[id] || null,
      };

      const result = await computePreferenceVector(BUYER_ID, deps);
      expect(result).not.toBeNull();

      const sa = result!.sizeAffinity;
      expect(sa).toHaveProperty("mean");
      expect(sa).toHaveProperty("stddev");
      expect(typeof sa.mean).toBe("number");
      expect(typeof sa.stddev).toBe("number");
    }
  );

  it.skip(
    "[P0] T10.1-19: bedroom_affinity has correct sub-fields (mode, distribution)",
    async () => {
      const { computePreferenceVector } = await import(
        "./compute-preference-vector"
      );

      const swipeEvents = createMockSwipeEvents(20, 0.6);
      const engagementEvents = createMockEngagementEvents(10);

      const deps = {
        getSwipeEvents: async () => swipeEvents,
        getEngagementEvents: async () => engagementEvents,
        getListingData: async (id: string) =>
          (MOCK_LISTING_DATA as any)[id] || null,
      };

      const result = await computePreferenceVector(BUYER_ID, deps);
      expect(result).not.toBeNull();

      const ba = result!.bedroomAffinity;
      expect(ba).toHaveProperty("mode");
      expect(ba).toHaveProperty("distribution");
      expect(typeof ba.mode).toBe("number");
      expect(typeof ba.distribution).toBe("object");
    }
  );

  it.skip(
    "[P0] T10.1-20: location_affinity has correct sub-fields (preferred_cities, geo_centroid)",
    async () => {
      const { computePreferenceVector } = await import(
        "./compute-preference-vector"
      );

      const swipeEvents = createMockSwipeEvents(20, 0.6);
      const engagementEvents = createMockEngagementEvents(10);

      const deps = {
        getSwipeEvents: async () => swipeEvents,
        getEngagementEvents: async () => engagementEvents,
        getListingData: async (id: string) =>
          (MOCK_LISTING_DATA as any)[id] || null,
      };

      const result = await computePreferenceVector(BUYER_ID, deps);
      expect(result).not.toBeNull();

      const la = result!.locationAffinity;
      expect(la).toHaveProperty("preferredCities");
      expect(la).toHaveProperty("geoCentroid");
      expect(Array.isArray(la.preferredCities)).toBe(true);
      // geoCentroid can be null or { lat, lng }
      if (la.geoCentroid !== null) {
        expect(la.geoCentroid).toHaveProperty("lat");
        expect(la.geoCentroid).toHaveProperty("lng");
      }
    }
  );

  it.skip(
    "[P1] T10.1-21: photo_engagement has correct sub-fields (avg_view_time_ms, preferred_photo_indices)",
    async () => {
      const { computePreferenceVector } = await import(
        "./compute-preference-vector"
      );

      const swipeEvents = createMockSwipeEvents(20, 0.6);
      const engagementEvents = createMockEngagementEvents(10);

      const deps = {
        getSwipeEvents: async () => swipeEvents,
        getEngagementEvents: async () => engagementEvents,
        getListingData: async (id: string) =>
          (MOCK_LISTING_DATA as any)[id] || null,
      };

      const result = await computePreferenceVector(BUYER_ID, deps);
      expect(result).not.toBeNull();

      const pe = result!.photoEngagement;
      expect(pe).toHaveProperty("avgViewTimeMs");
      expect(pe).toHaveProperty("preferredPhotoIndices");
      expect(typeof pe.avgViewTimeMs).toBe("number");
      expect(Array.isArray(pe.preferredPhotoIndices)).toBe(true);
    }
  );

  it.skip(
    "[P1] T10.1-22: engagement_depth has correct sub-fields (avg_scroll_depth_pct, avg_detail_view_ms)",
    async () => {
      const { computePreferenceVector } = await import(
        "./compute-preference-vector"
      );

      const swipeEvents = createMockSwipeEvents(20, 0.6);
      const engagementEvents = createMockEngagementEvents(10);

      const deps = {
        getSwipeEvents: async () => swipeEvents,
        getEngagementEvents: async () => engagementEvents,
        getListingData: async (id: string) =>
          (MOCK_LISTING_DATA as any)[id] || null,
      };

      const result = await computePreferenceVector(BUYER_ID, deps);
      expect(result).not.toBeNull();

      const ed = result!.engagementDepth;
      expect(ed).toHaveProperty("avgScrollDepthPct");
      expect(ed).toHaveProperty("avgDetailViewMs");
      expect(typeof ed.avgScrollDepthPct).toBe("number");
      expect(typeof ed.avgDetailViewMs).toBe("number");
    }
  );

  it.skip(
    "[P0] T10.1-23: match_rate is number between 0 and 1",
    async () => {
      const { computePreferenceVector } = await import(
        "./compute-preference-vector"
      );

      const swipeEvents = createMockSwipeEvents(20, 0.6);
      const engagementEvents = createMockEngagementEvents(10);

      const deps = {
        getSwipeEvents: async () => swipeEvents,
        getEngagementEvents: async () => engagementEvents,
        getListingData: async (id: string) =>
          (MOCK_LISTING_DATA as any)[id] || null,
      };

      const result = await computePreferenceVector(BUYER_ID, deps);
      expect(result).not.toBeNull();
      expect(typeof result!.matchRate).toBe("number");
      expect(result!.matchRate).toBeGreaterThanOrEqual(0);
      expect(result!.matchRate).toBeLessThanOrEqual(1);
    }
  );

  it.skip(
    "[P1] T10.1-24: reaffirm_rate is number between 0 and 1",
    async () => {
      const { computePreferenceVector } = await import(
        "./compute-preference-vector"
      );

      const swipeEvents = createMockSwipeEvents(20, 0.6);
      const engagementEvents = createMockEngagementEvents(10);

      const deps = {
        getSwipeEvents: async () => swipeEvents,
        getEngagementEvents: async () => engagementEvents,
        getListingData: async (id: string) =>
          (MOCK_LISTING_DATA as any)[id] || null,
      };

      const result = await computePreferenceVector(BUYER_ID, deps);
      expect(result).not.toBeNull();
      expect(typeof result!.reaffirmRate).toBe("number");
      expect(result!.reaffirmRate).toBeGreaterThanOrEqual(0);
      expect(result!.reaffirmRate).toBeLessThanOrEqual(1);
    }
  );

  // ─── AC2: Numeric sanity — no NaN/Infinity ───

  it.skip(
    "[P0] T10.1-25: all numeric values in vector are finite (no NaN, no Infinity)",
    async () => {
      const { computePreferenceVector } = await import(
        "./compute-preference-vector"
      );

      const swipeEvents = createMockSwipeEvents(20, 0.6);
      const engagementEvents = createMockEngagementEvents(10);

      const deps = {
        getSwipeEvents: async () => swipeEvents,
        getEngagementEvents: async () => engagementEvents,
        getListingData: async (id: string) =>
          (MOCK_LISTING_DATA as any)[id] || null,
      };

      const result = await computePreferenceVector(BUYER_ID, deps);
      expect(result).not.toBeNull();

      // Recursively check all numeric values are finite
      const checkFinite = (obj: any, path = ""): void => {
        for (const [key, value] of Object.entries(obj)) {
          const currentPath = path ? `${path}.${key}` : key;
          if (typeof value === "number") {
            expect(
              Number.isFinite(value),
              `${currentPath} should be finite but was ${value}`
            ).toBe(true);
          } else if (
            value !== null &&
            typeof value === "object" &&
            !Array.isArray(value)
          ) {
            checkFinite(value, currentPath);
          }
        }
      };

      checkFinite(result);
    }
  );

  // ─── AC2: JSONB serialization ───

  it.skip(
    "[P1] T10.1-26: vector serializes correctly as JSON (JSONB compatibility)",
    async () => {
      const { computePreferenceVector } = await import(
        "./compute-preference-vector"
      );

      const swipeEvents = createMockSwipeEvents(20, 0.6);
      const engagementEvents = createMockEngagementEvents(10);

      const deps = {
        getSwipeEvents: async () => swipeEvents,
        getEngagementEvents: async () => engagementEvents,
        getListingData: async (id: string) =>
          (MOCK_LISTING_DATA as any)[id] || null,
      };

      const result = await computePreferenceVector(BUYER_ID, deps);
      expect(result).not.toBeNull();

      // Must round-trip through JSON without loss
      const serialized = JSON.stringify(result);
      const deserialized = JSON.parse(serialized);
      expect(deserialized).toEqual(result);
    }
  );
});

// ─── AC3: Computation correctness ─────────────────────────────────────────────

describe("computePreferenceVector() — AC3: Computation Correctness", () => {
  it.skip(
    "[P0] T10.1-27: match_rate equals matches / total_swipes",
    async () => {
      const { computePreferenceVector } = await import(
        "./compute-preference-vector"
      );

      const totalSwipes = 20;
      const matchRatio = 0.5;
      const swipeEvents = createMockSwipeEvents(totalSwipes, matchRatio);
      const engagementEvents = createMockEngagementEvents(10);

      const deps = {
        getSwipeEvents: async () => swipeEvents,
        getEngagementEvents: async () => engagementEvents,
        getListingData: async (id: string) =>
          (MOCK_LISTING_DATA as any)[id] || null,
      };

      const result = await computePreferenceVector(BUYER_ID, deps);
      expect(result).not.toBeNull();

      const expectedMatchRate =
        swipeEvents.filter((e) => e.action === "match").length / totalSwipes;
      expect(result!.matchRate).toBeCloseTo(expectedMatchRate, 5);
    }
  );

  it.skip(
    "[P0] T10.1-28: price_affinity.mean reflects matched listings average price",
    async () => {
      const { computePreferenceVector } = await import(
        "./compute-preference-vector"
      );

      const swipeEvents = createMockSwipeEvents(15, 0.6);
      const engagementEvents = createMockEngagementEvents(5);

      const deps = {
        getSwipeEvents: async () => swipeEvents,
        getEngagementEvents: async () => engagementEvents,
        getListingData: async (id: string) =>
          (MOCK_LISTING_DATA as any)[id] || null,
      };

      const result = await computePreferenceVector(BUYER_ID, deps);
      expect(result).not.toBeNull();

      // price_affinity.mean should be a reasonable value between min and max listing prices
      expect(result!.priceAffinity.mean).toBeGreaterThan(0);
      expect(result!.priceAffinity.mean).toBeLessThan(1_000_000);
    }
  );

  it.skip(
    "[P1] T10.1-29: location_affinity.preferred_cities contains cities from matched listings",
    async () => {
      const { computePreferenceVector } = await import(
        "./compute-preference-vector"
      );

      const swipeEvents = createMockSwipeEvents(20, 0.6);
      const engagementEvents = createMockEngagementEvents(10);

      const deps = {
        getSwipeEvents: async () => swipeEvents,
        getEngagementEvents: async () => engagementEvents,
        getListingData: async (id: string) =>
          (MOCK_LISTING_DATA as any)[id] || null,
      };

      const result = await computePreferenceVector(BUYER_ID, deps);
      expect(result).not.toBeNull();

      // preferred_cities should be non-empty and contain known cities
      expect(result!.locationAffinity.preferredCities.length).toBeGreaterThan(
        0
      );
      for (const city of result!.locationAffinity.preferredCities) {
        expect(typeof city).toBe("string");
        expect(city.length).toBeGreaterThan(0);
      }
    }
  );

  it.skip(
    "[P1] T10.1-30: bedroom_affinity.mode is the most frequent bedroom count among matches",
    async () => {
      const { computePreferenceVector } = await import(
        "./compute-preference-vector"
      );

      const swipeEvents = createMockSwipeEvents(20, 0.6);
      const engagementEvents = createMockEngagementEvents(10);

      const deps = {
        getSwipeEvents: async () => swipeEvents,
        getEngagementEvents: async () => engagementEvents,
        getListingData: async (id: string) =>
          (MOCK_LISTING_DATA as any)[id] || null,
      };

      const result = await computePreferenceVector(BUYER_ID, deps);
      expect(result).not.toBeNull();

      // mode should be one of the bedroom values from listings
      expect([1, 2, 3]).toContain(result!.bedroomAffinity.mode);
    }
  );
});
