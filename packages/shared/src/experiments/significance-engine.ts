/**
 * Story 9.4 — Statistical significance engine for A/B experiments.
 *
 * Pure functions — zero side effects, zero DB access.
 * All tests are two-tailed (no a priori assumption about which variant is better).
 *
 * - normalCDF: Abramowitz & Stegun approximation (±1.5e-7 precision)
 * - zTestForProportions: two-sample z-test for proportions (match_rate, reaffirm_rate)
 * - welchTTest: Welch's t-test for continuous metrics (avg_view_time_ms)
 * - evaluateExperiment: orchestrates all 3 tests + guardrails
 *
 * Source: story 9-4, AC1–AC4, Task 1
 */

import tCDF from "@stdlib/stats-base-dists-t-cdf";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SignificanceConfig {
  targetPValue: number; // default 0.05
  minSampleSize: number; // experiment.min_sample_size
  minDurationHours: number; // default 48
}

export interface ZTestResult {
  zScore: number;
  pValue: number;
  isSignificant: boolean;
  favoredVariant: "a" | "b" | null; // null if not significant
}

export interface TTestResult {
  tStatistic: number;
  degreesOfFreedom: number;
  pValue: number;
  isSignificant: boolean;
  favoredVariant: "a" | "b" | null;
}

export type EvaluationReason =
  | "winner_declared"
  | "not_significant"
  | "mixed_results"
  | "min_duration_not_met"
  | "min_sample_size_not_met";

export interface ExperimentEvaluation {
  matchRateTest: ZTestResult | null;
  reaffirmRateTest: ZTestResult | null;
  viewTimeTest: TTestResult | null;
  winner: "a" | "b" | null;
  reason: EvaluationReason;
}

/** Aggregated metrics for one variant, used as input to the evaluation engine. */
export interface VariantResultData {
  impressions: number;
  totalViewTimeMs: number;
  sumViewTimeSqMs: number;
  matchCount: number;
  reaffirmCount: number;
}

/** Experiment metadata needed by the evaluation engine. */
export interface ExperimentMetadata {
  startedAt: Date;
  minSampleSize: number;
  targetPValue: number;
}

// ─── Normal CDF (Abramowitz & Stegun) ──────────────────────────────────────

/**
 * Approximation of the standard normal CDF.
 * Precision: ±1.5e-7 (sufficient for p-value threshold of 0.05).
 * Ref: Abramowitz & Stegun, Handbook of Mathematical Functions, formula 7.1.26
 */
export function normalCDF(z: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1.0 / (1.0 + p * x);
  const y =
    1.0 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

// ─── Z-test for proportions ────────────────────────────────────────────────

/**
 * Two-sample z-test for proportions.
 * H0: p_a = p_b (no difference between variants)
 * Two-tailed test.
 */
export function zTestForProportions(
  successA: number,
  nA: number,
  successB: number,
  nB: number,
  targetPValue: number
): ZTestResult {
  if (nA === 0 || nB === 0) {
    return { zScore: 0, pValue: 1, isSignificant: false, favoredVariant: null };
  }

  const pA = successA / nA;
  const pB = successB / nB;
  const pPooled = (successA + successB) / (nA + nB);

  const se = Math.sqrt(pPooled * (1 - pPooled) * (1 / nA + 1 / nB));

  // If SE is 0 (both proportions are 0 or 1), not significant
  if (se === 0) {
    return { zScore: 0, pValue: 1, isSignificant: false, favoredVariant: null };
  }

  const zScore = (pA - pB) / se;
  const pValue = 2 * (1 - normalCDF(Math.abs(zScore))); // two-tailed

  return {
    zScore,
    pValue,
    isSignificant: pValue <= targetPValue,
    favoredVariant: pValue <= targetPValue ? (pA > pB ? "a" : "b") : null,
  };
}

// ─── Variance calculation ──────────────────────────────────────────────────

/**
 * Calculate sample variance from aggregate counters.
 * Uses Bessel's correction (n-1 denominator).
 *
 * @param total - sum of values
 * @param sumSq - sum of squared values
 * @param n - count
 */
export function calculateVariance(
  total: number,
  sumSq: number,
  n: number
): number {
  if (n <= 1) return 0;
  const mean = total / n;
  const popVariance = sumSq / n - mean * mean;
  // Bessel's correction: multiply by n/(n-1) for sample variance
  return (popVariance * n) / (n - 1);
}

// ─── Welch's t-test ────────────────────────────────────────────────────────

/**
 * Welch's t-test for two independent samples with unequal variances.
 * Two-tailed test.
 *
 * Uses @stdlib/stats-base-dists-t-cdf for precise t-distribution CDF.
 */
export function welchTTest(
  meanA: number,
  varA: number,
  nA: number,
  meanB: number,
  varB: number,
  nB: number,
  targetPValue: number
): TTestResult {
  if (nA <= 1 || nB <= 1) {
    return {
      tStatistic: 0,
      degreesOfFreedom: 0,
      pValue: 1,
      isSignificant: false,
      favoredVariant: null,
    };
  }

  const seA = varA / nA;
  const seB = varB / nB;
  const seDenom = Math.sqrt(seA + seB);

  if (seDenom === 0) {
    return {
      tStatistic: 0,
      degreesOfFreedom: nA + nB - 2,
      pValue: 1,
      isSignificant: false,
      favoredVariant: null,
    };
  }

  const tStatistic = (meanA - meanB) / seDenom;

  // Welch-Satterthwaite degrees of freedom
  const numerator = (seA + seB) ** 2;
  const denominator =
    (seA ** 2) / (nA - 1) + (seB ** 2) / (nB - 1);
  const degreesOfFreedom = numerator / denominator;

  // p-value via t-distribution CDF (two-tailed)
  const pValue = 2 * (1 - tCDF(Math.abs(tStatistic), degreesOfFreedom));

  return {
    tStatistic,
    degreesOfFreedom,
    pValue,
    isSignificant: pValue <= targetPValue,
    favoredVariant:
      pValue <= targetPValue ? (meanA > meanB ? "a" : "b") : null,
  };
}

// ─── Experiment evaluation orchestrator ────────────────────────────────────

/**
 * Evaluates an experiment for statistical significance.
 * Checks guardrails first, then runs all 3 tests, then determines winner.
 *
 * @param variantA - aggregated metrics for variant A
 * @param variantB - aggregated metrics for variant B
 * @param experiment - experiment metadata (startedAt, minSampleSize, targetPValue)
 * @param config - global configuration (minDurationHours)
 * @param now - current timestamp (injectable for testing)
 */
export function evaluateExperiment(
  variantA: VariantResultData,
  variantB: VariantResultData,
  experiment: ExperimentMetadata,
  config: Pick<SignificanceConfig, "minDurationHours">,
  now: Date = new Date()
): ExperimentEvaluation {
  const nullResult: ExperimentEvaluation = {
    matchRateTest: null,
    reaffirmRateTest: null,
    viewTimeTest: null,
    winner: null,
    reason: "not_significant",
  };

  // ─── Guardrail: minimum duration ──────────────────────────────────────
  const hoursElapsed =
    (now.getTime() - experiment.startedAt.getTime()) / (1000 * 60 * 60);

  if (hoursElapsed < config.minDurationHours) {
    return { ...nullResult, reason: "min_duration_not_met" };
  }

  // ─── Guardrail: minimum sample size ───────────────────────────────────
  const minImpressions = Math.min(
    variantA.impressions,
    variantB.impressions
  );
  if (minImpressions < experiment.minSampleSize) {
    return { ...nullResult, reason: "min_sample_size_not_met" };
  }

  const targetP = experiment.targetPValue;

  // ─── Z-test for match_rate ────────────────────────────────────────────
  const matchRateTest = zTestForProportions(
    variantA.matchCount,
    variantA.impressions,
    variantB.matchCount,
    variantB.impressions,
    targetP
  );

  // ─── Z-test for reaffirm_rate ─────────────────────────────────────────
  // reaffirm_rate = reaffirm_count / match_count
  const reaffirmRateTest = zTestForProportions(
    variantA.reaffirmCount,
    variantA.matchCount || 1, // avoid division by zero — if no matches, test is trivially non-significant
    variantB.reaffirmCount,
    variantB.matchCount || 1,
    targetP
  );

  // ─── Welch's t-test for avg_view_time_ms ──────────────────────────────
  const meanA =
    variantA.impressions > 0
      ? variantA.totalViewTimeMs / variantA.impressions
      : 0;
  const meanB =
    variantB.impressions > 0
      ? variantB.totalViewTimeMs / variantB.impressions
      : 0;
  const varA = calculateVariance(
    variantA.totalViewTimeMs,
    variantA.sumViewTimeSqMs,
    variantA.impressions
  );
  const varB = calculateVariance(
    variantB.totalViewTimeMs,
    variantB.sumViewTimeSqMs,
    variantB.impressions
  );

  const viewTimeTest = welchTTest(
    meanA,
    varA,
    variantA.impressions,
    meanB,
    varB,
    variantB.impressions,
    targetP
  );

  // ─── Winner determination ─────────────────────────────────────────────
  const allTests = [matchRateTest, reaffirmRateTest, viewTimeTest];
  const allSignificant = allTests.every((t) => t.isSignificant);

  if (!allSignificant) {
    // Check if results are mixed (some significant with conflicting directions)
    const significantTests = allTests.filter((t) => t.isSignificant);
    if (significantTests.length > 0) {
      const directions = new Set(significantTests.map((t) => t.favoredVariant));
      if (directions.size > 1) {
        return {
          matchRateTest,
          reaffirmRateTest,
          viewTimeTest,
          winner: null,
          reason: "mixed_results",
        };
      }
    }

    return {
      matchRateTest,
      reaffirmRateTest,
      viewTimeTest,
      winner: null,
      reason: "not_significant",
    };
  }

  // All significant — check consistency
  const favoredVariants = new Set(allTests.map((t) => t.favoredVariant));
  if (favoredVariants.size !== 1) {
    // Mixed results — metrics point to different variants
    return {
      matchRateTest,
      reaffirmRateTest,
      viewTimeTest,
      winner: null,
      reason: "mixed_results",
    };
  }

  const winner = allTests[0].favoredVariant!;

  return {
    matchRateTest,
    reaffirmRateTest,
    viewTimeTest,
    winner,
    reason: "winner_declared",
  };
}
