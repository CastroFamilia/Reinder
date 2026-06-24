/**
 * Tipos compartidos para el sistema de Experimentos A/B.
 *
 * Estos tipos son consumidos por web y mobile — NO duplicar.
 *
 * Source: story 9-1, AC8, Task 11
 */

// ─── Enums como union types (reflejan los pgEnum del schema) ─────────────────

export const ExperimentStatus = [
  "draft",
  "running",
  "paused",
  "completed",
  "cancelled",
] as const;
export type ExperimentStatus = (typeof ExperimentStatus)[number];

export const ExperimentType = [
  "cover_image",
  "title",
  "description",
  "title_and_description",
] as const;
export type ExperimentType = (typeof ExperimentType)[number];

// ─── Variant Content JSONB Schema ────────────────────────────────────────────

/**
 * Contenido de una variante de experimento.
 * Almacenado como JSONB en listing_experiments.variant_a / variant_b.
 */
export type VariantContent = {
  /** Para cover_image: */
  coverImageUrl?: string;
  coverImageIndex?: number;

  /** Para title: */
  title?: string;

  /** Para description: */
  description?: string;
};

// ─── Row types ───────────────────────────────────────────────────────────────

export type Experiment = {
  id: string;
  listingId: string;
  agencyId: string;
  name: string;
  status: ExperimentStatus;
  experimentType: ExperimentType;
  variantA: VariantContent;
  variantB: VariantContent;
  minSampleSize: number;
  targetPValue: number;
  winnerVariant: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ExperimentAssignment = {
  id: string;
  experimentId: string;
  buyerId: string;
  variant: "a" | "b";
  assignedAt: string;
};

export type ExperimentResult = {
  id: string;
  experimentId: string;
  variant: "a" | "b";
  impressions: number;
  totalViewTimeMs: bigint;
  /** Story 9.3: sum of (view_time_ms)^2 for variance calculation */
  sumViewTimeSqMs: bigint;
  matchCount: number;
  reaffirmCount: number;
  updatedAt: string;
};

// ─── Story 9.3: Results Dashboard Types ──────────────────────────────────────

export type ExperimentVariantMetrics = {
  impressions: number;
  avgViewTimeMs: number;
  matchRate: number;
  reaffirmRate: number;
  totalViewTimeMs: number;
  matchCount: number;
  reaffirmCount: number;
};

export type ExperimentDeltaMetric = {
  diff: number;
  pctChange: number;
  better: "a" | "b" | null;
};

export type ExperimentDeltas = {
  avgViewTimeMs: ExperimentDeltaMetric;
  matchRate: ExperimentDeltaMetric;
  reaffirmRate: ExperimentDeltaMetric;
};

export type ExperimentConfidence = {
  sampleSufficient: boolean;
  minSampleSize: number;
  currentMinImpressions: number;
  preliminaryLeader: "a" | "b" | null;
  note: string;
};

export type ExperimentBaselineMetrics = {
  baselineAvgViewTimeMs: number;
  baselineMatchRate: number;
} | null;

export type ExperimentTimeseriesEntry = {
  bucketHour: string;
  a: { impressions: number; avgViewTimeMs: number };
  b: { impressions: number; avgViewTimeMs: number };
};

export type ExperimentResultsResponse = {
  experiment: {
    id: string;
    name: string;
    status: ExperimentStatus;
    startedAt: string | null;
  };
  results: {
    a: ExperimentVariantMetrics;
    b: ExperimentVariantMetrics;
  };
  deltas: ExperimentDeltas;
  confidence: ExperimentConfidence;
  baselineMetrics: ExperimentBaselineMetrics;
  timeseries: ExperimentTimeseriesEntry[];
};

