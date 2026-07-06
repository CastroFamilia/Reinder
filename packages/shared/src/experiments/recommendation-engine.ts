/**
 * Recommendation Engine — Type Selection, Priority Scoring, and Weekly Limits
 *
 * Determines what type of experiment to recommend based on which metric
 * is performing worst, calculates priority scores, and enforces the
 * 3-per-agency-per-week limit.
 *
 * Story 9.5, AC3, AC4
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ZScores {
  matchRate: number;
  viewTime: number;
  reaffirmRate: number | null;
}

export interface RecommendationCandidate {
  listingId: string;
  agencyId: string;
  impressions: number;
  zScores: ZScores;
  underperformingMetricCount: number;
}

export interface ScoredRecommendation extends RecommendationCandidate {
  priorityScore: number;
}

export type ExperimentType =
  | "cover_image"
  | "title"
  | "description"
  | "title_and_description";

// ─── Constants ──────────────────────────────────────────────────────────────

/** Maximum recommendations generated per agency per ISO week */
const MAX_RECOMMENDATIONS_PER_WEEK = 3;

/** Threshold for view_time being considered "OK" in the title rule */
const VIEW_TIME_OK_THRESHOLD = -0.5;

// ─── Experiment Type Selection (AC3) ────────────────────────────────────────

/**
 * Determines the recommended experiment type based on which metric has
 * the worst (lowest) z-score.
 *
 * Rules:
 * - If avg_view_time_ms is the worst → cover_image (portada no capta atención)
 * - If match_rate is the worst AND view_time is OK → title
 * - If reaffirm_rate is the worst → description
 * - If 2+ metrics are equally bad → title_and_description
 */
export function determineExperimentType(zScores: ZScores): ExperimentType {
  const { matchRate, viewTime, reaffirmRate } = zScores;

  // Effective reaffirm for comparisons (null → 0, meaning "not a concern")
  const effectiveReaffirm = reaffirmRate ?? 0;

  // Find the worst (minimum) z-score among available metrics
  const candidates: Array<{ metric: string; z: number }> = [
    { metric: "matchRate", z: matchRate },
    { metric: "viewTime", z: viewTime },
  ];

  if (reaffirmRate !== null) {
    candidates.push({ metric: "reaffirmRate", z: reaffirmRate });
  }

  // Sort by z-score ascending (worst first)
  candidates.sort((a, b) => a.z - b.z);

  const worst = candidates[0];
  const secondWorst = candidates.length > 1 ? candidates[1] : null;

  // Check if 2+ metrics are equally bad (within 0.01 tolerance)
  if (secondWorst && Math.abs(worst.z - secondWorst.z) < 0.01) {
    return "title_and_description";
  }

  // Single worst metric determines the type
  switch (worst.metric) {
    case "viewTime":
      return "cover_image";

    case "matchRate":
      // If match_rate is worst AND view_time is OK → title
      if (viewTime >= VIEW_TIME_OK_THRESHOLD) {
        return "title";
      }
      // Otherwise → title_and_description (both are bad)
      return "title_and_description";

    case "reaffirmRate":
      return "description";

    default:
      return "title_and_description";
  }
}

// ─── Priority Scoring (AC3) ─────────────────────────────────────────────────

/**
 * Calculates priority score for a recommendation candidate.
 *
 * Formula: abs(worst_z_score) × (impressions / 500) × (1 + count/3) × 20
 * Clamped to [0, 100].
 */
export function calculatePriorityScore(
  candidate: RecommendationCandidate,
): number {
  const { zScores, impressions, underperformingMetricCount } = candidate;

  // Find worst z-score (most negative)
  const zValues = [zScores.matchRate, zScores.viewTime];
  if (zScores.reaffirmRate !== null) {
    zValues.push(zScores.reaffirmRate);
  }

  const worstZ = Math.min(...zValues);

  // Priority formula
  const rawScore =
    Math.abs(worstZ) *
    (impressions / 500) *
    (1 + underperformingMetricCount / 3) *
    20;

  // Clamp to [0, 100]
  return Math.min(100, Math.max(0, Math.round(rawScore * 100) / 100));
}

// ─── Weekly Limit Selection (AC4) ───────────────────────────────────────────

/**
 * Selects the top 3 candidates by priority score for a given agency.
 * Returns scored recommendations sorted by priority descending.
 */
export function selectTopRecommendations(
  candidates: RecommendationCandidate[],
  agencyId: string,
): ScoredRecommendation[] {
  // Filter by agency and calculate scores
  const scored: ScoredRecommendation[] = candidates
    .filter((c) => c.agencyId === agencyId)
    .map((c) => ({
      ...c,
      priorityScore: calculatePriorityScore(c),
    }));

  // Sort by priority descending
  scored.sort((a, b) => b.priorityScore - a.priorityScore);

  // Return top 3
  return scored.slice(0, MAX_RECOMMENDATIONS_PER_WEEK);
}

// ─── ISO Week Utilities (AC4) ───────────────────────────────────────────────

/**
 * Returns the current ISO week in format `YYYY-Www` (e.g., `2026-W25`).
 */
export function getCurrentISOWeek(): string {
  return getISOWeekForDate(new Date());
}

/**
 * Returns the ISO week string for a given date.
 */
export function getISOWeekForDate(date: Date): string {
  // ISO week number calculation
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  // Set to nearest Thursday: current date + 4 - current day number
  // Make Sunday's day number 7
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  // Get first day of year
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  // Calculate week number
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );

  const isoYear = d.getUTCFullYear();
  return `${isoYear}-W${weekNo.toString().padStart(2, "0")}`;
}

// ─── Idempotency Check (AC4) ────────────────────────────────────────────────

/**
 * Determines whether new recommendations should be generated for an agency.
 * Returns false if the agency already has recommendations for the current week.
 */
export function shouldGenerateForAgency(
  existingWeeks: string[],
  currentWeek: string,
): boolean {
  return !existingWeeks.includes(currentWeek);
}
