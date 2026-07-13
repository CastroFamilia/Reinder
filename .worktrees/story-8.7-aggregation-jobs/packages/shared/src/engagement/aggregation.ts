/**
 * Engagement Aggregation — Transforms raw engagement events into read models.
 *
 * Two aggregation functions:
 * 1. aggregateListingAnalytics() → listing_analytics_hourly
 * 2. calculateBuyerIntentScores() → buyer_intent_scores
 *
 * Story 8.7 — Aggregation Jobs para Read Models de Analytics.
 *
 * These functions are designed to be called by pg_cron (via SQL wrapper)
 * or directly from an API trigger. They read from listing_engagement_events
 * and upsert into the read model tables.
 *
 * Key invariant: if aggregation fails, read models retain their last
 * successful values — stale data, never error.
 *
 * Source: epics.md#Story 8.7
 */

import type { EngagementEventType } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Raw event row shape (from listing_engagement_events query) */
export interface RawEngagementRow {
  id: string;
  buyerId: string;
  listingId: string;
  sessionId: string;
  eventType: EngagementEventType;
  payload: Record<string, unknown>;
  createdAt: Date;
}

/** Aggregated listing analytics for one listing + hour bucket */
export interface ListingAnalyticsRow {
  listingId: string;
  bucketHour: Date;
  totalViews: number;
  avgPhotoViewMs: number;
  avgScrollDepthPct: number;
  matchCount: number;
  rejectCount: number;
  reaffirmCount: number;
  photoEngagement: Array<{
    photo_index: number;
    avg_duration_ms: number;
    view_count: number;
  }>;
}

/** Computed buyer intent score */
export interface BuyerIntentScoreRow {
  buyerId: string;
  score: number;
  scoreBreakdown: {
    matchCount: number;
    reaffirmRatio: number;
    avgViewTimeVsGlobal: number;
    preferenceConsistency: number;
  };
}

/** Job execution result */
export interface AggregationResult {
  success: boolean;
  processedEvents: number;
  analyticsRowsUpserted: number;
  intentScoresUpdated: number;
  durationMs: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Score weights — must sum to 100 */
const WEIGHTS = {
  MATCH_COUNT: 15,        // per match, capped at 5 matches (= 75 max contribution)
  REAFFIRM_RATIO: 25,     // reaffirms / matches, 0-1 scaled to 0-25
  AVG_VIEW_VS_GLOBAL: 30, // buyer avg view time / global avg, clamped 0-2 → 0-30
  PREFERENCE_CONSISTENCY: 30, // consistent engagement pattern, 0-1 → 0-30
} as const;

const MAX_MATCH_COUNT_CONTRIBUTION = 5;
const MAX_VIEW_TIME_RATIO = 2.0;

// ---------------------------------------------------------------------------
// Listing Analytics Aggregation
// ---------------------------------------------------------------------------

/**
 * Aggregate raw engagement events into hourly analytics per listing.
 *
 * Groups events by (listing_id, hour_bucket) and computes:
 * - total views (detail_open events)
 * - avg photo view time
 * - avg scroll depth
 * - match/reject/reaffirm counts
 * - per-photo engagement breakdown
 */
export function aggregateListingAnalytics(
  events: RawEngagementRow[]
): ListingAnalyticsRow[] {
  // Group by listing + hour
  const buckets = new Map<string, RawEngagementRow[]>();

  for (const event of events) {
    const bucketHour = new Date(event.createdAt);
    bucketHour.setMinutes(0, 0, 0);
    const key = `${event.listingId}|${bucketHour.toISOString()}`;

    if (!buckets.has(key)) {
      buckets.set(key, []);
    }
    buckets.get(key)!.push(event);
  }

  const results: ListingAnalyticsRow[] = [];

  for (const [key, bucketEvents] of buckets) {
    const [listingId, bucketHourISO] = key.split("|");
    const bucketHour = new Date(bucketHourISO);

    // Count detail_open as "views"
    const detailOpens = bucketEvents.filter((e) => e.eventType === "detail_open");
    const totalViews = detailOpens.length;

    // Photo view times
    const photoViews = bucketEvents.filter((e) => e.eventType === "photo_view");
    const totalPhotoViewMs = photoViews.reduce(
      (sum, e) => sum + ((e.payload as { duration_ms?: number }).duration_ms || 0),
      0
    );
    const avgPhotoViewMs =
      photoViews.length > 0 ? Math.round(totalPhotoViewMs / photoViews.length) : 0;

    // Scroll depth
    const scrollEvents = bucketEvents.filter((e) => e.eventType === "scroll_depth");
    const totalScrollDepth = scrollEvents.reduce(
      (sum, e) => sum + ((e.payload as { max_depth_pct?: number }).max_depth_pct || 0),
      0
    );
    const avgScrollDepthPct =
      scrollEvents.length > 0 ? Math.round(totalScrollDepth / scrollEvents.length) : 0;

    // Counts
    const matchCount = bucketEvents.filter((e) => e.eventType === "match_reaffirm").length
      ? 0
      : 0; // match events come from swipe_events table, not engagement
    const rejectCount = 0; // similarly from swipe_events
    const reaffirmCount = bucketEvents.filter(
      (e) => e.eventType === "match_reaffirm"
    ).length;

    // Per-photo engagement
    const photoMap = new Map<
      number,
      { totalDuration: number; count: number }
    >();
    for (const pv of photoViews) {
      const payload = pv.payload as { photo_index?: number; duration_ms?: number };
      const idx = payload.photo_index ?? 0;
      const dur = payload.duration_ms ?? 0;
      const existing = photoMap.get(idx) || { totalDuration: 0, count: 0 };
      existing.totalDuration += dur;
      existing.count += 1;
      photoMap.set(idx, existing);
    }

    const photoEngagement = Array.from(photoMap.entries()).map(
      ([photoIndex, data]) => ({
        photo_index: photoIndex,
        avg_duration_ms:
          data.count > 0 ? Math.round(data.totalDuration / data.count) : 0,
        view_count: data.count,
      })
    );

    results.push({
      listingId,
      bucketHour,
      totalViews,
      avgPhotoViewMs,
      avgScrollDepthPct,
      matchCount,
      rejectCount,
      reaffirmCount,
      photoEngagement,
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Buyer Intent Score Calculation
// ---------------------------------------------------------------------------

/**
 * Calculate intent scores for each buyer based on their engagement events.
 *
 * Score formula:
 *   score = clamp(0, 100,
 *     matchCount × 15 (capped at 5) +
 *     reaffirmRatio × 25 +
 *     avgViewTimeVsGlobal × 30 (clamped 0-2) +
 *     preferenceConsistency × 30
 *   )
 *
 * @param events - All engagement events to process
 * @param globalAvgViewTimeMs - Platform-wide average photo view time (for relative comparison)
 */
export function calculateBuyerIntentScores(
  events: RawEngagementRow[],
  globalAvgViewTimeMs: number = 2000
): BuyerIntentScoreRow[] {
  // Group events by buyer
  const buyerEvents = new Map<string, RawEngagementRow[]>();
  for (const event of events) {
    if (!buyerEvents.has(event.buyerId)) {
      buyerEvents.set(event.buyerId, []);
    }
    buyerEvents.get(event.buyerId)!.push(event);
  }

  const results: BuyerIntentScoreRow[] = [];

  for (const [buyerId, userEvents] of buyerEvents) {
    // ── Match count component ───────────────────────────────────────────
    // We count match_reaffirm as proxy for strong match intent
    const reaffirmEvents = userEvents.filter(
      (e) => e.eventType === "match_reaffirm"
    );
    const matchCount = reaffirmEvents.length;
    const cappedMatches = Math.min(matchCount, MAX_MATCH_COUNT_CONTRIBUTION);
    const matchScore = cappedMatches * WEIGHTS.MATCH_COUNT;

    // ── Reaffirm ratio component ────────────────────────────────────────
    // How many of their views led to reaffirmation (proxy for decisiveness)
    const detailOpens = userEvents.filter((e) => e.eventType === "detail_open");
    const reaffirmRatio =
      detailOpens.length > 0 ? reaffirmEvents.length / detailOpens.length : 0;
    const reaffirmScore = Math.round(reaffirmRatio * WEIGHTS.REAFFIRM_RATIO);

    // ── Avg view time vs global component ───────────────────────────────
    const photoViews = userEvents.filter((e) => e.eventType === "photo_view");
    const totalViewTime = photoViews.reduce(
      (sum, e) =>
        sum + ((e.payload as { duration_ms?: number }).duration_ms || 0),
      0
    );
    const avgViewTime =
      photoViews.length > 0 ? totalViewTime / photoViews.length : 0;
    const viewTimeRatio =
      globalAvgViewTimeMs > 0 ? avgViewTime / globalAvgViewTimeMs : 0;
    const clampedRatio = Math.min(viewTimeRatio, MAX_VIEW_TIME_RATIO);
    const viewTimeScore = Math.round(
      (clampedRatio / MAX_VIEW_TIME_RATIO) * WEIGHTS.AVG_VIEW_VS_GLOBAL
    );

    // ── Preference consistency component ────────────────────────────────
    // How consistent are they? Measured by: engaged with multiple listings?
    // More unique listings engaged = more serious buyer
    const uniqueListings = new Set(userEvents.map((e) => e.listingId));
    const sessionCount = new Set(userEvents.map((e) => e.sessionId)).size;
    // Normalize: 5+ unique listings in 3+ sessions = max consistency
    const listingDiversity = Math.min(uniqueListings.size / 5, 1);
    const sessionDiversity = Math.min(sessionCount / 3, 1);
    const preferenceConsistency = (listingDiversity + sessionDiversity) / 2;
    const consistencyScore = Math.round(
      preferenceConsistency * WEIGHTS.PREFERENCE_CONSISTENCY
    );

    // ── Final score ─────────────────────────────────────────────────────
    const rawScore =
      matchScore + reaffirmScore + viewTimeScore + consistencyScore;
    const score = Math.max(0, Math.min(100, rawScore));

    results.push({
      buyerId,
      score,
      scoreBreakdown: {
        matchCount,
        reaffirmRatio: Math.round(reaffirmRatio * 100) / 100,
        avgViewTimeVsGlobal: Math.round(viewTimeRatio * 100) / 100,
        preferenceConsistency: Math.round(preferenceConsistency * 100) / 100,
      },
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Compute global average view time (helper)
// ---------------------------------------------------------------------------

/**
 * Compute the global average photo view time from all events.
 * Used as the baseline for buyer intent score calculations.
 */
export function computeGlobalAvgViewTimeMs(
  events: RawEngagementRow[]
): number {
  const photoViews = events.filter((e) => e.eventType === "photo_view");
  if (photoViews.length === 0) return 2000; // default fallback

  const totalMs = photoViews.reduce(
    (sum, e) =>
      sum + ((e.payload as { duration_ms?: number }).duration_ms || 0),
    0
  );

  return Math.round(totalMs / photoViews.length);
}
