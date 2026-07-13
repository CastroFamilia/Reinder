/**
 * apps/web/src/app/api/v1/agent/clients/[buyerId]/history/route.ts
 *
 * GET /api/v1/agent/clients/[buyerId]/history
 * Returns paginated match and reject history for a specific buyer,
 * accessible only by the agent bonded to that buyer.
 *
 * Query params:
 * - page: number (default: 1, 1-indexed)
 * - pageSize: number (default: 20, max: 50)
 *
 * Response: { matches: MatchHistoryItem[], rejects: RejectHistoryItem[], total: number }
 *
 * - RLS: only the agent bonded to the buyer can access (verified via bond lookup)
 * - Pagination: offset-based (20 per page as per AC5)
 *
 * Source: story 4-3-historial-matches-rechazos-cliente.md (Task 1)
 * Source: architecture.md#authentication-security (RBAC)
 */
import "server-only";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/supabase/db";
import {
  userProfiles,
  agentBuyerBonds,
  matchEvents,
  swipeEvents,
  listings,
} from "@reinder/shared/db/schema";
import { eq, and, desc, count } from "drizzle-orm";
import type { ApiResponse } from "@reinder/shared";

// ─── Response types ───────────────────────────────────────────────────────────

export interface MatchHistoryItem {
  matchId: string;
  listingId: string;
  listingTitle: string | null;
  listingPrice: string | null; // numeric as string (Drizzle returns string for numeric)
  listingAddress: string | null;
  listingImageUrl: string | null; // first image from images[] JSONB array
  matchedAt: string;
}

export interface RejectHistoryItem {
  rejectId: string;
  listingId: string;
  listingTitle: string | null;
  listingPrice: string | null;
  listingAddress: string | null;
  listingImageUrl: string | null;
  rejectedAt: string;
}

export interface ClientHistoryResponse {
  matches: MatchHistoryItem[];
  rejects: RejectHistoryItem[];
  totalMatches: number;
  totalRejects: number;
  page: number;
  pageSize: number;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ buyerId: string }> }
) {
  const { buyerId } = await params;

  // ─── 1. Auth ─────────────────────────────────────────────────────────────────

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
      } satisfies ApiResponse<never>,
      { status: 401 }
    );
  }

  // ─── 2. Role check ────────────────────────────────────────────────────────────

  const [profile] = await db
    .select({ role: userProfiles.role })
    .from(userProfiles)
    .where(eq(userProfiles.id, user.id))
    .limit(1);

  if (!profile || profile.role !== "agent") {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "FORBIDDEN",
          message: "Agent role required",
        },
      } satisfies ApiResponse<never>,
      { status: 403 }
    );
  }

  // ─── 3. Verify bond ownership (RLS) ────────────────────────────────────────

  const [bond] = await db
    .select({ id: agentBuyerBonds.id })
    .from(agentBuyerBonds)
    .where(
      and(
        eq(agentBuyerBonds.agentId, user.id),
        eq(agentBuyerBonds.buyerId, buyerId),
        eq(agentBuyerBonds.status, "active")
      )
    )
    .limit(1);

  if (!bond) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "FORBIDDEN",
          message: "No active bond with this buyer",
        },
      } satisfies ApiResponse<never>,
      { status: 403 }
    );
  }

  // ─── 4. Parse pagination params ──────────────────────────────────────────────

  const searchParams = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10)));
  const offset = (page - 1) * pageSize;

  // ─── 5. Query matches ─────────────────────────────────────────────────────────

  const [{ value: totalMatches }] = await db
    .select({ value: count() })
    .from(matchEvents)
    .where(eq(matchEvents.buyerId, buyerId));

  const matchRows = await db
    .select({
      matchId: matchEvents.id,
      listingId: matchEvents.listingId,
      listingTitle: listings.title,
      listingPrice: listings.price,
      listingAddress: listings.address,
      listingImages: listings.images,
      matchedAt: matchEvents.createdAt,
    })
    .from(matchEvents)
    .leftJoin(listings, eq(listings.id, matchEvents.listingId))
    .where(eq(matchEvents.buyerId, buyerId))
    .orderBy(desc(matchEvents.createdAt))
    .limit(pageSize)
    .offset(offset);

  // ─── 6. Query rejects ─────────────────────────────────────────────────────────

  const [{ value: totalRejects }] = await db
    .select({ value: count() })
    .from(swipeEvents)
    .where(
      and(
        eq(swipeEvents.buyerId, buyerId),
        eq(swipeEvents.action, "reject")
      )
    );

  const rejectRows = await db
    .select({
      rejectId: swipeEvents.id,
      listingId: swipeEvents.listingId,
      listingTitle: listings.title,
      listingPrice: listings.price,
      listingAddress: listings.address,
      listingImages: listings.images,
      rejectedAt: swipeEvents.createdAt,
    })
    .from(swipeEvents)
    .leftJoin(listings, eq(listings.id, swipeEvents.listingId))
    .where(
      and(
        eq(swipeEvents.buyerId, buyerId),
        eq(swipeEvents.action, "reject")
      )
    )
    .orderBy(desc(swipeEvents.createdAt))
    .limit(pageSize)
    .offset(offset);

  // ─── 7. Update agentLastSeenAt (mark as seen) ────────────────────────────────

  await db
    .update(agentBuyerBonds)
    .set({ agentLastSeenAt: new Date() })
    .where(
      and(
        eq(agentBuyerBonds.agentId, user.id),
        eq(agentBuyerBonds.buyerId, buyerId)
      )
    );

  // ─── 8. Map and return ────────────────────────────────────────────────────────

  const response: ClientHistoryResponse = {
    matches: matchRows.map((row) => ({
      matchId: row.matchId,
      listingId: row.listingId,
      listingTitle: row.listingTitle ?? null,
      listingPrice: row.listingPrice ?? null,
      listingAddress: row.listingAddress ?? null,
      listingImageUrl: (row.listingImages as string[] | null)?.[0] ?? null,
      matchedAt: row.matchedAt.toISOString(),
    })),
    rejects: rejectRows.map((row) => ({
      rejectId: row.rejectId,
      listingId: row.listingId,
      listingTitle: row.listingTitle ?? null,
      listingPrice: row.listingPrice ?? null,
      listingAddress: row.listingAddress ?? null,
      listingImageUrl: (row.listingImages as string[] | null)?.[0] ?? null,
      rejectedAt: row.rejectedAt.toISOString(),
    })),
    totalMatches,
    totalRejects,
    page,
    pageSize,
  };

  return NextResponse.json(
    { data: response, error: null } satisfies ApiResponse<ClientHistoryResponse>,
    { status: 200 }
  );
}
