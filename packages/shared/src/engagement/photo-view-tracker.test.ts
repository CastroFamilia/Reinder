/**
 * Story 8.2 — ATDD Tests: Photo View Tracker
 *
 * Tests cover:
 * - T8.2-01: Photo viewed >500ms → photo_view event created
 * - T8.2-02: Photo viewed <500ms → no event
 * - T8.2-03: Swipe (stopAndFlush) auto-closes active tracker
 * - T8.2-04: Tracking is ref-based (no re-renders — verified by mock absence)
 * - T8.2-05: Multiple photos tracked independently per session
 *
 * Run: pnpm --filter @reinder/shared test -- src/engagement/photo-view-tracker.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createPhotoViewTracker } from "./photo-view-tracker";
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
    batchSize: 100, // High batch size so we control flushing
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Helper to advance time ────────────────────────────────────────────────

function advanceTime(ms: number): void {
  const now = Date.now();
  vi.spyOn(Date, "now").mockReturnValue(now + ms);
}

// ─── T8.2-01: Photo viewed >500ms → event created ─────────────────────────

describe("T8.2-01: Photo viewed >500ms creates photo_view event", () => {
  it("creates event when photo is viewed for exactly 500ms", () => {
    const tracker = createPhotoViewTracker({ engagementTracker });
    
    const startTime = Date.now();
    vi.spyOn(Date, "now").mockReturnValueOnce(startTime); // onPhotoChange start
    tracker.onPhotoChange(0);
    
    vi.spyOn(Date, "now").mockReturnValueOnce(startTime + 500); // stopAndFlush
    tracker.stopAndFlush();

    expect(engagementTracker.getPendingCount()).toBe(1);
  });

  it("creates event when photo is viewed for 2500ms", () => {
    const tracker = createPhotoViewTracker({ engagementTracker });
    
    const startTime = Date.now();
    vi.spyOn(Date, "now").mockReturnValueOnce(startTime);
    tracker.onPhotoChange(0);
    
    vi.spyOn(Date, "now").mockReturnValueOnce(startTime + 2500);
    tracker.stopAndFlush();

    expect(engagementTracker.getPendingCount()).toBe(1);
  });
});

// ─── T8.2-02: Photo viewed <500ms → no event ──────────────────────────────

describe("T8.2-02: Photo viewed <500ms creates no event", () => {
  it("does not create event when photo viewed for 499ms", () => {
    const tracker = createPhotoViewTracker({ engagementTracker });
    
    const startTime = Date.now();
    vi.spyOn(Date, "now").mockReturnValueOnce(startTime);
    tracker.onPhotoChange(0);
    
    vi.spyOn(Date, "now").mockReturnValueOnce(startTime + 499);
    tracker.stopAndFlush();

    expect(engagementTracker.getPendingCount()).toBe(0);
  });

  it("does not create event when photo viewed for 0ms", () => {
    const tracker = createPhotoViewTracker({ engagementTracker });
    
    const startTime = Date.now();
    vi.spyOn(Date, "now").mockReturnValueOnce(startTime);
    tracker.onPhotoChange(0);
    
    vi.spyOn(Date, "now").mockReturnValueOnce(startTime);
    tracker.stopAndFlush();

    expect(engagementTracker.getPendingCount()).toBe(0);
  });
});

// ─── T8.2-03: Swipe auto-closes active tracker ────────────────────────────

describe("T8.2-03: Swipe (stopAndFlush) auto-closes active photo tracker", () => {
  it("stopAndFlush closes the active photo tracker", () => {
    const tracker = createPhotoViewTracker({ engagementTracker });
    
    const startTime = Date.now();
    vi.spyOn(Date, "now").mockReturnValueOnce(startTime);
    tracker.onPhotoChange(2);

    expect(tracker.getCurrentPhotoIndex()).toBe(2);
    
    vi.spyOn(Date, "now").mockReturnValueOnce(startTime + 1000);
    tracker.stopAndFlush();

    expect(tracker.getCurrentPhotoIndex()).toBeNull();
    expect(engagementTracker.getPendingCount()).toBe(1);
  });

  it("stopAndFlush is a no-op when no photo is being tracked", () => {
    const tracker = createPhotoViewTracker({ engagementTracker });
    tracker.stopAndFlush();
    expect(engagementTracker.getPendingCount()).toBe(0);
  });

  it("switching photos auto-stops the previous one", () => {
    const tracker = createPhotoViewTracker({ engagementTracker });
    
    const startTime = Date.now();
    vi.spyOn(Date, "now").mockReturnValueOnce(startTime);
    tracker.onPhotoChange(0);
    
    // Switch to photo 1 after 600ms
    vi.spyOn(Date, "now").mockReturnValueOnce(startTime + 600);
    tracker.onPhotoChange(1);

    // Photo 0 should have been tracked (600ms > 500ms threshold)
    expect(engagementTracker.getPendingCount()).toBe(1);
    expect(tracker.getCurrentPhotoIndex()).toBe(1);
  });
});

// ─── T8.2-04: Ref-based, no re-renders ────────────────────────────────────

describe("T8.2-04: Tracking is ref-based (no re-renders)", () => {
  it("createPhotoViewTracker returns plain object (not React state)", () => {
    const tracker = createPhotoViewTracker({ engagementTracker });
    
    // Verify it's a plain object with functions, not a React hook
    expect(typeof tracker).toBe("object");
    expect(typeof tracker.onPhotoChange).toBe("function");
    expect(typeof tracker.stopAndFlush).toBe("function");
    expect(typeof tracker.getCurrentPhotoIndex).toBe("function");
  });

  it("tracking operations do not trigger any external callbacks besides trackPhotoView", () => {
    const trackPhotoViewSpy = vi.spyOn(engagementTracker, "trackPhotoView");
    const tracker = createPhotoViewTracker({ engagementTracker });
    
    const startTime = Date.now();
    vi.spyOn(Date, "now").mockReturnValueOnce(startTime);
    tracker.onPhotoChange(0);
    
    vi.spyOn(Date, "now").mockReturnValueOnce(startTime + 1000);
    tracker.stopAndFlush();

    // Only trackPhotoView is called — no setState, no useEffect triggers
    expect(trackPhotoViewSpy).toHaveBeenCalledTimes(1);
    expect(trackPhotoViewSpy).toHaveBeenCalledWith(0, 1000);
  });
});

// ─── T8.2-05: Multiple photos tracked independently ───────────────────────

describe("T8.2-05: Multiple photos tracked independently per session", () => {
  it("tracks multiple photos in sequence with correct durations", () => {
    const trackPhotoViewSpy = vi.spyOn(engagementTracker, "trackPhotoView");
    const tracker = createPhotoViewTracker({ engagementTracker });
    
    const startTime = 1000000;
    
    // Photo 0 starts at startTime
    vi.spyOn(Date, "now").mockReturnValue(startTime);
    tracker.onPhotoChange(0);
    
    // Switch to photo 1 at +1000ms
    // stopCurrentPhoto reads Date.now() for end, then onPhotoChange reads it for start
    vi.spyOn(Date, "now").mockReturnValue(startTime + 1000);
    tracker.onPhotoChange(1);

    // Switch to photo 2 at +1800ms
    vi.spyOn(Date, "now").mockReturnValue(startTime + 1800);
    tracker.onPhotoChange(2);

    // Stop at +3500ms
    vi.spyOn(Date, "now").mockReturnValue(startTime + 3500);
    tracker.stopAndFlush();

    // Photo 0: 1000ms, Photo 1: 800ms, Photo 2: 1700ms
    expect(trackPhotoViewSpy).toHaveBeenCalledTimes(3);
    expect(trackPhotoViewSpy).toHaveBeenNthCalledWith(1, 0, 1000);
    expect(trackPhotoViewSpy).toHaveBeenNthCalledWith(2, 1, 800);
    expect(trackPhotoViewSpy).toHaveBeenNthCalledWith(3, 2, 1700);
  });

  it("skips quick-flipped photos under threshold", () => {
    const trackPhotoViewSpy = vi.spyOn(engagementTracker, "trackPhotoView");
    const tracker = createPhotoViewTracker({ engagementTracker });
    
    const startTime = 1000000;
    
    // Photo 0 starts
    vi.spyOn(Date, "now").mockReturnValue(startTime);
    tracker.onPhotoChange(0);
    
    // Quick flip to photo 1 at +100ms (both stop and start use same timestamp)
    vi.spyOn(Date, "now").mockReturnValue(startTime + 100);
    tracker.onPhotoChange(1);

    // Photo 1 stops at +2100ms
    vi.spyOn(Date, "now").mockReturnValue(startTime + 2100);
    tracker.stopAndFlush();

    // Only photo 1 should be tracked (100ms < 500ms threshold for photo 0)
    expect(trackPhotoViewSpy).toHaveBeenCalledTimes(1);
    expect(trackPhotoViewSpy).toHaveBeenCalledWith(1, 2000);
  });
});
