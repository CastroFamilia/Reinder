/**
 * Story 10.3 — ATDD: SQL Migration — Trigger includes `images` field
 *
 * AC7: Invalidación al cambiar fotos del listing
 *
 * The existing trigger `invalidate_listing_fit_scores()` in
 * 20260722000002_listing_fit_scores.sql monitors: price, size_sqm, bedrooms,
 * city, latitude, longitude — but NOT `images`.
 *
 * Story 10.3 must create a new migration that adds `images` to the monitored fields.
 *
 * These tests verify the migration file exists and contains the correct SQL.
 *
 * Run: npx vitest run src/personalization/trigger-images-invalidation.atdd.test.ts
 */

import { describe, expect, test } from "vitest";
import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";

// ─── AC7: Migration file for images trigger ─────────────────────────────────

describe("Story 10.3 — AC7: SQL trigger migration includes images field", () => {
  const migrationsDir = join(
    __dirname,
    "../../../..", // navigate from packages/shared/src/personalization/ to project root
    "supabase/migrations",
  );

  test(
    "[P0] T10.3-27: migration file for images trigger exists",
    () => {
      // Given: Story 10.3 requires a new migration to add `images` to the trigger
      // When: we check supabase/migrations/
      // Then: a migration file containing "listing_fit_scores_images_trigger" exists
      expect(existsSync(migrationsDir)).toBe(true);

      const files = readdirSync(migrationsDir);
      const triggerMigration = files.find(
        (f) => f.includes("listing_fit_scores_images_trigger") || f.includes("images_trigger")
      );

      expect(triggerMigration).toBeDefined();
    }
  );

  test(
    "[P0] T10.3-28: migration adds OLD.images IS DISTINCT FROM NEW.images to trigger",
    () => {
      // Given: the trigger migration file exists
      // When: we read its contents
      // Then: it contains the SQL to add images to the monitored fields
      const files = readdirSync(migrationsDir);
      const triggerMigration = files.find(
        (f) => f.includes("listing_fit_scores_images_trigger") || f.includes("images_trigger")
      );

      expect(triggerMigration).toBeDefined();

      const content = readFileSync(join(migrationsDir, triggerMigration!), "utf-8");

      // Must use CREATE OR REPLACE FUNCTION
      expect(content).toContain("CREATE OR REPLACE FUNCTION");
      // Must reference the invalidation function
      expect(content).toContain("invalidate_listing_fit_scores");
      // Must add images check
      expect(content.toLowerCase()).toContain("images");
      expect(content).toContain("IS DISTINCT FROM");
    }
  );

  test(
    "[P1] T10.3-29: migration deletes listing_fit_scores when images change",
    () => {
      // The trigger should DELETE from listing_fit_scores WHERE listing_id = OLD.id
      // when images change, so the batch job recalculates recommended_photo_index
      const files = readdirSync(migrationsDir);
      const triggerMigration = files.find(
        (f) => f.includes("listing_fit_scores_images_trigger") || f.includes("images_trigger")
      );

      expect(triggerMigration).toBeDefined();

      const content = readFileSync(join(migrationsDir, triggerMigration!), "utf-8");

      // Must DELETE from listing_fit_scores
      expect(content.toUpperCase()).toContain("DELETE");
      expect(content).toContain("listing_fit_scores");
    }
  );
});
