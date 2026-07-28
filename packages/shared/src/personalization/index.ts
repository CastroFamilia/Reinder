/**
 * packages/shared/src/personalization/index.ts
 *
 * Barrel export for the personalization module.
 * Story 10.1 — AC8: Types and functions exported from @reinder/shared.
 */

// Types
export type {
  BuyerPreferenceVector,
  BuyerPreferenceVectorRow,
  PriceAffinity,
  SizeAffinity,
  BedroomAffinity,
  LocationAffinity,
  PhotoEngagement,
  EngagementDepth,
  ListingDataForVector,
  SwipeEventInput,
  EngagementEventInput,
  ComputePreferenceVectorDeps,
  NumericAffinity,
} from "./types";

// Constants
export { PREFERENCE_VECTOR_VERSION, MIN_SWIPES_THRESHOLD } from "./types";

// Functions
export { computePreferenceVector } from "./compute-preference-vector";

// ─── Story 10.2: Listing Fit Score ────────────────────────────────────────────

// Types
export type {
  DimensionScores,
  ListingFitScore,
  ListingFitScoreRow,
  ListingDataForScore,
} from "./fit-score-types";

// Constants
export { FIT_SCORE_WEIGHTS, FIT_SCORE_VERSION } from "./fit-score-types";

// Functions
export {
  computeListingFitScore,
  selectRecommendedPhotoIndex,
} from "./compute-listing-fit-score";
