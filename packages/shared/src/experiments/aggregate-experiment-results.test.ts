/**
 * Story 9.3 — ATDD Tests: aggregateExperimentResults()
 *
 * AC1: Aggregation job — cálculo de métricas por variante
 * AC4: Aggregation job — snapshot de time-series
 * AC11: Error isolation per experiment
 *
 * Run: pnpm --filter @reinder/shared test packages/shared/src/experiments/aggregate-experiment-results.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Drizzle DB ────────────────────────────────────────────────────────

const mockTx = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  execute: vi.fn().mockResolvedValue([]),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  onConflictDoUpdate: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([]),
};

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  execute: vi.fn().mockResolvedValue([]),
  transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
};

// ─── Test Data Factories ────────────────────────────────────────────────────

function makeExperiment(overrides: Partial<{
  id: string;
  listingId: string;
  status: string;
  startedAt: Date;
}> = {}) {
  return {
    id: overrides.id ?? "exp-001",
    listingId: overrides.listingId ?? "listing-001",
    agencyId: "agency-001",
    status: overrides.status ?? "running",
    startedAt: overrides.startedAt ?? new Date("2026-06-01T00:00:00Z"),
    minSampleSize: 100,
  };
}

function makeAssignment(overrides: Partial<{
  experimentId: string;
  buyerId: string;
  variant: "a" | "b";
}> = {}) {
  return {
    id: `assign-${Math.random().toString(36).slice(2)}`,
    experimentId: overrides.experimentId ?? "exp-001",
    buyerId: overrides.buyerId ?? `buyer-${Math.random().toString(36).slice(2)}`,
    variant: overrides.variant ?? "a",
    assignedAt: new Date().toISOString(),
  };
}

function makeEngagementEvent(overrides: Partial<{
  buyerId: string;
  listingId: string;
  eventType: string;
  viewTimeMs: number;
}> = {}) {
  return {
    id: `evt-${Math.random().toString(36).slice(2)}`,
    buyerId: overrides.buyerId ?? "buyer-001",
    listingId: overrides.listingId ?? "listing-001",
    eventType: overrides.eventType ?? "photo_view",
    viewTimeMs: overrides.viewTimeMs ?? 3000,
    createdAt: new Date().toISOString(),
  };
}

describe("aggregateExperimentResults() — AC1: Cálculo de métricas por variante", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // ─── T9.3-01: Calcula impressions, view_time, match_count por variante ───
  it("[P0] T9.3-01: correctly computes impressions, total_view_time_ms, match_count, reaffirm_count per variant", async () => {
    const { aggregateExperimentResults } = await import("./aggregate-experiment-results");

    // Setup: 2 buyers in variant a, 2 in variant b
    const assignments = [
      makeAssignment({ experimentId: "exp-001", buyerId: "buyer-a1", variant: "a" }),
      makeAssignment({ experimentId: "exp-001", buyerId: "buyer-a2", variant: "a" }),
      makeAssignment({ experimentId: "exp-001", buyerId: "buyer-b1", variant: "b" }),
      makeAssignment({ experimentId: "exp-001", buyerId: "buyer-b2", variant: "b" }),
    ];

    // Engagement: buyer-a1 has 2 photo_views, buyer-a2 has 1
    const engagementEvents = [
      makeEngagementEvent({ buyerId: "buyer-a1", listingId: "listing-001", eventType: "photo_view", viewTimeMs: 3000 }),
      makeEngagementEvent({ buyerId: "buyer-a1", listingId: "listing-001", eventType: "photo_view", viewTimeMs: 2000 }),
      makeEngagementEvent({ buyerId: "buyer-a2", listingId: "listing-001", eventType: "photo_view", viewTimeMs: 4000 }),
      makeEngagementEvent({ buyerId: "buyer-b1", listingId: "listing-001", eventType: "photo_view", viewTimeMs: 5000 }),
      makeEngagementEvent({ buyerId: "buyer-b2", listingId: "listing-001", eventType: "photo_view", viewTimeMs: 6000 }),
      // Reaffirm events
      makeEngagementEvent({ buyerId: "buyer-a1", listingId: "listing-001", eventType: "match_reaffirm", viewTimeMs: 0 }),
      makeEngagementEvent({ buyerId: "buyer-b1", listingId: "listing-001", eventType: "match_reaffirm", viewTimeMs: 0 }),
      makeEngagementEvent({ buyerId: "buyer-b2", listingId: "listing-001", eventType: "match_reaffirm", viewTimeMs: 0 }),
    ];

    const result = computeVariantMetrics(
      makeExperiment(),
      assignments,
      engagementEvents,
      [
        { buyerId: "buyer-a1", listingId: "listing-001", action: "match" },
        { buyerId: "buyer-b1", listingId: "listing-001", action: "match" },
        { buyerId: "buyer-b2", listingId: "listing-001", action: "match" },
      ]
    );

    // Variant A: 2 unique buyers with photo_view = 2 impressions
    expect(result.a.impressions).toBe(2);
    // Total view time: 3000 + 2000 + 4000 = 9000
    expect(result.a.totalViewTimeMs).toBe(9000);
    // 1 match from buyer-a1
    expect(result.a.matchCount).toBe(1);
    // 1 reaffirm from buyer-a1
    expect(result.a.reaffirmCount).toBe(1);

    // Variant B: 2 unique buyers with photo_view = 2 impressions
    expect(result.b.impressions).toBe(2);
    // Total view time: 5000 + 6000 = 11000
    expect(result.b.totalViewTimeMs).toBe(11000);
    // 2 matches from buyer-b1 + buyer-b2
    expect(result.b.matchCount).toBe(2);
    // 2 reaffirms from buyer-b1 + buyer-b2
    expect(result.b.reaffirmCount).toBe(2);
  });

  // ─── T9.3-02: Calcula sum_view_time_sq_ms correctamente ───
  it("[P0] T9.3-02: correctly calculates sum_view_time_sq_ms (sum of squares, not square of sums)", async () => {
    const { computeVariantMetrics } = await import("./aggregate-experiment-results");

    const assignments = [
      makeAssignment({ experimentId: "exp-001", buyerId: "buyer-a1", variant: "a" }),
    ];

    const engagementEvents = [
      makeEngagementEvent({ buyerId: "buyer-a1", listingId: "listing-001", eventType: "photo_view", viewTimeMs: 3000 }),
      makeEngagementEvent({ buyerId: "buyer-a1", listingId: "listing-001", eventType: "photo_view", viewTimeMs: 5000 }),
    ];

    const result = computeVariantMetrics(
      makeExperiment(),
      assignments,
      engagementEvents,
      []
    );

    // sum_view_time_sq_ms = 3000^2 + 5000^2 = 9,000,000 + 25,000,000 = 34,000,000
    expect(result.a.sumViewTimeSqMs).toBe(34_000_000);

    // NOT (3000 + 5000)^2 = 64,000,000 — that would be wrong
    expect(result.a.sumViewTimeSqMs).not.toBe(64_000_000);
  });

  // ─── T9.3-03: Solo procesa experimentos con status 'running' ───
  it("[P0] T9.3-03: only processes experiments with status 'running' (ignores draft, paused, completed, cancelled)", async () => {
    const { shouldProcessExperiment } = await import("./aggregate-experiment-results");

    expect(shouldProcessExperiment("running")).toBe(true);
    expect(shouldProcessExperiment("draft")).toBe(false);
    expect(shouldProcessExperiment("paused")).toBe(false);
    expect(shouldProcessExperiment("completed")).toBe(false);
    expect(shouldProcessExperiment("cancelled")).toBe(false);
  });

  // ─── T9.3-04: Error en un experimento no detiene procesamiento de los demás ───
  it("[P0] T9.3-04: error in one experiment does not stop processing of others", async () => {
    const { processAllExperiments } = await import("./aggregate-experiment-results");

    // Provide 3 experiments: second one throws error
    const experiments = [
      makeExperiment({ id: "exp-ok-1", status: "running" }),
      makeExperiment({ id: "exp-bad", status: "running" }),
      makeExperiment({ id: "exp-ok-2", status: "running" }),
    ];

    // Mock fetcher that throws for the "bad" experiment
    const mockFetcher = async (experimentId: string) => {
      if (experimentId === "exp-bad") {
        throw new Error("DB connection failed for this experiment");
      }
      return {
        a: { impressions: 10, totalViewTimeMs: 5000, sumViewTimeSqMs: 250000, matchCount: 1, reaffirmCount: 0 },
        b: { impressions: 12, totalViewTimeMs: 6000, sumViewTimeSqMs: 360000, matchCount: 2, reaffirmCount: 1 },
      };
    };

    const result = await processAllExperiments(experiments, mockFetcher);

    // Should process 2 successfully, 1 error
    expect(result.processed).toBe(2);
    expect(result.errors).toBe(1);
    expect(result.errorDetails).toHaveLength(1);
    expect(result.errorDetails[0].experimentId).toBe("exp-bad");
  });
});

describe("calculateBaseline() — AC5: Baseline comparison", () => {
  // ─── T9.3-05: Devuelve null si no hay datos pre-experimento ───
  it("[P0] T9.3-05: returns null when no pre-experiment data exists for the listing", async () => {
    const { calculateBaseline } = await import("./calculate-baseline");

    // Empty hourly data = no baseline
    const result = calculateBaseline([], new Date("2026-06-15T00:00:00Z"));

    expect(result).toBeNull();
  });

  it("[P1] T9.3-05b: calculates correct averages from hourly data within 7-day window", async () => {
    const { calculateBaseline } = await import("./calculate-baseline");

    const hourlyData = [
      { bucketHour: "2026-06-08T10:00:00Z", totalViews: 100, totalViewTimeMs: 500000, uniqueViewers: 50, matchCount: 5, reaffirmCount: 2 },
      { bucketHour: "2026-06-09T10:00:00Z", totalViews: 120, totalViewTimeMs: 600000, uniqueViewers: 60, matchCount: 7, reaffirmCount: 3 },
    ];

    const result = calculateBaseline(hourlyData, new Date("2026-06-15T00:00:00Z"));

    expect(result).not.toBeNull();
    // avg view time = (500000 + 600000) / (100 + 120) = 1100000 / 220 = 5000
    expect(result!.baselineAvgViewTimeMs).toBeCloseTo(5000, 0);
    // match rate = (5 + 7) / (50 + 60) = 12 / 110 ≈ 0.109
    expect(result!.baselineMatchRate).toBeCloseTo(0.109, 2);
  });
});

describe("API GET /api/v1/experiments/[id]/results — AC6", () => {
  // ─── T9.3-06: Responde 403 para buyer ───
  it("[P0] T9.3-06: responds 403 when caller is a buyer (not agency_admin)", async () => {
    // This test validates the API route handler auth guard
    // In integration, we'd call the route handler — unit test validates the auth logic
    const { validateExperimentResultsAccess } = await import("./experiment-results-access");

    const result = validateExperimentResultsAccess({
      role: "buyer",
      agencyId: null,
      experimentAgencyId: "agency-001",
    });

    expect(result.allowed).toBe(false);
    expect(result.statusCode).toBe(403);
  });

  // ─── T9.3-07: Responde 404 para experimento de otra agencia ───
  it("[P0] T9.3-07: responds 404 when experiment belongs to another agency", async () => {
    const { validateExperimentResultsAccess } = await import("./experiment-results-access");

    const result = validateExperimentResultsAccess({
      role: "agency_admin",
      agencyId: "agency-001",
      experimentAgencyId: "agency-002", // Different agency
    });

    expect(result.allowed).toBe(false);
    expect(result.statusCode).toBe(404);
  });

  // ─── T9.3-08: Calcula deltas correctamente ───
  it("[P0] T9.3-08: calculates deltas correctly between variant A and B", async () => {
    const { calculateDeltas } = await import("./aggregate-experiment-results");

    const a = { impressions: 450, totalViewTimeMs: 2340000, matchCount: 40, reaffirmCount: 20, sumViewTimeSqMs: 0 };
    const b = { impressions: 460, totalViewTimeMs: 2806000, matchCount: 52, reaffirmCount: 28, sumViewTimeSqMs: 0 };

    const deltas = calculateDeltas(a, b);

    // avgViewTimeMs: A=5200, B=6100 → diff=900, pct=17.3%
    expect(deltas.avgViewTimeMs.diff).toBeCloseTo(900, 0);
    expect(deltas.avgViewTimeMs.pctChange).toBeCloseTo(17.3, 0);
    expect(deltas.avgViewTimeMs.better).toBe("b");

    // matchRate: A=0.0889, B=0.113 → diff≈0.024, pct≈27%
    expect(deltas.matchRate.diff).toBeCloseTo(0.024, 2);
    expect(deltas.matchRate.better).toBe("b");

    // reaffirmRate: A=20/40=0.5, B=28/52≈0.538 → better='b'
    expect(deltas.reaffirmRate.better).toBe("b");
  });
});

describe("MetricComparisonCard — AC7: Renderización", () => {
  // ─── T9.3-09: Renderiza valores formateados y delta correcto ───
  it("[P0] T9.3-09: formatMetric correctly formats seconds, percentage, and rate", async () => {
    const { formatMetric, formatDelta, formatDeltaPP } = await import("./format-metrics");

    // 5200ms → "5.2s"
    expect(formatMetric(5200, "seconds")).toBe("5.2s");
    // 0.089 → "8.9%"
    expect(formatMetric(0.089, "percentage")).toBe("8.9%");
    // 0.045 → "4.5%"
    expect(formatMetric(0.045, "rate")).toBe("4.5%");

    // Delta formatting
    expect(formatDelta(17.3)).toBe("+17.3%");
    expect(formatDelta(-5.2)).toBe("-5.2%");

    // PP formatting
    expect(formatDeltaPP(0.024)).toBe("+2.4pp");
    expect(formatDeltaPP(-0.01)).toBe("-1.0pp");
  });
});

describe("ConfidenceIndicator — AC8", () => {
  // ─── T9.3-10: Muestra badge correcto según sampleSufficient ───
  it("[P0] T9.3-10: returns correct badge info based on sampleSufficient flag", async () => {
    const { getConfidenceBadge } = await import("./aggregate-experiment-results");

    const sufficient = getConfidenceBadge({
      sampleSufficient: true,
      minSampleSize: 100,
      currentMinImpressions: 150,
      preliminaryLeader: "b",
      note: "",
    });

    expect(sufficient.label).toBe("Datos suficientes");
    expect(sufficient.variant).toBe("success");

    const collecting = getConfidenceBadge({
      sampleSufficient: false,
      minSampleSize: 100,
      currentMinImpressions: 45,
      preliminaryLeader: null,
      note: "",
    });

    expect(collecting.label).toBe("Recopilando datos");
    expect(collecting.variant).toBe("warning");
    expect(collecting.progress).toBeCloseTo(0.45, 2);
  });
});

// ─── Helper: computeVariantMetrics (used in T9.3-01) ───
// This references the pure function that computes metrics from raw data
function computeVariantMetrics(
  experiment: ReturnType<typeof makeExperiment>,
  assignments: ReturnType<typeof makeAssignment>[],
  engagementEvents: ReturnType<typeof makeEngagementEvent>[],
  swipeEvents: Array<{ buyerId: string; listingId: string; action: string }>
) {
  // Import happens lazily in tests above — this is a structural placeholder
  // The actual function is tested via dynamic import in the test body
  throw new Error("This should not be called directly — use dynamic import in tests");
}
