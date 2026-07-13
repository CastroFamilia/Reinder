/**
 * Detail Sheet Tracker — Tracks scroll depth and open/close timing.
 *
 * Captures how much of a property description the buyer reads (scroll depth)
 * and how long they spend in the detail sheet.
 *
 * Story 8.3 — Instrumentación de PropertyDetailSheet — Scroll Depth.
 *
 * Usage:
 *   const detailTracker = createDetailSheetTracker({ engagementTracker });
 *   detailTracker.onOpen();                    // track detail_open
 *   detailTracker.onScroll(scrollPct);         // update max scroll depth
 *   detailTracker.onClose();                   // track scroll_depth + detail_close
 *   // OR
 *   detailTracker.onCloseWithAction('match');  // track action before close
 *
 * Source: epics.md#Story 8.3
 */

import type { EngagementTracker } from "./use-engagement-tracker";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DetailSheetTrackerOptions {
  /** Engagement tracker instance for event submission */
  engagementTracker: EngagementTracker;
}

export interface DetailSheetTracker {
  /** Call when detail sheet opens. Emits detail_open event. */
  onOpen: () => void;
  /** Call on scroll — updates the max scroll depth (does NOT emit event yet). */
  onScroll: (scrollPct: number) => void;
  /** Call when sheet closes normally. Emits scroll_depth + detail_close. */
  onClose: () => void;
  /** Call when match/reject happens from within the sheet. Emits scroll_depth + detail_close. */
  onCloseWithAction: (action: "match" | "reject") => void;
  /** Check if the sheet is currently being tracked */
  isOpen: () => boolean;
  /** Get current max scroll depth (for testing) */
  getMaxScrollDepth: () => number;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export function createDetailSheetTracker(
  options: DetailSheetTrackerOptions
): DetailSheetTracker {
  const { engagementTracker } = options;

  let openTime: number | null = null;
  let maxScrollDepthPct = 0;
  let isTracking = false;

  function emitCloseEvents(): void {
    if (!isTracking || openTime === null) return;

    const durationMs = Date.now() - openTime;

    // Always emit scroll_depth (even if 0 — means buyer didn't scroll)
    engagementTracker.trackScrollDepth(maxScrollDepthPct);

    // Emit detail_close with duration
    engagementTracker.trackDetailClose(durationMs);

    // Reset state
    openTime = null;
    maxScrollDepthPct = 0;
    isTracking = false;
  }

  return {
    onOpen(): void {
      // If already open (shouldn't happen), close first
      if (isTracking) {
        emitCloseEvents();
      }

      openTime = Date.now();
      maxScrollDepthPct = 0;
      isTracking = true;

      engagementTracker.trackDetailOpen();
    },

    onScroll(scrollPct: number): void {
      if (!isTracking) return;
      // Only track maximum depth reached
      const clamped = Math.max(0, Math.min(100, Math.round(scrollPct)));
      if (clamped > maxScrollDepthPct) {
        maxScrollDepthPct = clamped;
      }
    },

    onClose(): void {
      emitCloseEvents();
    },

    onCloseWithAction(_action: "match" | "reject"): void {
      // AC: "si el comprador hace match o reject desde el sheet,
      //      esos eventos se registran antes del cierre"
      // The swipe action itself is recorded by the swipe handler.
      // We just need to ensure our close events fire.
      emitCloseEvents();
    },

    isOpen(): boolean {
      return isTracking;
    },

    getMaxScrollDepth(): number {
      return maxScrollDepthPct;
    },
  };
}
