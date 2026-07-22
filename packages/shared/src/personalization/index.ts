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
