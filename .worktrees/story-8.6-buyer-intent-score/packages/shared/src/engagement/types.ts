/**
 * Engagement event types for Epic 8: Engagement Intelligence.
 *
 * These types define the shape of events captured by the engagement tracker
 * and persisted in the `listing_engagement_events` table.
 *
 * Source: epics.md#Story 8.1
 */

// ---------------------------------------------------------------------------
// Event type literals
// ---------------------------------------------------------------------------

export const ENGAGEMENT_EVENT_TYPES = [
  "photo_view",
  "photo_swipe",
  "scroll_depth",
  "detail_open",
  "detail_close",
  "match_reaffirm",
] as const;

export type EngagementEventType = (typeof ENGAGEMENT_EVENT_TYPES)[number];

// ---------------------------------------------------------------------------
// Payload schemas per event type
// ---------------------------------------------------------------------------

export interface PhotoViewPayload {
  photo_index: number;
  duration_ms: number;
}

export interface ScrollDepthPayload {
  max_depth_pct: number; // 0-100
}

export interface DetailOpenPayload {
  // No additional data needed
}

export interface DetailClosePayload {
  duration_ms: number;
}

export interface MatchReaffirmPayload {
  match_event_id: string;
}

export type EngagementPayload =
  | PhotoViewPayload
  | ScrollDepthPayload
  | DetailOpenPayload
  | DetailClosePayload
  | MatchReaffirmPayload
  | Record<string, unknown>;

// ---------------------------------------------------------------------------
// Engagement event (client-side, pre-flush)
// ---------------------------------------------------------------------------

export interface EngagementEvent {
  /** Listing being interacted with */
  listingId: string;
  /** Session ID for grouping events */
  sessionId: string;
  /** Type of engagement event */
  eventType: EngagementEventType;
  /** Event-specific payload */
  payload: EngagementPayload;
  /** Client-side timestamp (ISO string) */
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Batch submission payload (sent to API)
// ---------------------------------------------------------------------------

export interface EngagementBatchPayload {
  events: EngagementEvent[];
}

// ---------------------------------------------------------------------------
// API response
// ---------------------------------------------------------------------------

export interface EngagementBatchResponse {
  inserted: number;
}
