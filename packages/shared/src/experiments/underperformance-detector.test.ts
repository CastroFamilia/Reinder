/**
 * Story 9.5 — ATDD Tests: Underperformance Detection Algorithm
 *
 * AC2: Algoritmo de detección de underperformance
 *   - Z-score < -1.0 on 2+ metrics → flagged
 *   - Z-score > -1.0 → NOT flagged
 *   - Listings with < 50 impressions → excluded
 *   - Listings with active experiment → excluded
 *   - Listings with pending recommendation → excluded
 *   - Agency with 1 listing → uses platform avg, relaxed threshold -0.5
 *
 * Test Design IDs: T9.5-02, T9.5-03, T9.5-04, T9.5-05, T9.5-06, T9.5-07
 *
 * TDD RED PHASE: Tests will fail until the detection algorithm is implemented.
 * The detection logic lives in the SQL function `generate_experiment_recommendations()`,
 * but these tests verify the TypeScript helper/service that orchestrates detection logic.
 *
 * Run: pnpm --filter @reinder/shared test packages/shared/src/experiments/underperformance-detector.test.ts
 */

import { describe, it, expect } from "vitest";

// ─── Types for test data ────────────────────────────────────────────────────

interface ListingMetrics {
  listingId: string;
  agencyId: string;
  impressions: number;
  matchRate: number;
  avgViewTimeMs: number;
  reaffirmRate: number | null;
}

interface AgencyStats {
  agencyId: string;
  avgMatchRate: number;
  stdMatchRate: number;
  avgViewTimeMs: number;
  stdViewTimeMs: number;
  avgReaffirmRate: number | null;
  stdReaffirmRate: number | null;
  listingCount: number;
}

interface UnderperformanceResult {
  listingId: string;
  agencyId: string;
  isUnderperforming: boolean;
  underperformingMetricCount: number;
  zScores: {
    matchRate: number;
    viewTime: number;
    reaffirmRate: number | null;
  };
}

// ─── Test Fixtures ──────────────────────────────────────────────────────────

const AGENCY_ID = "agency-uuid-001";
const PLATFORM_STATS: AgencyStats = {
  agencyId: "platform",
  avgMatchRate: 0.065,
  stdMatchRate: 0.02,
  avgViewTimeMs: 4500,
  stdViewTimeMs: 1200,
  avgReaffirmRate: 0.35,
  stdReaffirmRate: 0.1,
  listingCount: 100,
};

const AGENCY_STATS: AgencyStats = {
  agencyId: AGENCY_ID,
  avgMatchRate: 0.065,
  stdMatchRate: 0.02,
  avgViewTimeMs: 4500,
  stdViewTimeMs: 1200,
  avgReaffirmRate: 0.35,
  stdReaffirmRate: 0.1,
  listingCount: 5,
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("Underperformance Detection — AC2: Detection Algorithm", () => {
  // ─── T9.5-02: Listing with z-score < -1.0 on 2+ metrics → flagged ───

  it("[P0] T9.5-02: flags listing when z-score < -1.0 on 2+ metrics (match_rate AND view_time)", async () => {
    const { detectUnderperformance } = await import(
      "./underperformance-detector"
    );

    // Listing with significantly below-average match_rate and view_time
    const listing: ListingMetrics = {
      listingId: "listing-underperform-001",
      agencyId: AGENCY_ID,
      impressions: 200,
      matchRate: 0.02, // z = (0.02 - 0.065) / 0.02 = -2.25 (< -1.0 ✓)
      avgViewTimeMs: 2000, // z = (2000 - 4500) / 1200 = -2.08 (< -1.0 ✓)
      reaffirmRate: 0.35, // z = (0.35 - 0.35) / 0.1 = 0.0 (OK)
    };

    const result = detectUnderperformance(listing, AGENCY_STATS, PLATFORM_STATS);

    expect(result.isUnderperforming).toBe(true);
    expect(result.underperformingMetricCount).toBeGreaterThanOrEqual(2);
    expect(result.zScores.matchRate).toBeLessThan(-1.0);
    expect(result.zScores.viewTime).toBeLessThan(-1.0);
  });

  // ─── T9.5-03: Listing with z-score > -1.0 on all metrics → NOT flagged ───

  it("[P0] T9.5-03: does NOT flag listing when z-score > -1.0 on all metrics", async () => {
    const { detectUnderperformance } = await import(
      "./underperformance-detector"
    );

    // Listing with slightly below average but within normal range
    const listing: ListingMetrics = {
      listingId: "listing-normal-001",
      agencyId: AGENCY_ID,
      impressions: 200,
      matchRate: 0.055, // z = (0.055 - 0.065) / 0.02 = -0.5 (> -1.0 ✓)
      avgViewTimeMs: 4000, // z = (4000 - 4500) / 1200 = -0.42 (> -1.0 ✓)
      reaffirmRate: 0.30, // z = (0.30 - 0.35) / 0.1 = -0.5 (> -1.0 ✓)
    };

    const result = detectUnderperformance(listing, AGENCY_STATS, PLATFORM_STATS);

    expect(result.isUnderperforming).toBe(false);
  });

  // ─── T9.5-03b: Listing with only 1 metric below -1.0 → NOT flagged ───

  it("[P0] T9.5-03b: does NOT flag listing when only 1 metric has z-score < -1.0 (needs 2+)", async () => {
    const { detectUnderperformance } = await import(
      "./underperformance-detector"
    );

    // Only match_rate is underperforming
    const listing: ListingMetrics = {
      listingId: "listing-single-low-001",
      agencyId: AGENCY_ID,
      impressions: 200,
      matchRate: 0.02, // z = -2.25 (< -1.0 ✓ — only one)
      avgViewTimeMs: 4500, // z = 0.0 (OK)
      reaffirmRate: 0.35, // z = 0.0 (OK)
    };

    const result = detectUnderperformance(listing, AGENCY_STATS, PLATFORM_STATS);

    expect(result.isUnderperforming).toBe(false);
    expect(result.underperformingMetricCount).toBe(1);
  });

  // ─── T9.5-04: Listing with < 50 impressions → excluded ───

  it("[P0] T9.5-04: excludes listing with < 50 impressions from analysis", async () => {
    const { detectUnderperformance } = await import(
      "./underperformance-detector"
    );

    const listing: ListingMetrics = {
      listingId: "listing-low-impressions-001",
      agencyId: AGENCY_ID,
      impressions: 30, // Below minimum threshold of 50
      matchRate: 0.01, // Would be underperforming if analyzed
      avgViewTimeMs: 1000, // Would be underperforming if analyzed
      reaffirmRate: 0.05, // Would be underperforming if analyzed
    };

    const result = detectUnderperformance(listing, AGENCY_STATS, PLATFORM_STATS);

    // Must not flag — insufficient data
    expect(result.isUnderperforming).toBe(false);
  });

  // ─── T9.5-05: shouldExclude returns true for listing with active experiment ───

  it("[P0] T9.5-05: excludes listing with an active experiment (draft, running, or paused)", async () => {
    const { shouldExcludeListing } = await import(
      "./underperformance-detector"
    );

    // Listing has an active experiment in 'running' status
    const result = shouldExcludeListing({
      listingId: "listing-with-experiment-001",
      hasActiveExperiment: true,
      hasPendingRecommendation: false,
    });

    expect(result).toBe(true);
  });

  // ─── T9.5-06: shouldExclude returns true for listing with pending recommendation ───

  it("[P1] T9.5-06: excludes listing with a pending recommendation", async () => {
    const { shouldExcludeListing } = await import(
      "./underperformance-detector"
    );

    const result = shouldExcludeListing({
      listingId: "listing-with-recommendation-001",
      hasActiveExperiment: false,
      hasPendingRecommendation: true,
    });

    expect(result).toBe(true);
  });

  // ─── T9.5-07: Agency with 1 listing → uses platform avg, relaxed threshold ───

  it("[P1] T9.5-07: uses platform avg as fallback for agency with 1 listing, with relaxed -0.5 threshold", async () => {
    const { detectUnderperformance } = await import(
      "./underperformance-detector"
    );

    // Agency has only 1 listing — cannot compute stddev
    const singleListingAgencyStats: AgencyStats = {
      agencyId: "agency-single-listing",
      avgMatchRate: 0.03,
      stdMatchRate: 0, // Cannot compute with n=1
      avgViewTimeMs: 2000,
      stdViewTimeMs: 0,
      avgReaffirmRate: 0.1,
      stdReaffirmRate: 0,
      listingCount: 1,
    };

    // Listing slightly below platform average (would pass -1.0 but fail -0.5)
    const listing: ListingMetrics = {
      listingId: "listing-single-agency-001",
      agencyId: "agency-single-listing",
      impressions: 100,
      matchRate: 0.05, // z vs platform = (0.05 - 0.065) / 0.02 = -0.75 (< -0.5 ✓)
      avgViewTimeMs: 3600, // z vs platform = (3600 - 4500) / 1200 = -0.75 (< -0.5 ✓)
      reaffirmRate: 0.35, // z vs platform = 0.0 (OK)
    };

    const result = detectUnderperformance(
      listing,
      singleListingAgencyStats,
      PLATFORM_STATS
    );

    // With relaxed threshold of -0.5 for platform fallback, 2 metrics qualify
    expect(result.isUnderperforming).toBe(true);
  });

  // ─── T9.5-07b: Agency with 1 listing, metrics barely above relaxed threshold ───

  it("[P1] T9.5-07b: does NOT flag listing in single-listing agency when above relaxed -0.5 threshold", async () => {
    const { detectUnderperformance } = await import(
      "./underperformance-detector"
    );

    const singleListingAgencyStats: AgencyStats = {
      agencyId: "agency-single-listing-2",
      avgMatchRate: 0.06,
      stdMatchRate: 0,
      avgViewTimeMs: 4200,
      stdViewTimeMs: 0,
      avgReaffirmRate: 0.33,
      stdReaffirmRate: 0,
      listingCount: 1,
    };

    // Listing close to platform average (z > -0.5)
    const listing: ListingMetrics = {
      listingId: "listing-single-agency-002",
      agencyId: "agency-single-listing-2",
      impressions: 100,
      matchRate: 0.06, // z = (0.06 - 0.065) / 0.02 = -0.25 (> -0.5)
      avgViewTimeMs: 4200, // z = (4200 - 4500) / 1200 = -0.25 (> -0.5)
      reaffirmRate: 0.33, // z = (0.33 - 0.35) / 0.1 = -0.2 (> -0.5)
    };

    const result = detectUnderperformance(
      listing,
      singleListingAgencyStats,
      PLATFORM_STATS
    );

    expect(result.isUnderperforming).toBe(false);
  });

  // ─── T9.5-02b: Listing with all 3 metrics underperforming ───

  it("[P0] T9.5-02b: flags listing when all 3 metrics have z-score < -1.0", async () => {
    const { detectUnderperformance } = await import(
      "./underperformance-detector"
    );

    const listing: ListingMetrics = {
      listingId: "listing-all-bad-001",
      agencyId: AGENCY_ID,
      impressions: 300,
      matchRate: 0.01, // z = (0.01 - 0.065) / 0.02 = -2.75
      avgViewTimeMs: 1500, // z = (1500 - 4500) / 1200 = -2.5
      reaffirmRate: 0.1, // z = (0.1 - 0.35) / 0.1 = -2.5
    };

    const result = detectUnderperformance(listing, AGENCY_STATS, PLATFORM_STATS);

    expect(result.isUnderperforming).toBe(true);
    expect(result.underperformingMetricCount).toBe(3);
  });

  // ─── T9.5-02c: Z-score calculation is correct ───

  it("[P0] T9.5-02c: calculates z-scores correctly using (value - mean) / stddev", async () => {
    const { detectUnderperformance } = await import(
      "./underperformance-detector"
    );

    const listing: ListingMetrics = {
      listingId: "listing-zscore-check",
      agencyId: AGENCY_ID,
      impressions: 200,
      matchRate: 0.025, // Expected z = (0.025 - 0.065) / 0.02 = -2.0
      avgViewTimeMs: 3300, // Expected z = (3300 - 4500) / 1200 = -1.0
      reaffirmRate: 0.25, // Expected z = (0.25 - 0.35) / 0.1 = -1.0
    };

    const result = detectUnderperformance(listing, AGENCY_STATS, PLATFORM_STATS);

    // Verify z-scores are approximately correct
    expect(result.zScores.matchRate).toBeCloseTo(-2.0, 1);
    expect(result.zScores.viewTime).toBeCloseTo(-1.0, 1);
    expect(result.zScores.reaffirmRate).toBeCloseTo(-1.0, 1);
  });

  // ─── T9.5-02d: Handles null reaffirm_rate (match_count = 0) ───

  it("[P1] T9.5-02d: handles null reaffirm_rate correctly (excludes from count)", async () => {
    const { detectUnderperformance } = await import(
      "./underperformance-detector"
    );

    // No matches → reaffirm_rate is null → only 2 metrics evaluated
    const listing: ListingMetrics = {
      listingId: "listing-no-matches",
      agencyId: AGENCY_ID,
      impressions: 200,
      matchRate: 0.02, // z = -2.25 (underperforming)
      avgViewTimeMs: 2000, // z = -2.08 (underperforming)
      reaffirmRate: null, // Excluded (no matches)
    };

    const result = detectUnderperformance(listing, AGENCY_STATS, PLATFORM_STATS);

    expect(result.isUnderperforming).toBe(true);
    expect(result.underperformingMetricCount).toBe(2);
    expect(result.zScores.reaffirmRate).toBeNull();
  });
});
