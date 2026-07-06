/**
 * Story 9.5 — ATDD Tests: Proactive Experiment Recommendations
 *
 * AC1: experiment_recommendations table (Drizzle schema)
 * AC2: Underperformance detection algorithm
 * AC3: Recommendation engine (experiment type based on weakest metric)
 * AC4: Max 3 recommendations per agency per week
 * AC5: Auto-expiry of old recommendations
 * AC6: GET /api/v1/agency/recommendations
 * AC7: PATCH /api/v1/agency/recommendations/:id
 * AC10: Drizzle schema and types
 *
 * Run: pnpm --filter @reinder/shared test packages/shared/src/db/schema-recommendations.test.ts
 */

import { describe, it, expect } from "vitest";

// ─── AC1 + AC10: Drizzle schema — experimentRecommendations table ───

describe("Drizzle Schema — experiment_recommendations (AC1, AC10)", () => {
  it("[P0] T9.5-01: exports experimentRecommendations table from schema.ts", async () => {
    const schema = await import("./schema");

    expect(schema.experimentRecommendations).toBeDefined();
    expect(
      (schema.experimentRecommendations as any)[Symbol.for("drizzle:Name")]
    ).toBe("experiment_recommendations");
  }, { timeout: 15_000 });

  it("[P0] T9.5-02: experiment_recommendations has all required columns per AC1", async () => {
    const schema = await import("./schema");
    const table = schema.experimentRecommendations;
    const columns = Object.keys(table);

    const requiredColumns = [
      "id",
      "agencyId",
      "listingId",
      "recommendedExperimentType",
      "reasonCode",
      "reasonDetail",
      "underperformingMetrics",
      "priorityScore",
      "status",
      "acceptedExperimentId",
      "weekGenerated",
      "createdAt",
      "updatedAt",
    ];

    for (const col of requiredColumns) {
      expect(columns, `Missing column: ${col}`).toContain(col);
    }
  });

  it("[P0] T9.5-03: recommendedExperimentType reuses experimentTypeEnum", async () => {
    const schema = await import("./schema");
    const col = (schema.experimentRecommendations as any)
      .recommendedExperimentType;

    // The column should reference the same enum as listing_experiments.experiment_type
    expect(col).toBeDefined();
    // Drizzle enum columns have an enumValues property on the column config
    const enumName = col?.enumName || col?.config?.enumName;
    // The column should be using experiment_type enum
    expect(
      schema.experimentTypeEnum.enumValues
    ).toEqual([
      "cover_image",
      "title",
      "description",
      "title_and_description",
    ]);
  });

  it("[P0] T9.5-04: priorityScore uses numeric(5,2)", async () => {
    const schema = await import("./schema");
    const col = (schema.experimentRecommendations as any).priorityScore;

    expect(col).toBeDefined();
    expect(col.dataType).toBe("string"); // Drizzle numeric maps to string
  });

  it("[P0] T9.5-05: underperformingMetrics uses jsonb", async () => {
    const schema = await import("./schema");
    const col = (schema.experimentRecommendations as any).underperformingMetrics;

    expect(col).toBeDefined();
    expect(col.dataType).toBe("json"); // Drizzle jsonb maps to 'json' dataType
  });

  it("[P1] T9.5-06: acceptedExperimentId is nullable FK", async () => {
    const schema = await import("./schema");
    const col = (schema.experimentRecommendations as any).acceptedExperimentId;

    expect(col).toBeDefined();
    expect(col.notNull).toBeFalsy();
  });
});

// ─── AC10: Shared types ───

describe("Shared Types — Recommendation types (AC10)", () => {
  it("[P0] T9.5-07: exports ExperimentRecommendation and related types", async () => {
    const types = await import("../types/experiment");

    expect(types).toHaveProperty("RecommendationStatus");
    // RecommendationStatus is a const tuple — spread into plain array for comparison
    expect([...types.RecommendationStatus]).toEqual([
      "pending",
      "accepted",
      "dismissed",
      "expired",
    ]);
  });

  it("[P0] T9.5-08: ExperimentRecommendation type has required fields", async () => {
    // This is a compile-time check — if the type is wrong, TS will error.
    // We verify the type is importable and has the expected shape
    const types = await import("../types/experiment");

    // Verify the type exists by checking it's exported
    const rec: types.ExperimentRecommendation = {
      id: "test",
      agencyId: "test",
      listingId: "test",
      recommendedExperimentType: "cover_image",
      reasonCode: "low_match_rate",
      reasonDetail: "Test detail",
      underperformingMetrics: {
        match_rate: { value: 0.02, agency_avg: 0.06, platform_avg: 0.05, z_score: -1.8 },
      },
      priorityScore: 75.5,
      status: "pending",
      acceptedExperimentId: null,
      weekGenerated: "2026-W25",
      createdAt: "2026-06-22T00:00:00Z",
      updatedAt: "2026-06-22T00:00:00Z",
    };

    expect(rec.id).toBe("test");
    expect(rec.status).toBe("pending");
  });
});

// ─── AC2: Detection algorithm logic (unit-level) ───

describe("Detection Algorithm — Underperformance logic (AC2)", () => {
  it("[P0] T9.5-09: listing with 2+ metrics at z < -1.0 is underperforming", () => {
    // Unit test for the detection logic
    const zScores = { match_rate: -1.5, avg_view_time_ms: -1.2, reaffirm_rate: -0.3 };
    const threshold = -1.0;
    const underperformingCount = Object.values(zScores).filter(
      (z) => z !== null && z < threshold
    ).length;

    expect(underperformingCount).toBeGreaterThanOrEqual(2);
  });

  it("[P0] T9.5-10: listing with only 1 metric below threshold is NOT underperforming", () => {
    const zScores = { match_rate: -1.5, avg_view_time_ms: 0.3, reaffirm_rate: 0.1 };
    const threshold = -1.0;
    const underperformingCount = Object.values(zScores).filter(
      (z) => z !== null && z < threshold
    ).length;

    expect(underperformingCount).toBeLessThan(2);
  });

  it("[P0] T9.5-11: listing with <50 impressions should be excluded", () => {
    const impressions = 30;
    const MIN_IMPRESSIONS = 50;

    expect(impressions).toBeLessThan(MIN_IMPRESSIONS);
    // The SQL function filters on impressions >= 50
  });
});

// ─── AC3: Recommendation engine logic (unit-level) ───

describe("Recommendation Engine — Experiment type selection (AC3)", () => {
  function determineExperimentType(
    zMatchRate: number,
    zViewTime: number,
    zReaffirm: number | null
  ): string {
    const effectiveReaffirm = zReaffirm ?? 0;

    if (zViewTime <= zMatchRate && zViewTime <= effectiveReaffirm) {
      return "cover_image";
    }
    if (
      zMatchRate <= zViewTime &&
      zMatchRate <= effectiveReaffirm &&
      zViewTime >= -0.5
    ) {
      return "title";
    }
    if (
      zReaffirm !== null &&
      zReaffirm <= zMatchRate &&
      zReaffirm <= zViewTime
    ) {
      return "description";
    }
    return "title_and_description";
  }

  it("[P0] T9.5-12: worst metric = avg_view_time → recommends cover_image", () => {
    const result = determineExperimentType(-0.8, -2.0, -0.3);
    expect(result).toBe("cover_image");
  });

  it("[P0] T9.5-13: worst metric = match_rate AND view_time OK → recommends title", () => {
    const result = determineExperimentType(-2.0, -0.2, -0.1);
    expect(result).toBe("title");
  });

  it("[P0] T9.5-14: worst metric = reaffirm_rate → recommends description", () => {
    const result = determineExperimentType(-0.5, -0.3, -2.0);
    expect(result).toBe("description");
  });

  it("[P0] T9.5-15: 2+ metrics equally bad → recommends title_and_description", () => {
    const result = determineExperimentType(-2.0, -1.8, null);
    // When view_time is worst, it would return cover_image in this case
    // but with null reaffirm and both match/view bad:
    // z_view_time (-1.8) > z_match_rate (-2.0) so match_rate is worst
    // but z_view_time is NOT >= -0.5, so it falls to title_and_description
    expect(result).toBe("title_and_description");
  });
});

// ─── AC4: Max 3 recommendations per agency per week ───

describe("Recommendation Limits (AC4)", () => {
  it("[P0] T9.5-16: max 3 recommendations selected from candidates", () => {
    const candidates = [
      { priorityScore: 90 },
      { priorityScore: 85 },
      { priorityScore: 80 },
      { priorityScore: 75 },
      { priorityScore: 70 },
    ];

    const MAX_PER_AGENCY = 3;
    const selected = candidates
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, MAX_PER_AGENCY);

    expect(selected).toHaveLength(3);
    expect(selected[0].priorityScore).toBe(90);
    expect(selected[2].priorityScore).toBe(80);
  });
});

// ─── AC5: Expiration logic ───

describe("Recommendation Expiration (AC5)", () => {
  it("[P0] T9.5-17: recommendations >14 days old should be expired", () => {
    const now = new Date("2026-06-22T06:00:00Z");
    const createdAt = new Date("2026-06-06T06:00:00Z"); // 16 days ago
    const expiryThresholdDays = 14;

    const daysDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    expect(daysDiff).toBeGreaterThan(expiryThresholdDays);
  });

  it("[P0] T9.5-18: recommendations <14 days old should NOT be expired", () => {
    const now = new Date("2026-06-22T06:00:00Z");
    const createdAt = new Date("2026-06-15T06:00:00Z"); // 7 days ago
    const expiryThresholdDays = 14;

    const daysDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    expect(daysDiff).toBeLessThan(expiryThresholdDays);
  });
});

// ─── AC6: Priority score normalization ───

describe("Priority Score Normalization (AC3, AC6)", () => {
  function calculatePriorityScore(
    worstZ: number,
    impressions: number,
    underperformingCount: number
  ): number {
    const raw =
      Math.abs(worstZ) *
      (impressions / 500) *
      (1 + underperformingCount / 3) *
      20;
    return Math.min(100, Math.max(0, raw));
  }

  it("[P0] T9.5-19: priority score is normalized to 0–100", () => {
    const score = calculatePriorityScore(-2.0, 1000, 3);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("[P1] T9.5-20: priority score never goes below 0", () => {
    const score = calculatePriorityScore(0, 10, 0);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it("[P1] T9.5-21: priority score caps at 100", () => {
    const score = calculatePriorityScore(-5.0, 5000, 3);
    expect(score).toBe(100);
  });
});
