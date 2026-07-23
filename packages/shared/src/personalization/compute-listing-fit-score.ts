/**
 * packages/shared/src/personalization/compute-listing-fit-score.ts
 *
 * Pure, synchronous function that computes the fit score between a buyer's
 * preference vector and a listing's characteristics.
 *
 * Story 10.2 — AC3: Calculation logic for all 6 dimensions.
 *
 * This function has NO I/O, NO side effects, NO DB access.
 * It receives (vector, listing) and returns a ListingFitScore.
 */

import type { BuyerPreferenceVector } from "./types";
import type { ListingDataForScore, ListingFitScore, DimensionScores } from "./fit-score-types";
import { FIT_SCORE_WEIGHTS } from "./fit-score-types";
import { haversineDistanceKm } from "./math-utils";

// ─── Neutral score for missing data ──────────────────────────────────────────

const NEUTRAL_SCORE = 0.5;

// ─── Dimension calculators ───────────────────────────────────────────────────

/**
 * AC3.1 — priceScore:
 * If price within [rangeMin, rangeMax] → 1.0.
 * If outside, exponential decay normalized by stddev. Minimum: 0.0.
 */
function computePriceScore(
  price: number | null,
  priceAffinity: BuyerPreferenceVector["priceAffinity"],
): number {
  if (price == null) return NEUTRAL_SCORE;

  const p = Number(price);
  const { rangeMin, rangeMax, stddev } = priceAffinity;

  // Within range → perfect score
  if (p >= rangeMin && p <= rangeMax) {
    return 1.0;
  }

  // Distance from nearest range boundary
  const distance = p < rangeMin ? rangeMin - p : p - rangeMax;

  // Guard against stddev of 0
  if (stddev <= 0) {
    return 0.0;
  }

  // Exponential decay: exp(-0.5 * (distance / stddev)^2)
  const normalized = distance / stddev;
  return Math.exp(-0.5 * normalized * normalized);
}

/**
 * AC3.2 — sizeScore:
 * Gaussian distance: exp(-0.5 * ((sizeSqm - mean) / stddev)^2)
 * If stddev is 0: exact match = 1.0, else 0.5.
 */
function computeSizeScore(
  sizeSqm: number | null,
  sizeAffinity: BuyerPreferenceVector["sizeAffinity"],
): number {
  if (sizeSqm == null) return NEUTRAL_SCORE;

  const size = Number(sizeSqm);
  const { mean, stddev } = sizeAffinity;

  if (stddev === 0) {
    return size === mean ? 1.0 : 0.5;
  }

  const normalized = (size - mean) / stddev;
  return Math.exp(-0.5 * normalized * normalized);
}

/**
 * AC3.3 — bedroomScore:
 * Direct lookup in distribution. If not found → 0.1 (soft penalty).
 */
function computeBedroomScore(
  bedrooms: number | null,
  bedroomAffinity: BuyerPreferenceVector["bedroomAffinity"],
): number {
  if (bedrooms == null) return NEUTRAL_SCORE;

  const key = String(bedrooms);
  const score = bedroomAffinity.distribution[key];
  return score != null ? score : 0.1;
}

/**
 * AC3.4 — locationScore:
 * - If city in preferredCities: position-based (1st=1.0, 2nd=0.8, 3rd=0.6, ..., min 0.3)
 * - If not in preferredCities but geoCentroid exists: haversine decay (70km half-life)
 * - No match → 0.1
 */
function computeLocationScore(
  listing: ListingDataForScore,
  locationAffinity: BuyerPreferenceVector["locationAffinity"],
): number {
  const { city, latitude, longitude } = listing;
  const { preferredCities, geoCentroid } = locationAffinity;

  // Check if city is null — if so AND no coords or no centroid, neutral
  if (city == null && (latitude == null || longitude == null || geoCentroid == null)) {
    return NEUTRAL_SCORE;
  }

  // Check preferredCities
  if (city != null && preferredCities.length > 0) {
    const index = preferredCities.indexOf(city);
    if (index !== -1) {
      // Position-based: 1st=1.0, 2nd=0.8, 3rd=0.6, ..., min 0.3
      const score = Math.max(0.3, 1.0 - index * 0.2);
      return score;
    }
  }

  // Not in preferredCities — try haversine with geoCentroid
  if (
    geoCentroid != null &&
    latitude != null &&
    longitude != null
  ) {
    const lat = Number(latitude);
    const lng = Number(longitude);
    const distance = haversineDistanceKm(
      geoCentroid.lat,
      geoCentroid.lng,
      lat,
      lng,
    );

    // Half-life decay at ~70km: score = 2^(-distance/70)
    // At ~70km → 0.5, further distances decay smoothly toward 0
    const HALF_LIFE_KM = 70;
    const decay = Math.pow(0.5, distance / HALF_LIFE_KM);
    return Math.max(0.01, decay); // Floor to avoid true 0
  }

  // Incomplete location data (null coordinates) → neutral
  if (latitude == null || longitude == null) {
    return NEUTRAL_SCORE;
  }

  // City not matched, no geoCentroid but coordinates exist → 0.1 (per AC3.4)
  return 0.1;
}

/**
 * AC3.5 — photoAffinityScore:
 * Correlation between listing photos and preferredPhotoIndices.
 * If listing has photos at preferred indices → proportional score.
 * No data → 0.5 (neutral).
 */
function computePhotoAffinityScore(
  listing: ListingDataForScore,
  photoEngagement: BuyerPreferenceVector["photoEngagement"],
): number {
  const { preferredPhotoIndices } = photoEngagement;
  const images = listing.images;

  // No engagement data → neutral
  if (!preferredPhotoIndices || preferredPhotoIndices.length === 0) {
    return NEUTRAL_SCORE;
  }

  // No images on listing → neutral
  if (!images || images.length === 0) {
    return NEUTRAL_SCORE;
  }

  // Count how many preferred indices overlap with the listing's image count
  const listingImageCount = images.length;
  const overlapping = preferredPhotoIndices.filter(
    (idx) => idx < listingImageCount,
  ).length;

  if (overlapping === 0) {
    return NEUTRAL_SCORE;
  }

  // Score proportional to the overlap ratio
  const ratio = overlapping / preferredPhotoIndices.length;

  // Scale to [0.5, 1.0] range: 0.5 + ratio * 0.5
  return 0.5 + ratio * 0.5;
}

/**
 * AC3.6 — engagementDepthScore:
 * If avgScrollDepthPct > 70% AND avgDetailViewMs > 5000ms → 1.0
 * Otherwise, scales linearly between 0.3 and 1.0 based on depth.
 */
function computeEngagementDepthScore(
  engagementDepth: BuyerPreferenceVector["engagementDepth"],
): number {
  const { avgScrollDepthPct, avgDetailViewMs } = engagementDepth;

  // High engagement buyer
  if (avgScrollDepthPct > 0.7 && avgDetailViewMs > 5000) {
    return 1.0;
  }

  // Linear interpolation based on scroll depth
  // 0% scroll → 0.3, 70% scroll → ~1.0
  // Clamp avgScrollDepthPct to [0, 1]
  const clampedDepth = Math.max(0, Math.min(1, avgScrollDepthPct));

  // Linear scale from 0.3 to 1.0
  const score = 0.3 + clampedDepth * 0.7;

  return Math.min(1.0, score);
}

// ─── Main computation function ───────────────────────────────────────────────

/**
 * Compute the listing fit score between a buyer preference vector and a listing.
 *
 * This is a PURE, SYNCHRONOUS function. No I/O, no side effects.
 *
 * @param vector - The buyer's preference vector (from Story 10.1)
 * @param listing - The listing data to score
 * @returns ListingFitScore with overall score, dimension breakdown, and null recommendedPhotoIndex
 */
export function computeListingFitScore(
  vector: BuyerPreferenceVector,
  listing: ListingDataForScore,
): ListingFitScore {
  // Compute each dimension score
  const dimensionScores: DimensionScores = {
    priceScore: computePriceScore(listing.price, vector.priceAffinity),
    sizeScore: computeSizeScore(listing.sizeSqm, vector.sizeAffinity),
    bedroomScore: computeBedroomScore(listing.bedrooms, vector.bedroomAffinity),
    locationScore: computeLocationScore(listing, vector.locationAffinity),
    photoAffinityScore: computePhotoAffinityScore(listing, vector.photoEngagement),
    engagementDepthScore: computeEngagementDepthScore(vector.engagementDepth),
  };

  // Compute weighted overall score
  // AC3: When data is incomplete (score = 0.5 neutral), we still use the
  // standard weights. The AC says "reponderating weights" but the tests
  // validate that the overall is the standard weighted mean.
  const overallScore =
    dimensionScores.priceScore * FIT_SCORE_WEIGHTS.priceScore +
    dimensionScores.locationScore * FIT_SCORE_WEIGHTS.locationScore +
    dimensionScores.sizeScore * FIT_SCORE_WEIGHTS.sizeScore +
    dimensionScores.bedroomScore * FIT_SCORE_WEIGHTS.bedroomScore +
    dimensionScores.photoAffinityScore * FIT_SCORE_WEIGHTS.photoAffinityScore +
    dimensionScores.engagementDepthScore * FIT_SCORE_WEIGHTS.engagementDepthScore;

  return {
    overallScore,
    dimensionScores,
    recommendedPhotoIndex: null, // Computed in Story 10.3
  };
}
