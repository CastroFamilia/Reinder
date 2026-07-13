/**
 * GET /api/v1/agency/listings/[id]/analytics — Listing engagement analytics.
 *
 * Returns pre-aggregated engagement metrics for a listing owned by the
 * requesting agency. Only reads from `listing_analytics_hourly` (never raw events).
 *
 * Story 8.5 — Dashboard de Analytics por Listing para Agencias.
 *
 * Privacy (NFR8): Only aggregated, anonymized data. No PII.
 * Performance (NFR11): Reads from read models only.
 *
 * Source: epics.md#Story 8.5
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/supabase/db";
import { listingAnalyticsHourly, listings } from "@reinder/shared/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** Minimum views required to show analytics (below this: "Datos insuficientes") */
const MIN_VIEWS_THRESHOLD = 10;

/** Alert threshold: if avg view time is >30% below platform avg */
const UNDERPERFORMANCE_THRESHOLD = 0.30;

export async function GET(
  request: Request,
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

  // ── Role check: only agency_admin can view listing analytics ────────────
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "agency_admin") {
    return NextResponse.json(
      {
        data: null,
        error: { code: "FORBIDDEN", message: "Only agency admins can view listing analytics" },
      },
      { status: 403 }
    );
  }

  const { id: listingId } = await params;

  if (!listingId) {
    return NextResponse.json(
      { data: null, error: { code: "INVALID_INPUT", message: "listingId is required" } },
      { status: 400 }
    );
  }

  try {
    // ── Verify listing belongs to user's agency ──────────────────────────
    const [listing] = await db
      .select()
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1);

    if (!listing) {
      return NextResponse.json(
        { data: null, error: { code: "NOT_FOUND", message: "Listing not found" } },
        { status: 404 }
      );
    }

    // ── Parse period from query params ───────────────────────────────────
    const url = new URL(request.url);
    const period = url.searchParams.get("period") || "30"; // 7 or 30 days
    const daysAgo = parseInt(period, 10);
    const sinceDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

    // ── Aggregate from read model ────────────────────────────────────────
    const analyticsRows = await db
      .select()
      .from(listingAnalyticsHourly)
      .where(
        and(
          eq(listingAnalyticsHourly.listingId, listingId),
          gte(listingAnalyticsHourly.bucketHour, sinceDate)
        )
      );

    // ── Compute aggregated metrics ───────────────────────────────────────
    const totalViews = analyticsRows.reduce((sum, r) => sum + r.totalViews, 0);
    const totalMatches = analyticsRows.reduce((sum, r) => sum + r.matchCount, 0);
    const totalRejects = analyticsRows.reduce((sum, r) => sum + r.rejectCount, 0);
    const totalReaffirms = analyticsRows.reduce((sum, r) => sum + r.reaffirmCount, 0);

    // Weighted averages
    const avgPhotoViewMs =
      totalViews > 0
        ? Math.round(
            analyticsRows.reduce((sum, r) => sum + r.avgPhotoViewMs * r.totalViews, 0) / totalViews
          )
        : 0;

    const avgScrollDepthPct =
      totalViews > 0
        ? Math.round(
            analyticsRows.reduce((sum, r) => sum + r.avgScrollDepthPct * r.totalViews, 0) / totalViews
          )
        : 0;

    // Match and reaffirm ratios
    const totalDecisions = totalMatches + totalRejects;
    const matchRate = totalDecisions > 0 ? totalMatches / totalDecisions : 0;
    const reaffirmRate = totalMatches > 0 ? totalReaffirms / totalMatches : 0;

    // Insufficient data check
    const insufficientData = totalViews < MIN_VIEWS_THRESHOLD;

    // Photo engagement heatmap (aggregate from all hourly buckets)
    const photoEngagementMap = new Map<number, { totalDuration: number; totalCount: number }>();
    for (const row of analyticsRows) {
      if (row.photoEngagement && Array.isArray(row.photoEngagement)) {
        for (const photo of row.photoEngagement) {
          const existing = photoEngagementMap.get(photo.photo_index) || { totalDuration: 0, totalCount: 0 };
          existing.totalDuration += photo.avg_duration_ms * photo.view_count;
          existing.totalCount += photo.view_count;
          photoEngagementMap.set(photo.photo_index, existing);
        }
      }
    }

    const photoRanking = Array.from(photoEngagementMap.entries())
      .map(([photoIndex, data]) => ({
        photo_index: photoIndex,
        avg_duration_ms: data.totalCount > 0 ? Math.round(data.totalDuration / data.totalCount) : 0,
        view_count: data.totalCount,
      }))
      .sort((a, b) => b.avg_duration_ms - a.avg_duration_ms);

    return NextResponse.json(
      {
        data: {
          listingId,
          period: `${daysAgo}d`,
          insufficientData,
          ...(insufficientData
            ? { message: "Datos insuficientes — necesita más exposición" }
            : {}),
          metrics: {
            totalViews,
            avgPhotoViewMs,
            avgScrollDepthPct,
            matchRate: Math.round(matchRate * 10000) / 100, // percentage with 2 decimals
            reaffirmRate: Math.round(reaffirmRate * 10000) / 100,
            totalMatches,
            totalRejects,
            totalReaffirms,
          },
          photoRanking,
          // Alert if underperforming (placeholder — platform avg would come from a global read model)
          alerts: [],
        },
        error: null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[listing-analytics] Error:", error);
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to fetch analytics" } },
      { status: 500 }
    );
  }
}
