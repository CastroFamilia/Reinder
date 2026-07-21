/**
 * packages/shared/src/personalization/types.ts
 *
 * TypeScript types for the Buyer Preference Vector system.
 * Story 10.1 — AC2 (vector structure) + AC8 (exported types).
 *
 * The preference vector captures 8 dimensions of buyer behavior
 * derived from swipe events and engagement events.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

/** Current version of the preference vector schema. Bumped on breaking changes. */
export const PREFERENCE_VECTOR_VERSION = 1;

/** Minimum number of swipe events required before a vector can be computed (AC3). */
export const MIN_SWIPES_THRESHOLD = 10;

// ─── Sub-dimension types ──────────────────────────────────────────────────────

/** Statistical distribution for numeric property dimensions (price, size). */
export interface NumericAffinity {
  mean: number;
  stddev: number;
}

/** Price affinity includes explicit range bounds. */
export interface PriceAffinity extends NumericAffinity {
  rangeMin: number;
  rangeMax: number;
}

/** Size affinity — mean + stddev of preferred sqm. */
export interface SizeAffinity extends NumericAffinity {}

/** Bedroom preference — mode + distribution across bedroom counts. */
export interface BedroomAffinity {
  mode: number;
  distribution: Record<string, number>;
}

/** Geographic preference — preferred cities + optional geo centroid. */
export interface LocationAffinity {
  preferredCities: string[];
  geoCentroid: { lat: number; lng: number } | null;
}

/** Photo engagement metrics from engagement events. */
export interface PhotoEngagement {
  avgViewTimeMs: number;
  preferredPhotoIndices: number[];
}

/** Depth of engagement with property detail views. */
export interface EngagementDepth {
  avgScrollDepthPct: number;
  avgDetailViewMs: number;
}

// ─── Main Vector Type ─────────────────────────────────────────────────────────

/**
 * BuyerPreferenceVector — 8-dimension vector stored in JSONB.
 * Computed by `computePreferenceVector()` and persisted in `buyer_preference_vectors.vector`.
 *
 * Dimensions:
 *  1. priceAffinity    — preferred price range (mean, stddev, min, max)
 *  2. sizeAffinity     — preferred size in sqm (mean, stddev)
 *  3. bedroomAffinity  — preferred bedroom count (mode, distribution)
 *  4. locationAffinity — preferred cities + geo centroid
 *  5. photoEngagement  — photo viewing behavior
 *  6. engagementDepth  — scroll + detail view depth
 *  7. matchRate        — ratio of matches to total swipes
 *  8. reaffirmRate     — ratio of reaffirms (revisits) — currently 0 placeholder
 */
export interface BuyerPreferenceVector {
  priceAffinity: PriceAffinity;
  sizeAffinity: SizeAffinity;
  bedroomAffinity: BedroomAffinity;
  locationAffinity: LocationAffinity;
  photoEngagement: PhotoEngagement;
  engagementDepth: EngagementDepth;
  matchRate: number;
  reaffirmRate: number;
}

// ─── Dependency injection types for computePreferenceVector ───────────────────

/** Listing data needed for vector computation. */
export interface ListingDataForVector {
  price: number;
  sizeSqm: number;
  bedrooms: number;
  city: string;
  latitude: number;
  longitude: number;
  images: string[];
}

/** Swipe event shape used by computePreferenceVector. */
export interface SwipeEventInput {
  buyerId: string;
  listingId: string;
  action: string; // "match" | "reject"
  createdAt: Date;
}

/** Engagement event shape used by computePreferenceVector. */
export interface EngagementEventInput {
  buyerId: string;
  listingId: string;
  sessionId: string;
  eventType: string; // "photo_view" | "detail_view"
  payload: {
    viewTimeMs?: number;
    scrollDepthPct?: number;
    photoIndex?: number;
  };
  createdAt: Date;
}

/** Dependencies injected into computePreferenceVector for testability. */
export interface ComputePreferenceVectorDeps {
  getSwipeEvents: (buyerId: string) => Promise<SwipeEventInput[]>;
  getEngagementEvents: (buyerId: string) => Promise<EngagementEventInput[]>;
  getListingData: (listingId: string) => Promise<ListingDataForVector | null>;
}

// ─── Row Type ─────────────────────────────────────────────────────────────────

/** Complete row shape of buyer_preference_vectors table (AC8). */
export interface BuyerPreferenceVectorRow {
  id: string;
  buyerId: string;
  vector: BuyerPreferenceVector;
  swipeCount: number;
  engagementEventCount: number;
  version: number;
  lastComputedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

