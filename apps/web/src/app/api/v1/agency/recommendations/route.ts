/**
 * apps/web/src/app/api/v1/agency/recommendations/route.ts
 *
 * GET /api/v1/agency/recommendations — List pending experiment recommendations.
 *
 * Story 9.5, AC6
 *
 * Auth: agency_admin only (401/403)
 * Returns: pending recommendations sorted by priority_score DESC,
 *          JOINed with listings for title + image.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/supabase/db";
import { experimentRecommendations, listings } from "@reinder/shared/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  // ─── 1. Auth check ────────────────────────────────────────────────────────

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "UNAUTHORIZED", message: "No autenticado" },
      },
      { status: 401 },
    );
  }

  // ─── 2. Role check — agency_admin only ────────────────────────────────────

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, agencyId:agency_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "agency_admin" || !profile.agencyId) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "FORBIDDEN", message: "Solo agency_admin" },
      },
      { status: 403 },
    );
  }

  // ─── 3. Query pending recommendations + JOIN listings ─────────────────────

  try {
    const recommendations = await db
      .select({
        id: experimentRecommendations.id,
        listingId: experimentRecommendations.listingId,
        listingTitle: listings.title,
        listingImage: listings.images,
        recommendedExperimentType:
          experimentRecommendations.recommendedExperimentType,
        reasonCode: experimentRecommendations.reasonCode,
        reasonDetail: experimentRecommendations.reasonDetail,
        underperformingMetrics:
          experimentRecommendations.underperformingMetrics,
        priorityScore: experimentRecommendations.priorityScore,
        status: experimentRecommendations.status,
        createdAt: experimentRecommendations.createdAt,
      })
      .from(experimentRecommendations)
      .innerJoin(
        listings,
        eq(listings.id, experimentRecommendations.listingId),
      )
      .where(
        and(
          eq(experimentRecommendations.agencyId, profile.agencyId),
          eq(experimentRecommendations.status, "pending"),
        ),
      )
      .orderBy(desc(experimentRecommendations.priorityScore));

    // Extract first image as thumbnail
    const formatted = recommendations.map((r) => ({
      ...r,
      listingImageUrl:
        Array.isArray(r.listingImage) && r.listingImage.length > 0
          ? r.listingImage[0]
          : null,
      listingImage: undefined,
    }));

    return NextResponse.json({
      data: { recommendations: formatted },
      error: null,
    });
  } catch (error) {
    console.error("[recommendations] GET failed:", error);
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch recommendations",
        },
      },
      { status: 500 },
    );
  }
}
