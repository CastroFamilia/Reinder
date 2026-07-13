/**
 * POST /api/v1/matches/{id}/reaffirm — Reaffirm a match from the Match Recap Screen.
 *
 * Records a `match_reaffirm` engagement event and emits a Realtime event
 * to the buyer's bonded agent. The agent receives an urgent push notification.
 *
 * Story 8.4 — Tracking Match Reaffirm desde Match Recap Screen.
 *
 * Source: epics.md#Story 8.4
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/supabase/db";
import {
  matchEvents,
  listingEngagementEvents,
  agentBuyerBonds,
} from "@reinder/shared/db/schema";
import { eq, and } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(
  _request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
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

  const { id: matchId } = await params;

  if (!matchId) {
    return NextResponse.json(
      { data: null, error: { code: "INVALID_INPUT", message: "matchId is required" } },
      { status: 400 }
    );
  }

  try {
    // ── Verify match exists and belongs to buyer ────────────────────────
    const [match] = await db
      .select()
      .from(matchEvents)
      .where(and(eq(matchEvents.id, matchId), eq(matchEvents.buyerId, user.id)))
      .limit(1);

    if (!match) {
      return NextResponse.json(
        { data: null, error: { code: "NOT_FOUND", message: "Match not found or not owned by user" } },
        { status: 404 }
      );
    }

    // ── Check for existing reaffirmation (idempotency) ─────────────────
    const [existingReaffirm] = await db
      .select()
      .from(listingEngagementEvents)
      .where(
        and(
          eq(listingEngagementEvents.buyerId, user.id),
          eq(listingEngagementEvents.listingId, match.listingId),
          eq(listingEngagementEvents.eventType, "match_reaffirm")
        )
      )
      .limit(1);

    if (existingReaffirm) {
      // Already reaffirmed — return success without duplicate event
      return NextResponse.json(
        {
          data: { reaffirmed: true, matchId, alreadyReaffirmed: true },
          error: null,
        },
        { status: 200 }
      );
    }

    // ── Record the reaffirmation event ─────────────────────────────────
    await db.insert(listingEngagementEvents).values({
      buyerId: user.id,
      listingId: match.listingId,
      sessionId: crypto.randomUUID(), // Auto-generated session for server-initiated events
      eventType: "match_reaffirm",
      payload: { match_event_id: matchId },
    });

    // ── Update match as confirmed ─────────────────────────────────────
    await db
      .update(matchEvents)
      .set({ confirmedAt: new Date() })
      .where(eq(matchEvents.id, matchId));

    // ── Notify bonded agent (if exists) ────────────────────────────────
    const [bond] = await db
      .select()
      .from(agentBuyerBonds)
      .where(
        and(
          eq(agentBuyerBonds.buyerId, user.id),
          eq(agentBuyerBonds.status, "active")
        )
      )
      .limit(1);

    if (bond) {
      // Emit Realtime event for agent's dashboard
      try {
        await supabase.channel(`agent-${bond.agentId}`).send({
          type: "broadcast",
          event: "match.reaffirmed",
          payload: {
            matchId,
            buyerId: user.id,
            listingId: match.listingId,
            type: "urgent",
          },
        });
      } catch (realtimeError) {
        // Log but don't fail the request — notification is best-effort
        console.error("[reaffirm] Realtime broadcast error:", realtimeError);
      }
    }

    return NextResponse.json(
      {
        data: { reaffirmed: true, matchId, agentNotified: !!bond },
        error: null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[reaffirm] Error:", error);
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to reaffirm match" } },
      { status: 500 }
    );
  }
}
