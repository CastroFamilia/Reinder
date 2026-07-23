/**
 * packages/shared/src/personalization/fit-score-types.ts
 *
 * Types and constants for the Listing Fit Score system.
 * Story 10.2 — AC2 (DimensionScores structure) + AC9 (exported types).
 *
 * The fit score quantifies the affinity between a buyer's preference vector
 * and a specific listing's characteristics across 6 weighted dimensions.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

/** Current version of the fit score algorithm. Bumped on breaking changes. */
export const FIT_SCORE_VERSION = 1;

/**
 * Weights for each dimension in the overall score calculation.
 * Sum = 1.0. Price and location dominate real estate decisions.
 */
export const FIT_SCORE_WEIGHTS = {
  priceScore: 0.30,
  locationScore: 0.25,
  sizeScore: 0.15,
  bedroomScore: 0.15,
  photoAffinityScore: 0.10,
  engagementDepthScore: 0.05,
} as const;

// ─── Dimension Scores ─────────────────────────────────────────────────────────

/**
 * Breakdown of the fit score by dimension.
 * All scores are normalized to [0, 1] and are finite (no NaN/Infinity).
 */
export interface DimensionScores {
  /** How close the listing price is to the buyer's preferred range (0–1). */
  priceScore: number;
  /** Affinity of listing size (sqm) with the buyer's preference (0–1). */
  sizeScore: number;
  /** Match between listing bedrooms and buyer's preferred distribution (0–1). */
  bedroomScore: number;
  /** Geographic proximity to the buyer's preferred cities/centroid (0–1). */
  locationScore: number;
  /** Affinity based on photo engagement patterns (0–1). */
  photoAffinityScore: number;
  /** Affinity based on engagement depth (scroll, detail view time) (0–1). */
  engagementDepthScore: number;
}

// ─── Fit Score Result ─────────────────────────────────────────────────────────

/**
 * Result of computeListingFitScore() — the affinity between a buyer and a listing.
 * AC3: return shape { overallScore, dimensionScores, recommendedPhotoIndex }.
 */
export interface ListingFitScore {
  /** Weighted mean of dimension scores, normalized to [0, 1]. */
  overallScore: number;
  /** Per-dimension breakdown. */
  dimensionScores: DimensionScores;
  /** Optimal photo index for this buyer (null — computed in Story 10.3). */
  recommendedPhotoIndex: number | null;
}

// ─── Row Type ─────────────────────────────────────────────────────────────────

/**
 * Complete row shape of the listing_fit_scores table (AC1, AC9).
 */
export interface ListingFitScoreRow {
  id: string;
  buyerId: string;
  listingId: string;
  overallScore: number;
  dimensionScores: DimensionScores;
  recommendedPhotoIndex: number | null;
  vectorVersion: number;
  lastComputedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Input Type ───────────────────────────────────────────────────────────────

/**
 * Listing data shape required by computeListingFitScore().
 * Fields are nullable to handle incomplete data (AC3 — neutral 0.5 fallback).
 */
export interface ListingDataForScore {
  id: string;
  price: number | null;
  sizeSqm: number | null;
  bedrooms: number | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  images: string[] | null;
  status: string;
}
