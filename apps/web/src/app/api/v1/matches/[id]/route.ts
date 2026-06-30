/**
 * apps/web/src/app/api/v1/matches/[id]/route.ts
 *
 * PATCH /api/v1/matches/{id}/confirm — Confirma un match desde el recap.
 *   The {id} can be either a match_events.id OR a listing_id.
 *   Sets confirmed_at = now() on the match_events row.
 *   Verifies the match belongs to the authenticated buyer.
 *
 * DELETE /api/v1/matches/{id} — Descarta un match desde el recap.
 *   The {id} can be either a match_events.id OR a listing_id.
 *   Deletes the match_events row (only if it belongs to the authenticated buyer).
 *
 * NOTE: The mobile recap screen passes listing IDs (not match event IDs),
 * so we look up by both match_events.id and match_events.listing_id.
 *
 * Backlog Item 3: Fix — implements real persistence replacing the stub.
 *
 * Source: architecture.md#API & Communication Patterns
 * Source: epics.md#Story-2.6 (AC3, AC4)
 */
import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/supabase/api-auth";
import { db } from "@/lib/supabase/db";
import { matchEvents } from "@reinder/shared/db/schema";
import { eq, and, or } from "drizzle-orm";
import type { ApiResponse } from "@reinder/shared";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/v1/matches/{id}/confirm
 * Confirma un match desde el recap — sets confirmed_at = now().
 */
export async function PATCH(
  _request: Request,
  { params }: RouteParams
): Promise<
  NextResponse<ApiResponse<{ confirmed: boolean; matchId: string }>>
> {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "INVALID_INPUT",
            message: "matchId es requerido",
          },
        },
        { status: 400 }
      );
    }

    // Auth: supports both cookies (web) and Bearer token (mobile)
    const auth = await authenticateApiRequest(_request);

    if (!auth.user) {
      return NextResponse.json(
        {
          data: null,
          error: { code: "UNAUTHORIZED", message: auth.error },
        },
        { status: 401 }
      );
    }

    const user = auth.user;

    // Update match_events: set confirmed_at = now()
    // The ID may be a match_events.id OR a listing_id (mobile recap sends listing IDs)
    // Only update if the match belongs to this buyer
    const [updated] = await db
      .update(matchEvents)
      .set({ confirmedAt: new Date() })
      .where(
        and(
          or(
            eq(matchEvents.id, id),
            eq(matchEvents.listingId, id)
          ),
          eq(matchEvents.buyerId, user.id)
        )
      )
      .returning({ id: matchEvents.id });

    if (!updated) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "NOT_FOUND",
            message: "Match no encontrado o no pertenece a este usuario",
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: { confirmed: true, matchId: id },
      error: null,
    });
  } catch (err) {
    console.error("[matches/confirm] Error:", err);
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "SERVER_ERROR",
          message: "Error interno del servidor",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/matches/{id}
 * Descarta un match desde el recap — deletes the match_events row.
 */
export async function DELETE(
  _request: Request,
  { params }: RouteParams
): Promise<
  NextResponse<ApiResponse<{ deleted: boolean; matchId: string }>>
> {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "INVALID_INPUT",
            message: "matchId es requerido",
          },
        },
        { status: 400 }
      );
    }

    // Auth: supports both cookies (web) and Bearer token (mobile)
    const auth = await authenticateApiRequest(_request);

    if (!auth.user) {
      return NextResponse.json(
        {
          data: null,
          error: { code: "UNAUTHORIZED", message: auth.error },
        },
        { status: 401 }
      );
    }

    const user = auth.user;

    // Delete match_events row — only if it belongs to this buyer
    // The ID may be a match_events.id OR a listing_id (mobile recap sends listing IDs)
    const [deleted] = await db
      .delete(matchEvents)
      .where(
        and(
          or(
            eq(matchEvents.id, id),
            eq(matchEvents.listingId, id)
          ),
          eq(matchEvents.buyerId, user.id)
        )
      )
      .returning({ id: matchEvents.id });

    if (!deleted) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "NOT_FOUND",
            message: "Match no encontrado o no pertenece a este usuario",
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: { deleted: true, matchId: id },
      error: null,
    });
  } catch (err) {
    console.error("[matches/delete] Error:", err);
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "SERVER_ERROR",
          message: "Error interno del servidor",
        },
      },
      { status: 500 }
    );
  }
}
