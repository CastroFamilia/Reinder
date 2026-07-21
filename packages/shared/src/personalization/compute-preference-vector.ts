/**
 * packages/shared/src/personalization/compute-preference-vector.ts
 *
 * Story 10.1 — AC3: computePreferenceVector() logic.
 *
 * Pure function that computes a BuyerPreferenceVector from swipe and engagement
 * events. Dependencies are injected for testability (no DB coupling).
 *
 * Threshold: returns null if buyer has < MIN_SWIPES_THRESHOLD swipes.
 */

import type {
  BuyerPreferenceVector,
  ComputePreferenceVectorDeps,
  ListingDataForVector,
  SwipeEventInput,
  EngagementEventInput,
} from "./types";
import { MIN_SWIPES_THRESHOLD } from "./types";

// ─── Statistical helpers ──────────────────────────────────────────────────────

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const variance =
    values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function mode(values: number[]): number {
  if (values.length === 0) return 0;
  const freq = new Map<number, number>();
  for (const v of values) {
    freq.set(v, (freq.get(v) ?? 0) + 1);
  }
  let maxCount = 0;
  let modeVal = values[0];
  for (const [val, count] of freq) {
    if (count > maxCount) {
      maxCount = count;
      modeVal = val;
    }
  }
  return modeVal;
}

function distribution(values: number[]): Record<string, number> {
  if (values.length === 0) return {};
  const freq = new Map<number, number>();
  for (const v of values) {
    freq.set(v, (freq.get(v) ?? 0) + 1);
  }
  const result: Record<string, number> = {};
  for (const [val, count] of freq) {
    result[String(val)] = count / values.length;
  }
  return result;
}

// ─── Main compute function ────────────────────────────────────────────────────

/**
 * Computes the 8-dimension BuyerPreferenceVector for a given buyer.
 *
 * @param buyerId - The buyer's UUID
 * @param deps - Injected dependencies for data retrieval
 * @returns The computed vector, or null if below threshold
 */
export async function computePreferenceVector(
  buyerId: string,
  deps: ComputePreferenceVectorDeps
): Promise<BuyerPreferenceVector | null> {
  // Fetch raw events
  const swipeEvents = await deps.getSwipeEvents(buyerId);
  const engagementEvents = await deps.getEngagementEvents(buyerId);

  // AC3: Minimum threshold check
  if (swipeEvents.length < MIN_SWIPES_THRESHOLD) {
    return null;
  }

  // Separate matched vs rejected listings
  const matchedSwipes = swipeEvents.filter((e) => e.action === "match");
  const matchRate = matchedSwipes.length / swipeEvents.length;

  // Resolve listing data for relevant swipes (use all if no matches)
  const relevantSwipes = matchedSwipes.length > 0 ? matchedSwipes : swipeEvents;
  const relevantListingIds = [...new Set(relevantSwipes.map((e) => e.listingId))];
  const listingDataMap = new Map<string, ListingDataForVector>();

  for (const listingId of relevantListingIds) {
    const data = await deps.getListingData(listingId);
    if (data) {
      listingDataMap.set(listingId, data);
    }
  }

  // Gather numeric arrays from relevant listings
  const prices: number[] = [];
  const sizes: number[] = [];
  const bedrooms: number[] = [];
  const cities: string[] = [];
  const lats: number[] = [];
  const lngs: number[] = [];

  for (const swipe of relevantSwipes) {
    const listing = listingDataMap.get(swipe.listingId);
    if (!listing) continue;
    prices.push(listing.price);
    sizes.push(listing.sizeSqm);
    bedrooms.push(listing.bedrooms);
    cities.push(listing.city);
    lats.push(listing.latitude);
    lngs.push(listing.longitude);
  }

  // ── Dimension 1: Price Affinity ──
  const priceAffinity = {
    mean: mean(prices),
    stddev: stddev(prices),
    rangeMin: prices.length > 0 ? Math.min(...prices) : 0,
    rangeMax: prices.length > 0 ? Math.max(...prices) : 0,
  };

  // ── Dimension 2: Size Affinity ──
  const sizeAffinity = {
    mean: mean(sizes),
    stddev: stddev(sizes),
  };

  // ── Dimension 3: Bedroom Affinity ──
  const bedroomAffinity = {
    mode: mode(bedrooms),
    distribution: distribution(bedrooms),
  };

  // ── Dimension 4: Location Affinity ──
  const cityFreq = new Map<string, number>();
  for (const city of cities) {
    cityFreq.set(city, (cityFreq.get(city) ?? 0) + 1);
  }
  const preferredCities = [...cityFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([city]) => city);

  const geoCentroid =
    lats.length > 0
      ? { lat: mean(lats), lng: mean(lngs) }
      : null;

  const locationAffinity = {
    preferredCities,
    geoCentroid,
  };

  // ── Dimension 5: Photo Engagement ──
  const photoEvents = engagementEvents.filter(
    (e) => e.eventType === "photo_view"
  );
  const photoViewTimes = photoEvents
    .map((e) => e.payload.viewTimeMs)
    .filter((v): v is number => v !== undefined);
  const photoIndices = photoEvents
    .map((e) => e.payload.photoIndex)
    .filter((v): v is number => v !== undefined);

  // Find preferred photo indices (most viewed)
  const photoIndexFreq = new Map<number, number>();
  for (const idx of photoIndices) {
    photoIndexFreq.set(idx, (photoIndexFreq.get(idx) ?? 0) + 1);
  }
  const preferredPhotoIndices = [...photoIndexFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([idx]) => idx);

  const photoEngagement = {
    avgViewTimeMs: mean(photoViewTimes),
    preferredPhotoIndices,
  };

  // ── Dimension 6: Engagement Depth ──
  const detailEvents = engagementEvents.filter(
    (e) => e.eventType === "detail_view"
  );
  const scrollDepths = detailEvents
    .map((e) => e.payload.scrollDepthPct)
    .filter((v): v is number => v !== undefined);
  const detailViewTimes = detailEvents
    .map((e) => e.payload.viewTimeMs)
    .filter((v): v is number => v !== undefined);

  const engagementDepth = {
    avgScrollDepthPct: mean(scrollDepths),
    avgDetailViewMs: mean(detailViewTimes),
  };

  // ── Dimension 7: Match Rate (already computed) ──
  // ── Dimension 8: Reaffirm Rate (placeholder — no reaffirm events yet) ──
  const reaffirmRate = 0;

  return {
    priceAffinity,
    sizeAffinity,
    bedroomAffinity,
    locationAffinity,
    photoEngagement,
    engagementDepth,
    matchRate,
    reaffirmRate,
  };
}
