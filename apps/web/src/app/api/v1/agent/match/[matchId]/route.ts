/**
 * apps/web/src/app/api/v1/agent/match/[matchId]/route.ts
 *
 * GET /api/v1/agent/match/[matchId]
 * Returns full match details: listing info + buyer info + match metadata.
 * Accessible only by the agent bonded to the buyer of the match.
 *
 * PATCH /api/v1/agent/match/[matchId]
 * Marks the match as "gestionado" (confirmedAt = now()).
 * Used by the "Marcar como gestionado" button (FR34, Story 4.4 AC4).
 *
 * Source: story 4-4-deep-link-notificacion-detalle-match.md (Task 1)
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
  listings,
} from "@reinder/shared/db/schema";
import { eq, and } from "drizzle-orm";
import type { ApiResponse } from "@reinder/shared";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MatchDetail {
  matchId: string;
  matchedAt: string;
  confirmedAt: string | null; // null = pending, set = gestionado
  // Listing info
  listingId: string;
  listingTitle: string | null;
  listingPrice: string | null;
  listingAddress: string | null;
  listingCity: string | null;
  listingImages: string[];
  listingBedrooms: number | null;
  listingSizeSqm: string | null;
  listingDescription: string | null;
  // Buyer info
  buyerId: string;
  buyerName: string | null;
  buyerAvatarUrl: string | null;
}

// ─── Shared auth guard ────────────────────────────────────────────────────────

async function requireAgentMatchAccess(
  matchId: string,
  agentId: string
): Promise<
  | {
      ok: true;
      match: {
        id: string;
        buyerId: string;
        listingId: string;
        confirmedAt: Date | null;
        createdAt: Date;
      };
    }
  | { ok: false; status: number; code: string; message: string }
> {
  // Fetch the match
  const [match] = await db
    .select({
      id: matchEvents.id,
      buyerId: matchEvents.buyerId,
      listingId: matchEvents.listingId,
      confirmedAt: matchEvents.confirmedAt,
      createdAt: matchEvents.createdAt,
    })
    .from(matchEvents)
    .where(eq(matchEvents.id, matchId))
    .limit(1);

  if (!match) {
    return {
      ok: false,
      status: 404,
      code: "NOT_FOUND",
      message: "Match not found",
    };
  }

  // Verify bond: only the bonded agent can access this match
  const [bond] = await db
    .select({ id: agentBuyerBonds.id })
    .from(agentBuyerBonds)
    .where(
      and(
        eq(agentBuyerBonds.agentId, agentId),
        eq(agentBuyerBonds.buyerId, match.buyerId),
        eq(agentBuyerBonds.status, "active")
      )
    )
    .limit(1);

  if (!bond) {
    return {
      ok: false,
      status: 403,
      code: "FORBIDDEN",
      message: "No active bond with the buyer of this match",
    };
  }

  return { ok: true, match };
}

// ─── GET /api/v1/agent/match/[matchId] ───────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { data: null, error: { code: "UNAUTHORIZED", message: "Authentication required" } } satisfies ApiResponse<never>,
      { status: 401 }
    );
  }

  // Role check
  const [profile] = await db
    .select({ role: userProfiles.role })
    .from(userProfiles)
    .where(eq(userProfiles.id, user.id))
    .limit(1);

  if (!profile || profile.role !== "agent") {
    return NextResponse.json(
      { data: null, error: { code: "FORBIDDEN", message: "Agent role required" } } satisfies ApiResponse<never>,
      { status: 403 }
    );
  }

  // Auth + bond check
  const guard = await requireAgentMatchAccess(matchId, user.id);
  if (!guard.ok) {
    return NextResponse.json(
      { data: null, error: { code: guard.code, message: guard.message } } satisfies ApiResponse<never>,
      { status: guard.status }
    );
  }

  const { match } = guard;

  // Fetch listing + buyer info
  const [listing] = await db
    .select({
      title: listings.title,
      price: listings.price,
      address: listings.address,
      city: listings.city,
      images: listings.images,
      bedrooms: listings.bedrooms,
      sizeSqm: listings.sizeSqm,
      description: listings.description,
    })
    .from(listings)
    .where(eq(listings.id, match.listingId))
    .limit(1);

  const [buyer] = await db
    .select({
      fullName: userProfiles.fullName,
      avatarUrl: userProfiles.avatarUrl,
    })
    .from(userProfiles)
    .where(eq(userProfiles.id, match.buyerId))
    .limit(1);

  const response: MatchDetail = {
    matchId: match.id,
    matchedAt: match.createdAt.toISOString(),
    confirmedAt: match.confirmedAt?.toISOString() ?? null,
    listingId: match.listingId,
    listingTitle: listing?.title ?? null,
    listingPrice: listing?.price ?? null,
    listingAddress: listing?.address ?? null,
    listingCity: listing?.city ?? null,
    listingImages: (listing?.images as string[]) ?? [],
    listingBedrooms: listing?.bedrooms ?? null,
    listingSizeSqm: listing?.sizeSqm ?? null,
    listingDescription: listing?.description ?? null,
    buyerId: match.buyerId,
    buyerName: buyer?.fullName ?? null,
    buyerAvatarUrl: buyer?.avatarUrl ?? null,
  };

  return NextResponse.json(
    { data: response, error: null } satisfies ApiResponse<MatchDetail>,
    { status: 200 }
  );
}

// ─── PATCH /api/v1/agent/match/[matchId] ─────────────────────────────────────
// Marks match as "gestionado" — sets confirmedAt = now() (FR34)

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { data: null, error: { code: "UNAUTHORIZED", message: "Authentication required" } } satisfies ApiResponse<never>,
      { status: 401 }
    );
  }

  // Role check
  const [profile] = await db
    .select({ role: userProfiles.role })
    .from(userProfiles)
    .where(eq(userProfiles.id, user.id))
    .limit(1);

  if (!profile || profile.role !== "agent") {
    return NextResponse.json(
      { data: null, error: { code: "FORBIDDEN", message: "Agent role required" } } satisfies ApiResponse<never>,
      { status: 403 }
    );
  }

  // Auth + bond check
  const guard = await requireAgentMatchAccess(matchId, user.id);
  if (!guard.ok) {
    return NextResponse.json(
      { data: null, error: { code: guard.code, message: guard.message } } satisfies ApiResponse<never>,
      { status: guard.status }
    );
  }

  // Update confirmedAt
  await db
    .update(matchEvents)
    .set({ confirmedAt: new Date() })
    .where(eq(matchEvents.id, matchId));

  return NextResponse.json(
    { data: { matchId, gestionado: true }, error: null } satisfies ApiResponse<{ matchId: string; gestionado: boolean }>,
    { status: 200 }
  );
}
