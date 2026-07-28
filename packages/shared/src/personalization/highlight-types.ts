/**
 * packages/shared/src/personalization/highlight-types.ts
 *
 * Types and constants for the Description Highlights system.
 * Story 10.4 — AC2 (category-dimension mapping) + AC3 (exported types).
 *
 * Highlights are extracted from listing descriptions and ordered
 * by relevance to the buyer's preference profile.
 */

import type { DimensionScores } from "./fit-score-types";

// ─── Category Type ────────────────────────────────────────────────────────────

/**
 * Category of a description highlight.
 * Each category maps to one or more DimensionScores fields.
 */
export type HighlightCategory =
  | "price"
  | "size"
  | "bedrooms"
  | "location"
  | "amenity"
  | "general";

// ─── Highlight Interface ──────────────────────────────────────────────────────

/**
 * A single highlighted fragment extracted from a listing description.
 * AC1: text (max ~150 chars), category, relevanceScore (0–1).
 */
export interface DescriptionHighlight {
  /** Fragment of the description text (sentence or short paragraph, max ~150 chars). */
  text: string;
  /** Detected category based on keyword matching. */
  category: HighlightCategory;
  /** Relevance score 0–1 derived from the buyer's DimensionScores for this category. */
  relevanceScore: number;
}

// ─── Keywords ─────────────────────────────────────────────────────────────────

/**
 * Spanish keywords used to detect highlight categories via pattern matching.
 * AC1: keyword lists per category for extraction in < 1ms.
 */
export const HIGHLIGHT_KEYWORDS: Record<
  Exclude<HighlightCategory, "general">,
  string[]
> = {
  price: [
    "precio",
    "€",
    "euros",
    "financiación",
    "hipoteca",
    "oportunidad",
    "rebajado",
    "negociable",
  ],
  size: ["m²", "metros", "superficie", "amplio", "espacioso", "luminoso"],
  bedrooms: [
    "habitación",
    "habitaciones",
    "dormitorio",
    "dormitorios",
    "suite",
    "estudio",
  ],
  location: [
    "zona",
    "barrio",
    "cerca de",
    "próximo",
    "metro",
    "transporte",
    "colegio",
    "parque",
    "centro",
    "playa",
  ],
  amenity: [
    "garaje",
    "piscina",
    "terraza",
    "trastero",
    "ascensor",
    "portero",
    "jardín",
    "reformado",
    "a estrenar",
    "vistas",
    "climatización",
    "calefacción",
  ],
};

// ─── Category → Dimension Mapping ─────────────────────────────────────────────

/**
 * AC2: Maps each HighlightCategory to a function that computes relevanceScore
 * from the buyer's DimensionScores.
 *
 * - price    → priceScore × 1.0
 * - size     → sizeScore × 1.0
 * - bedrooms → bedroomScore × 1.0
 * - location → locationScore × 1.0
 * - amenity  → max(sizeScore, bedroomScore) × 0.7
 * - general  → 0.3 (constant)
 */
export const CATEGORY_DIMENSION_MAP: Record<
  HighlightCategory,
  (scores: DimensionScores) => number
> = {
  price: (s) => s.priceScore * 1.0,
  size: (s) => s.sizeScore * 1.0,
  bedrooms: (s) => s.bedroomScore * 1.0,
  location: (s) => s.locationScore * 1.0,
  amenity: (s) => Math.max(s.sizeScore, s.bedroomScore) * 0.7,
  general: () => 0.3,
};
