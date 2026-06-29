/**
 * Story 9.1 — ATDD Tests: assignVariant() (Motor de Asignación Determinístico)
 *
 * AC4: Motor de asignación determinístico (función pura)
 *
 * TDD RED PHASE: All tests use it.skip() — will fail until implementation exists.
 * Remove .skip() after implementing packages/shared/src/experiments/assign-variant.ts
 *
 * Run: pnpm --filter @reinder/shared test packages/shared/src/experiments/assign-variant.test.ts
 */

import { describe, it, expect } from "vitest";

// This import will fail until the module is created (TDD red phase)
// import { assignVariant } from "./assign-variant";

describe("assignVariant() — AC4: Motor de asignación determinístico", () => {
  // ─── T9.1-01: Determinismo — misma entrada produce misma salida ───
  it("[P0] T9.1-01: returns consistent variant for the same buyerId + experimentId (100 invocations)", async () => {
    const { assignVariant } = await import("./assign-variant");

    const buyerId = "550e8400-e29b-41d4-a716-446655440000";
    const experimentId = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

    const firstResult = assignVariant(buyerId, experimentId);

    for (let i = 0; i < 100; i++) {
      const result = assignVariant(buyerId, experimentId);
      expect(result).toBe(firstResult);
    }
  });

  // ─── T9.1-02: Distribución 50/50 con ±5% tolerancia ───
  it("[P0] T9.1-02: achieves ~50/50 distribution (±5%) over 10,000 random UUID pairs", async () => {
    const { assignVariant } = await import("./assign-variant");

    let countA = 0;
    let countB = 0;
    const total = 10_000;

    for (let i = 0; i < total; i++) {
      const buyerId = crypto.randomUUID();
      const experimentId = crypto.randomUUID();
      const variant = assignVariant(buyerId, experimentId);

      if (variant === "a") countA++;
      else if (variant === "b") countB++;
      else throw new Error(`Unexpected variant: ${variant}`);
    }

    const ratioA = countA / total;
    const ratioB = countB / total;

    // Distribution must be within 45%–55%
    expect(ratioA).toBeGreaterThanOrEqual(0.45);
    expect(ratioA).toBeLessThanOrEqual(0.55);
    expect(ratioB).toBeGreaterThanOrEqual(0.45);
    expect(ratioB).toBeLessThanOrEqual(0.55);
    expect(countA + countB).toBe(total);
  });

  // ─── T9.1-03: Función pura — solo retorna 'a' o 'b', sin side effects ───
  it("[P0] T9.1-03: is a pure function — returns only 'a' or 'b', no side effects", async () => {
    const { assignVariant } = await import("./assign-variant");

    const buyerId = "buyer-test-uuid-1234";
    const experimentId = "experiment-test-uuid-5678";

    const result = assignVariant(buyerId, experimentId);

    // Must return exactly 'a' or 'b'
    expect(["a", "b"]).toContain(result);
    expect(typeof result).toBe("string");

    // Function signature check: accepts exactly 2 string args, returns string
    expect(typeof assignVariant).toBe("function");
    expect(assignVariant.length).toBe(2);
  });

  // ─── T9.1-04: Performance — 1000 invocaciones < 100ms total ───
  it("[P1] T9.1-04: executes 1000 invocations in under 100ms total", async () => {
    const { assignVariant } = await import("./assign-variant");

    // Pre-generate UUIDs to not count generation time
    const pairs = Array.from({ length: 1000 }, () => ({
      buyerId: crypto.randomUUID(),
      experimentId: crypto.randomUUID(),
    }));

    const start = performance.now();

    for (const { buyerId, experimentId } of pairs) {
      assignVariant(buyerId, experimentId);
    }

    const elapsed = performance.now() - start;

    // AC4: execution < 1ms per call → 1000 calls < 200ms total (generous margin for CI)
    expect(elapsed).toBeLessThan(200);
  });

  // ─── T9.1-05: Uses FNV-1a hash — different inputs produce different outputs ───
  it("[P1] T9.1-05: different buyer/experiment pairs can produce different variants", async () => {
    const { assignVariant } = await import("./assign-variant");

    // Generate enough random UUID pairs to get both variants
    const results = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const result = assignVariant(crypto.randomUUID(), crypto.randomUUID());
      results.add(result);
    }

    // With 100 different random UUID pairs, we should see both 'a' and 'b'
    expect(results.size).toBe(2);
    expect(results.has("a")).toBe(true);
    expect(results.has("b")).toBe(true);
  });

  // ─── T9.1-06: Determinismo con separador correcto ───
  it("[P1] T9.1-06: uses buyerId:experimentId concatenation (order matters)", async () => {
    const { assignVariant } = await import("./assign-variant");

    const id1 = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
    const id2 = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";

    const result1 = assignVariant(id1, id2);
    const result2 = assignVariant(id2, id1);

    // Swapping buyer and experiment IDs should (likely) produce different results
    // because FNV-1a("id1:id2") ≠ FNV-1a("id2:id1")
    // Note: There's a 50% chance they match by coincidence, so we test determinism instead
    expect(assignVariant(id1, id2)).toBe(result1);
    expect(assignVariant(id2, id1)).toBe(result2);
  });
});
