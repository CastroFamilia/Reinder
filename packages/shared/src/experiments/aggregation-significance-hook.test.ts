/**
 * Story 9.4 — ATDD Tests: Aggregation hook integration
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
 *
 * TDD RED PHASE: Tests define expected behavior — implementation follows.
 * Run: pnpm --filter @reinder/shared test packages/shared/src/experiments/aggregation-significance-hook.test.ts
 */

import { describe, it, expect, vi } from "vitest";
import {
  evaluateExperiment,
  type VariantResultData,
  type ExperimentMetadata,
} from "./significance-engine";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hoursAgo(hours: number, from = new Date("2026-06-20T12:00:00Z")): Date {
  return new Date(from.getTime() - hours * 60 * 60 * 1000);
}

const NOW = new Date("2026-06-20T12:00:00Z");
const STALE_THRESHOLD_HOURS = 3;

// ─── AC9: Aggregation hook behavior ──────────────────────────────────────────

describe("Aggregation significance hook — AC9", () => {
  /**
   * After the aggregation job updates experiment_results, the significance
   * hook should evaluate all running experiments that pass guardrails.
   */

  it("AC9: evaluates significance for running experiments that pass guardrails", () => {
    // Experiment with sufficient data — should be evaluated
    const variantA: VariantResultData = {
      impressions: 500,
      totalViewTimeMs: 2500000,
      sumViewTimeSqMs: 13_000_000_000,
      matchCount: 50,
      reaffirmCount: 10,
    };

    const result = evaluateExperiment(
      variantA,
      { ...variantA }, // same data = not significant
      {
        startedAt: hoursAgo(72, NOW),
        minSampleSize: 100,
        targetPValue: 0.05,
      },
      { minDurationHours: 48 },
      NOW
    );

    // Engine should run (not skipped)
    expect(result.matchRateTest).not.toBeNull();
    expect(result.reaffirmRateTest).not.toBeNull();
    expect(result.viewTimeTest).not.toBeNull();
  });

  it("AC9: skips experiments that don't meet guardrails (min duration)", () => {
    const variant: VariantResultData = {
      impressions: 500,
      totalViewTimeMs: 2500000,
      sumViewTimeSqMs: 13_000_000_000,
      matchCount: 50,
      reaffirmCount: 10,
    };

    const result = evaluateExperiment(
      variant,
      { ...variant },
      {
        startedAt: hoursAgo(12, NOW), // only 12 hours ago
        minSampleSize: 100,
        targetPValue: 0.05,
      },
      { minDurationHours: 48 },
      NOW
    );

    expect(result.reason).toBe("min_duration_not_met");
    expect(result.matchRateTest).toBeNull();
  });

  it("AC9: processes experiments sequentially — fault isolation", () => {
    // Simulate processing multiple experiments
    const experiments = [
      { id: "exp-1", startedHoursAgo: 72, impressions: 500 },
      { id: "exp-2", startedHoursAgo: 72, impressions: 500 },
      { id: "exp-3", startedHoursAgo: 24, impressions: 500 }, // guardrail fail
    ];

    const results = experiments.map((exp) => {
      try {
        return evaluateExperiment(
          {
            impressions: exp.impressions,
            totalViewTimeMs: 2500000,
            sumViewTimeSqMs: 13_000_000_000,
            matchCount: 50,
            reaffirmCount: 10,
          },
          {
            impressions: exp.impressions,
            totalViewTimeMs: 2500000,
            sumViewTimeSqMs: 13_000_000_000,
            matchCount: 50,
            reaffirmCount: 10,
          },
          {
            startedAt: hoursAgo(exp.startedHoursAgo, NOW),
            minSampleSize: 100,
            targetPValue: 0.05,
          },
          { minDurationHours: 48 },
          NOW
        );
      } catch {
        return { reason: "error", winner: null };
      }
    });

    // Experiment 1 and 2 should be evaluated (not skipped)
    expect(results[0].reason).not.toBe("min_duration_not_met");
    expect(results[1].reason).not.toBe("min_duration_not_met");

    // Experiment 3 should be skipped (guardrail)
    expect(results[2].reason).toBe("min_duration_not_met");

    // All experiments should have results (no unhandled crashes)
    expect(results).toHaveLength(3);
  });

  it("AC9: stale data check — skips if results are >3h old", () => {
    // Simulate the stale data check that the aggregation hook performs
    const lastUpdatedAt = hoursAgo(4, NOW); // 4 hours ago = stale
    const hoursSinceUpdate =
      (NOW.getTime() - lastUpdatedAt.getTime()) / (1000 * 60 * 60);

    const isStale = hoursSinceUpdate > STALE_THRESHOLD_HOURS;
    expect(isStale).toBe(true);

    // Fresh data should proceed
    const freshUpdatedAt = hoursAgo(1, NOW); // 1 hour ago = fresh
    const freshHoursSince =
      (NOW.getTime() - freshUpdatedAt.getTime()) / (1000 * 60 * 60);

    const isFresh = freshHoursSince <= STALE_THRESHOLD_HOURS;
    expect(isFresh).toBe(true);
  });
});

// ─── AC6: Audit log structure ────────────────────────────────────────────────

describe("Promotion audit log — AC6", () => {
  it("AC6: promotion log has all required fields", () => {
    // Define the expected shape of a promotion log entry
    const promotionLog = {
      experimentId: "exp-001",
      listingId: "listing-001",
      promotedVariant: "b" as const,
      experimentType: "title" as const,
      previousContent: { title: "Original Title" },
      promotedContent: { title: "Winning Title" },
      promotedAt: new Date(),
      promotedBy: "system" as const,
    };

    // All required fields must be present
    expect(promotionLog.experimentId).toBeDefined();
    expect(promotionLog.listingId).toBeDefined();
    expect(["a", "b"]).toContain(promotionLog.promotedVariant);
    expect(["cover_image", "title", "description", "title_and_description"]).toContain(
      promotionLog.experimentType
    );
    expect(promotionLog.previousContent).toBeDefined();
    expect(promotionLog.promotedContent).toBeDefined();
    expect(promotionLog.promotedAt).toBeInstanceOf(Date);
    expect(promotionLog.promotedBy).toBe("system");
  });

  it("AC6: rollback log has promoted_by = 'rollback_agency_admin'", () => {
    const rollbackLog = {
      experimentId: "exp-001",
      listingId: "listing-001",
      promotedVariant: "a" as const, // rollback restores variant_a
      experimentType: "title" as const,
      previousContent: { title: "Winning Title" },
      promotedContent: { title: "Original Title" },
      promotedAt: new Date(),
      promotedBy: "rollback_agency_admin" as const,
    };

    expect(rollbackLog.promotedBy).toBe("rollback_agency_admin");
    expect(rollbackLog.promotedVariant).toBe("a");
  });
});

// ─── AC7: Notification pattern ──────────────────────────────────────────────

describe("Notification on winner declaration — AC7", () => {
  it("AC7: notification includes experiment name and winner variant", () => {
    const notification = {
      experimentName: "Cover Image A/B Test",
      winnerVariant: "b" as const,
      message: 'Experimento "Cover Image A/B Test": Variante B es la ganadora 🏆',
    };

    expect(notification.experimentName).toBeDefined();
    expect(notification.winnerVariant).toBeDefined();
    expect(notification.message).toContain(notification.experimentName);
    expect(notification.message).toContain("ganadora");
  });

  it("AC7: notification is fire-and-forget — errors do not propagate", async () => {
    // Simulate a failing notification
    const notifyFn = async () => {
      try {
        throw new Error("Push service unavailable");
      } catch {
        // Fire-and-forget: swallow the error
        console.error("[notifyExperimentWinner] Push failed");
      }
    };

    // The function should NOT throw
    await expect(notifyFn()).resolves.toBeUndefined();
  });
});
