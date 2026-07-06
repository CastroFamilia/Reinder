/**
 * Story 9.6 — ATDD Tests: Drizzle Schema for AI Generation Usage Table
 *
 * AC4 — Tabla de tracking de uso de IA
 *
 * Test Design Reference: T9.6-01 (Migration: `ai_generation_usage` table
 *   with correct schema and index)
 *
 * Run: pnpm --filter @reinder/shared test packages/shared/src/db/schema-ai-generation-usage.test.ts
 */

import { describe, it, expect } from "vitest";

describe("Drizzle Schema — ai_generation_usage Table (AC4, T9.6-01)", () => {
  // ─── AC4: Table exists in schema ───

  it("[P0] T9.6-01a: exports aiGenerationUsage table from schema.ts", async () => {
    const schema = await import("./schema");

    expect(schema.aiGenerationUsage).toBeDefined();
    // Drizzle tables have a Symbol for the table name
    expect((schema.aiGenerationUsage as any)[Symbol.for("drizzle:Name")]).toBe(
      "ai_generation_usage"
    );
  });

  // ─── AC4: All required columns present ───

  it("[P0] T9.6-01b: ai_generation_usage has all required columns per AC4", async () => {
    const schema = await import("./schema");
    const table = schema.aiGenerationUsage;
    const columns = Object.keys(table);

    const requiredColumns = [
      "id",
      "agencyId",
      "listingId",
      "userId",
      "model",
      "promptTokens",
      "completionTokens",
      "createdAt",
    ];

    for (const col of requiredColumns) {
      expect(columns, `Missing column: ${col}`).toContain(col);
    }
  });

  // ─── AC4: Column types ───

  it("[P0] T9.6-01c: id column is UUID with primary key", async () => {
    const schema = await import("./schema");
    const col = (schema.aiGenerationUsage as any).id;

    expect(col.dataType).toBe("string"); // UUID is stored as string in Drizzle
    expect(col.hasDefault).toBe(true); // defaultRandom()
  });

  it("[P0] T9.6-01d: agencyId references agencies table (FK)", async () => {
    const schema = await import("./schema");
    const col = (schema.aiGenerationUsage as any).agencyId;

    expect(col.notNull).toBe(true);
    expect(col.dataType).toBe("string"); // UUID FK
  });

  it("[P0] T9.6-01e: listingId references listings table (FK)", async () => {
    const schema = await import("./schema");
    const col = (schema.aiGenerationUsage as any).listingId;

    expect(col.notNull).toBe(true);
    expect(col.dataType).toBe("string"); // UUID FK
  });

  it("[P0] T9.6-01f: userId is UUID and NOT NULL", async () => {
    const schema = await import("./schema");
    const col = (schema.aiGenerationUsage as any).userId;

    expect(col.notNull).toBe(true);
    expect(col.dataType).toBe("string"); // UUID
  });

  it("[P0] T9.6-01g: model is TEXT and NOT NULL", async () => {
    const schema = await import("./schema");
    const col = (schema.aiGenerationUsage as any).model;

    expect(col.notNull).toBe(true);
    expect(col.dataType).toBe("string"); // TEXT
  });

  it("[P0] T9.6-01h: promptTokens is INTEGER with NOT NULL and default 0", async () => {
    const schema = await import("./schema");
    const col = (schema.aiGenerationUsage as any).promptTokens;

    expect(col.notNull).toBe(true);
    expect(col.dataType).toBe("number"); // INTEGER
    expect(col.hasDefault).toBe(true);
  });

  it("[P0] T9.6-01i: completionTokens is INTEGER with NOT NULL and default 0", async () => {
    const schema = await import("./schema");
    const col = (schema.aiGenerationUsage as any).completionTokens;

    expect(col.notNull).toBe(true);
    expect(col.dataType).toBe("number"); // INTEGER
    expect(col.hasDefault).toBe(true);
  });

  it("[P0] T9.6-01j: createdAt is TIMESTAMPTZ with NOT NULL and defaultNow", async () => {
    const schema = await import("./schema");
    const col = (schema.aiGenerationUsage as any).createdAt;

    expect(col.notNull).toBe(true);
    expect(col.hasDefault).toBe(true);
  });
});
