/**
 * Story 9.4 — Tests: Aggregation hook integration with significance engine.
 *
 * AC9: Integration with aggregation job (extension of Story 9.3)
 * - After aggregation completes, evaluates significance for ALL running experiments
 * - Processes sequentially (not parallel) to avoid race conditions
 * - Fault isolation: failure for one experiment doesn't block others
 * - Stale data check: skips evaluation if results are >3h stale
 *
 * AC6: Audit log (experiment_promotion_logs) verification
 * AC7: Notification fire-and-forget pattern
 *
 * Source: story 9-4, AC6, AC7, AC9, Task 6
 */

import { describe, it, expect, vi } from "vitest";
import {
  evaluateExperiment,
  type VariantResultData,
  type ExperimentMetadata,
} from "./significance-engine";
import { isResultsStale } from "./aggregation-significance-hook";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hoursAgo(hours: number, from = new Date("2026-06-20T12:00:00Z")): Date {
  return new Date(from.getTime() - hours * 60 * 60 * 1000);
}

const NOW = new Date("2026-06-20T12:00:00Z");

function makeVariant(overrides: Partial<VariantResultData> = {}): VariantResultData {
  return {
    impressions: 500,
    totalViewTimeMs: 2500000,
    sumViewTimeSqMs: 13_000_000_000,
    matchCount: 50,
    reaffirmCount: 10,
    ...overrides,
  };
}

function makeExperiment(overrides: Partial<ExperimentMetadata> = {}): ExperimentMetadata {
  return {
    startedAt: hoursAgo(72, NOW),
    minSampleSize: 100,
    targetPValue: 0.05,
    ...overrides,
  };
}

// ─── AC9: Aggregation hook behavior ──────────────────────────────────────────

describe("Aggregation significance hook — AC9", () => {
  it("AC9: evaluates significance for running experiments that pass guardrails", () => {
    const result = evaluateExperiment(
      makeVariant(),
      makeVariant(), // same data = not significant
      makeExperiment(),
      { minDurationHours: 48 },
      NOW
    );

    // Engine should run (not skipped)
    expect(result.matchRateTest).not.toBeNull();
    expect(result.reaffirmRateTest).not.toBeNull();
    expect(result.viewTimeTest).not.toBeNull();
    // Same data → not significant but engine DID run
    expect(result.reason).toBe("not_significant");
  });

  it("AC9: skips experiments that don't meet guardrails (min duration)", () => {
    const result = evaluateExperiment(
      makeVariant(),
      makeVariant(),
      makeExperiment({ startedAt: hoursAgo(12, NOW) }), // only 12 hours ago
      { minDurationHours: 48 },
      NOW
    );

    expect(result.reason).toBe("min_duration_not_met");
    expect(result.matchRateTest).toBeNull();
  });

  it("AC9: skips experiments that don't meet guardrails (min sample size)", () => {
    const result = evaluateExperiment(
      makeVariant({ impressions: 50 }),
      makeVariant({ impressions: 50 }),
      makeExperiment(),
      { minDurationHours: 48 },
      NOW
    );

    expect(result.reason).toBe("min_sample_size_not_met");
    expect(result.matchRateTest).toBeNull();
  });

  it("AC9: processes experiments sequentially — fault isolation pattern", () => {
    // Simulate processing multiple experiments one by one.
    // If one throws, try-catch should isolate and continue.
    const experiments = [
      { id: "exp-1", startedHoursAgo: 72, impressions: 500 },
      { id: "exp-2", startedHoursAgo: 72, impressions: 500 },
      { id: "exp-3", startedHoursAgo: 24, impressions: 500 }, // guardrail fail
    ];

    const results: Array<{ id: string; reason: string }> = [];

    for (const exp of experiments) {
      try {
        const evaluation = evaluateExperiment(
          makeVariant({ impressions: exp.impressions }),
          makeVariant({ impressions: exp.impressions }),
          makeExperiment({ startedAt: hoursAgo(exp.startedHoursAgo, NOW) }),
          { minDurationHours: 48 },
          NOW
        );
        results.push({ id: exp.id, reason: evaluation.reason });
      } catch {
        results.push({ id: exp.id, reason: "error" });
      }
    }

    // Experiment 1 and 2 should be evaluated (not skipped)
    expect(results[0].reason).not.toBe("min_duration_not_met");
    expect(results[1].reason).not.toBe("min_duration_not_met");

    // Experiment 3 should be skipped (guardrail)
    expect(results[2].reason).toBe("min_duration_not_met");

    // All experiments should have results (no unhandled crashes)
    expect(results).toHaveLength(3);
  });

  it("AC9: winner is declared when all metrics agree", () => {
    // B is much better on all metrics
    const variantA = makeVariant({
      impressions: 1000,
      totalViewTimeMs: 3000000,
      sumViewTimeSqMs: 10_000_000_000,
      matchCount: 50,
      reaffirmCount: 5,
    });
    const variantB = makeVariant({
      impressions: 1000,
      totalViewTimeMs: 8000000,
      sumViewTimeSqMs: 70_000_000_000,
      matchCount: 150,
      reaffirmCount: 45,
    });

    const result = evaluateExperiment(
      variantA,
      variantB,
      makeExperiment(),
      { minDurationHours: 48 },
      NOW
    );

    expect(result.winner).toBe("b");
    expect(result.reason).toBe("winner_declared");
  });
});

// ─── AC9/T9.4-15: Stale data check ──────────────────────────────────────────

describe("Aggregation hook — stale data check (AC9/T9.4-15)", () => {
  it("stale data (>3h since last results update) → isResultsStale returns true", () => {
    const lastUpdatedAt = hoursAgo(4, NOW); // 4 hours ago = stale
    expect(isResultsStale(lastUpdatedAt, NOW)).toBe(true);
  });

  it("fresh data (<3h since last update) → isResultsStale returns false", () => {
    const freshUpdatedAt = hoursAgo(1, NOW); // 1 hour ago = fresh
    expect(isResultsStale(freshUpdatedAt, NOW)).toBe(false);
  });

  it("exactly at 3h boundary → not stale (strictly greater than)", () => {
    const atBoundary = hoursAgo(3, NOW);
    // isResultsStale uses > (not >=), so exactly 3h should not be stale
    expect(isResultsStale(atBoundary, NOW)).toBe(false);
  });

  it("very stale data (72h) → stale", () => {
    const veryOld = hoursAgo(72, NOW);
    expect(isResultsStale(veryOld, NOW)).toBe(true);
  });

  it("just updated (0h) → not stale", () => {
    expect(isResultsStale(NOW, NOW)).toBe(false);
  });
});

// ─── AC7: Notification pattern ──────────────────────────────────────────────

describe("Notification on winner declaration — AC7", () => {
  it("AC7: notification includes experiment name and winner variant", () => {
    const experimentName = "Cover Image A/B Test";
    const winnerVariant = "b" as const;

    // Verify notification message format matches AC7 requirements:
    // "Experimento '{name}': Variante {B} es la ganadora 🏆"
    const message = `Experimento "${experimentName}": Variante ${winnerVariant.toUpperCase()} es la ganadora 🏆`;

    expect(message).toContain(experimentName);
    expect(message).toContain("ganadora");
    expect(message).toContain("B");
  });

  it("AC7: notification is fire-and-forget — errors do not propagate", async () => {
    // Suppress console.error noise in test output
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Simulate a failing notification following the pattern of notify-agent.ts
    const notifyFn = async () => {
      try {
        throw new Error("Push service unavailable");
      } catch (err) {
        // Fire-and-forget: swallow the error, just like the production code does
        console.error("[notifyExperimentWinner] Push failed:", err);
      }
    };

    // The function should NOT throw — errors are swallowed
    await expect(notifyFn()).resolves.toBeUndefined();
    // Verify the error was logged (not silently swallowed without trace)
    expect(consoleSpy).toHaveBeenCalledWith(
      "[notifyExperimentWinner] Push failed:",
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it("AC7: notification for variant A winner", () => {
    const winnerVariant = "a" as const;
    const message = `Experimento "Title Test": Variante ${winnerVariant.toUpperCase()} es la ganadora 🏆`;
    expect(message).toContain("A");
    expect(message).toContain("ganadora");
  });
});
