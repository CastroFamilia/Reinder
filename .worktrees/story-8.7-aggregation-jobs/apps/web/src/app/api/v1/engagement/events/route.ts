/**
 * POST /api/v1/engagement/events — Batch engagement event ingestion.
 *
 * Accepts a batch of engagement events from the buyer's session and inserts
 * them into `listing_engagement_events`. Auth-protected: only `buyer` role.
 *
 * Story 8.1 — Schema de Engagement Events e Instrumentación Base.
 *
 * Source: epics.md#Story 8.1
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/supabase/db";
import { listingEngagementEvents } from "@reinder/shared/db/schema";
import type {
  EngagementBatchPayload,
  EngagementEvent,
} from "@reinder/shared/engagement/types";

// ---------------------------------------------------------------------------
// Valid event types
// ---------------------------------------------------------------------------

const VALID_EVENT_TYPES = new Set([
  "photo_view",
  "photo_swipe",
  "scroll_depth",
  "detail_open",
  "detail_close",
  "match_reaffirm",
]);

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  // ── Auth check ──────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { data: null, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  // ── Role check: only buyers can submit engagement events ────────────────
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "buyer") {
    return NextResponse.json(
      {
        data: null,
        error: { code: "FORBIDDEN", message: "Only buyers can submit engagement events" },
      },
      { status: 403 }
    );
  }

  // ── Parse body ──────────────────────────────────────────────────────────
  let body: EngagementBatchPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { data: null, error: { code: "INVALID_INPUT", message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  if (!body.events || !Array.isArray(body.events) || body.events.length === 0) {
    return NextResponse.json(
      { data: null, error: { code: "INVALID_INPUT", message: "events array is required and must be non-empty" } },
      { status: 400 }
    );
  }

  // ── Validate events ─────────────────────────────────────────────────────
  for (const event of body.events) {
    if (!event.listingId || !event.sessionId || !event.eventType) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "INVALID_INPUT",
            message: "Each event must have listingId, sessionId, and eventType",
          },
        },
        { status: 400 }
      );
    }

    if (!VALID_EVENT_TYPES.has(event.eventType)) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "INVALID_EVENT_TYPE",
            message: `Invalid event type: ${event.eventType}`,
          },
        },
        { status: 400 }
      );
    }
  }

  // ── Batch insert ────────────────────────────────────────────────────────
  try {
    const rows = body.events.map((event: EngagementEvent) => ({
      buyerId: user.id, // Always use auth.uid() — never trust client-provided buyer_id
      listingId: event.listingId,
      sessionId: event.sessionId,
      eventType: event.eventType as "photo_view" | "photo_swipe" | "scroll_depth" | "detail_open" | "detail_close" | "match_reaffirm",
      payload: event.payload || {},
    }));

    await db.insert(listingEngagementEvents).values(rows);

    return NextResponse.json(
      { data: { inserted: rows.length }, error: null },
      { status: 200 }
    );
  } catch (error) {
    console.error("[engagement/events] Insert error:", error);
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to store events" } },
      { status: 500 }
    );
  }
}
