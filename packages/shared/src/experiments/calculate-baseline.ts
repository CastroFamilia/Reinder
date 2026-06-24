/**
 * Story 9.3 — Baseline calculator from listing_analytics_hourly.
 *
 * Computes pre-experiment baseline metrics for comparison with A/B test results.
 * Uses the 7-day window before experiment start.
 *
 * Source: story 9-3, AC5
 */

export type BaselineMetrics = {
  baselineAvgViewTimeMs: number;
  baselineMatchRate: number;
};

export type HourlyAnalyticsRow = {
  bucketHour: string;
  totalViews: number;
  totalViewTimeMs: number;
  uniqueViewers: number;
  matchCount: number;
  reaffirmCount: number;
};

/**
 * Calculates baseline metrics from listing_analytics_hourly data.
 *
 * AC5: Uses 7-day window before experiment started_at.
 * Returns null if no data exists (new listing without history).
 *
 * @param hourlyData - Pre-experiment hourly analytics rows
 * @param experimentStartedAt - When the experiment started
 * @returns Baseline metrics or null if no data
 */
export function calculateBaseline(
  hourlyData: HourlyAnalyticsRow[],
  experimentStartedAt: Date
): BaselineMetrics | null {
  if (hourlyData.length === 0) {
    return null;
  }

  // Filter to 7-day window before experiment start
  const windowStart = new Date(experimentStartedAt);
  windowStart.setDate(windowStart.getDate() - 7);

  const inWindowData = hourlyData.filter((row) => {
    const bucketDate = new Date(row.bucketHour);
    return bucketDate >= windowStart && bucketDate < experimentStartedAt;
  });

  if (inWindowData.length === 0) {
    return null;
  }

  // Aggregate across all in-window buckets
  let totalViews = 0;
  let totalViewTimeMs = 0;
  let totalUniqueViewers = 0;
  let totalMatchCount = 0;

  for (const row of inWindowData) {
    totalViews += row.totalViews;
    totalViewTimeMs += row.totalViewTimeMs;
    totalUniqueViewers += row.uniqueViewers;
    totalMatchCount += row.matchCount;
  }

  return {
    baselineAvgViewTimeMs:
      totalViews > 0 ? totalViewTimeMs / totalViews : 0,
    baselineMatchRate:
      totalUniqueViewers > 0 ? totalMatchCount / totalUniqueViewers : 0,
  };
}
