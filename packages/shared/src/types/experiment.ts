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
  matchCount: number;
  reaffirmCount: number;
  updatedAt: string;
};
