/**
 * Story 9.5 — ATDD Tests: Recommendation Expiration
 *
 * AC5: Expiración automática de recomendaciones antiguas
 *   - Pending recommendations with created_at > 14 days → auto-expired
 *   - This frees space for new recommendations in the next job run
 *
 * Test Design ID: T9.5-13
 *
 * TDD RED PHASE: Tests will fail until the expiration logic is implemented.
 * The expiration logic is part of the SQL function `generate_experiment_recommendations()`,
 * but these tests verify the TypeScript service that can be used for validation.
 *
 * Run: pnpm --filter @reinder/shared test packages/shared/src/experiments/recommendation-expiration.test.ts
 */

import { describe, it, expect } from "vitest";

// ─── Types for test data ────────────────────────────────────────────────────

interface Recommendation {
  id: string;
  status: "pending" | "accepted" | "dismissed" | "expired";
  createdAt: Date;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("Recommendation Expiration — AC5: Auto-expire after 14 days", () => {
  // ─── T9.5-13a: Pending recommendation > 14 days → should be expired ───

  it("[P1] T9.5-13a: identifies pending recommendations older than 14 days as expired", async () => {
    const { shouldExpire } = await import("./recommendation-expiration");

    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    const recommendation: Recommendation = {
      id: "rec-old-001",
      status: "pending",
      createdAt: fifteenDaysAgo,
    };

    expect(shouldExpire(recommendation)).toBe(true);
  });

  // ─── T9.5-13b: Pending recommendation exactly 14 days old → should be expired ───

  it("[P1] T9.5-13b: expires pending recommendations at exactly 14 days", async () => {
    const { shouldExpire } = await import("./recommendation-expiration");

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    fourteenDaysAgo.setHours(fourteenDaysAgo.getHours() - 1); // Slightly past 14 days

    const recommendation: Recommendation = {
      id: "rec-exact-14d",
      status: "pending",
      createdAt: fourteenDaysAgo,
    };

    expect(shouldExpire(recommendation)).toBe(true);
  });

  // ─── T9.5-13c: Pending recommendation < 14 days → should NOT be expired ───

  it("[P1] T9.5-13c: does NOT expire pending recommendations younger than 14 days", async () => {
    const { shouldExpire } = await import("./recommendation-expiration");

    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    const recommendation: Recommendation = {
      id: "rec-recent-001",
      status: "pending",
      createdAt: tenDaysAgo,
    };

    expect(shouldExpire(recommendation)).toBe(false);
  });

  // ─── T9.5-13d: Non-pending recommendation > 14 days → should NOT be expired ───

  it("[P1] T9.5-13d: does NOT expire already-dismissed recommendations even if > 14 days", async () => {
    const { shouldExpire } = await import("./recommendation-expiration");

    const twentyDaysAgo = new Date();
    twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);

    const recommendation: Recommendation = {
      id: "rec-dismissed-001",
      status: "dismissed",
      createdAt: twentyDaysAgo,
    };

    // Already in terminal state — should not be re-expired
    expect(shouldExpire(recommendation)).toBe(false);
  });

  // ─── T9.5-13e: Already expired recommendation → should NOT be re-expired ───

  it("[P1] T9.5-13e: does NOT re-expire already-expired recommendations", async () => {
    const { shouldExpire } = await import("./recommendation-expiration");

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recommendation: Recommendation = {
      id: "rec-already-expired",
      status: "expired",
      createdAt: thirtyDaysAgo,
    };

    expect(shouldExpire(recommendation)).toBe(false);
  });

  // ─── T9.5-13f: filterExpired returns only the expirable recommendations ───

  it("[P1] T9.5-13f: filterExpired returns only pending recommendations older than 14 days", async () => {
    const { filterExpired } = await import("./recommendation-expiration");

    const now = new Date();
    const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);

    const recommendations: Recommendation[] = [
      { id: "rec-1", status: "pending", createdAt: fifteenDaysAgo }, // Should expire
      { id: "rec-2", status: "pending", createdAt: fiveDaysAgo }, // Too recent
      { id: "rec-3", status: "dismissed", createdAt: twentyDaysAgo }, // Not pending
      { id: "rec-4", status: "pending", createdAt: twentyDaysAgo }, // Should expire
      { id: "rec-5", status: "accepted", createdAt: fifteenDaysAgo }, // Not pending
    ];

    const expired = filterExpired(recommendations);

    expect(expired).toHaveLength(2);
    expect(expired.map((r) => r.id)).toEqual(
      expect.arrayContaining(["rec-1", "rec-4"])
    );
  });
});
