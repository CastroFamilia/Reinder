/**
 * apps/web/src/app/api/v1/experiments/[id]/results/route.ts
 *
 * GET /api/v1/experiments/[id]/results — Experiment results with metrics + timeseries + baseline.
 *
 * Story 9.3, AC6:
 * - Auth: agency_admin requerido (401/403)
 * - Ownership: experiment must belong to user's agency (404)
 * - Reads pre-computed metrics from experiment_results (NO aggregation in request path)
 * - Reads timeseries from experiment_results_timeseries
 * - Computes baseline from listing_analytics_hourly
 * - Calculates deltas server-side
 * - Response format: ApiResponse<ExperimentResultsResponse>
 *
 * Source: story 9-3, AC6, Task 6
 */
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/supabase/db";
import {
  listingExperiments,
  experimentResults,
  experimentResultsTimeseries,
} from "@reinder/shared/db/schema";
import { eq, asc } from "drizzle-orm";
import {
  calculateDeltas,
  calculateConfidence,
} from "@reinder/shared/experiments/aggregate-experiment-results";
import type {
  ExperimentVariantMetrics,
  ExperimentResultsResponse,
} from "@reinder/shared/types/experiment";

// ─── GET /api/v1/experiments/[id]/results ──────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // ─── 1. Auth ──────────────────────────────────────────────────────────────

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "UNAUTHORIZED", message: "Not authenticated" },
      },
      { status: 401 }
    );
  }

  // ─── 2. Role check — agency_admin only ──────────────────────────────────

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, agencyId:agency_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "agency_admin" || !profile.agencyId) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "FORBIDDEN",
          message: "Agency Admin role required",
        },
      },
      { status: 403 }
    );
  }

  const { id: experimentId } = await params;

  try {
    // ─── 3. Fetch experiment + verify ownership ───────────────────────────

    const [experiment] = await db
      .select()
      .from(listingExperiments)
      .where(eq(listingExperiments.id, experimentId))
      .limit(1);

    if (!experiment || experiment.agencyId !== profile.agencyId) {
      return NextResponse.json(
        {
          data: null,
          error: { code: "NOT_FOUND", message: "Experiment not found" },
        },
        { status: 404 }
      );
    }

    // ─── 4. Fetch experiment results (2 rows: a + b) ─────────────────────

    const resultsRows = await db
      .select()
      .from(experimentResults)
      .where(eq(experimentResults.experimentId, experimentId));

    // Build variant metrics (default to zeros for drafts)
    const emptyMetrics = (): ExperimentVariantMetrics => ({
      impressions: 0,
      avgViewTimeMs: 0,
      matchRate: 0,
      reaffirmRate: 0,
      totalViewTimeMs: 0,
      matchCount: 0,
      reaffirmCount: 0,
    });

    const variantA = resultsRows.find((r) => r.variant === "a");
    const variantB = resultsRows.find((r) => r.variant === "b");

    const metricsA = variantA
      ? buildVariantMetrics(variantA)
      : emptyMetrics();
    const metricsB = variantB
      ? buildVariantMetrics(variantB)
      : emptyMetrics();

    // ─── 5. Calculate deltas server-side ─────────────────────────────────

    const rawA = {
      impressions: metricsA.impressions,
      totalViewTimeMs: metricsA.totalViewTimeMs,
      sumViewTimeSqMs: 0,
      matchCount: metricsA.matchCount,
      reaffirmCount: metricsA.reaffirmCount,
    };
    const rawB = {
      impressions: metricsB.impressions,
      totalViewTimeMs: metricsB.totalViewTimeMs,
      sumViewTimeSqMs: 0,
      matchCount: metricsB.matchCount,
      reaffirmCount: metricsB.reaffirmCount,
    };

    const deltas = calculateDeltas(rawA, rawB);

    // ─── 6. Calculate confidence ─────────────────────────────────────────

    const confidence = calculateConfidence(
      rawA,
      rawB,
      experiment.minSampleSize
    );

    // ─── 7. Fetch timeseries ─────────────────────────────────────────────

    const timeseriesRows = await db
      .select()
      .from(experimentResultsTimeseries)
      .where(eq(experimentResultsTimeseries.experimentId, experimentId))
      .orderBy(asc(experimentResultsTimeseries.bucketHour));

    // Group timeseries by bucket_hour
    const timeseriesMap = new Map<
      string,
      { a?: { impressions: number; avgViewTimeMs: number }; b?: { impressions: number; avgViewTimeMs: number } }
    >();

    for (const row of timeseriesRows) {
      const hourKey = row.bucketHour instanceof Date
        ? row.bucketHour.toISOString()
        : String(row.bucketHour);
      if (!timeseriesMap.has(hourKey)) {
        timeseriesMap.set(hourKey, {});
      }
      const entry = timeseriesMap.get(hourKey)!;
      const viewTimeMs = Number(row.totalViewTimeMs);
      const impressions = row.impressions;
      const avgViewTimeMs = impressions > 0 ? viewTimeMs / impressions : 0;

      if (row.variant === "a") {
        entry.a = { impressions, avgViewTimeMs };
      } else {
        entry.b = { impressions, avgViewTimeMs };
      }
    }

    const timeseries = Array.from(timeseriesMap.entries()).map(
      ([bucketHour, data]) => ({
        bucketHour,
        a: data.a ?? { impressions: 0, avgViewTimeMs: 0 },
        b: data.b ?? { impressions: 0, avgViewTimeMs: 0 },
      })
    );

    // ─── 8. Calculate baseline from listing_analytics_hourly ─────────────
    // Use Supabase client for RLS-aware query

    let baselineMetrics: ExperimentResultsResponse["baselineMetrics"] = null;

    if (experiment.startedAt) {
      const windowStart = new Date(experiment.startedAt);
      windowStart.setDate(windowStart.getDate() - 7);

      const { data: hourlyData } = await supabase
        .from("listing_analytics_hourly")
        .select(
          "bucket_hour, total_views, total_view_time_ms, unique_viewers, match_count, reaffirm_count"
        )
        .eq("listing_id", experiment.listingId)
        .gte("bucket_hour", windowStart.toISOString())
        .lt("bucket_hour", experiment.startedAt.toISOString());

      if (hourlyData && hourlyData.length > 0) {
        let totalViews = 0;
        let totalViewTimeMs = 0;
        let totalUniqueViewers = 0;
        let totalMatchCount = 0;

        for (const row of hourlyData) {
          totalViews += row.total_views ?? 0;
          totalViewTimeMs += row.total_view_time_ms ?? 0;
          totalUniqueViewers += row.unique_viewers ?? 0;
          totalMatchCount += row.match_count ?? 0;
        }

        if (totalViews > 0) {
          baselineMetrics = {
            baselineAvgViewTimeMs: totalViewTimeMs / totalViews,
            baselineMatchRate:
              totalUniqueViewers > 0
                ? totalMatchCount / totalUniqueViewers
                : 0,
          };
        }
      }
    }

    // ─── 9. Build response ───────────────────────────────────────────────

    const responseData: ExperimentResultsResponse = {
      experiment: {
        id: experiment.id,
        name: experiment.name,
        status: experiment.status,
        startedAt: experiment.startedAt?.toISOString() ?? null,
      },
      results: {
        a: metricsA,
        b: metricsB,
      },
      deltas,
      confidence,
      baselineMetrics,
      timeseries,
    };

    return NextResponse.json(
      { data: responseData, error: null },
      { status: 200 }
    );
  } catch (error) {
    console.error("[experiments/results] GET failed:", error);
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch experiment results",
        },
      },
      { status: 500 }
    );
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildVariantMetrics(
  row: typeof experimentResults.$inferSelect
): ExperimentVariantMetrics {
  const impressions = row.impressions;
  const totalViewTimeMs = Number(row.totalViewTimeMs);
  const matchCount = row.matchCount;
  const reaffirmCount = row.reaffirmCount;

  return {
    impressions,
    avgViewTimeMs: impressions > 0 ? totalViewTimeMs / impressions : 0,
    matchRate: impressions > 0 ? matchCount / impressions : 0,
    reaffirmRate: matchCount > 0 ? reaffirmCount / matchCount : 0,
    totalViewTimeMs,
    matchCount,
    reaffirmCount,
  };
}
