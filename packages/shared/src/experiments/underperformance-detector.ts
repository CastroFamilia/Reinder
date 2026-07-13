/**
 * Underperformance Detection Algorithm
 *
 * Detects listings that are significantly underperforming based on z-score
 * analysis against agency or platform averages.
 *
 * Story 9.5, AC2
 *
 * NOTE: The primary detection runs in the SQL function
 * `generate_experiment_recommendations()`. This TypeScript module provides
 * the same logic for unit-testable validation and potential client-side use.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ListingMetrics {
  listingId: string;
  agencyId: string;
  impressions: number;
  matchRate: number;
  avgViewTimeMs: number;
  reaffirmRate: number | null;
}

export interface AgencyStats {
  agencyId: string;
  avgMatchRate: number;
  stdMatchRate: number;
  avgViewTimeMs: number;
  stdViewTimeMs: number;
  avgReaffirmRate: number | null;
  stdReaffirmRate: number | null;
  listingCount: number;
}

export interface UnderperformanceResult {
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

// ─── Constants ──────────────────────────────────────────────────────────────

/** Minimum impressions required for analysis */
const MIN_IMPRESSIONS = 50;

/** Z-score threshold for agency-level comparison (2+ listings) */
const Z_THRESHOLD_AGENCY = -1.0;

/** Relaxed z-score threshold when using platform fallback (1 listing) */
const Z_THRESHOLD_PLATFORM = -0.5;

/** Minimum number of underperforming metrics to flag a listing */
const MIN_UNDERPERFORMING_METRICS = 2;

// ─── Detection Logic ────────────────────────────────────────────────────────

/**
 * Calculates z-score: (value - mean) / stddev.
 * Returns 0 if stddev is 0 or undefined (cannot meaningfully compute).
 */
function zScore(value: number, mean: number, stddev: number): number {
  if (stddev <= 0) return 0;
  return (value - mean) / stddev;
}

/**
 * Detects whether a listing is underperforming based on z-score analysis.
 *
 * - Uses agency stats if listingCount >= 2 (meaningful stddev).
 * - Falls back to platform stats with relaxed threshold (-0.5) for agencies with 1 listing.
 * - Requires z < threshold on 2+ metrics to flag as underperforming.
 * - Listings with < 50 impressions are automatically excluded (insufficient data).
 */
export function detectUnderperformance(
  listing: ListingMetrics,
  agencyStats: AgencyStats,
  platformStats: AgencyStats,
): UnderperformanceResult {
  const { listingId, agencyId } = listing;

  // Insufficient data — cannot analyze
  if (listing.impressions < MIN_IMPRESSIONS) {
    return {
      listingId,
      agencyId,
      isUnderperforming: false,
      underperformingMetricCount: 0,
      zScores: { matchRate: 0, viewTime: 0, reaffirmRate: null },
    };
  }

  // Determine whether to use agency or platform stats
  const usesPlatformFallback = agencyStats.listingCount < 2;
  const threshold = usesPlatformFallback
    ? Z_THRESHOLD_PLATFORM
    : Z_THRESHOLD_AGENCY;

  // Select reference stats
  const refAvgMatchRate = usesPlatformFallback
    ? platformStats.avgMatchRate
    : agencyStats.avgMatchRate;
  const refStdMatchRate = usesPlatformFallback
    ? platformStats.stdMatchRate
    : agencyStats.stdMatchRate;
  const refAvgViewTime = usesPlatformFallback
    ? platformStats.avgViewTimeMs
    : agencyStats.avgViewTimeMs;
  const refStdViewTime = usesPlatformFallback
    ? platformStats.stdViewTimeMs
    : agencyStats.stdViewTimeMs;
  const refAvgReaffirm = usesPlatformFallback
    ? platformStats.avgReaffirmRate
    : agencyStats.avgReaffirmRate;
  const refStdReaffirm = usesPlatformFallback
    ? platformStats.stdReaffirmRate
    : agencyStats.stdReaffirmRate;

  // Calculate z-scores
  const zMatchRate = zScore(listing.matchRate, refAvgMatchRate, refStdMatchRate);
  const zViewTime = zScore(listing.avgViewTimeMs, refAvgViewTime, refStdViewTime);

  let zReaffirm: number | null = null;
  if (
    listing.reaffirmRate !== null &&
    refAvgReaffirm !== null &&
    refStdReaffirm !== null &&
    refStdReaffirm > 0
  ) {
    zReaffirm = zScore(listing.reaffirmRate, refAvgReaffirm, refStdReaffirm);
  }

  // Count underperforming metrics
  let underperformingCount = 0;
  if (zMatchRate < threshold) underperformingCount++;
  if (zViewTime < threshold) underperformingCount++;
  if (zReaffirm !== null && zReaffirm < threshold) underperformingCount++;

  return {
    listingId,
    agencyId,
    isUnderperforming: underperformingCount >= MIN_UNDERPERFORMING_METRICS,
    underperformingMetricCount: underperformingCount,
    zScores: {
      matchRate: zMatchRate,
      viewTime: zViewTime,
      reaffirmRate: zReaffirm,
    },
  };
}

// ─── Exclusion Logic ────────────────────────────────────────────────────────

export interface ExclusionCheck {
  listingId: string;
  hasActiveExperiment: boolean;
  hasPendingRecommendation: boolean;
}

/**
 * Returns true if the listing should be excluded from underperformance analysis.
 *
 * Exclusion rules (AC2):
 * - Listing has an active experiment (status: draft, running, or paused)
 * - Listing already has a pending recommendation
 */
export function shouldExcludeListing(check: ExclusionCheck): boolean {
  return check.hasActiveExperiment || check.hasPendingRecommendation;
}
