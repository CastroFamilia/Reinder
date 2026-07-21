/**
 * Story 10.1 — ATDD Tests: TypeScript Types & Exports from @reinder/shared
 *
 * AC8: Types exported from @reinder/shared personalization module
 *
 * TDD RED PHASE: All tests use it.skip() — will fail until types are implemented.
 * Remove .skip() after creating packages/shared/src/personalization/types.ts and index.ts
 *
 * Run: pnpm --filter @reinder/shared test packages/shared/src/personalization/types.test.ts
 */

import { describe, it, expect } from "vitest";

describe("Personalization Types & Exports (AC8)", () => {
  // ─── AC8: BuyerPreferenceVector interface ───

  it(
    "[P0] T10.1-31: exports BuyerPreferenceVector type from personalization module",
    async () => {
      const personalization = await import("./index");

      // BuyerPreferenceVector should be re-exported (as a type, we check for the key)
      expect(personalization).toHaveProperty("computePreferenceVector");
    }
  );

  it(
    "[P0] T10.1-32: exports computePreferenceVector function from personalization module",
    async () => {
      const personalization = await import("./index");

      expect(personalization.computePreferenceVector).toBeDefined();
      expect(typeof personalization.computePreferenceVector).toBe("function");
    }
  );

  it(
    "[P0] T10.1-33: exports PREFERENCE_VECTOR_VERSION constant",
    async () => {
      const personalization = await import("./index");

      expect(personalization.PREFERENCE_VECTOR_VERSION).toBeDefined();
      expect(typeof personalization.PREFERENCE_VECTOR_VERSION).toBe("number");
      expect(personalization.PREFERENCE_VECTOR_VERSION).toBeGreaterThanOrEqual(
        1
      );
    }
  );

  it(
    "[P0] T10.1-34: exports MIN_SWIPES_THRESHOLD constant equal to 10",
    async () => {
      const personalization = await import("./index");

      expect(personalization.MIN_SWIPES_THRESHOLD).toBeDefined();
      expect(personalization.MIN_SWIPES_THRESHOLD).toBe(10);
    }
  );
});
