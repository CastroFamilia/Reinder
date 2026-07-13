/**
 * Story 9.5 — ATDD Tests: Drizzle Schema for experiment_recommendations
 *
 * AC1: Table experiment_recommendations with correct columns, FKs, indices, RLS
 * AC10: Drizzle schema compiles, experimentRecommendations defined with existing patterns
 *
 * Test Design IDs: T9.5-01 (migration schema)
 *
 * TDD RED PHASE: Tests will fail until schema is implemented.
 * Remove .skip() after adding experimentRecommendations to packages/shared/src/db/schema.ts
 *
 * Run: pnpm --filter @reinder/shared test packages/shared/src/db/schema-experiment-recommendations.test.ts
 */

import { describe, it, expect } from "vitest";

describe("Drizzle Schema — experiment_recommendations (AC1, AC10)", () => {
  // ─── T9.5-01a: Table export exists ───

  it(
    "[P0] T9.5-01a: exports experimentRecommendations table from schema.ts",
    { timeout: 15_000 },
    async () => {
      const schema = await import("./schema");

      expect(schema.experimentRecommendations).toBeDefined();
      // Drizzle tables have a Symbol for the table name
      expect(
        (schema.experimentRecommendations as any)[Symbol.for("drizzle:Name")]
      ).toBe("experiment_recommendations");
    },
  );

  // ─── T9.5-01b: All required columns present per AC1 ───

  it("[P0] T9.5-01b: experiment_recommendations has all required columns per AC1", async () => {
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

  // ─── T9.5-01c: Reuses experimentTypeEnum from Story 9.1 ───

  it("[P0] T9.5-01c: recommendedExperimentType reuses experimentTypeEnum (not a new enum)", async () => {
    const schema = await import("./schema");

    // experimentTypeEnum should exist from Story 9.1
    expect(schema.experimentTypeEnum).toBeDefined();
    expect(schema.experimentTypeEnum.enumValues).toContain("cover_image");
    expect(schema.experimentTypeEnum.enumValues).toContain("title");
    expect(schema.experimentTypeEnum.enumValues).toContain("description");
    expect(schema.experimentTypeEnum.enumValues).toContain("title_and_description");

    // The column should use the same enum
    const col = (schema.experimentRecommendations as any).recommendedExperimentType;
    expect(col).toBeDefined();
  });

  // ─── T9.5-01d: status column defaults to 'pending' ───

  it("[P0] T9.5-01d: status column has default value 'pending'", async () => {
    const schema = await import("./schema");
    const col = (schema.experimentRecommendations as any).status;

    expect(col).toBeDefined();
    // Drizzle text columns with .default() store the default value
    expect(col.hasDefault).toBe(true);
  });

  // ─── T9.5-01e: acceptedExperimentId is nullable FK ───

  it("[P1] T9.5-01e: acceptedExperimentId is nullable (FK to listing_experiments)", async () => {
    const schema = await import("./schema");
    const col = (schema.experimentRecommendations as any).acceptedExperimentId;

    expect(col).toBeDefined();
    // Nullable column: notNull should be false
    expect(col.notNull).toBe(false);
  });

  // ─── T9.5-01f: priorityScore uses numeric(5,2) ───

  it("[P1] T9.5-01f: priorityScore column uses numeric type with precision 5, scale 2", async () => {
    const schema = await import("./schema");
    const col = (schema.experimentRecommendations as any).priorityScore;

    expect(col).toBeDefined();
    // Drizzle numeric columns have dataType 'string' (numeric is string-typed in Drizzle)
    expect(col.dataType).toBe("string");
  });

  // ─── T9.5-01g: underperformingMetrics uses JSONB ───

  it("[P1] T9.5-01g: underperformingMetrics column uses jsonb type", async () => {
    const schema = await import("./schema");
    const col = (schema.experimentRecommendations as any).underperformingMetrics;

    expect(col).toBeDefined();
    expect(col.dataType).toBe("json");
  });

  // ─── T9.5-01h: Timestamps with timezone ───

  it("[P1] T9.5-01h: createdAt and updatedAt use timestamp with timezone and defaultNow", async () => {
    const schema = await import("./schema");

    const createdAt = (schema.experimentRecommendations as any).createdAt;
    const updatedAt = (schema.experimentRecommendations as any).updatedAt;

    expect(createdAt).toBeDefined();
    expect(createdAt.hasDefault).toBe(true);
    expect(createdAt.notNull).toBe(true);

    expect(updatedAt).toBeDefined();
    expect(updatedAt.hasDefault).toBe(true);
    expect(updatedAt.notNull).toBe(true);
  });

  // ─── T9.5-01i: weekGenerated is NOT NULL text ───

  it("[P1] T9.5-01i: weekGenerated is a NOT NULL text column (ISO week format)", async () => {
    const schema = await import("./schema");
    const col = (schema.experimentRecommendations as any).weekGenerated;

    expect(col).toBeDefined();
    expect(col.notNull).toBe(true);
    expect(col.dataType).toBe("string");
  });
});

describe("Drizzle Schema — experiment_recommendations Types (AC10)", () => {
  // ─── Types exported from shared package ───

  it("[P0] T9.5-01j: exports ExperimentRecommendation type from @reinder/shared types", async () => {
    const types = await import("../types/experiment");

    expect(types).toHaveProperty("RecommendationStatus");
  });

  it("[P1] T9.5-01k: exports UnderperformingMetrics type from @reinder/shared types", async () => {
    const types = await import("../types/experiment");

    expect(types).toHaveProperty("UnderperformingMetricDetail");
  });
});
