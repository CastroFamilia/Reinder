/**
 * Story 8.1 — ATDD Tests: useEngagementTracker()
 *
 * Tests cover:
 * - T8.1-02: Hook exposes all required callbacks
 * - T8.1-03: Events are batched locally, not sent per-event
 * - T8.1-07: Photo view threshold enforcement (500ms min)
 *
 * Run: pnpm --filter @reinder/shared test packages/shared/src/engagement/use-engagement-tracker.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createEngagementTracker,
  MIN_PHOTO_VIEW_MS,
} from "./use-engagement-tracker";
import type { EngagementTracker } from "./use-engagement-tracker";

// ─── Setup ────────────────────────────────────────────────────────────────────

const LISTING_ID = "listing-uuid-1";
const SESSION_ID = "session-uuid-1";

let tracker: EngagementTracker;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ data: { inserted: 1 }, error: null }),
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── T8.1-02: Hook exposes all required callbacks ──────────────────────────

describe("T8.1-02: Engagement tracker API contract", () => {
  it("exposes trackPhotoView callback", () => {
    tracker = createEngagementTracker({ listingId: LISTING_ID, sessionId: SESSION_ID });
    expect(typeof tracker.trackPhotoView).toBe("function");
  });

  it("exposes trackScrollDepth callback", () => {
    tracker = createEngagementTracker({ listingId: LISTING_ID, sessionId: SESSION_ID });
    expect(typeof tracker.trackScrollDepth).toBe("function");
  });

  it("exposes trackDetailOpen callback", () => {
    tracker = createEngagementTracker({ listingId: LISTING_ID, sessionId: SESSION_ID });
    expect(typeof tracker.trackDetailOpen).toBe("function");
  });

  it("exposes trackDetailClose callback", () => {
    tracker = createEngagementTracker({ listingId: LISTING_ID, sessionId: SESSION_ID });
    expect(typeof tracker.trackDetailClose).toBe("function");
  });

  it("exposes trackMatchReaffirm callback", () => {
    tracker = createEngagementTracker({ listingId: LISTING_ID, sessionId: SESSION_ID });
    expect(typeof tracker.trackMatchReaffirm).toBe("function");
  });

  it("exposes flush callback", () => {
    tracker = createEngagementTracker({ listingId: LISTING_ID, sessionId: SESSION_ID });
    expect(typeof tracker.flush).toBe("function");
  });

  it("exposes getPendingCount callback", () => {
    tracker = createEngagementTracker({ listingId: LISTING_ID, sessionId: SESSION_ID });
    expect(typeof tracker.getPendingCount).toBe("function");
  });
});

// ─── T8.1-03: Events are batched locally ───────────────────────────────────

describe("T8.1-03: Batch flushing behavior", () => {
  it("does NOT call fetch for individual events below batch size", () => {
    tracker = createEngagementTracker({
      listingId: LISTING_ID,
      sessionId: SESSION_ID,
      batchSize: 10,
    });

    tracker.trackPhotoView(0, 1000);
    tracker.trackPhotoView(1, 2000);
    tracker.trackPhotoView(2, 3000);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(tracker.getPendingCount()).toBe(3);
  });

  it("auto-flushes when batch size is reached", () => {
    tracker = createEngagementTracker({
      listingId: LISTING_ID,
      sessionId: SESSION_ID,
      batchSize: 3,
    });

    tracker.trackPhotoView(0, 1000);
    tracker.trackPhotoView(1, 2000);
    tracker.trackPhotoView(2, 3000); // triggers flush

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/engagement/events");
    expect(options.method).toBe("POST");

    const body = JSON.parse(options.body);
    expect(body.events).toHaveLength(3);
    expect(body.events[0].eventType).toBe("photo_view");
  });

  it("manual flush() sends all pending events", async () => {
    tracker = createEngagementTracker({
      listingId: LISTING_ID,
      sessionId: SESSION_ID,
      batchSize: 100, // large batch size — won't auto-flush
    });

    tracker.trackPhotoView(0, 1000);
    tracker.trackScrollDepth(75);
    tracker.trackDetailOpen();

    expect(tracker.getPendingCount()).toBe(3);

    await tracker.flush();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(tracker.getPendingCount()).toBe(0);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.events).toHaveLength(3);
    expect(body.events[0].eventType).toBe("photo_view");
    expect(body.events[1].eventType).toBe("scroll_depth");
    expect(body.events[2].eventType).toBe("detail_open");
  });

  it("flush() is a no-op when queue is empty", async () => {
    tracker = createEngagementTracker({ listingId: LISTING_ID, sessionId: SESSION_ID });
    await tracker.flush();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("re-enqueues events on fetch failure", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    tracker = createEngagementTracker({
      listingId: LISTING_ID,
      sessionId: SESSION_ID,
      batchSize: 100,
    });

    tracker.trackPhotoView(0, 1000);
    tracker.trackPhotoView(1, 2000);

    await tracker.flush();

    // Events should be re-enqueued
    expect(tracker.getPendingCount()).toBe(2);
  });

  it("re-enqueues events on network error", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Network error"));

    tracker = createEngagementTracker({
      listingId: LISTING_ID,
      sessionId: SESSION_ID,
      batchSize: 100,
    });

    tracker.trackPhotoView(0, 1000);
    await tracker.flush();

    expect(tracker.getPendingCount()).toBe(1);
  });
});

// ─── Photo view threshold ──────────────────────────────────────────────────

describe("Photo view threshold (MIN_PHOTO_VIEW_MS)", () => {
  it("tracks photo view when duration >= 500ms", () => {
    tracker = createEngagementTracker({
      listingId: LISTING_ID,
      sessionId: SESSION_ID,
      batchSize: 100,
    });

    tracker.trackPhotoView(0, MIN_PHOTO_VIEW_MS);
    expect(tracker.getPendingCount()).toBe(1);
  });

  it("ignores photo view when duration < 500ms", () => {
    tracker = createEngagementTracker({
      listingId: LISTING_ID,
      sessionId: SESSION_ID,
      batchSize: 100,
    });

    tracker.trackPhotoView(0, MIN_PHOTO_VIEW_MS - 1);
    expect(tracker.getPendingCount()).toBe(0);
  });

  it("ignores photo view at 0ms", () => {
    tracker = createEngagementTracker({
      listingId: LISTING_ID,
      sessionId: SESSION_ID,
      batchSize: 100,
    });

    tracker.trackPhotoView(0, 0);
    expect(tracker.getPendingCount()).toBe(0);
  });
});

// ─── Event payload correctness ─────────────────────────────────────────────

describe("Event payload correctness", () => {
  it("photo_view event includes photo_index and duration_ms", async () => {
    tracker = createEngagementTracker({
      listingId: LISTING_ID,
      sessionId: SESSION_ID,
      batchSize: 100,
    });

    tracker.trackPhotoView(3, 2500);
    await tracker.flush();

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    const event = body.events[0];
    expect(event.eventType).toBe("photo_view");
    expect(event.payload).toEqual({ photo_index: 3, duration_ms: 2500 });
    expect(event.listingId).toBe(LISTING_ID);
    expect(event.sessionId).toBe(SESSION_ID);
    expect(event.createdAt).toBeDefined();
  });

  it("scroll_depth clamps value to 0-100 range", async () => {
    tracker = createEngagementTracker({
      listingId: LISTING_ID,
      sessionId: SESSION_ID,
      batchSize: 100,
    });

    tracker.trackScrollDepth(150); // over max
    tracker.trackScrollDepth(-10); // under min
    tracker.trackScrollDepth(75.7); // fractional → rounds
    await tracker.flush();

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.events[0].payload.max_depth_pct).toBe(100);
    expect(body.events[1].payload.max_depth_pct).toBe(0);
    expect(body.events[2].payload.max_depth_pct).toBe(76);
  });

  it("detail_open event has empty payload", async () => {
    tracker = createEngagementTracker({
      listingId: LISTING_ID,
      sessionId: SESSION_ID,
      batchSize: 100,
    });

    tracker.trackDetailOpen();
    await tracker.flush();

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.events[0].eventType).toBe("detail_open");
    expect(body.events[0].payload).toEqual({});
  });

  it("detail_close event includes duration_ms", async () => {
    tracker = createEngagementTracker({
      listingId: LISTING_ID,
      sessionId: SESSION_ID,
      batchSize: 100,
    });

    tracker.trackDetailClose(5000);
    await tracker.flush();

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.events[0].eventType).toBe("detail_close");
    expect(body.events[0].payload).toEqual({ duration_ms: 5000 });
  });

  it("match_reaffirm event includes match_event_id when provided", async () => {
    tracker = createEngagementTracker({
      listingId: LISTING_ID,
      sessionId: SESSION_ID,
      batchSize: 100,
    });

    tracker.trackMatchReaffirm("match-uuid-123");
    await tracker.flush();

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.events[0].eventType).toBe("match_reaffirm");
    expect(body.events[0].payload).toEqual({ match_event_id: "match-uuid-123" });
  });

  it("match_reaffirm event has empty payload when no matchEventId", async () => {
    tracker = createEngagementTracker({
      listingId: LISTING_ID,
      sessionId: SESSION_ID,
      batchSize: 100,
    });

    tracker.trackMatchReaffirm();
    await tracker.flush();

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.events[0].eventType).toBe("match_reaffirm");
    expect(body.events[0].payload).toEqual({});
  });
});

// ─── Custom endpoint ───────────────────────────────────────────────────────

describe("Custom flush endpoint", () => {
  it("uses custom endpoint when provided", async () => {
    tracker = createEngagementTracker({
      listingId: LISTING_ID,
      sessionId: SESSION_ID,
      flushEndpoint: "/custom/endpoint",
      batchSize: 100,
    });

    tracker.trackDetailOpen();
    await tracker.flush();

    expect(fetchMock.mock.calls[0][0]).toBe("/custom/endpoint");
  });
});
