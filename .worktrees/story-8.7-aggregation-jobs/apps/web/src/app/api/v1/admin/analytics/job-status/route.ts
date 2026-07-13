/**
 * GET /api/v1/admin/analytics/job-status — Aggregation job status.
 *
 * Returns the status of the last analytics aggregation job execution.
 * Alerts if the job hasn't run in more than 3 hours.
 *
 * Story 8.7 — Aggregation Jobs para Read Models de Analytics.
 *
 * Auth: platform_admin only.
 *
 * Source: epics.md#Story 8.7
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/supabase/db";
import {
  listingAnalyticsHourly,
  buyerIntentScores,
} from "@reinder/shared/db/schema";
import { sql } from "drizzle-orm";

/** Alert threshold: if last aggregation is older than this */
const STALE_THRESHOLD_HOURS = 3;

export async function GET(): Promise<NextResponse> {
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

  // ── Role check: platform_admin only ─────────────────────────────────────
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "platform_admin") {
    return NextResponse.json(
      {
        data: null,
        error: { code: "FORBIDDEN", message: "Only platform admins can view job status" },
      },
      { status: 403 }
    );
  }

  try {
    // ── Get last analytics update time ────────────────────────────────────
    const [lastAnalytics] = await db
      .select({ maxUpdatedAt: sql<Date>`max(${listingAnalyticsHourly.updatedAt})` })
      .from(listingAnalyticsHourly);

    // ── Get last intent score update time ─────────────────────────────────
    const [lastIntent] = await db
      .select({ maxUpdatedAt: sql<Date>`max(${buyerIntentScores.updatedAt})` })
      .from(buyerIntentScores);

    // ── Get row counts ────────────────────────────────────────────────────
    const [analyticsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(listingAnalyticsHourly);

    const [intentCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(buyerIntentScores);

    // ── Determine staleness ───────────────────────────────────────────────
    const now = new Date();
    const lastRunAt = lastAnalytics?.maxUpdatedAt || lastIntent?.maxUpdatedAt || null;

    let isStale = false;
    let hoursAgo: number | null = null;

    if (lastRunAt) {
      hoursAgo = Math.round(
        (now.getTime() - new Date(lastRunAt).getTime()) / (1000 * 60 * 60) * 10
      ) / 10;
      isStale = hoursAgo > STALE_THRESHOLD_HOURS;
    } else {
      isStale = true; // No data = stale
    }

    return NextResponse.json(
      {
        data: {
          lastRunAt,
          isStale,
          hoursAgo,
          staleThresholdHours: STALE_THRESHOLD_HOURS,
          readModels: {
            listingAnalyticsHourly: {
              lastUpdatedAt: lastAnalytics?.maxUpdatedAt || null,
              rowCount: Number(analyticsCount?.count) || 0,
            },
            buyerIntentScores: {
              lastUpdatedAt: lastIntent?.maxUpdatedAt || null,
              rowCount: Number(intentCount?.count) || 0,
            },
          },
          ...(isStale
            ? {
                alert: {
                  level: "warning",
                  message: lastRunAt
                    ? `Aggregation job is stale — last run ${hoursAgo}h ago (threshold: ${STALE_THRESHOLD_HOURS}h)`
                    : "Aggregation job has never run — read models are empty",
                },
              }
            : {}),
        },
        error: null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[job-status] Error:", error);
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to fetch job status" } },
      { status: 500 }
    );
  }
}
