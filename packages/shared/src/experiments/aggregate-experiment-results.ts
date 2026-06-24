/**
 * Story 9.3 — Aggregation logic for experiment results.
 *
 * Pure functions for computing per-variant metrics from engagement data.
 * The SQL aggregation runs via pg_cron, but these TypeScript functions
 * serve as the canonical logic reference and are used for testing.
 *
 * Source: story 9-3, AC1, AC4, AC11
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type VariantMetrics = {
  impressions: number;
  totalViewTimeMs: number;
  sumViewTimeSqMs: number;
  matchCount: number;
  reaffirmCount: number;
};

export type VariantMetricsMap = {
  a: VariantMetrics;
  b: VariantMetrics;
};

export type DeltaMetric = {
  diff: number;
  pctChange: number;
  better: "a" | "b" | null;
};

export type ExperimentDeltas = {
  avgViewTimeMs: DeltaMetric;
  matchRate: DeltaMetric;
  reaffirmRate: DeltaMetric;
};

export type ExperimentConfidence = {
  sampleSufficient: boolean;
  minSampleSize: number;
  currentMinImpressions: number;
  preliminaryLeader: "a" | "b" | null;
  note: string;
};

export type ConfidenceBadge = {
  label: string;
  variant: "success" | "warning";
  progress?: number;
};

type ExperimentRow = {
  id: string;
  listingId: string;
  status: string;
  startedAt: Date;
  minSampleSize: number;
};

type AssignmentRow = {
  experimentId: string;
  buyerId: string;
  variant: "a" | "b";
};

type EngagementEventRow = {
  buyerId: string;
  listingId: string;
  eventType: string;
  viewTimeMs: number;
};

type SwipeEventRow = {
  buyerId: string;
  listingId: string;
  action: string;
};

// ─── Core: computeVariantMetrics ────────────────────────────────────────────

/**
 * Computes per-variant metrics from raw engagement data.
 * Pure function — no DB access.
 *
 * AC1: Calculates impressions, total_view_time_ms, sum_view_time_sq_ms,
 *       match_count, reaffirm_count per variant.
 */
export function computeVariantMetrics(
  experiment: ExperimentRow,
  assignments: AssignmentRow[],
  engagementEvents: EngagementEventRow[],
  swipeEvents: SwipeEventRow[]
): VariantMetricsMap {
  const emptyMetrics = (): VariantMetrics => ({
    impressions: 0,
    totalViewTimeMs: 0,
    sumViewTimeSqMs: 0,
    matchCount: 0,
    reaffirmCount: 0,
  });

  const result: VariantMetricsMap = {
    a: emptyMetrics(),
    b: emptyMetrics(),
  };

  // Group assignments by variant
  const buyerVariantMap = new Map<string, "a" | "b">();
  for (const assignment of assignments) {
    if (assignment.experimentId === experiment.id) {
      buyerVariantMap.set(assignment.buyerId, assignment.variant);
    }
  }

  // Track unique buyers with photo_view per variant (for impressions)
  const buyersWithPhotoView: Record<"a" | "b", Set<string>> = {
    a: new Set(),
    b: new Set(),
  };

  // Process engagement events
  for (const event of engagementEvents) {
    if (event.listingId !== experiment.listingId) continue;

    const variant = buyerVariantMap.get(event.buyerId);
    if (!variant) continue;

    if (event.eventType === "photo_view") {
      buyersWithPhotoView[variant].add(event.buyerId);
      result[variant].totalViewTimeMs += event.viewTimeMs;
      result[variant].sumViewTimeSqMs += event.viewTimeMs * event.viewTimeMs;
    }

    if (event.eventType === "match_reaffirm") {
      result[variant].reaffirmCount += 1;
    }
  }

  // Process swipe events (matches)
  for (const swipe of swipeEvents) {
    if (swipe.listingId !== experiment.listingId) continue;
    if (swipe.action !== "match") continue;

    const variant = buyerVariantMap.get(swipe.buyerId);
    if (!variant) continue;

    result[variant].matchCount += 1;
  }

  // Set impressions = distinct buyers with at least 1 photo_view
  result.a.impressions = buyersWithPhotoView.a.size;
  result.b.impressions = buyersWithPhotoView.b.size;

  return result;
}

// ─── Status filter ──────────────────────────────────────────────────────────

/**
 * AC1: Only experiments with status 'running' should be processed.
 */
export function shouldProcessExperiment(status: string): boolean {
  return status === "running";
}

// ─── Delta calculation ──────────────────────────────────────────────────────

/**
 * Calculates deltas between variant A and B metrics.
 * AC6: Deltas are computed server-side, not client-side.
 *
 * Source: story 9-3, Dev Notes "Cálculo de Deltas"
 */
export function calculateDeltas(
  a: VariantMetrics,
  b: VariantMetrics
): ExperimentDeltas {
  const avgViewA = a.impressions > 0 ? a.totalViewTimeMs / a.impressions : 0;
  const avgViewB = b.impressions > 0 ? b.totalViewTimeMs / b.impressions : 0;
  const matchRateA = a.impressions > 0 ? a.matchCount / a.impressions : 0;
  const matchRateB = b.impressions > 0 ? b.matchCount / b.impressions : 0;
  const reaffirmRateA = a.matchCount > 0 ? a.reaffirmCount / a.matchCount : 0;
  const reaffirmRateB = b.matchCount > 0 ? b.reaffirmCount / b.matchCount : 0;

  return {
    avgViewTimeMs: {
      diff: avgViewB - avgViewA,
      pctChange:
        avgViewA > 0 ? ((avgViewB - avgViewA) / avgViewA) * 100 : 0,
      better:
        avgViewB > avgViewA ? "b" : avgViewA > avgViewB ? "a" : null,
    },
    matchRate: {
      diff: matchRateB - matchRateA,
      pctChange:
        matchRateA > 0
          ? ((matchRateB - matchRateA) / matchRateA) * 100
          : 0,
      better:
        matchRateB > matchRateA ? "b" : matchRateA > matchRateB ? "a" : null,
    },
    reaffirmRate: {
      diff: reaffirmRateB - reaffirmRateA,
      pctChange:
        reaffirmRateA > 0
          ? ((reaffirmRateB - reaffirmRateA) / reaffirmRateA) * 100
          : 0,
      better:
        reaffirmRateB > reaffirmRateA
          ? "b"
          : reaffirmRateA > reaffirmRateB
            ? "a"
            : null,
    },
  };
}

// ─── Confidence calculation ─────────────────────────────────────────────────

/**
 * Calculates confidence indicator for experiment results.
 * AC6, AC8: Determines if sample is sufficient and identifies preliminary leader.
 */
export function calculateConfidence(
  a: VariantMetrics,
  b: VariantMetrics,
  minSampleSize: number
): ExperimentConfidence {
  const currentMinImpressions = Math.min(a.impressions, b.impressions);
  const sampleSufficient = currentMinImpressions >= minSampleSize;

  let preliminaryLeader: "a" | "b" | null = null;
  if (a.impressions > 0 && b.impressions > 0) {
    const avgViewA = a.totalViewTimeMs / a.impressions;
    const avgViewB = b.totalViewTimeMs / b.impressions;
    if (avgViewB > avgViewA) preliminaryLeader = "b";
    else if (avgViewA > avgViewB) preliminaryLeader = "a";
  }

  return {
    sampleSufficient,
    minSampleSize,
    currentMinImpressions,
    preliminaryLeader,
    note: sampleSufficient
      ? "Datos preliminares — la significancia estadística se evaluará en Story 9.4"
      : `Se necesitan al menos ${minSampleSize} impresiones por variante`,
  };
}

/**
 * Returns badge display info for the confidence indicator.
 * AC8: Green badge for sufficient data, yellow for collecting.
 */
export function getConfidenceBadge(
  confidence: ExperimentConfidence
): ConfidenceBadge {
  if (confidence.sampleSufficient) {
    return {
      label: "Datos suficientes",
      variant: "success",
    };
  }

  return {
    label: "Recopilando datos",
    variant: "warning",
    progress:
      confidence.minSampleSize > 0
        ? confidence.currentMinImpressions / confidence.minSampleSize
        : 0,
  };
}

// ─── Batch processor with error isolation ───────────────────────────────────

export type ProcessResult = {
  processed: number;
  errors: number;
  errorDetails: Array<{ experimentId: string; error: string }>;
  durationMs: number;
};

type MetricsFetcher = (
  experimentId: string
) => Promise<VariantMetricsMap>;

/**
 * Processes all experiments, isolating errors per experiment.
 * AC11: Error in one experiment does not stop processing of others.
 */
export async function processAllExperiments(
  experiments: ExperimentRow[],
  fetchMetrics: MetricsFetcher
): Promise<ProcessResult> {
  const startTs = performance.now();
  let processed = 0;
  let errors = 0;
  const errorDetails: Array<{ experimentId: string; error: string }> = [];

  for (const experiment of experiments) {
    if (!shouldProcessExperiment(experiment.status)) continue;

    try {
      await fetchMetrics(experiment.id);
      processed++;
    } catch (err) {
      errors++;
      errorDetails.push({
        experimentId: experiment.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    processed,
    errors,
    errorDetails,
    durationMs: Math.round(performance.now() - startTs),
  };
}
