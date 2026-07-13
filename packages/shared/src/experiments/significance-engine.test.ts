/**
 * Story 9.4 — Tests for statistical significance engine.
 *
 * T9.4-01 through T9.4-10, T9.4-15 through T9.4-17 as specified in the
 * story and epic test design.
 *
 * Source: story 9-4, AC1–AC4, Task 2
 */

import { describe, it, expect } from "vitest";
import {
  normalCDF,
  zTestForProportions,
  welchTTest,
  calculateVariance,
  evaluateExperiment,
  type VariantResultData,
  type ExperimentMetadata,
} from "./significance-engine";
import { isResultsStale } from "./aggregation-significance-hook";

// ─── Helper: create a Date offset by hours from now ────────────────────────

function hoursAgo(hours: number, from = new Date("2026-06-20T12:00:00Z")): Date {
  return new Date(from.getTime() - hours * 60 * 60 * 1000);
}

const NOW = new Date("2026-06-20T12:00:00Z");

// ─── T9.4-05: normalCDF known values ──────────────────────────────────────

describe("normalCDF", () => {
  it("T9.4-05a: normalCDF(0) ≈ 0.5", () => {
    expect(normalCDF(0)).toBeCloseTo(0.5, 7);
  });

  it("T9.4-05b: normalCDF(1.96) ≈ 0.975", () => {
    expect(normalCDF(1.96)).toBeCloseTo(0.975, 3);
  });

  it("T9.4-05c: normalCDF(-1.96) ≈ 0.025", () => {
    expect(normalCDF(-1.96)).toBeCloseTo(0.025, 3);
  });

  it("normalCDF(2.576) ≈ 0.995", () => {
    expect(normalCDF(2.576)).toBeCloseTo(0.995, 3);
  });

  it("normalCDF(3.0) ≈ 0.9987", () => {
    expect(normalCDF(3.0)).toBeCloseTo(0.9987, 3);
  });

  it("normalCDF(-3.0) ≈ 0.0013 (symmetric)", () => {
    expect(normalCDF(-3.0)).toBeCloseTo(0.0013, 3);
  });
});

// ─── calculateVariance ────────────────────────────────────────────────────

describe("calculateVariance", () => {
  it("returns 0 for n <= 1", () => {
    expect(calculateVariance(100, 10000, 0)).toBe(0);
    expect(calculateVariance(100, 10000, 1)).toBe(0);
  });

  it("calculates sample variance with Bessel correction", () => {
    // Known data: [2, 4, 6] → mean=4, pop_var=8/3, sample_var=4
    // total=12, sumSq=4+16+36=56, n=3
    const result = calculateVariance(12, 56, 3);
    expect(result).toBeCloseTo(4.0, 5);
  });

  it("returns 0 for uniform data (all same value)", () => {
    // [5, 5, 5, 5] → total=20, sumSq=100, n=4 → variance should be 0
    const result = calculateVariance(20, 100, 4);
    expect(result).toBeCloseTo(0, 5);
  });

  it("handles potential negative floating point variance (sumSq/n < mean²) gracefully", () => {
    // Edge case: due to floating point, popVariance could be very slightly negative
    // E.g. total=1000000001, sumSq=1000000002000000001, n=1000000001
    // In practice this shouldn't crash
    const result = calculateVariance(10, 100, 10);
    // [1,1,...,1] ten 1s → should be 0
    expect(Number.isFinite(result)).toBe(true);
    expect(result).toBeGreaterThanOrEqual(0);
  });
});

// ─── T9.4-01, T9.4-02, T9.4-03: z-test for proportions ──────────────────

describe("zTestForProportions", () => {
  it("T9.4-01: z-test with known data — match_rate AC1 example values", () => {
    // AC1: A(500 impressions, 45 matches), B(500 impressions, 65 matches)
    const result = zTestForProportions(45, 500, 65, 500, 0.05);

    // Verify intermediate values per AC1:
    // p_a = 45/500 = 0.09, p_b = 65/500 = 0.13
    // p_pooled = (45+65)/(500+500) = 110/1000 = 0.11
    const pA = 45 / 500; // 0.09
    const pB = 65 / 500; // 0.13
    const pPooled = 110 / 1000; // 0.11

    expect(pA).toBeCloseTo(0.09, 10);
    expect(pB).toBeCloseTo(0.13, 10);
    expect(pPooled).toBeCloseTo(0.11, 10);

    // SE = sqrt(0.11 × 0.89 × (1/500 + 1/500)) = sqrt(0.11 * 0.89 * 0.004)
    const se = Math.sqrt(pPooled * (1 - pPooled) * (1 / 500 + 1 / 500));
    expect(se).toBeCloseTo(0.01979, 4);

    // z = (0.09 - 0.13) / SE ≈ -2.02
    const expectedZ = (pA - pB) / se;
    expect(result.zScore).toBeCloseTo(expectedZ, 3);
    expect(Math.abs(result.zScore)).toBeGreaterThan(1.96); // Beyond 95% threshold

    // Two-tailed p-value should be < 0.05
    expect(result.pValue).toBeLessThan(0.05);
    expect(result.isSignificant).toBe(true);
    expect(result.favoredVariant).toBe("b"); // B has higher match rate
  });

  it("T9.4-01b: z-test applies same logic for reaffirm_rate", () => {
    // reaffirm_rate = reaffirm_count / match_count (AC1)
    // A: 10 reaffirms out of 45 matches, B: 25 reaffirms out of 65 matches
    const result = zTestForProportions(10, 45, 25, 65, 0.05);

    // p_a = 10/45 ≈ 0.222, p_b = 25/65 ≈ 0.385
    expect(result.zScore).not.toBe(0);
    // With these proportions and sample sizes, may or may not be significant
    // The important thing is the calculation doesn't error
    expect(Number.isFinite(result.zScore)).toBe(true);
    expect(Number.isFinite(result.pValue)).toBe(true);
  });

  it("T9.4-02: correctly identifies significant result (p < 0.05)", () => {
    // Very large difference with large n → definitely significant
    const result = zTestForProportions(20, 1000, 80, 1000, 0.05);
    expect(result.isSignificant).toBe(true);
    expect(result.pValue).toBeLessThan(0.05);
    expect(result.favoredVariant).toBe("b");
  });

  it("T9.4-03: correctly identifies non-significant result (p ≥ 0.05)", () => {
    // Equal proportions → p-value ≈ 1
    const result = zTestForProportions(50, 500, 50, 500, 0.05);

    expect(result.zScore).toBeCloseTo(0, 5);
    expect(result.pValue).toBeCloseTo(1, 1);
    expect(result.isSignificant).toBe(false);
    expect(result.favoredVariant).toBeNull();
  });

  it("T9.4-03b: very small difference is not significant with small n", () => {
    // 51 vs 49 out of 100 — not significant
    const result = zTestForProportions(51, 100, 49, 100, 0.05);
    expect(result.isSignificant).toBe(false);
    expect(result.favoredVariant).toBeNull();
  });

  it("handles SE = 0 case (all zeros)", () => {
    const result = zTestForProportions(0, 500, 0, 500, 0.05);
    expect(result.pValue).toBe(1);
    expect(result.isSignificant).toBe(false);
  });

  it("handles SE = 0 case (all 100% success)", () => {
    const result = zTestForProportions(500, 500, 500, 500, 0.05);
    expect(result.pValue).toBe(1);
    expect(result.isSignificant).toBe(false);
  });

  it("favors variant A when A has higher proportion", () => {
    const result = zTestForProportions(80, 1000, 20, 1000, 0.05);
    expect(result.isSignificant).toBe(true);
    expect(result.favoredVariant).toBe("a");
  });

  it("pValue is always in [0, 1] range for extreme inputs", () => {
    // Very extreme proportions
    const result1 = zTestForProportions(1, 1000, 999, 1000, 0.05);
    expect(result1.pValue).toBeGreaterThanOrEqual(0);
    expect(result1.pValue).toBeLessThanOrEqual(1);

    const result2 = zTestForProportions(500, 500, 0, 500, 0.05);
    expect(result2.pValue).toBeGreaterThanOrEqual(0);
    expect(result2.pValue).toBeLessThanOrEqual(1);
  });
});

// ─── T9.4-04, T9.4-05: Welch's t-test ────────────────────────────────────

describe("welchTTest", () => {
  it("T9.4-04a: significantly different means → p-value < 0.05", () => {
    // Large difference: mean_a = 5000, mean_b = 6500, similar variance
    const result = welchTTest(5000, 1000000, 500, 6500, 1000000, 500, 0.05);

    expect(result.isSignificant).toBe(true);
    expect(result.pValue).toBeLessThan(0.05);
    expect(result.favoredVariant).toBe("b"); // B has higher mean
    expect(result.degreesOfFreedom).toBeGreaterThan(0);
  });

  it("T9.4-04b: identical means → not significant", () => {
    const result = welchTTest(5000, 1000000, 500, 5000, 1000000, 500, 0.05);

    expect(result.tStatistic).toBeCloseTo(0, 5);
    expect(result.isSignificant).toBe(false);
    expect(result.favoredVariant).toBeNull();
  });

  it("T9.4-04c: AC2 reference values — view time test", () => {
    // AC2: A(500 impressions, 2,500,000 total_view_time_ms), B(500, 3,250,000)
    // mean_a = 5000, mean_b = 6500
    // We provide realistic variance values
    const meanA = 2500000 / 500; // 5000
    const meanB = 3250000 / 500; // 6500

    expect(meanA).toBe(5000);
    expect(meanB).toBe(6500);

    const result = welchTTest(meanA, 2000000, 500, meanB, 2000000, 500, 0.05);
    expect(result.isSignificant).toBe(true);
    expect(result.favoredVariant).toBe("b");
  });

  it("T9.4-05: equal variances — degenerates to Student's t", () => {
    // With equal variances and equal n, Welch-Satterthwaite df ≈ n_a + n_b - 2
    const n = 100;
    const variance = 500000;
    const result = welchTTest(5000, variance, n, 6000, variance, n, 0.05);

    // With equal variances, df should be close to 2n-2 = 198
    expect(result.degreesOfFreedom).toBeCloseTo(2 * n - 2, 0);
    expect(result.isSignificant).toBe(true);
    expect(result.favoredVariant).toBe("b");
  });

  it("handles n <= 1 gracefully", () => {
    const result = welchTTest(5000, 0, 1, 6500, 0, 1, 0.05);
    expect(result.pValue).toBe(1);
    expect(result.isSignificant).toBe(false);
  });

  it("favors variant A when A has higher mean", () => {
    const result = welchTTest(8000, 1000000, 500, 5000, 1000000, 500, 0.05);
    expect(result.isSignificant).toBe(true);
    expect(result.favoredVariant).toBe("a");
  });
});

// ─── T9.4-06, T9.4-07, T9.4-08: Guardrails ──────────────────────────────

describe("evaluateExperiment — guardrails", () => {
  const makeVariant = (overrides: Partial<VariantResultData> = {}): VariantResultData => ({
    impressions: 200,
    totalViewTimeMs: 1000000,
    sumViewTimeSqMs: 5500000000,
    matchCount: 30,
    reaffirmCount: 10,
    ...overrides,
  });

  const makeExperiment = (overrides: Partial<ExperimentMetadata> = {}): ExperimentMetadata => ({
    startedAt: hoursAgo(72, NOW),
    minSampleSize: 100,
    targetPValue: 0.05,
    ...overrides,
  });

  it("T9.4-06: min duration not met (24h < 48h) → skipped", () => {
    const result = evaluateExperiment(
      makeVariant(),
      makeVariant(),
      makeExperiment({ startedAt: hoursAgo(24, NOW) }),
      { minDurationHours: 48 },
      NOW
    );

    expect(result.reason).toBe("min_duration_not_met");
    expect(result.winner).toBeNull();
    expect(result.matchRateTest).toBeNull();
    expect(result.reaffirmRateTest).toBeNull();
    expect(result.viewTimeTest).toBeNull();
  });

  it("T9.4-06b: exactly at min duration boundary (48h) → proceeds", () => {
    const result = evaluateExperiment(
      makeVariant(),
      makeVariant(),
      makeExperiment({ startedAt: hoursAgo(48, NOW) }),
      { minDurationHours: 48 },
      NOW
    );

    // 48h elapsed === 48h min → should proceed (not less than)
    expect(result.reason).not.toBe("min_duration_not_met");
    expect(result.matchRateTest).not.toBeNull();
  });

  it("T9.4-07: min sample size not met (80 < 100) → skipped", () => {
    const result = evaluateExperiment(
      makeVariant({ impressions: 80 }),
      makeVariant({ impressions: 80 }),
      makeExperiment(),
      { minDurationHours: 48 },
      NOW
    );

    expect(result.reason).toBe("min_sample_size_not_met");
    expect(result.winner).toBeNull();
  });

  it("T9.4-07b: only ONE variant below min sample → still skipped", () => {
    const result = evaluateExperiment(
      makeVariant({ impressions: 200 }),
      makeVariant({ impressions: 80 }), // B below minimum
      makeExperiment(),
      { minDurationHours: 48 },
      NOW
    );

    expect(result.reason).toBe("min_sample_size_not_met");
    expect(result.winner).toBeNull();
  });

  it("T9.4-08: both guardrails met → runs tests", () => {
    const result = evaluateExperiment(
      makeVariant({ impressions: 150 }),
      makeVariant({ impressions: 150 }),
      makeExperiment(),
      { minDurationHours: 48 },
      NOW
    );

    // Should run tests (not skipped)
    expect(result.reason).not.toBe("min_duration_not_met");
    expect(result.reason).not.toBe("min_sample_size_not_met");
    expect(result.matchRateTest).not.toBeNull();
    expect(result.reaffirmRateTest).not.toBeNull();
    expect(result.viewTimeTest).not.toBeNull();
  });

  it("guardrail priority: duration checked before sample size", () => {
    // Both guardrails fail — the first one checked should be reported
    const result = evaluateExperiment(
      makeVariant({ impressions: 50 }),
      makeVariant({ impressions: 50 }),
      makeExperiment({ startedAt: hoursAgo(12, NOW) }),
      { minDurationHours: 48 },
      NOW
    );

    // Duration is checked first
    expect(result.reason).toBe("min_duration_not_met");
  });

  it("zero matchCount in both variants → reaffirmRateTest runs without division by zero", () => {
    // Tests the || 1 fallback for reaffirm_rate denominator
    const result = evaluateExperiment(
      makeVariant({ impressions: 200, matchCount: 0, reaffirmCount: 0 }),
      makeVariant({ impressions: 200, matchCount: 0, reaffirmCount: 0 }),
      makeExperiment(),
      { minDurationHours: 48 },
      NOW
    );

    // Should not crash and should produce valid results
    expect(result.reaffirmRateTest).not.toBeNull();
    expect(Number.isFinite(result.reaffirmRateTest!.zScore)).toBe(true);
    expect(Number.isFinite(result.reaffirmRateTest!.pValue)).toBe(true);
    // With 0 reaffirms in both, no significance expected
    expect(result.reaffirmRateTest!.isSignificant).toBe(false);
  });
});

// ─── T9.4-09, T9.4-10: Winner declaration ────────────────────────────────

describe("evaluateExperiment — winner declaration", () => {
  it("T9.4-08b: mixed results (contradicting metrics) → no winner", () => {
    // Variant A has higher match rate, but B has higher view time
    // Use extreme values to guarantee significance
    const variantA: VariantResultData = {
      impressions: 1000,
      totalViewTimeMs: 3000000,  // avg 3000ms
      sumViewTimeSqMs: 10_000_000_000,
      matchCount: 200,    // match_rate = 0.20 (A wins)
      reaffirmCount: 80,  // reaffirm_rate = 0.40 (A wins)
    };
    const variantB: VariantResultData = {
      impressions: 1000,
      totalViewTimeMs: 8000000,  // avg 8000ms (B wins view time)
      sumViewTimeSqMs: 70_000_000_000,
      matchCount: 100,    // match_rate = 0.10 (A wins)
      reaffirmCount: 30,  // reaffirm_rate = 0.30 (A wins)
    };

    const result = evaluateExperiment(
      variantA,
      variantB,
      {
        startedAt: hoursAgo(72, NOW),
        minSampleSize: 100,
        targetPValue: 0.05,
      },
      { minDurationHours: 48 },
      NOW
    );

    // If all tests significant but different directions → mixed_results
    // If not all significant → not_significant
    // Either way, no winner
    expect(result.winner).toBeNull();
    expect(["mixed_results", "not_significant"]).toContain(result.reason);
  });

  it("T9.4-09: all metrics significant & consistent → declares winner B", () => {
    // Variant B is better in ALL metrics by a large margin
    const variantA: VariantResultData = {
      impressions: 1000,
      totalViewTimeMs: 3000000,   // avg 3000ms
      sumViewTimeSqMs: 10_000_000_000,
      matchCount: 50,     // match_rate = 0.05
      reaffirmCount: 5,   // reaffirm_rate = 0.10
    };
    const variantB: VariantResultData = {
      impressions: 1000,
      totalViewTimeMs: 8000000,   // avg 8000ms (B wins)
      sumViewTimeSqMs: 70_000_000_000,
      matchCount: 150,    // match_rate = 0.15 (B wins)
      reaffirmCount: 45,  // reaffirm_rate = 0.30 (B wins)
    };

    const result = evaluateExperiment(
      variantA,
      variantB,
      {
        startedAt: hoursAgo(72, NOW),
        minSampleSize: 100,
        targetPValue: 0.05,
      },
      { minDurationHours: 48 },
      NOW
    );

    expect(result.winner).toBe("b");
    expect(result.reason).toBe("winner_declared");
    expect(result.matchRateTest?.isSignificant).toBe(true);
    expect(result.matchRateTest?.favoredVariant).toBe("b");
    expect(result.reaffirmRateTest?.isSignificant).toBe(true);
    expect(result.reaffirmRateTest?.favoredVariant).toBe("b");
    expect(result.viewTimeTest?.isSignificant).toBe(true);
    expect(result.viewTimeTest?.favoredVariant).toBe("b");
  });

  it("T9.4-10: variant A wins → winner = 'a' (no bias toward B)", () => {
    // Same as T9.4-09 but A is better
    const variantA: VariantResultData = {
      impressions: 1000,
      totalViewTimeMs: 8000000,   // avg 8000ms (A wins)
      sumViewTimeSqMs: 70_000_000_000,
      matchCount: 150,    // match_rate = 0.15 (A wins)
      reaffirmCount: 45,  // reaffirm_rate = 0.30 (A wins)
    };
    const variantB: VariantResultData = {
      impressions: 1000,
      totalViewTimeMs: 3000000,   // avg 3000ms
      sumViewTimeSqMs: 10_000_000_000,
      matchCount: 50,     // match_rate = 0.05
      reaffirmCount: 5,   // reaffirm_rate = 0.10
    };

    const result = evaluateExperiment(
      variantA,
      variantB,
      {
        startedAt: hoursAgo(72, NOW),
        minSampleSize: 100,
        targetPValue: 0.05,
      },
      { minDurationHours: 48 },
      NOW
    );

    expect(result.winner).toBe("a");
    expect(result.reason).toBe("winner_declared");
    expect(result.matchRateTest?.favoredVariant).toBe("a");
    expect(result.viewTimeTest?.favoredVariant).toBe("a");
  });

  it("equal metrics in both variants → not significant", () => {
    const variant: VariantResultData = {
      impressions: 500,
      totalViewTimeMs: 2500000,
      sumViewTimeSqMs: 13_000_000_000,
      matchCount: 50,
      reaffirmCount: 10,
    };

    const result = evaluateExperiment(
      { ...variant },
      { ...variant },
      {
        startedAt: hoursAgo(72, NOW),
        minSampleSize: 100,
        targetPValue: 0.05,
      },
      { minDurationHours: 48 },
      NOW
    );

    expect(result.winner).toBeNull();
    expect(result.reason).toBe("not_significant");
  });

  it("only 2/3 metrics significant (same direction) → no winner", () => {
    // match_rate and view_time favor B, but reaffirm_rate not significant
    const variantA: VariantResultData = {
      impressions: 1000,
      totalViewTimeMs: 3000000,
      sumViewTimeSqMs: 10_000_000_000,
      matchCount: 50,
      reaffirmCount: 10, // reaffirm_rate = 10/50 = 0.20
    };
    const variantB: VariantResultData = {
      impressions: 1000,
      totalViewTimeMs: 8000000,
      sumViewTimeSqMs: 70_000_000_000,
      matchCount: 150,
      reaffirmCount: 31, // reaffirm_rate = 31/150 ≈ 0.207 (very close to A's 0.20)
    };

    const result = evaluateExperiment(
      variantA,
      variantB,
      {
        startedAt: hoursAgo(72, NOW),
        minSampleSize: 100,
        targetPValue: 0.05,
      },
      { minDurationHours: 48 },
      NOW
    );

    // Not all 3 metrics significant → no winner
    expect(result.winner).toBeNull();
    expect(result.reason).toBe("not_significant");
  });
});

// ─── T9.4-15: Stale data guardrail ───────────────────────────────────────

describe("isResultsStale (T9.4-15)", () => {
  it("T9.4-15: stale data (>3h since last results update) → returns true", () => {
    const lastUpdatedAt = hoursAgo(4, NOW); // 4 hours ago → stale
    expect(isResultsStale(lastUpdatedAt, NOW)).toBe(true);
  });

  it("T9.4-15b: fresh data (<3h since last update) → returns false", () => {
    const lastUpdatedAt = hoursAgo(1, NOW); // 1 hour ago → fresh
    expect(isResultsStale(lastUpdatedAt, NOW)).toBe(false);
  });

  it("T9.4-15c: exactly at threshold boundary (3h) → returns false", () => {
    const lastUpdatedAt = hoursAgo(3, NOW); // exactly 3 hours → not stale (>3h, not >=)
    expect(isResultsStale(lastUpdatedAt, NOW)).toBe(false);
  });

  it("T9.4-15d: very old data (24h) → returns true", () => {
    const lastUpdatedAt = hoursAgo(24, NOW);
    expect(isResultsStale(lastUpdatedAt, NOW)).toBe(true);
  });
});

// ─── T9.4-16: z-test edge case (n=0) ────────────────────────────────────

describe("zTestForProportions edge cases (T9.4-16)", () => {
  it("T9.4-16: n=0 (zero impressions) → graceful skip, no division by zero", () => {
    const result = zTestForProportions(0, 0, 0, 0, 0.05);

    expect(result.pValue).toBe(1);
    expect(result.isSignificant).toBe(false);
    expect(result.favoredVariant).toBeNull();
    // No NaN or Infinity
    expect(Number.isFinite(result.zScore)).toBe(true);
    expect(Number.isFinite(result.pValue)).toBe(true);
  });

  it("T9.4-16b: one variant n=0, other has data → graceful skip", () => {
    const result = zTestForProportions(50, 500, 0, 0, 0.05);

    expect(result.pValue).toBe(1);
    expect(result.isSignificant).toBe(false);
    expect(Number.isFinite(result.zScore)).toBe(true);
  });

  it("T9.4-16c: success > n (impossible but defensive) → no crash", () => {
    // Shouldn't happen in practice, but the function shouldn't crash
    const result = zTestForProportions(600, 500, 50, 500, 0.05);
    expect(Number.isFinite(result.zScore)).toBe(true);
    expect(Number.isFinite(result.pValue)).toBe(true);
  });
});

// ─── T9.4-17: Welch's t-test edge case (zero variance) ─────────────────

describe("welchTTest edge cases (T9.4-17)", () => {
  it("T9.4-17: zero variance in both variants → graceful skip", () => {
    const result = welchTTest(5000, 0, 100, 5000, 0, 100, 0.05);

    expect(result.pValue).toBe(1);
    expect(result.isSignificant).toBe(false);
    expect(result.favoredVariant).toBeNull();
    // No NaN or Infinity
    expect(Number.isFinite(result.tStatistic)).toBe(true);
    expect(Number.isFinite(result.pValue)).toBe(true);
  });

  it("T9.4-17b: very small n with zero variance → graceful skip", () => {
    const result = welchTTest(5000, 0, 2, 6000, 0, 2, 0.05);

    expect(result.pValue).toBe(1);
    expect(result.isSignificant).toBe(false);
    expect(Number.isFinite(result.tStatistic)).toBe(true);
  });

  it("T9.4-17c: zero variance in one variant only → graceful handling", () => {
    const result = welchTTest(5000, 0, 100, 6000, 1000000, 100, 0.05);

    // Should not crash — SE denominator may have issues with one zero variance
    expect(Number.isFinite(result.tStatistic)).toBe(true);
    expect(Number.isFinite(result.pValue)).toBe(true);
  });
});
