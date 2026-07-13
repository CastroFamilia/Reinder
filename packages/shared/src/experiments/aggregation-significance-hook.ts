/**
 * packages/shared/src/experiments/aggregation-significance-hook.ts
 *
 * Extension of Story 9.3's aggregation job. After experiment_results are
 * updated, this hook evaluates statistical significance for ALL running
 * experiments that pass guardrails.
 *
 * Processing is SEQUENTIAL (not parallel) to avoid race conditions.
 * Each experiment evaluation is isolated — failure for one does not block others.
 *
 * Source: story 9-4, AC9, Task 6
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  listingExperiments,
  experimentResults,
} from "../db/schema";
import {
  evaluateExperiment,
  type VariantResultData,
  type ExperimentEvaluation,
} from "./significance-engine";
import { declareWinner, promoteWinner } from "./winner-promotion";
import {
  EXPERIMENT_MIN_DURATION_HOURS,
  EXPERIMENT_STALE_THRESHOLD_HOURS,
} from "../constants";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ExperimentEvaluationResult {
  experimentId: string;
  result: "skipped_stale" | "skipped_guardrail" | "no_winner" | "winner_declared" | "error";
  evaluation?: ExperimentEvaluation;
  error?: string;
}

// ─── Stale data check ───────────────────────────────────────────────────────

/**
 * Check if experiment results data is fresh enough for significance evaluation.
 * Results older than STALE_THRESHOLD_HOURS are considered stale.
 */
export function isResultsStale(
  lastUpdatedAt: Date,
  now: Date = new Date()
): boolean {
  const hoursSinceUpdate =
    (now.getTime() - lastUpdatedAt.getTime()) / (1000 * 60 * 60);
  return hoursSinceUpdate > EXPERIMENT_STALE_THRESHOLD_HOURS;
}

// ─── Main hook ──────────────────────────────────────────────────────────────

/**
 * Evaluate all running experiments for statistical significance.
 * Called after the aggregation job updates experiment_results.
 *
 * @param db - Drizzle database instance
 * @param now - Current timestamp (injectable for testing)
 * @returns Array of evaluation results for each experiment
 */
export async function evaluateAllRunningExperiments(
  db: PostgresJsDatabase,
  now: Date = new Date()
): Promise<ExperimentEvaluationResult[]> {
  const results: ExperimentEvaluationResult[] = [];

  // Load all running experiments
  const runningExperiments = await db
    .select()
    .from(listingExperiments)
    .where(eq(listingExperiments.status, "running"));

  // Process sequentially — not parallel (AC9)
  for (const experiment of runningExperiments) {
    try {
      // Load experiment results (2 rows: a + b)
      const expResults = await db
        .select()
        .from(experimentResults)
        .where(eq(experimentResults.experimentId, experiment.id));

      const resultA = expResults.find((r) => r.variant === "a");
      const resultB = expResults.find((r) => r.variant === "b");

      if (!resultA || !resultB) {
        results.push({
          experimentId: experiment.id,
          result: "error",
          error: "Missing experiment results for one or both variants",
        });
        continue;
      }

      // Stale data check
      const latestUpdate = new Date(
        Math.max(
          new Date(resultA.updatedAt).getTime(),
          new Date(resultB.updatedAt).getTime()
        )
      );

      if (isResultsStale(latestUpdate, now)) {
        results.push({
          experimentId: experiment.id,
          result: "skipped_stale",
        });
        console.log(
          `[significance-hook] Skipping ${experiment.id}: stale data (last update: ${latestUpdate.toISOString()})`
        );
        continue;
      }

      // Prepare variant data for the significance engine
      const variantA: VariantResultData = {
        impressions: resultA.impressions,
        totalViewTimeMs: Number(resultA.totalViewTimeMs),
        sumViewTimeSqMs: Number(resultA.sumViewTimeSqMs),
        matchCount: resultA.matchCount,
        reaffirmCount: resultA.reaffirmCount,
      };

      const variantB: VariantResultData = {
        impressions: resultB.impressions,
        totalViewTimeMs: Number(resultB.totalViewTimeMs),
        sumViewTimeSqMs: Number(resultB.sumViewTimeSqMs),
        matchCount: resultB.matchCount,
        reaffirmCount: resultB.reaffirmCount,
      };

      // Evaluate significance
      const evaluation = evaluateExperiment(
        variantA,
        variantB,
        {
          startedAt: experiment.startedAt ?? new Date(),
          minSampleSize: experiment.minSampleSize,
          targetPValue: Number(experiment.targetPValue),
        },
        { minDurationHours: EXPERIMENT_MIN_DURATION_HOURS },
        now
      );

      if (
        evaluation.reason === "min_duration_not_met" ||
        evaluation.reason === "min_sample_size_not_met"
      ) {
        results.push({
          experimentId: experiment.id,
          result: "skipped_guardrail",
          evaluation,
        });
        console.log(
          `[significance-hook] Skipping ${experiment.id}: ${evaluation.reason}`
        );
        continue;
      }

      if (evaluation.winner) {
        // Declare winner and auto-promote
        await declareWinner(db, experiment.id, evaluation.winner);
        await promoteWinner(db, experiment.id);

        results.push({
          experimentId: experiment.id,
          result: "winner_declared",
          evaluation,
        });
        console.log(
          `[significance-hook] Winner declared for ${experiment.id}: variant ${evaluation.winner}`
        );
      } else {
        results.push({
          experimentId: experiment.id,
          result: "no_winner",
          evaluation,
        });
        console.log(
          `[significance-hook] No winner for ${experiment.id}: ${evaluation.reason}`
        );
      }
    } catch (error) {
      // Fault isolation — continue with remaining experiments
      const errMsg = error instanceof Error ? error.message : String(error);
      results.push({
        experimentId: experiment.id,
        result: "error",
        error: errMsg,
      });
      console.error(
        `[significance-hook] Error evaluating ${experiment.id}:`,
        error
      );
    }
  }

  return results;
}
