/**
 * Story 8.3 — ATDD Tests: Detail Sheet Tracker
 *
 * Tests cover:
 * - T8.3-01: Opening sheet → detail_open event
 * - T8.3-02: Closing sheet → detail_close with duration_ms + scroll_depth with max_depth_pct
 * - T8.3-03: Scroll depth correctly calculated as percentage (0-100)
 * - T8.3-04: Match/reject from sheet → engagement events fire before close
 * - T8.3-05: No scroll → max_depth_pct: 0
 *
 * Run: pnpm --filter @reinder/shared test -- src/engagement/detail-sheet-tracker.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createDetailSheetTracker } from "./detail-sheet-tracker";
import { createEngagementTracker } from "./use-engagement-tracker";
import type { EngagementTracker } from "./use-engagement-tracker";

// ─── Setup ────────────────────────────────────────────────────────────────────

let engagementTracker: EngagementTracker;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
  vi.stubGlobal("fetch", fetchMock);

  engagementTracker = createEngagementTracker({
    listingId: "listing-uuid-1",
    sessionId: "session-uuid-1",
    batchSize: 100,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── T8.3-01: Opening sheet → detail_open event ───────────────────────────

describe("T8.3-01: Opening sheet emits detail_open event", () => {
  it("emits detail_open when onOpen() is called", () => {
    const spy = vi.spyOn(engagementTracker, "trackDetailOpen");
    const tracker = createDetailSheetTracker({ engagementTracker });

    tracker.onOpen();

    expect(spy).toHaveBeenCalledTimes(1);
    expect(tracker.isOpen()).toBe(true);
  });
});

// ─── T8.3-02: Closing sheet → detail_close + scroll_depth ─────────────────

describe("T8.3-02: Closing sheet emits scroll_depth + detail_close", () => {
  it("emits scroll_depth and detail_close with duration on close", () => {
    const scrollSpy = vi.spyOn(engagementTracker, "trackScrollDepth");
    const closeSpy = vi.spyOn(engagementTracker, "trackDetailClose");
    const tracker = createDetailSheetTracker({ engagementTracker });

    const startTime = 1000000;
    vi.spyOn(Date, "now").mockReturnValue(startTime);
    tracker.onOpen();

    tracker.onScroll(50);

    vi.spyOn(Date, "now").mockReturnValue(startTime + 5000);
    tracker.onClose();

    expect(scrollSpy).toHaveBeenCalledWith(50);
    expect(closeSpy).toHaveBeenCalledWith(5000);
    expect(tracker.isOpen()).toBe(false);
  });
});

// ─── T8.3-03: Scroll depth correctly calculated as percentage ──────────────

describe("T8.3-03: Scroll depth tracks maximum depth correctly", () => {
  it("tracks the maximum scroll depth reached", () => {
    const scrollSpy = vi.spyOn(engagementTracker, "trackScrollDepth");
    const tracker = createDetailSheetTracker({ engagementTracker });

    const startTime = 1000000;
    vi.spyOn(Date, "now").mockReturnValue(startTime);
    tracker.onOpen();

    tracker.onScroll(20);
    tracker.onScroll(60);
    tracker.onScroll(40); // scrolled back up — should not decrease max
    tracker.onScroll(80);

    vi.spyOn(Date, "now").mockReturnValue(startTime + 3000);
    tracker.onClose();

    // Should report max depth of 80, not 40
    expect(scrollSpy).toHaveBeenCalledWith(80);
  });

  it("clamps scroll depth to 0-100 range", () => {
    const tracker = createDetailSheetTracker({ engagementTracker });

    const startTime = 1000000;
    vi.spyOn(Date, "now").mockReturnValue(startTime);
    tracker.onOpen();

    tracker.onScroll(150); // over max
    expect(tracker.getMaxScrollDepth()).toBe(100);

    tracker.onScroll(-10); // should not decrease max
    expect(tracker.getMaxScrollDepth()).toBe(100);
  });

  it("rounds fractional percentages", () => {
    const tracker = createDetailSheetTracker({ engagementTracker });

    vi.spyOn(Date, "now").mockReturnValue(1000000);
    tracker.onOpen();

    tracker.onScroll(33.7);
    expect(tracker.getMaxScrollDepth()).toBe(34);
  });
});

// ─── T8.3-04: Match/reject from sheet → events fire before close ───────────

describe("T8.3-04: Match/reject from sheet fires engagement events before close", () => {
  it("onCloseWithAction('match') emits scroll_depth + detail_close", () => {
    const scrollSpy = vi.spyOn(engagementTracker, "trackScrollDepth");
    const closeSpy = vi.spyOn(engagementTracker, "trackDetailClose");
    const tracker = createDetailSheetTracker({ engagementTracker });

    const startTime = 1000000;
    vi.spyOn(Date, "now").mockReturnValue(startTime);
    tracker.onOpen();

    tracker.onScroll(75);

    vi.spyOn(Date, "now").mockReturnValue(startTime + 8000);
    tracker.onCloseWithAction("match");

    expect(scrollSpy).toHaveBeenCalledWith(75);
    expect(closeSpy).toHaveBeenCalledWith(8000);
    expect(tracker.isOpen()).toBe(false);
  });

  it("onCloseWithAction('reject') emits scroll_depth + detail_close", () => {
    const scrollSpy = vi.spyOn(engagementTracker, "trackScrollDepth");
    const closeSpy = vi.spyOn(engagementTracker, "trackDetailClose");
    const tracker = createDetailSheetTracker({ engagementTracker });

    const startTime = 1000000;
    vi.spyOn(Date, "now").mockReturnValue(startTime);
    tracker.onOpen();

    tracker.onScroll(10);

    vi.spyOn(Date, "now").mockReturnValue(startTime + 2000);
    tracker.onCloseWithAction("reject");

    expect(scrollSpy).toHaveBeenCalledWith(10);
    expect(closeSpy).toHaveBeenCalledWith(2000);
  });
});

// ─── T8.3-05: No scroll → max_depth_pct: 0 ────────────────────────────────

describe("T8.3-05: No scroll results in scroll_depth 0", () => {
  it("reports max_depth_pct 0 when user never scrolled", () => {
    const scrollSpy = vi.spyOn(engagementTracker, "trackScrollDepth");
    const tracker = createDetailSheetTracker({ engagementTracker });

    const startTime = 1000000;
    vi.spyOn(Date, "now").mockReturnValue(startTime);
    tracker.onOpen();

    // No onScroll calls
    vi.spyOn(Date, "now").mockReturnValue(startTime + 1000);
    tracker.onClose();

    expect(scrollSpy).toHaveBeenCalledWith(0);
  });
});

// ─── Edge cases ────────────────────────────────────────────────────────────

describe("Edge cases", () => {
  it("onClose is a no-op when sheet is not open", () => {
    const closeSpy = vi.spyOn(engagementTracker, "trackDetailClose");
    const tracker = createDetailSheetTracker({ engagementTracker });

    tracker.onClose();
    expect(closeSpy).not.toHaveBeenCalled();
  });

  it("onScroll is ignored when sheet is not open", () => {
    const tracker = createDetailSheetTracker({ engagementTracker });
    tracker.onScroll(50);
    expect(tracker.getMaxScrollDepth()).toBe(0);
  });

  it("double onOpen closes the first session and starts a new one", () => {
    const openSpy = vi.spyOn(engagementTracker, "trackDetailOpen");
    const closeSpy = vi.spyOn(engagementTracker, "trackDetailClose");
    const tracker = createDetailSheetTracker({ engagementTracker });

    const startTime = 1000000;
    vi.spyOn(Date, "now").mockReturnValue(startTime);
    tracker.onOpen();

    vi.spyOn(Date, "now").mockReturnValue(startTime + 1000);
    tracker.onOpen(); // Should close first, then reopen

    expect(openSpy).toHaveBeenCalledTimes(2);
    expect(closeSpy).toHaveBeenCalledTimes(1);
    expect(closeSpy).toHaveBeenCalledWith(1000);
  });
});
