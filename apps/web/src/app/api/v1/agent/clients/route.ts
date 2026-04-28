/**
 * apps/web/src/app/api/v1/agent/clients/route.ts
 *
 * GET /api/v1/agent/clients
 * Returns the list of buyers bonded to the authenticated agent, with match activity.
 *
 * - Only accessible by users with role 'agent'
 * - Results ordered by most recent match first (lastMatchAt DESC NULLS LAST)
 * - Computes hasNewMatches from agentLastSeenAt vs. lastMatchAt
 *
 * Source: story 4-1-lista-clientes-vinculados-panel-agente.md (Task 1)
 * Source: architecture.md#API & Communication Patterns
 * Source: architecture.md#authentication-security (RBAC)
 */
import "server-only";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/supabase/db";
import {
  agentBuyerBonds,
  userProfiles,
  matchEvents,
} from "@reinder/shared/db/schema";
import { eq, and, count, max, desc, sql } from "drizzle-orm";
import type { ApiResponse } from "@reinder/shared";
import type { AgentClient } from "@reinder/shared/types/agent";

// ─── Auth helper ─────────────────────────────────────────────────────────────

/**
 * Validates that the current user is authenticated and has role 'agent'.
 * Returns the user object or null if unauthorized/forbidden.
 */
async function requireAgent(): Promise<{
  userId: string | null;
  forbidden: boolean;
}> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { userId: null, forbidden: false };
  }

  const [profile] = await db
    .select({ role: userProfiles.role })
    .from(userProfiles)
    .where(eq(userProfiles.id, user.id))
    .limit(1);

  if (!profile) {
    return { userId: null, forbidden: false };
  }

  if (profile.role !== "agent") {
    return { userId: null, forbidden: true };
  }

  return { userId: user.id, forbidden: false };
}

// ─── GET /api/v1/agent/clients ────────────────────────────────────────────────

export async function GET(_req: NextRequest) {
  const { userId, forbidden } = await requireAgent();

  if (forbidden) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "FORBIDDEN",
          message: "Agent role required to access this resource",
        },
      } satisfies ApiResponse<never>,
      { status: 403 }
    );
  }

  if (!userId) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      } satisfies ApiResponse<never>,
      { status: 401 }
    );
  }

  // ─── Query: bonds JOIN user_profiles JOIN match_events (aggregated) ────────
  //
  // Groups by bond + buyer profile, counts matches and finds most recent.
  // Ordered by lastMatchAt DESC NULLS LAST (most active clients first),
  // with a secondary sort by bond creation date for tie-breaking.
  //
  // Note: Using Drizzle directly (not Supabase RLS) with explicit agentId filter
  // for full control over the query. RLS policy also protects at DB level.

  const rows = await db
    .select({
      bondId: agentBuyerBonds.id,
      buyerId: agentBuyerBonds.buyerId,
      buyerName: userProfiles.fullName,
      buyerAvatarUrl: userProfiles.avatarUrl,
      bondCreatedAt: agentBuyerBonds.createdAt,
      agentLastSeenAt: agentBuyerBonds.agentLastSeenAt,
      totalMatches: count(matchEvents.id),
      lastMatchAt: max(matchEvents.createdAt),
    })
    .from(agentBuyerBonds)
    .leftJoin(userProfiles, eq(userProfiles.id, agentBuyerBonds.buyerId))
    .leftJoin(matchEvents, eq(matchEvents.buyerId, agentBuyerBonds.buyerId))
    .where(
      and(
        eq(agentBuyerBonds.agentId, userId),
        eq(agentBuyerBonds.status, "active")
      )
    )
    .groupBy(
      agentBuyerBonds.id,
      agentBuyerBonds.buyerId,
      agentBuyerBonds.createdAt,
      agentBuyerBonds.agentLastSeenAt,
      userProfiles.fullName,
      userProfiles.avatarUrl
    )
    .orderBy(
      // Most recently active clients first; NULLS LAST for clients with no matches
      sql`MAX(${matchEvents.createdAt}) DESC NULLS LAST`,
      desc(agentBuyerBonds.createdAt)
    );

  // ─── Map to AgentClient response type ─────────────────────────────────────

  const clients: AgentClient[] = rows.map((row) => {
    const lastMatchAt = row.lastMatchAt ?? null;
    const agentLastSeenAt = row.agentLastSeenAt ?? null;

    // hasNewMatches logic:
    // - If agentLastSeenAt is set and lastMatchAt is newer → true
    // - If agentLastSeenAt is null and there are any matches → true (agent hasn't seen any)
    // - If no matches → false
    let hasNewMatches = false;
    if (lastMatchAt) {
      if (agentLastSeenAt) {
        hasNewMatches = lastMatchAt > agentLastSeenAt;
      } else {
        // Agent has never viewed this client's matches
        hasNewMatches = true;
      }
    }

    return {
      bondId: row.bondId,
      buyerId: row.buyerId,
      buyerName: row.buyerName ?? null,
      buyerAvatarUrl: row.buyerAvatarUrl ?? null,
      bondCreatedAt: row.bondCreatedAt.toISOString(),
      totalMatches: row.totalMatches,
      lastMatchAt: lastMatchAt?.toISOString() ?? null,
      hasNewMatches,
    };
  });

  return NextResponse.json(
    { data: clients, error: null } satisfies ApiResponse<AgentClient[]>,
    { status: 200 }
  );
}
