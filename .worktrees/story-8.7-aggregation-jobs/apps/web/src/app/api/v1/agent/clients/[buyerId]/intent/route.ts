/**
 * GET /api/v1/agent/clients/[buyerId]/intent — Buyer intent score panel.
 *
 * Returns the pre-calculated intent score for a specific buyer,
 * read from `buyer_intent_scores` (never computed on the fly).
 *
 * Story 8.6 — Panel de Intent Score del Comprador para Agente.
 *
 * Privacy (NFR8): Score is aggregated — no raw event data exposed.
 * Performance (NFR11): Single row read from read model.
 *
 * Source: epics.md#Story 8.6
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/supabase/db";
import {
  buyerIntentScores,
  agentBuyerBonds,
} from "@reinder/shared/db/schema";
import { eq, and } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ buyerId: string }>;
}

/** Score thresholds for intent level classification */
const INTENT_LEVELS = {
  HIGH: 70,
  MEDIUM: 40,
  LOW: 0,
} as const;

function getIntentLevel(score: number): "high" | "medium" | "low" {
  if (score >= INTENT_LEVELS.HIGH) return "high";
  if (score >= INTENT_LEVELS.MEDIUM) return "medium";
  return "low";
}

export async function GET(
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

  // ── Role check: only agents can view buyer intent scores ────────────────
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "agent") {
    return NextResponse.json(
      {
        data: null,
        error: { code: "FORBIDDEN", message: "Only agents can view buyer intent scores" },
      },
      { status: 403 }
    );
  }

  const { buyerId } = await params;

  if (!buyerId) {
    return NextResponse.json(
      { data: null, error: { code: "INVALID_INPUT", message: "buyerId is required" } },
      { status: 400 }
    );
  }

  try {
    // ── Verify agent has active bond with this buyer ─────────────────────
    const [bond] = await db
      .select()
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
        },
        { status: 403 }
      );
    }

    // ── Read intent score from read model ─────────────────────────────────
    const [intentScore] = await db
      .select()
      .from(buyerIntentScores)
      .where(eq(buyerIntentScores.buyerId, buyerId))
      .limit(1);

    if (!intentScore) {
      // Score not yet calculated — return default
      return NextResponse.json(
        {
          data: {
            buyerId,
            score: 0,
            intentLevel: "low",
            scoreBreakdown: null,
            lastCalculatedAt: null,
            message: "Score pendiente de cálculo — datos insuficientes",
          },
          error: null,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        data: {
          buyerId,
          score: intentScore.score,
          intentLevel: getIntentLevel(intentScore.score),
          scoreBreakdown: intentScore.scoreBreakdown,
          lastCalculatedAt: intentScore.lastCalculatedAt,
        },
        error: null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[buyer-intent] Error:", error);
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to fetch intent score" } },
      { status: 500 }
    );
  }
}
