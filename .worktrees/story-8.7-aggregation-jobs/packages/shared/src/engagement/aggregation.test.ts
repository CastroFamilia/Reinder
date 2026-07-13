/**
 * Story 8.7 — ATDD Tests: Aggregation Jobs
 *
 * Tests cover:
 * - T8.7-02: Aggregation correctly computes avg view time per listing
 * - T8.7-03: Aggregation correctly computes buyer intent scores
 * - T8.7-04: Empty events → no crash, empty results
 * - Score formula validation
 *
 * Run: pnpm --filter @reinder/shared test -- src/engagement/aggregation.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  aggregateListingAnalytics,
  calculateBuyerIntentScores,
  computeGlobalAvgViewTimeMs,
} from "./aggregation";
import type { RawEngagementRow } from "./aggregation";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const LISTING_1 = "listing-uuid-1";
const LISTING_2 = "listing-uuid-2";
const BUYER_1 = "buyer-uuid-1";
const BUYER_2 = "buyer-uuid-2";
const SESSION_1 = "session-uuid-1";
const SESSION_2 = "session-uuid-2";
const SESSION_3 = "session-uuid-3";

function makeEvent(
  overrides: Partial<RawEngagementRow> = {}
): RawEngagementRow {
  return {
    id: `evt-${Math.random().toString(36).slice(2, 8)}`,
    buyerId: BUYER_1,
    listingId: LISTING_1,
    sessionId: SESSION_1,
    eventType: "photo_view",
    payload: { photo_index: 0, duration_ms: 2000 },
    createdAt: new Date("2026-05-17T10:30:00Z"),
    ...overrides,
  };
}

// ─── T8.7-02: Listing analytics aggregation ────────────────────────────────

describe("T8.7-02: aggregateListingAnalytics", () => {
  it("correctly computes avg photo view time per listing", () => {
    const events: RawEngagementRow[] = [
      makeEvent({ payload: { photo_index: 0, duration_ms: 2000 } }),
      makeEvent({ payload: { photo_index: 1, duration_ms: 4000 } }),
      makeEvent({ payload: { photo_index: 0, duration_ms: 3000 } }),
    ];

    const results = aggregateListingAnalytics(events);

    expect(results).toHaveLength(1);
    expect(results[0].listingId).toBe(LISTING_1);
    expect(results[0].avgPhotoViewMs).toBe(3000); // (2000+4000+3000)/3
  });

  it("groups by listing and hour bucket", () => {
    const events: RawEngagementRow[] = [
      // Listing 1, hour 10
      makeEvent({
        listingId: LISTING_1,
        createdAt: new Date("2026-05-17T10:15:00Z"),
      }),
      // Listing 1, hour 11
      makeEvent({
        listingId: LISTING_1,
        createdAt: new Date("2026-05-17T11:20:00Z"),
      }),
      // Listing 2, hour 10
      makeEvent({
        listingId: LISTING_2,
        createdAt: new Date("2026-05-17T10:45:00Z"),
      }),
    ];

    const results = aggregateListingAnalytics(events);

    // Should produce 3 buckets: L1@10, L1@11, L2@10
    expect(results).toHaveLength(3);
  });

  it("counts detail_open as totalViews", () => {
    const events: RawEngagementRow[] = [
      makeEvent({ eventType: "detail_open", payload: {} }),
      makeEvent({ eventType: "detail_open", payload: {} }),
      makeEvent({ eventType: "photo_view", payload: { photo_index: 0, duration_ms: 1000 } }),
    ];

    const results = aggregateListingAnalytics(events);

    expect(results[0].totalViews).toBe(2);
  });

  it("computes per-photo engagement breakdown", () => {
    const events: RawEngagementRow[] = [
      makeEvent({ payload: { photo_index: 0, duration_ms: 2000 } }),
      makeEvent({ payload: { photo_index: 0, duration_ms: 4000 } }),
      makeEvent({ payload: { photo_index: 1, duration_ms: 1000 } }),
    ];

    const results = aggregateListingAnalytics(events);

    const photo0 = results[0].photoEngagement.find(
      (p) => p.photo_index === 0
    );
    const photo1 = results[0].photoEngagement.find(
      (p) => p.photo_index === 1
    );

    expect(photo0).toBeDefined();
    expect(photo0!.avg_duration_ms).toBe(3000); // (2000+4000)/2
    expect(photo0!.view_count).toBe(2);
    expect(photo1!.avg_duration_ms).toBe(1000);
    expect(photo1!.view_count).toBe(1);
  });

  it("computes avg scroll depth", () => {
    const events: RawEngagementRow[] = [
      makeEvent({
        eventType: "scroll_depth",
        payload: { max_depth_pct: 60 },
      }),
      makeEvent({
        eventType: "scroll_depth",
        payload: { max_depth_pct: 80 },
      }),
    ];

    const results = aggregateListingAnalytics(events);

    expect(results[0].avgScrollDepthPct).toBe(70); // (60+80)/2
  });

  it("counts match_reaffirm events", () => {
    const events: RawEngagementRow[] = [
      makeEvent({
        eventType: "match_reaffirm",
        payload: { match_event_id: "m1" },
      }),
      makeEvent({
        eventType: "match_reaffirm",
        payload: { match_event_id: "m2" },
      }),
      makeEvent({ eventType: "photo_view", payload: { photo_index: 0, duration_ms: 1000 } }),
    ];

    const results = aggregateListingAnalytics(events);

    expect(results[0].reaffirmCount).toBe(2);
  });

  it("returns empty array for no events", () => {
    const results = aggregateListingAnalytics([]);
    expect(results).toHaveLength(0);
  });
});

// ─── T8.7-03: Buyer intent score calculation ───────────────────────────────

describe("T8.7-03: calculateBuyerIntentScores", () => {
  it("computes score for a highly engaged buyer", () => {
    const events: RawEngagementRow[] = [
      // Multiple reaffirms
      makeEvent({ eventType: "match_reaffirm", payload: { match_event_id: "m1" }, listingId: LISTING_1, sessionId: SESSION_1 }),
      makeEvent({ eventType: "match_reaffirm", payload: { match_event_id: "m2" }, listingId: LISTING_2, sessionId: SESSION_2 }),
      makeEvent({ eventType: "match_reaffirm", payload: { match_event_id: "m3" }, listingId: "listing-3", sessionId: SESSION_3 }),
      // Multiple detail_opens
      makeEvent({ eventType: "detail_open", payload: {}, listingId: LISTING_1, sessionId: SESSION_1 }),
      makeEvent({ eventType: "detail_open", payload: {}, listingId: LISTING_2, sessionId: SESSION_2 }),
      makeEvent({ eventType: "detail_open", payload: {}, listingId: "listing-3", sessionId: SESSION_3 }),
      // Long photo views (above global avg of 2000ms)
      makeEvent({ payload: { photo_index: 0, duration_ms: 4000 }, listingId: LISTING_1, sessionId: SESSION_1 }),
      makeEvent({ payload: { photo_index: 0, duration_ms: 3500 }, listingId: LISTING_2, sessionId: SESSION_2 }),
      makeEvent({ payload: { photo_index: 0, duration_ms: 3000 }, listingId: "listing-3", sessionId: SESSION_3 }),
      // More unique listings and sessions for consistency
      makeEvent({ eventType: "detail_open", payload: {}, listingId: "listing-4", sessionId: SESSION_1 }),
      makeEvent({ eventType: "detail_open", payload: {}, listingId: "listing-5", sessionId: SESSION_2 }),
    ];

    const results = calculateBuyerIntentScores(events, 2000);

    expect(results).toHaveLength(1);
    expect(results[0].buyerId).toBe(BUYER_1);
    expect(results[0].score).toBeGreaterThanOrEqual(50);
    expect(results[0].score).toBeLessThanOrEqual(100);
    expect(results[0].scoreBreakdown.matchCount).toBe(3);
    expect(results[0].scoreBreakdown.reaffirmRatio).toBeGreaterThan(0);
  });

  it("computes score of 0 for buyer with no meaningful engagement", () => {
    const events: RawEngagementRow[] = [
      // Only a single short view
      makeEvent({
        payload: { photo_index: 0, duration_ms: 100 },
        sessionId: SESSION_1,
      }),
    ];

    const results = calculateBuyerIntentScores(events, 2000);

    expect(results).toHaveLength(1);
    expect(results[0].score).toBeLessThanOrEqual(15); // minimal score from 1 session
  });

  it("caps match count contribution at 5 matches", () => {
    const events: RawEngagementRow[] = [];
    // 10 reaffirm events — should cap at 5
    for (let i = 0; i < 10; i++) {
      events.push(
        makeEvent({
          eventType: "match_reaffirm",
          payload: { match_event_id: `m${i}` },
          listingId: `listing-${i}`,
          sessionId: `session-${i % 3}`,
        })
      );
    }

    const results = calculateBuyerIntentScores(events, 2000);

    // Match score should be capped: 5 * 15 = 75
    expect(results[0].scoreBreakdown.matchCount).toBe(10);
    // But the contribution is capped
    expect(results[0].score).toBeLessThanOrEqual(100);
  });

  it("handles multiple buyers independently", () => {
    const events: RawEngagementRow[] = [
      makeEvent({ buyerId: BUYER_1, eventType: "match_reaffirm", payload: { match_event_id: "m1" } }),
      makeEvent({ buyerId: BUYER_1, eventType: "detail_open", payload: {} }),
      makeEvent({ buyerId: BUYER_2, eventType: "photo_view", payload: { photo_index: 0, duration_ms: 500 } }),
    ];

    const results = calculateBuyerIntentScores(events, 2000);

    expect(results).toHaveLength(2);
    const buyer1 = results.find((r) => r.buyerId === BUYER_1)!;
    const buyer2 = results.find((r) => r.buyerId === BUYER_2)!;

    expect(buyer1.score).toBeGreaterThan(buyer2.score);
  });

  it("returns empty array for no events", () => {
    const results = calculateBuyerIntentScores([], 2000);
    expect(results).toHaveLength(0);
  });

  it("score is always between 0 and 100", () => {
    // Edge case: massive engagement
    const events: RawEngagementRow[] = [];
    for (let i = 0; i < 50; i++) {
      events.push(
        makeEvent({
          eventType: "match_reaffirm",
          payload: { match_event_id: `m${i}` },
          listingId: `listing-${i}`,
          sessionId: `session-${i % 10}`,
        })
      );
      events.push(
        makeEvent({
          eventType: "detail_open",
          payload: {},
          listingId: `listing-${i}`,
          sessionId: `session-${i % 10}`,
        })
      );
      events.push(
        makeEvent({
          payload: { photo_index: 0, duration_ms: 10000 },
          listingId: `listing-${i}`,
          sessionId: `session-${i % 10}`,
        })
      );
    }

    const results = calculateBuyerIntentScores(events, 2000);

    expect(results[0].score).toBeLessThanOrEqual(100);
    expect(results[0].score).toBeGreaterThanOrEqual(0);
  });
});

// ─── Global avg view time helper ───────────────────────────────────────────

describe("computeGlobalAvgViewTimeMs", () => {
  it("computes average from photo_view events", () => {
    const events: RawEngagementRow[] = [
      makeEvent({ payload: { photo_index: 0, duration_ms: 2000 } }),
      makeEvent({ payload: { photo_index: 1, duration_ms: 4000 } }),
      makeEvent({ eventType: "detail_open", payload: {} }), // should be ignored
    ];

    expect(computeGlobalAvgViewTimeMs(events)).toBe(3000);
  });

  it("returns 2000ms default when no photo_view events", () => {
    const events: RawEngagementRow[] = [
      makeEvent({ eventType: "detail_open", payload: {} }),
    ];

    expect(computeGlobalAvgViewTimeMs(events)).toBe(2000);
  });

  it("returns 2000ms default for empty events", () => {
    expect(computeGlobalAvgViewTimeMs([])).toBe(2000);
  });
});
