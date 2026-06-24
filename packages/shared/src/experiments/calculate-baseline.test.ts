/**
 * Story 9.3 — ATDD Tests: calculateBaseline() helper
 *
 * AC5: Baseline comparison with listing_analytics_hourly
 *
 * Run: pnpm --filter @reinder/shared test packages/shared/src/experiments/calculate-baseline.test.ts
 */

import { describe, it, expect } from "vitest";

describe("calculateBaseline() — AC5: Baseline from listing_analytics_hourly", () => {
  it("[P0] returns null when hourlyData array is empty", async () => {
    const { calculateBaseline } = await import("./calculate-baseline");
    const result = calculateBaseline([], new Date("2026-06-15T00:00:00Z"));
    expect(result).toBeNull();
  });

  it("[P1] calculates correct averages from hourly buckets", async () => {
    const { calculateBaseline } = await import("./calculate-baseline");

    const hourlyData = [
      { bucketHour: "2026-06-10T10:00:00Z", totalViews: 80, totalViewTimeMs: 400000, uniqueViewers: 40, matchCount: 4, reaffirmCount: 1 },
      { bucketHour: "2026-06-11T10:00:00Z", totalViews: 100, totalViewTimeMs: 500000, uniqueViewers: 50, matchCount: 6, reaffirmCount: 2 },
      { bucketHour: "2026-06-12T10:00:00Z", totalViews: 120, totalViewTimeMs: 720000, uniqueViewers: 60, matchCount: 8, reaffirmCount: 4 },
    ];

    const result = calculateBaseline(hourlyData, new Date("2026-06-15T00:00:00Z"));

    expect(result).not.toBeNull();
    // avg view time = (400000 + 500000 + 720000) / (80 + 100 + 120) = 1620000 / 300 = 5400
    expect(result!.baselineAvgViewTimeMs).toBeCloseTo(5400, 0);
    // match rate = (4 + 6 + 8) / (40 + 50 + 60) = 18 / 150 = 0.12
    expect(result!.baselineMatchRate).toBeCloseTo(0.12, 2);
  });

  it("[P1] ignores data outside the 7-day window", async () => {
    const { calculateBaseline } = await import("./calculate-baseline");

    const hourlyData = [
      // This is 10 days before — should be outside 7-day window
      { bucketHour: "2026-06-05T10:00:00Z", totalViews: 200, totalViewTimeMs: 1000000, uniqueViewers: 100, matchCount: 20, reaffirmCount: 10 },
      // This is within window
      { bucketHour: "2026-06-14T10:00:00Z", totalViews: 50, totalViewTimeMs: 250000, uniqueViewers: 25, matchCount: 3, reaffirmCount: 1 },
    ];

    const result = calculateBaseline(hourlyData, new Date("2026-06-15T00:00:00Z"));

    expect(result).not.toBeNull();
    // Only the in-window data: avg_view_time = 250000 / 50 = 5000
    expect(result!.baselineAvgViewTimeMs).toBeCloseTo(5000, 0);
    // match rate = 3 / 25 = 0.12
    expect(result!.baselineMatchRate).toBeCloseTo(0.12, 2);
  });
});
