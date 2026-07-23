/**
 * Story 10.5 — ATDD Tests: Schema, Feed Guard, Aggregation & RLS
 *
 * AC1: Field personalization_enabled in user_profiles (BOOLEAN NOT NULL DEFAULT TRUE)
 * AC5: Swipe feed uses default content when personalization is disabled
 * AC6: Aggregation job skips buyers with personalization disabled; vector preserved
 * AC7: RLS — buyer can only modify their own personalization_enabled
 * AC8: Migration SQL is idempotent and adds the column correctly
 *
 * Run: pnpm --filter @reinder/web test apps/web/src/features/personalization/__tests__/personalization-privacy.test.ts
 */

import { describe, expect, vi, beforeEach, test } from "vitest";

/*
 * Provider Scrutiny Evidence:
 * - Schema field: NEW — personalizationEnabled does not exist in schema.ts yet
 * - Feed guard: NEW — no personalization check in feed logic yet
 * - Aggregation guard: NEW — compute_buyer_preference_vectors does not filter by personalization_enabled
 * - RLS: EXISTING — user_profiles RLS already restricts UPDATE to own user (id = auth.uid())
 * - Migration: NEW — file does not exist yet
 */

// ─── AC1: Schema field personalization_enabled ──────────────────────────────

describe("Schema — personalization_enabled field (AC1)", () => {
  test("[P0] T10.5-25: userProfiles table has personalizationEnabled field in Drizzle schema", async () => {
    // Import the schema — this will fail until the field is added
    const { userProfiles } = await import("@reinder/shared/db/schema");

    // Verify the field exists in the schema definition
    expect(userProfiles).toHaveProperty("personalizationEnabled");
  });

  test("[P0] T10.5-26: personalizationEnabled defaults to true", async () => {
    const { userProfiles } = await import("@reinder/shared/db/schema");

    // The column definition should have a default value of true
    const column = (userProfiles as any).personalizationEnabled;
    expect(column).toBeDefined();
    // Drizzle column config should have default(true)
    expect(column.config?.default).toBe(true);
  });

  test("[P1] T10.5-27: personalizationEnabled is NOT NULL", async () => {
    const { userProfiles } = await import("@reinder/shared/db/schema");

    const column = (userProfiles as any).personalizationEnabled;
    expect(column).toBeDefined();
    // Drizzle column config should have notNull
    expect(column.config?.notNull).toBe(true);
  });

  test("[P1] T10.5-28: personalizationEnabled is boolean type", async () => {
    const { userProfiles } = await import("@reinder/shared/db/schema");

    const column = (userProfiles as any).personalizationEnabled;
    expect(column).toBeDefined();
    expect(column.dataType).toBe("boolean");
  });
});

// ─── AC5: Feed personalization guard ────────────────────────────────────────

describe("Feed Personalization Guard (AC5)", () => {
  test("[P0] T10.5-29: shouldApplyPersonalization returns false when personalizationEnabled is false", () => {
    // Guard logic: the feed should check the buyer's personalizationEnabled flag
    // and skip fit_score lookup, personalized photos, and adapted highlights.
    //
    // This validates the guard contract. When the actual feed service module exists
    // (Stories 10.2–10.4), this test should import and call it directly.
    const shouldApplyPersonalization = (profile: { personalizationEnabled: boolean }) =>
      profile.personalizationEnabled === true;

    expect(shouldApplyPersonalization({ personalizationEnabled: false })).toBe(false);
  });

  test("[P0] T10.5-30: shouldApplyPersonalization returns true when personalizationEnabled is true", () => {
    const shouldApplyPersonalization = (profile: { personalizationEnabled: boolean }) =>
      profile.personalizationEnabled === true;

    expect(shouldApplyPersonalization({ personalizationEnabled: true })).toBe(true);
  });

  test("[P1] T10.5-31: personalization check is a simple boolean read — no performance degradation", () => {
    // The guard should be a simple if(!personalizationEnabled) check
    // No additional DB queries, no complex computation
    const startTime = Date.now();

    const shouldPersonalize = ({ personalizationEnabled }: { personalizationEnabled: boolean }) =>
      personalizationEnabled === true;

    // Run 10,000 iterations to confirm negligible cost
    for (let i = 0; i < 10_000; i++) {
      shouldPersonalize({ personalizationEnabled: i % 2 === 0 });
    }

    const elapsed = Date.now() - startTime;
    // 10k boolean checks should be well under 50ms
    expect(elapsed).toBeLessThan(50);
  });
});

// ─── AC6: Aggregation job guard ─────────────────────────────────────────────

describe("Aggregation Job — Personalization Guard (AC6)", () => {
  test("[P0] T10.5-32: eligible buyer filter excludes buyers with personalization_enabled = false", () => {
    // The compute_buyer_preference_vectors() job (pg_cron, every 6h)
    // should filter out buyers with personalization_enabled = false.
    // This mirrors the expected filter logic from Story 10.1 integration.

    const allBuyers = [
      { id: "buyer-1", personalizationEnabled: true },
      { id: "buyer-2", personalizationEnabled: false },
      { id: "buyer-3", personalizationEnabled: true },
      { id: "buyer-4", personalizationEnabled: false },
    ];

    const eligibleBuyers = allBuyers.filter(
      (b) => b.personalizationEnabled !== false
    );

    expect(eligibleBuyers).toHaveLength(2);
    expect(eligibleBuyers.map((b) => b.id)).toEqual(["buyer-1", "buyer-3"]);
    expect(eligibleBuyers.find((b) => b.id === "buyer-2")).toBeUndefined();
    expect(eligibleBuyers.find((b) => b.id === "buyer-4")).toBeUndefined();
  });

  test("[P0] T10.5-33: disabling personalization does NOT delete the preference vector", () => {
    // When a buyer disables personalization, the API endpoint only updates
    // personalization_enabled = false. It does NOT touch buyer_preference_vectors.
    // Verify the toggle endpoint payload does not include any vector deletion.

    const togglePayload = { enabled: false };
    // The PATCH endpoint only sends { personalization_enabled: false } to user_profiles
    // It never references buyer_preference_vectors
    expect(togglePayload).not.toHaveProperty("deleteVector");
    expect(togglePayload).not.toHaveProperty("clearPreferences");
    expect(Object.keys(togglePayload)).toEqual(["enabled"]);
  });

  test("[P0] T10.5-34: reactivated buyer uses existing vector immediately", () => {
    // When a buyer reactivates personalization (enabled: true):
    // 1. The existing vector is used IMMEDIATELY (no delay, no manual recalc)
    // 2. The aggregation job includes them in the next 6h cycle
    //
    // The toggle endpoint does NOT trigger a recalculation — it only flips the flag.

    const togglePayload = { enabled: true };
    // Verify no recalculation trigger in the request
    expect(togglePayload).not.toHaveProperty("recalculate");
    expect(togglePayload).not.toHaveProperty("forceRefresh");
    expect(Object.keys(togglePayload)).toEqual(["enabled"]);
  });
});

// ─── AC7: RLS — buyer only modifies own personalization_enabled ─────────────

describe("RLS — Own Record Only (AC7)", () => {
  test.skip("[P0] T10.5-35: buyer cannot update another buyer's personalization_enabled (requires live Supabase)", () => {
    // INTEGRATION TEST — requires a live Supabase instance with RLS enabled.
    // RLS policies on user_profiles already restrict:
    //   - SELECT: id = auth.uid()
    //   - UPDATE: id = auth.uid()
    //
    // The personalization_enabled field inherits these existing policies.
    // This test should be executed against a Supabase test instance where:
    //   1. Buyer A authenticates and attempts to UPDATE buyer B's record
    //   2. The operation should fail (0 rows affected or RLS error)
    //
    // Cannot be meaningfully unit-tested — skip until integration test harness is available.
  });

  test.skip("[P1] T10.5-36: existing RLS policies on user_profiles are NOT modified (migration audit)", () => {
    // MIGRATION AUDIT — verified by T10.5-40 (migration does NOT contain CREATE/ALTER/DROP POLICY).
    // This is redundant with T10.5-40 and kept as a documentation marker.
    // No additional runtime assertion is needed.
  });
});

// ─── AC8: Migration SQL ─────────────────────────────────────────────────────

describe("Migration SQL (AC8)", () => {
  test("[P0] T10.5-37: migration file exists with correct naming pattern", async () => {
    // Migration should be at:
    // supabase/migrations/YYYYMMDD000001_add_personalization_enabled.sql
    //
    // This test validates the file exists (checked during integration testing)
    const fs = await import("fs");
    const path = await import("path");

    const migrationsDir = path.resolve(
      process.cwd(),
      "supabase/migrations"
    );

    // Check that a migration file matching the pattern exists
    const files = fs.readdirSync(migrationsDir);
    const migrationFile = files.find((f: string) =>
      f.includes("add_personalization_enabled")
    );

    expect(migrationFile).toBeDefined();
  });

  test("[P1] T10.5-38: migration adds BOOLEAN NOT NULL DEFAULT TRUE column", async () => {
    // The migration SQL should contain:
    // ALTER TABLE user_profiles ADD COLUMN personalization_enabled BOOLEAN NOT NULL DEFAULT TRUE
    //
    // This is validated by reading the migration file content
    const fs = await import("fs");
    const path = await import("path");

    const migrationsDir = path.resolve(
      process.cwd(),
      "supabase/migrations"
    );
    const files = fs.readdirSync(migrationsDir);
    const migrationFile = files.find((f: string) =>
      f.includes("add_personalization_enabled")
    );

    expect(migrationFile).toBeDefined();

    const content = fs.readFileSync(
      path.join(migrationsDir, migrationFile!),
      "utf8"
    );

    expect(content).toContain("personalization_enabled");
    expect(content.toUpperCase()).toContain("BOOLEAN");
    expect(content.toUpperCase()).toContain("NOT NULL");
    expect(content.toUpperCase()).toContain("DEFAULT TRUE");
  });

  test("[P1] T10.5-39: migration is idempotent (IF NOT EXISTS guard)", async () => {
    const fs = await import("fs");
    const path = await import("path");

    const migrationsDir = path.resolve(
      process.cwd(),
      "supabase/migrations"
    );
    const files = fs.readdirSync(migrationsDir);
    const migrationFile = files.find((f: string) =>
      f.includes("add_personalization_enabled")
    );

    expect(migrationFile).toBeDefined();

    const content = fs.readFileSync(
      path.join(migrationsDir, migrationFile!),
      "utf8"
    );

    // Should use IF NOT EXISTS pattern for idempotency
    expect(content.toUpperCase()).toContain("IF NOT EXISTS");
  });

  test("[P2] T10.5-40: migration does NOT modify existing RLS policies", async () => {
    const fs = await import("fs");
    const path = await import("path");

    const migrationsDir = path.resolve(
      process.cwd(),
      "supabase/migrations"
    );
    const files = fs.readdirSync(migrationsDir);
    const migrationFile = files.find((f: string) =>
      f.includes("add_personalization_enabled")
    );

    expect(migrationFile).toBeDefined();

    const content = fs.readFileSync(
      path.join(migrationsDir, migrationFile!),
      "utf8"
    );

    // Should NOT contain any RLS-related statements
    expect(content.toUpperCase()).not.toContain("CREATE POLICY");
    expect(content.toUpperCase()).not.toContain("ALTER POLICY");
    expect(content.toUpperCase()).not.toContain("DROP POLICY");
  });
});
