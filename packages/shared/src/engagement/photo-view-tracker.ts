/**
 * Photo View Tracker — Measures time spent on each photo in a property gallery.
 *
 * Framework-agnostic (works in React via ref, or vanilla JS).
 * Uses timestamp-based tracking (no setInterval/setTimeout = no memory leaks).
 *
 * Story 8.2 — Instrumentación de PropertyCard — Tiempo por Foto.
 *
 * Usage:
 *   const tracker = createPhotoViewTracker({ engagementTracker });
 *   tracker.onPhotoChange(0);  // Start tracking photo 0
 *   tracker.onPhotoChange(1);  // Stop photo 0 (flush if >500ms), start photo 1
 *   tracker.stopAndFlush();    // Stop current photo on swipe/navigation
 *
 * Source: epics.md#Story 8.2
 */

import type { EngagementTracker } from "./use-engagement-tracker";
import { MIN_PHOTO_VIEW_MS } from "./use-engagement-tracker";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PhotoViewTrackerOptions {
  /** Engagement tracker instance for event submission */
  engagementTracker: EngagementTracker;
}

export interface PhotoViewTracker {
  /** Call when user navigates to a new photo. Stops tracking previous photo. */
  onPhotoChange: (photoIndex: number) => void;
  /** Stop tracking current photo and flush event. Call on swipe/match/reject. */
  stopAndFlush: () => void;
  /** Get the index of the currently tracked photo, or null if none. */
  getCurrentPhotoIndex: () => number | null;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export function createPhotoViewTracker(
  options: PhotoViewTrackerOptions
): PhotoViewTracker {
  const { engagementTracker } = options;

  // Internal state — ref-based, zero re-renders
  let currentPhotoIndex: number | null = null;
  let viewStartTime: number | null = null;

  /**
   * Stop tracking the current photo and emit event if viewed > MIN_PHOTO_VIEW_MS.
   * Returns the duration in ms (for testing), or 0 if nothing was tracked.
   */
  function stopCurrentPhoto(): number {
    if (currentPhotoIndex === null || viewStartTime === null) return 0;

    const durationMs = Date.now() - viewStartTime;
    const photoIndex = currentPhotoIndex;

    // Reset internal state
    currentPhotoIndex = null;
    viewStartTime = null;

    // Only track if viewed for more than threshold (enforced by tracker too)
    if (durationMs >= MIN_PHOTO_VIEW_MS) {
      engagementTracker.trackPhotoView(photoIndex, durationMs);
    }

    return durationMs;
  }

  return {
    onPhotoChange(photoIndex: number): void {
      // Stop tracking previous photo first
      stopCurrentPhoto();

      // Start tracking new photo
      currentPhotoIndex = photoIndex;
      viewStartTime = Date.now();
    },

    stopAndFlush(): void {
      stopCurrentPhoto();
    },

    getCurrentPhotoIndex(): number | null {
      return currentPhotoIndex;
    },
  };
}
