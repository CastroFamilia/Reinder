/**
 * Story 9.1 — ATDD Tests: Drizzle Schema for Experiments
 *
 * AC1: listing_experiments table
 * AC2: experiment_assignments table
 * AC3: experiment_results table
 * AC8: Drizzle schema compiles without TypeScript errors
 *
 * TDD RED PHASE: All tests use it.skip() — will fail until schema is implemented.
 * Remove .skip() after adding experiment tables to packages/shared/src/db/schema.ts
 *
 * Run: pnpm --filter @reinder/shared test packages/shared/src/db/schema-experiments.test.ts
 */

import { describe, it, expect } from "vitest";

describe("Drizzle Schema — Experiment Tables (AC1, AC2, AC3, AC8)", () => {
  // ─── AC1: listing_experiments table ───

  it.skip("[P0] T9.1-23: exports listingExperiments table from schema.ts", async () => {
    const schema = await import("./schema");

    expect(schema.listingExperiments).toBeDefined();
    // Drizzle tables have a Symbol for the table name
    expect((schema.listingExperiments as any)[Symbol.for("drizzle:Name")]).toBe("listing_experiments");
  });

  it.skip("[P0] T9.1-24: listing_experiments has all required columns per AC1", async () => {
    const schema = await import("./schema");
    const table = schema.listingExperiments;
    const columns = Object.keys(table);

    // All required columns
    const requiredColumns = [
      "id",
      "listingId",
      "agencyId",
      "name",
      "status",
      "experimentType",
      "variantA",
      "variantB",
      "minSampleSize",
      "targetPValue",
      "winnerVariant",
      "startedAt",
      "completedAt",
      "createdAt",
      "updatedAt",
    ];

    for (const col of requiredColumns) {
      expect(columns).toContain(col);
    }
  });

  // ─── AC1: Enums ───

  it.skip("[P0] T9.1-25: exports experimentStatusEnum with correct values", async () => {
    const schema = await import("./schema");

    expect(schema.experimentStatusEnum).toBeDefined();
    expect(schema.experimentStatusEnum.enumValues).toEqual([
      "draft",
      "running",
      "paused",
      "completed",
      "cancelled",
    ]);
  });

  it.skip("[P0] T9.1-26: exports experimentTypeEnum with correct values", async () => {
    const schema = await import("./schema");

    expect(schema.experimentTypeEnum).toBeDefined();
    expect(schema.experimentTypeEnum.enumValues).toEqual([
      "cover_image",
      "title",
      "description",
      "title_and_description",
    ]);
  });

  // ─── AC2: experiment_assignments table ───

  it.skip("[P0] T9.1-27: exports experimentAssignments table from schema.ts", async () => {
    const schema = await import("./schema");

    expect(schema.experimentAssignments).toBeDefined();
    expect((schema.experimentAssignments as any)[Symbol.for("drizzle:Name")]).toBe("experiment_assignments");
  });

  it.skip("[P0] T9.1-28: experiment_assignments has all required columns per AC2", async () => {
    const schema = await import("./schema");
    const columns = Object.keys(schema.experimentAssignments);

    const requiredColumns = [
      "id",
      "experimentId",
      "buyerId",
      "variant",
      "assignedAt",
    ];

    for (const col of requiredColumns) {
      expect(columns).toContain(col);
    }
  });

  // ─── AC3: experiment_results table ───

  it.skip("[P0] T9.1-29: exports experimentResults table from schema.ts", async () => {
    const schema = await import("./schema");

    expect(schema.experimentResults).toBeDefined();
    expect((schema.experimentResults as any)[Symbol.for("drizzle:Name")]).toBe("experiment_results");
  });

  it.skip("[P0] T9.1-30: experiment_results has all required columns per AC3", async () => {
    const schema = await import("./schema");
    const columns = Object.keys(schema.experimentResults);

    const requiredColumns = [
      "id",
      "experimentId",
      "variant",
      "impressions",
      "totalViewTimeMs",
      "matchCount",
      "reaffirmCount",
      "updatedAt",
    ];

    for (const col of requiredColumns) {
      expect(columns).toContain(col);
    }
  });

  // ─── AC3: totalViewTimeMs uses bigint ───

  it.skip("[P1] T9.1-31: experiment_results.totalViewTimeMs uses bigint (not integer)", async () => {
    const schema = await import("./schema");
    const col = (schema.experimentResults as any).totalViewTimeMs;

    // Drizzle bigint columns have dataType 'bigint'
    expect(col.dataType).toBe("bigint");
  });
});

describe("Drizzle Schema — Experiment Types (AC8, AC11)", () => {
  // ─── AC11: Types compartidos ───

  it.skip("[P1] T9.1-32: exports experiment types from @reinder/shared types", async () => {
    // This will fail until packages/shared/src/types/experiment.ts is created
    const types = await import("../types/experiment");

    expect(types).toHaveProperty("ExperimentStatus");
    expect(types).toHaveProperty("ExperimentType");
  });
});
