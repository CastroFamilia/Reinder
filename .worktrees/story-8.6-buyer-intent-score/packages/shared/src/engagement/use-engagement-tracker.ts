/**
 * useEngagementTracker() — Hook para captura de micro-comportamiento del comprador.
 *
 * Diseñado para ZERO re-renders: todo el estado se gestiona con refs.
 * Los eventos se encolan localmente y se envían en batch al API endpoint.
 *
 * Story 8.1 — Schema de Engagement Events e Instrumentación Base.
 *
 * Usage:
 *   const tracker = useEngagementTracker({ listingId, sessionId });
 *   tracker.trackPhotoView(0, 2500);  // photo 0 viewed for 2.5s
 *   tracker.trackScrollDepth(75);     // 75% of detail read
 *   await tracker.flush();            // manual flush
 *
 * Source: epics.md#Story 8.1
 */

import type {
  EngagementEvent,
  EngagementEventType,
  EngagementPayload,
} from "./types";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface UseEngagementTrackerOptions {
  /** UUID of the listing being viewed */
  listingId: string;
  /** UUID of the current session */
  sessionId: string;
  /** API endpoint for batch submission (default: /api/v1/engagement/events) */
  flushEndpoint?: string;
  /** Number of events that triggers auto-flush (default: 10) */
  batchSize?: number;
}

export interface EngagementTracker {
  /** Record a photo view event (only if durationMs > 500) */
  trackPhotoView: (photoIndex: number, durationMs: number) => void;
  /** Record the maximum scroll depth in the detail sheet */
  trackScrollDepth: (maxDepthPct: number) => void;
  /** Record detail sheet opened */
  trackDetailOpen: () => void;
  /** Record detail sheet closed with duration */
  trackDetailClose: (durationMs: number) => void;
  /** Record a match reaffirmation from the recap screen */
  trackMatchReaffirm: (matchEventId?: string) => void;
  /** Manually flush all queued events to the API */
  flush: () => Promise<void>;
  /** Get count of pending (unflushed) events */
  getPendingCount: () => number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_FLUSH_ENDPOINT = "/api/v1/engagement/events";
const DEFAULT_BATCH_SIZE = 10;
/** Minimum photo view duration to track (ms) — per AC Story 8.2 */
export const MIN_PHOTO_VIEW_MS = 500;

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Creates an engagement tracker instance.
 *
 * This is a factory function (not a React hook) so it can be used
 * in both React and non-React contexts. The React hook wrapper
 * would use useRef to store the instance.
 *
 * All state is internal — no external re-renders triggered.
 */
export function createEngagementTracker(
  options: UseEngagementTrackerOptions
): EngagementTracker {
  const {
    listingId,
    sessionId,
    flushEndpoint = DEFAULT_FLUSH_ENDPOINT,
    batchSize = DEFAULT_BATCH_SIZE,
  } = options;

  // Internal event queue — never exposed as state
  const queue: EngagementEvent[] = [];
  let isFlushing = false;

  // ── Helpers ──────────────────────────────────────────────────────────────

  function enqueue(eventType: EngagementEventType, payload: EngagementPayload): void {
    queue.push({
      listingId,
      sessionId,
      eventType,
      payload,
      createdAt: new Date().toISOString(),
    });

    // Auto-flush when batch size reached
    if (queue.length >= batchSize) {
      // Fire-and-forget flush (non-blocking)
      void flushEvents();
    }
  }

  async function flushEvents(): Promise<void> {
    if (isFlushing || queue.length === 0) return;

    isFlushing = true;
    // Drain the queue atomically
    const batch = queue.splice(0, queue.length);

    try {
      const response = await fetch(flushEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: batch }),
      });

      if (!response.ok) {
        // Re-enqueue failed events at the front
        queue.unshift(...batch);
        console.error(
          `[EngagementTracker] Flush failed (${response.status}): ${response.statusText}`
        );
      }
    } catch (error) {
      // Network error — re-enqueue for retry
      queue.unshift(...batch);
      console.error("[EngagementTracker] Flush network error:", error);
    } finally {
      isFlushing = false;
    }
  }

  // ── Public API ──────────────────────────────────────────────────────────

  return {
    trackPhotoView(photoIndex: number, durationMs: number): void {
      // AC: only track views >500ms
      if (durationMs < MIN_PHOTO_VIEW_MS) return;
      enqueue("photo_view", { photo_index: photoIndex, duration_ms: durationMs });
    },

    trackScrollDepth(maxDepthPct: number): void {
      const clamped = Math.max(0, Math.min(100, Math.round(maxDepthPct)));
      enqueue("scroll_depth", { max_depth_pct: clamped });
    },

    trackDetailOpen(): void {
      enqueue("detail_open", {});
    },

    trackDetailClose(durationMs: number): void {
      enqueue("detail_close", { duration_ms: durationMs });
    },

    trackMatchReaffirm(matchEventId?: string): void {
      enqueue("match_reaffirm", matchEventId ? { match_event_id: matchEventId } : {});
    },

    flush: flushEvents,

    getPendingCount(): number {
      return queue.length;
    },
  };
}
