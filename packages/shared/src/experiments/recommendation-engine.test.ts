/**
 * Story 9.5 — ATDD Tests: Recommendation Engine (Type Selection + Priority + Limits)
 *
 * AC3: Motor de recomendación de tipo de experimento
 *   - worst metric view_time → cover_image
 *   - worst metric match_rate (view_time OK) → title
 *   - worst metric reaffirm_rate → description
 *   - 2+ metrics equally bad → title_and_description
 *
 * AC4: Límite de 3 recomendaciones por agencia por semana
 *   - Max 3 created, sorted by priority_score
 *   - Skips if agency already has recommendations for this ISO week
 *
 * Test Design IDs: T9.5-08 through T9.5-12, T9.5-19
 *
 * TDD RED PHASE: Tests will fail until the recommendation engine is implemented.
 *
 * Run: pnpm --filter @reinder/shared test packages/shared/src/experiments/recommendation-engine.test.ts
 */

import { describe, it, expect } from "vitest";

// ─── Types for test data ────────────────────────────────────────────────────

interface ZScores {
  matchRate: number;
  viewTime: number;
  reaffirmRate: number | null;
}

interface RecommendationCandidate {
  listingId: string;
  agencyId: string;
  impressions: number;
  zScores: ZScores;
  underperformingMetricCount: number;
}

type ExperimentType = "cover_image" | "title" | "description" | "title_and_description";

// ─── Tests: Experiment Type Selection (AC3) ─────────────────────────────────

describe("Recommendation Engine — AC3: Experiment Type Selection", () => {
  // ─── T9.5-08: worst metric is view_time → recommends cover_image ───

  it("[P0] T9.5-08: recommends 'cover_image' when avg_view_time_ms is the worst metric", async () => {
    const { determineExperimentType } = await import(
      "./recommendation-engine"
    );

    const zScores: ZScores = {
      matchRate: -0.5, // OK
      viewTime: -2.5, // Worst metric (lowest z-score)
      reaffirmRate: -0.3, // OK
    };

    const result = determineExperimentType(zScores);

    expect(result).toBe("cover_image");
  });

  // ─── T9.5-09: worst metric is match_rate AND view_time is OK → title ───

  it("[P0] T9.5-09: recommends 'title' when match_rate is worst AND view_time is OK", async () => {
    const { determineExperimentType } = await import(
      "./recommendation-engine"
    );

    const zScores: ZScores = {
      matchRate: -2.0, // Worst metric
      viewTime: -0.3, // OK (>= -0.5)
      reaffirmRate: -0.2, // OK
    };

    const result = determineExperimentType(zScores);

    expect(result).toBe("title");
  });

  // ─── T9.5-10: worst metric is reaffirm_rate → description ───

  it("[P0] T9.5-10: recommends 'description' when reaffirm_rate is the worst metric", async () => {
    const { determineExperimentType } = await import(
      "./recommendation-engine"
    );

    const zScores: ZScores = {
      matchRate: -0.5, // OK
      viewTime: -0.3, // OK
      reaffirmRate: -2.5, // Worst metric
    };

    const result = determineExperimentType(zScores);

    expect(result).toBe("description");
  });

  // ─── T9.5-11: 2+ metrics equally bad → title_and_description ───

  it("[P1] T9.5-11: recommends 'title_and_description' when 2+ metrics are equally bad", async () => {
    const { determineExperimentType } = await import(
      "./recommendation-engine"
    );

    const zScores: ZScores = {
      matchRate: -2.0, // Both equally bad
      viewTime: -2.0, // Both equally bad
      reaffirmRate: -0.3, // OK
    };

    const result = determineExperimentType(zScores);

    expect(result).toBe("title_and_description");
  });

  // ─── T9.5-11b: All 3 metrics equally bad → title_and_description ───

  it("[P1] T9.5-11b: recommends 'title_and_description' when all 3 metrics are equally bad", async () => {
    const { determineExperimentType } = await import(
      "./recommendation-engine"
    );

    const zScores: ZScores = {
      matchRate: -2.0,
      viewTime: -2.0,
      reaffirmRate: -2.0,
    };

    const result = determineExperimentType(zScores);

    expect(result).toBe("title_and_description");
  });

  // ─── T9.5-11c: reaffirm_rate is null → never recommends description ───

  it("[P1] T9.5-11c: when reaffirm_rate is null, does not recommend 'description'", async () => {
    const { determineExperimentType } = await import(
      "./recommendation-engine"
    );

    const zScores: ZScores = {
      matchRate: -0.5,
      viewTime: -2.0,
      reaffirmRate: null, // No data
    };

    const result = determineExperimentType(zScores);

    // Should recommend based on view_time being worst available metric
    expect(result).toBe("cover_image");
    expect(result).not.toBe("description");
  });
});

// ─── Tests: Priority Score (AC3) ────────────────────────────────────────────

describe("Recommendation Engine — AC3: Priority Score", () => {
  // ─── T9.5-19: priority_score normalized to 0–100 ───

  it("[P1] T9.5-19: calculates priority_score normalized to 0–100 range", async () => {
    const { calculatePriorityScore } = await import(
      "./recommendation-engine"
    );

    const candidate: RecommendationCandidate = {
      listingId: "listing-priority-001",
      agencyId: "agency-uuid-001",
      impressions: 500,
      zScores: { matchRate: -2.5, viewTime: -1.8, reaffirmRate: -0.3 },
      underperformingMetricCount: 2,
    };

    const score = calculatePriorityScore(candidate);

    // Must be in 0–100 range
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  // ─── T9.5-19b: Higher abs(z-score) → higher priority ───

  it("[P1] T9.5-19b: listings with worse z-scores get higher priority scores", async () => {
    const { calculatePriorityScore } = await import(
      "./recommendation-engine"
    );

    const mildlyBad: RecommendationCandidate = {
      listingId: "listing-mild",
      agencyId: "agency-uuid-001",
      impressions: 200,
      zScores: { matchRate: -1.2, viewTime: -1.1, reaffirmRate: null },
      underperformingMetricCount: 2,
    };

    const severelyBad: RecommendationCandidate = {
      listingId: "listing-severe",
      agencyId: "agency-uuid-001",
      impressions: 200,
      zScores: { matchRate: -3.0, viewTime: -2.5, reaffirmRate: -2.0 },
      underperformingMetricCount: 3,
    };

    const mildScore = calculatePriorityScore(mildlyBad);
    const severeScore = calculatePriorityScore(severelyBad);

    expect(severeScore).toBeGreaterThan(mildScore);
  });

  // ─── T9.5-19c: More impressions → higher priority (more impact) ───

  it("[P1] T9.5-19c: listings with more impressions get higher priority scores", async () => {
    const { calculatePriorityScore } = await import(
      "./recommendation-engine"
    );

    const lowTraffic: RecommendationCandidate = {
      listingId: "listing-low-traffic",
      agencyId: "agency-uuid-001",
      impressions: 60,
      zScores: { matchRate: -2.0, viewTime: -2.0, reaffirmRate: null },
      underperformingMetricCount: 2,
    };

    const highTraffic: RecommendationCandidate = {
      listingId: "listing-high-traffic",
      agencyId: "agency-uuid-001",
      impressions: 1000,
      zScores: { matchRate: -2.0, viewTime: -2.0, reaffirmRate: null },
      underperformingMetricCount: 2,
    };

    const lowScore = calculatePriorityScore(lowTraffic);
    const highScore = calculatePriorityScore(highTraffic);

    expect(highScore).toBeGreaterThan(lowScore);
  });

  // ─── T9.5-19d: Score never negative or > 100 even with extreme values ───

  it("[P1] T9.5-19d: priority_score is clamped to [0, 100] even with extreme inputs", async () => {
    const { calculatePriorityScore } = await import(
      "./recommendation-engine"
    );

    const extreme: RecommendationCandidate = {
      listingId: "listing-extreme",
      agencyId: "agency-uuid-001",
      impressions: 100_000,
      zScores: { matchRate: -10.0, viewTime: -10.0, reaffirmRate: -10.0 },
      underperformingMetricCount: 3,
    };

    const score = calculatePriorityScore(extreme);

    expect(score).toBeLessThanOrEqual(100);
    expect(score).toBeGreaterThanOrEqual(0);
  });
});

// ─── Tests: Weekly Limit (AC4) ──────────────────────────────────────────────

describe("Recommendation Engine — AC4: Limit 3 per Agency per Week", () => {
  // ─── T9.5-12: Max 3 recommendations per agency per ISO week ───

  it("[P0] T9.5-12: selects only top 3 candidates by priority_score when agency has >3 underperforming listings", async () => {
    const { selectTopRecommendations } = await import(
      "./recommendation-engine"
    );

    // 7 candidates with varying priority scores
    const candidates: RecommendationCandidate[] = Array.from(
      { length: 7 },
      (_, i) => ({
        listingId: `listing-${i + 1}`,
        agencyId: AGENCY_ID,
        impressions: 200 + i * 100,
        zScores: { matchRate: -1.5 - i * 0.2, viewTime: -1.2 - i * 0.1, reaffirmRate: null },
        underperformingMetricCount: 2,
      })
    );

    const selected = selectTopRecommendations(candidates, AGENCY_ID);

    expect(selected).toHaveLength(3);
    // Should be ordered by priority_score descending
    for (let i = 0; i < selected.length - 1; i++) {
      expect(selected[i].priorityScore).toBeGreaterThanOrEqual(
        selected[i + 1].priorityScore
      );
    }
  });

  // ─── T9.5-12b: Fewer than 3 candidates → returns all ───

  it("[P0] T9.5-12b: returns all candidates when fewer than 3 are available", async () => {
    const { selectTopRecommendations } = await import(
      "./recommendation-engine"
    );

    const candidates: RecommendationCandidate[] = [
      {
        listingId: "listing-only-1",
        agencyId: AGENCY_ID,
        impressions: 200,
        zScores: { matchRate: -2.0, viewTime: -1.5, reaffirmRate: null },
        underperformingMetricCount: 2,
      },
      {
        listingId: "listing-only-2",
        agencyId: AGENCY_ID,
        impressions: 300,
        zScores: { matchRate: -1.8, viewTime: -1.3, reaffirmRate: -1.2 },
        underperformingMetricCount: 3,
      },
    ];

    const selected = selectTopRecommendations(candidates, AGENCY_ID);

    expect(selected).toHaveLength(2);
  });

  // ─── T9.5-12c: week_generated uses ISO week format ───

  it("[P1] T9.5-12c: generates week_generated in ISO week format (e.g., '2026-W25')", async () => {
    const { getCurrentISOWeek } = await import("./recommendation-engine");

    const isoWeek = getCurrentISOWeek();

    // Should match pattern like 2026-W25
    expect(isoWeek).toMatch(/^\d{4}-W\d{2}$/);
  });

  // ─── T9.5-12d: Idempotent — no duplicates for same week ───

  it("[P0] T9.5-12d: does not generate new recommendations if agency already has pending ones for the same week", async () => {
    const { shouldGenerateForAgency } = await import(
      "./recommendation-engine"
    );

    const existingWeeks = ["2026-W25"]; // Already has recommendations this week
    const currentWeek = "2026-W25";

    const shouldGenerate = shouldGenerateForAgency(existingWeeks, currentWeek);

    expect(shouldGenerate).toBe(false);
  });

  // ─── T9.5-12e: Generates if no existing recommendations for this week ───

  it("[P0] T9.5-12e: generates recommendations if agency has no pending ones for the current week", async () => {
    const { shouldGenerateForAgency } = await import(
      "./recommendation-engine"
    );

    const existingWeeks = ["2026-W24"]; // Has from LAST week, not this week
    const currentWeek = "2026-W25";

    const shouldGenerate = shouldGenerateForAgency(existingWeeks, currentWeek);

    expect(shouldGenerate).toBe(true);
  });
});

// ─── Constants ──────────────────────────────────────────────────────────────

const AGENCY_ID = "agency-uuid-001";

// ─── Tests: Additional Edge Cases ───────────────────────────────────────────

describe("Recommendation Engine — Edge Cases", () => {
  // ─── T9.5-09b: match_rate worst but view_time also bad → title_and_description ───

  it("[P1] T9.5-09b: recommends 'title_and_description' when match_rate is worst but view_time is also bad", async () => {
    const { determineExperimentType } = await import(
      "./recommendation-engine"
    );

    const zScores: ZScores = {
      matchRate: -2.5, // Worst metric
      viewTime: -1.5, // Also bad (< -0.5 threshold)
      reaffirmRate: -0.2, // OK
    };

    const result = determineExperimentType(zScores);

    // match_rate is worst BUT view_time is also bad (< -0.5), so it should be title_and_description
    expect(result).toBe("title_and_description");
  });

  // ─── getISOWeekForDate with known date ───

  it("[P1] T9.5-12f: getISOWeekForDate produces correct ISO week for a known date", async () => {
    const { getISOWeekForDate } = await import("./recommendation-engine");

    // Monday June 22, 2026 should be in week 26
    const date = new Date(Date.UTC(2026, 5, 22)); // June 22, 2026
    const isoWeek = getISOWeekForDate(date);

    expect(isoWeek).toMatch(/^\d{4}-W\d{2}$/);
    // June 22, 2026 is ISO week 26 of year 2026
    expect(isoWeek).toBe("2026-W26");
  });

  // ─── Empty candidates → returns empty ───

  it("[P1] T9.5-12g: returns empty array when no candidates provided", async () => {
    const { selectTopRecommendations } = await import(
      "./recommendation-engine"
    );

    const selected = selectTopRecommendations([], AGENCY_ID);

    expect(selected).toHaveLength(0);
  });

  // ─── shouldGenerateForAgency with empty existing weeks ───

  it("[P1] T9.5-12h: generates when existingWeeks is empty (first ever run)", async () => {
    const { shouldGenerateForAgency } = await import(
      "./recommendation-engine"
    );

    const shouldGenerate = shouldGenerateForAgency([], "2026-W25");

    expect(shouldGenerate).toBe(true);
  });

  // ─── Priority score with minimal underperformance ───

  it("[P1] T9.5-19e: priority_score is low for mildly underperforming listing with few impressions", async () => {
    const { calculatePriorityScore } = await import(
      "./recommendation-engine"
    );

    const mild: RecommendationCandidate = {
      listingId: "listing-mild",
      agencyId: AGENCY_ID,
      impressions: 55, // Barely above threshold
      zScores: { matchRate: -1.1, viewTime: -1.05, reaffirmRate: null },
      underperformingMetricCount: 2,
    };

    const score = calculatePriorityScore(mild);

    // Should still be in valid range but relatively low
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
    expect(score).toBeLessThan(30); // Mild case with few impressions → low score
  });
});
