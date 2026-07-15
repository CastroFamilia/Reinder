/**
 * Story 10.1 — ATDD Tests: Drizzle Schema for buyer_preference_vectors
 *
 * AC1: buyer_preference_vectors table with all required columns and indices
 * AC8: Types exported from @reinder/shared
 *
 * TDD RED PHASE: All tests use it.skip() — will fail until schema is implemented.
 * Remove .skip() after adding buyer_preference_vectors table to packages/shared/src/db/schema.ts
 *
 * Run: pnpm --filter @reinder/shared test packages/shared/src/db/schema-buyer-preference-vectors.test.ts
 */

import { describe, it, expect } from "vitest";

describe("Drizzle Schema — buyer_preference_vectors Table (AC1)", () => {
  // ─── AC1: Table exists and exports correctly ───

  it.skip(
    "[P0] T10.1-01: exports buyerPreferenceVectors table from schema.ts",
    async () => {
      const schema = await import("./schema");

      expect(schema.buyerPreferenceVectors).toBeDefined();
      // Drizzle tables have a Symbol for the table name
      expect(
        (schema.buyerPreferenceVectors as any)[Symbol.for("drizzle:Name")]
      ).toBe("buyer_preference_vectors");
    },
    { timeout: 15_000 }
  );

  // ─── AC1: All required columns present ───

  it.skip(
    "[P0] T10.1-02: buyer_preference_vectors has all required columns per AC1",
    async () => {
      const schema = await import("./schema");
      const table = schema.buyerPreferenceVectors;
      const columns = Object.keys(table);

      const requiredColumns = [
        "id",
        "buyerId",
        "vector",
        "swipeCount",
        "engagementEventCount",
        "version",
        "lastComputedAt",
        "createdAt",
        "updatedAt",
      ];

      for (const col of requiredColumns) {
        expect(columns).toContain(col);
      }
    }
  );

  // ─── AC1: Column types ───

  it.skip(
    "[P0] T10.1-03: id is UUID with defaultRandom",
    async () => {
      const schema = await import("./schema");
      const col = (schema.buyerPreferenceVectors as any).id;

      expect(col.dataType).toBe("uuid");
      expect(col.hasDefault).toBe(true);
    }
  );

  it.skip(
    "[P0] T10.1-04: buyerId is UUID NOT NULL",
    async () => {
      const schema = await import("./schema");
      const col = (schema.buyerPreferenceVectors as any).buyerId;

      expect(col.dataType).toBe("uuid");
      expect(col.notNull).toBe(true);
    }
  );

  it.skip(
    "[P0] T10.1-05: vector is JSONB NOT NULL",
    async () => {
      const schema = await import("./schema");
      const col = (schema.buyerPreferenceVectors as any).vector;

      expect(col.dataType).toBe("json");
      expect(col.notNull).toBe(true);
    }
  );

  it.skip(
    "[P1] T10.1-06: swipeCount is INTEGER NOT NULL with default 0",
    async () => {
      const schema = await import("./schema");
      const col = (schema.buyerPreferenceVectors as any).swipeCount;

      expect(col.dataType).toBe("number");
      expect(col.notNull).toBe(true);
      expect(col.hasDefault).toBe(true);
    }
  );

  it.skip(
    "[P1] T10.1-07: engagementEventCount is INTEGER NOT NULL with default 0",
    async () => {
      const schema = await import("./schema");
      const col = (schema.buyerPreferenceVectors as any).engagementEventCount;

      expect(col.dataType).toBe("number");
      expect(col.notNull).toBe(true);
      expect(col.hasDefault).toBe(true);
    }
  );

  it.skip(
    "[P1] T10.1-08: version is INTEGER NOT NULL with default 1",
    async () => {
      const schema = await import("./schema");
      const col = (schema.buyerPreferenceVectors as any).version;

      expect(col.dataType).toBe("number");
      expect(col.notNull).toBe(true);
      expect(col.hasDefault).toBe(true);
    }
  );

  it.skip(
    "[P1] T10.1-09: lastComputedAt is TIMESTAMPTZ NOT NULL",
    async () => {
      const schema = await import("./schema");
      const col = (schema.buyerPreferenceVectors as any).lastComputedAt;

      expect(col.dataType).toBe("date");
      expect(col.notNull).toBe(true);
    }
  );

  it.skip(
    "[P2] T10.1-10: createdAt is TIMESTAMPTZ NOT NULL with defaultNow",
    async () => {
      const schema = await import("./schema");
      const col = (schema.buyerPreferenceVectors as any).createdAt;

      expect(col.dataType).toBe("date");
      expect(col.notNull).toBe(true);
      expect(col.hasDefault).toBe(true);
    }
  );

  it.skip(
    "[P2] T10.1-11: updatedAt is TIMESTAMPTZ NOT NULL with defaultNow",
    async () => {
      const schema = await import("./schema");
      const col = (schema.buyerPreferenceVectors as any).updatedAt;

      expect(col.dataType).toBe("date");
      expect(col.notNull).toBe(true);
      expect(col.hasDefault).toBe(true);
    }
  );
});
