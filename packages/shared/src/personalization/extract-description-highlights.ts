/**
 * packages/shared/src/personalization/extract-description-highlights.ts
 *
 * Pure, synchronous function to extract description highlights from a listing.
 * Story 10.4 — AC1: extractDescriptionHighlights()
 *
 * Algorithm:
 * 1. Split description by sentences (regex: /[.!?]\s+/ or double newline)
 * 2. For each sentence: normalize → keyword match → assign category
 * 3. Calculate relevanceScore via CATEGORY_DIMENSION_MAP
 * 4. Sort by relevanceScore DESC
 * 5. Truncate to max 5 highlights
 *
 * Performance: O(n) where n = sentences. Executes in < 1ms (NFR2).
 * No I/O, no async, fully deterministic.
 */

import type { DimensionScores } from "./fit-score-types";
import type { DescriptionHighlight, HighlightCategory } from "./highlight-types";
import { CATEGORY_DIMENSION_MAP, HIGHLIGHT_KEYWORDS } from "./highlight-types";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum number of highlights returned. */
const MAX_HIGHLIGHTS = 5;

/** Maximum character length for a highlight text fragment. */
const MAX_TEXT_LENGTH = 150;

/** Default relevance score when no DimensionScores are provided. */
const DEFAULT_RELEVANCE_SCORE = 0.5;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normalize text for keyword matching: lowercase + strip diacritics.
 * The original text (with tildes) is preserved in the highlight output.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Normalize a keyword for matching.
 * Same normalization as text but applied to keywords.
 */
function normalizeKeyword(keyword: string): string {
  return normalize(keyword);
}

/**
 * Split description into sentences by punctuation or double newline.
 * Trims whitespace and filters out empty fragments.
 */
function splitSentences(description: string): string[] {
  return description
    .split(/(?<=[.!?])\s+|\n{2,}/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// Pre-calculate normalized keywords to avoid repeated normalizations per sentence
const NORMALIZED_KEYWORDS: Record<Exclude<HighlightCategory, "general">, string[]> = {
  price: HIGHLIGHT_KEYWORDS.price.map(normalizeKeyword),
  size: HIGHLIGHT_KEYWORDS.size.map(normalizeKeyword),
  bedrooms: HIGHLIGHT_KEYWORDS.bedrooms.map(normalizeKeyword),
  location: HIGHLIGHT_KEYWORDS.location.map(normalizeKeyword),
  amenity: HIGHLIGHT_KEYWORDS.amenity.map(normalizeKeyword),
};

/**
 * Detect the most matching category for a sentence.
 * Returns the category with the most keyword hits, or null if none.
 */
function detectCategory(
  normalizedSentence: string
): Exclude<HighlightCategory, "general"> | null {
  let bestCategory: Exclude<HighlightCategory, "general"> | null = null;
  let bestCount = 0;

  const categories = Object.keys(NORMALIZED_KEYWORDS) as Array<
    Exclude<HighlightCategory, "general">
  >;

  for (const category of categories) {
    const keywords = NORMALIZED_KEYWORDS[category];
    let count = 0;

    for (const keyword of keywords) {
      if (normalizedSentence.includes(keyword)) {
        count++;
      }
    }

    if (count > bestCount) {
      bestCount = count;
      bestCategory = category;
    }
  }

  return bestCategory;
}

/**
 * Truncate text to MAX_TEXT_LENGTH, trimming at the last word boundary.
 */
function truncateText(text: string): string {
  if (text.length <= MAX_TEXT_LENGTH) return text;

  const truncated = text.slice(0, MAX_TEXT_LENGTH);
  const lastSpace = truncated.lastIndexOf(" ");
  return lastSpace > 0 ? truncated.slice(0, lastSpace) + "…" : truncated + "…";
}

/**
 * Clamp a number to [0, 1].
 */
function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

// ─── Main Function ────────────────────────────────────────────────────────────

/**
 * Extract description highlights from a listing description,
 * ordered by relevance to the buyer's DimensionScores.
 *
 * AC1: Pure, synchronous function. Returns DescriptionHighlight[].
 * AC2: Category → DimensionScores mapping for relevanceScore.
 *
 * @param description - Raw listing description text (Spanish).
 * @param dimensionScores - Buyer's DimensionScores (optional). If null/undefined,
 *   all highlights receive relevanceScore = 0.5 and maintain original order.
 * @returns Array of at most 5 highlights sorted by relevanceScore DESC.
 */
export function extractDescriptionHighlights(
  description: string,
  dimensionScores?: DimensionScores | null
): DescriptionHighlight[] {
  // Guard: null, undefined, or empty description → empty array
  if (!description || typeof description !== "string" || description.trim().length === 0) {
    return [];
  }

  const sentences = splitSentences(description);
  const highlights: DescriptionHighlight[] = [];

  for (const sentence of sentences) {
    const normalizedSentence = normalize(sentence);
    const category = detectCategory(normalizedSentence);

    // AC1: "Sin match → general" — but per Dev Notes algorithm step 6:
    // "Si la descripción no tiene ningún keyword → retornar []"
    // We skip sentences with no keyword match (no general fallback for unmatched)
    if (category === null) {
      continue;
    }

    const text = truncateText(sentence);

    let relevanceScore: number;
    if (dimensionScores == null) {
      // AC1: No dimensionScores → all highlights get 0.5, original order preserved
      relevanceScore = DEFAULT_RELEVANCE_SCORE;
    } else {
      // AC2: Map category to dimension score
      relevanceScore = clamp01(CATEGORY_DIMENSION_MAP[category](dimensionScores));
    }

    highlights.push({ text, category, relevanceScore });
  }

  // Sort by relevanceScore DESC (stable sort preserves original order for equal scores)
  if (dimensionScores != null) {
    highlights.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  // AC1: Maximum 5 highlights
  return highlights.slice(0, MAX_HIGHLIGHTS);
}
