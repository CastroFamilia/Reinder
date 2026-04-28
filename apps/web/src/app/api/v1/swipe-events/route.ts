/**
 * apps/web/src/app/api/v1/swipe-events/route.ts
 *
 * POST /api/v1/swipe-events — Registra una acción de swipe (match o reject).
 *
 * Story 4.2: Implementación real con persistencia Supabase + notificación al agente.
 * Reemplaza el stub de Story 2.3.
 *
 * Flujo:
 * 1. Auth: buyer autenticado (buyerId = auth.uid())
 * 2. INSERT swipe_events (siempre — match y reject)
 * 3. Si action = 'match':
 *    a. INSERT match_events (con agentId del bond activo, si existe)
 *    b. notifyAgent → push notification al agente
 *
 * Source: story 4-2-notificacion-tiempo-real-match-cliente.md (Task 1)
 * Source: architecture.md#API & Communication Patterns
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/supabase/db";
import {
  swipeEvents,
  matchEvents,
  agentBuyerBonds,
  userProfiles,
} from "@reinder/shared/db/schema";
import { eq, and } from "drizzle-orm";
import type { ApiResponse, SwipeEvent } from "@reinder/shared";
import { notifyAgent } from "@/features/agent-link/lib/notify-agent";

// ─── POST /api/v1/swipe-events ────────────────────────────────────────────────

export async function POST(request: Request): Promise<NextResponse<ApiResponse<SwipeEvent>>> {
  // ─── 1. Auth ────────────────────────────────────────────────────────────────

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      },
      { status: 401 }
    );
  }

  // ─── 2. Parse + validate body ───────────────────────────────────────────────

  let body: { action?: string; listingId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        data: null,
        error: { code: "INVALID_INPUT", message: "Body JSON inválido" },
      },
      { status: 400 }
    );
  }

  const { action, listingId } = body;

  if (!action || !listingId) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "INVALID_INPUT",
          message: "action y listingId son requeridos",
        },
      },
      { status: 400 }
    );
  }

  if (action !== "match" && action !== "reject") {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "INVALID_ACTION",
          message: 'action debe ser "match" o "reject"',
        },
      },
      { status: 400 }
    );
  }

  // ─── 3. INSERT swipe_events (always) ────────────────────────────────────────

  const [swipeEvent] = await db
    .insert(swipeEvents)
    .values({
      buyerId: user.id,
      listingId,
      action,
    })
    .returning();

  // ─── 4. If match: persist match_events + notify agent ───────────────────────

  if (action === "match") {
    // Lookup active bond for this buyer (if any)
    const [bond] = await db
      .select({
        agentId: agentBuyerBonds.agentId,
      })
      .from(agentBuyerBonds)
      .where(
        and(
          eq(agentBuyerBonds.buyerId, user.id),
          eq(agentBuyerBonds.status, "active")
        )
      )
      .limit(1);

    const agentId = bond?.agentId ?? null;

    // INSERT match_events
    await db.insert(matchEvents).values({
      buyerId: user.id,
      listingId,
      agentId,
    });

    // Push notification to agent (silent no-op if no token or no bond)
    if (agentId) {
      // Get buyer name for personalized message
      const [buyerProfile] = await db
        .select({ fullName: userProfiles.fullName })
        .from(userProfiles)
        .where(eq(userProfiles.id, user.id))
        .limit(1);

      const buyerName = buyerProfile?.fullName ?? "Tu cliente";
      const message = `${buyerName} ha hecho match con una propiedad`;

      // Fire-and-forget — never fail the main request
      notifyAgent(agentId, message, "Nuevo match en Reinder", {
        type: "match.created",
        listingId,
        buyerId: user.id,
      }).catch((err) => {
        console.error("[swipe-events] Error notificando agente:", err);
      });
    }
  }

  // ─── 5. Return response ─────────────────────────────────────────────────────

  const response: SwipeEvent = {
    id: swipeEvent.id,
    action: swipeEvent.action as "match" | "reject",
    listingId: swipeEvent.listingId,
    buyerId: swipeEvent.buyerId,
    createdAt: swipeEvent.createdAt.toISOString(),
  };

  return NextResponse.json({ data: response, error: null });
}
