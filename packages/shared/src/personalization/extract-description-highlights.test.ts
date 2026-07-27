/**
 * Story 10.4 — ATDD Acceptance Tests: extractDescriptionHighlights()
 *
 * AC1: Pure function extractDescriptionHighlights()
 * AC2: HighlightCategory → DimensionScores mapping
 * AC3: TypeScript types exported from @reinder/shared
 * AC7: Exhaustive unit test coverage
 *
 * Test-review applied: 2026-07-27
 * Run: npx vitest run src/personalization/extract-description-highlights.test.ts
 */

import { describe, expect, test } from "vitest";

// ─── Imports ──────────────────────────────────────────────────────────────────
// AC3: Types and function must be exported from the personalization module.

import { extractDescriptionHighlights } from "./extract-description-highlights";
import type { DescriptionHighlight, HighlightCategory } from "./highlight-types";
import { CATEGORY_DIMENSION_MAP, HIGHLIGHT_KEYWORDS } from "./highlight-types";
import type { DimensionScores } from "./fit-score-types";

// ─── Test Fixtures ────────────────────────────────────────────────────────────

/**
 * Creates a complete DimensionScores object for testing.
 * Mirrors the DimensionScores interface from fit-score-types.ts (Story 10.2).
 */
function createMockDimensionScores(
  overrides: Partial<DimensionScores> = {}
): DimensionScores {
  return {
    priceScore: 0.8,
    sizeScore: 0.6,
    bedroomScore: 0.7,
    locationScore: 0.9,
    photoAffinityScore: 0.5,
    engagementDepthScore: 0.4,
    ...overrides,
  };
}

/** Listing description with keywords from multiple categories (Spanish). */
const MULTI_CATEGORY_DESCRIPTION =
  "Piso amplio y luminoso de 120 m² con 3 habitaciones en zona céntrica. " +
  "Precio negociable, oportunidad única. " +
  "Terraza con vistas al parque y garaje incluido. " +
  "Cerca del metro y colegios internacionales. " +
  "Reformado a estrenar con climatización centralizada.";

/** Description with only price-related keywords. */
const PRICE_ONLY_DESCRIPTION =
  "Oportunidad de inversión a precio rebajado. Financiación disponible y negociable con hipoteca favorable.";

/** Description with no matching keywords at all. */
const NO_KEYWORDS_DESCRIPTION =
  "Esta es una propiedad interesante que merece consideración para cualquier comprador.";

/** Empty description. */
const EMPTY_DESCRIPTION = "";

/** Description with many sentences to test the max 5 highlights limit. */
const MANY_HIGHLIGHTS_DESCRIPTION =
  "Precio muy competitivo y rebajado para la zona. " +
  "Superficie de 150 m² muy amplio y espacioso. " +
  "Cuenta con 4 dormitorios y una suite principal. " +
  "Ubicado cerca del centro y próximo a transporte público. " +
  "Terraza privada con vistas espectaculares. " +
  "Garaje doble con trastero incluido. " +
  "Ascensor y portero 24 horas. " +
  "Jardín comunitario con piscina climatizada. " +
  "Calefacción central y climatización por conductos.";

/** Description with tildes and accent variations. */
const TILDES_DESCRIPTION =
  "Amplia habitación principal con dormitorio de servicio. " +
  "Próximo a la estación de metro y colegio bilingüe.";

// ─── AC1: Pure function extractDescriptionHighlights() ────────────────────────

describe("Story 10.4 — AC1: extractDescriptionHighlights() pure function", () => {
  test("returns DescriptionHighlight[] with correct shape", () => {
    const result = extractDescriptionHighlights(
      MULTI_CATEGORY_DESCRIPTION,
      createMockDimensionScores()
    );

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);

    for (const highlight of result) {
      expect(highlight).toHaveProperty("text");
      expect(highlight).toHaveProperty("category");
      expect(highlight).toHaveProperty("relevanceScore");
      expect(typeof highlight.text).toBe("string");
      expect(typeof highlight.category).toBe("string");
      expect(typeof highlight.relevanceScore).toBe("number");
    }
  });

  test("extracts highlights with correct categories from multi-category description", () => {
    const result = extractDescriptionHighlights(
      MULTI_CATEGORY_DESCRIPTION,
      createMockDimensionScores()
    );

    const categories = result.map((h) => h.category);

    // Should detect multiple categories from the description
    expect(categories).toContain("size"); // "amplio", "luminoso", "m²"
    expect(categories).toContain("price"); // "negociable", "oportunidad"
    expect(categories).toContain("location"); // "zona", "parque", "metro", "colegios"
    expect(categories).toContain("amenity"); // "terraza", "garaje", "vistas", "reformado"
  });

  test("categorizes price keywords correctly", () => {
    const result = extractDescriptionHighlights(
      PRICE_ONLY_DESCRIPTION,
      createMockDimensionScores()
    );

    expect(result.length).toBeGreaterThan(0);
    for (const highlight of result) {
      expect(highlight.category).toBe("price");
    }
  });

  test("orders highlights by relevanceScore DESC", () => {
    const scores = createMockDimensionScores({
      priceScore: 0.3,
      locationScore: 0.9,
      sizeScore: 0.6,
    });

    const result = extractDescriptionHighlights(
      MULTI_CATEGORY_DESCRIPTION,
      scores
    );

    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].relevanceScore).toBeGreaterThanOrEqual(
        result[i].relevanceScore
      );
    }
  });

  test("returns maximum 5 highlights when more candidates exist", () => {
    const result = extractDescriptionHighlights(
      MANY_HIGHLIGHTS_DESCRIPTION,
      createMockDimensionScores()
    );

    expect(result.length).toBeLessThanOrEqual(5);
  });

  test("is pure — same input produces same output", () => {
    const scores = createMockDimensionScores();
    const result1 = extractDescriptionHighlights(
      MULTI_CATEGORY_DESCRIPTION,
      scores
    );
    const result2 = extractDescriptionHighlights(
      MULTI_CATEGORY_DESCRIPTION,
      scores
    );

    expect(result1).toEqual(result2);
  });

  test("is synchronous — returns immediately without promises", () => {
    const result = extractDescriptionHighlights(
      MULTI_CATEGORY_DESCRIPTION,
      createMockDimensionScores()
    );

    // Should NOT be a Promise
    expect(result).not.toBeInstanceOf(Promise);
    expect(Array.isArray(result)).toBe(true);
  });

  test("highlight text is max ~150 characters", () => {
    const result = extractDescriptionHighlights(
      MULTI_CATEGORY_DESCRIPTION,
      createMockDimensionScores()
    );

    for (const highlight of result) {
      expect(highlight.text.length).toBeLessThanOrEqual(160); // ~150 with tolerance
    }
  });
});

// ─── AC1: No dimensionScores fallback behavior ───────────────────────────────

describe("Story 10.4 — AC1: fallback when dimensionScores is undefined/null", () => {
  test("all highlights receive relevanceScore 0.5 when dimensionScores is undefined", () => {
    const result = extractDescriptionHighlights(MULTI_CATEGORY_DESCRIPTION);

    expect(result.length).toBeGreaterThan(0);
    for (const highlight of result) {
      expect(highlight.relevanceScore).toBe(0.5);
    }
  });

  test("all highlights receive relevanceScore 0.5 when dimensionScores is null", () => {
    const result = extractDescriptionHighlights(
      MULTI_CATEGORY_DESCRIPTION,
      null
    );

    expect(result.length).toBeGreaterThan(0);
    for (const highlight of result) {
      expect(highlight.relevanceScore).toBe(0.5);
    }
  });

  test("maintains original extraction order when dimensionScores is absent", () => {
    const result = extractDescriptionHighlights(
      MULTI_CATEGORY_DESCRIPTION,
      undefined
    );

    // All have same relevanceScore — verify equality
    for (const highlight of result) {
      expect(highlight.relevanceScore).toBe(0.5);
    }

    // Verify order matches sentence appearance in the description
    // The first detected category in MULTI_CATEGORY_DESCRIPTION is "size" ("amplio")
    if (result.length >= 2) {
      const firstCategory = result[0].category;
      expect(firstCategory).toBe("size");
    }
  });
});

// ─── AC1: Edge cases — empty and null descriptions ───────────────────────────

describe("Story 10.4 — AC1: edge cases for description input", () => {
  test("returns empty array for empty description", () => {
    const result = extractDescriptionHighlights(
      EMPTY_DESCRIPTION,
      createMockDimensionScores()
    );

    expect(result).toEqual([]);
  });

  test("returns empty array for null description", () => {
    const result = extractDescriptionHighlights(
      null as unknown as string,
      createMockDimensionScores()
    );

    expect(result).toEqual([]);
  });

  test("returns empty array for undefined description", () => {
    const result = extractDescriptionHighlights(
      undefined as unknown as string,
      createMockDimensionScores()
    );

    expect(result).toEqual([]);
  });

  test("returns empty array or only general highlights for description without keywords", () => {
    const result = extractDescriptionHighlights(
      NO_KEYWORDS_DESCRIPTION,
      createMockDimensionScores()
    );

    // Per AC1: "Sin match → general" and algorithm may return [] for no keyword matches
    // The function should either return [] or only 'general' category highlights
    for (const highlight of result) {
      expect(highlight.category).toBe("general");
    }
  });
});

// ─── AC2: HighlightCategory → DimensionScores mapping ────────────────────────

describe("Story 10.4 — AC2: category-to-dimension mapping", () => {
  test("price category uses dimensionScores.priceScore × 1.0", () => {
    const scores = createMockDimensionScores({ priceScore: 0.75 });
    const result = extractDescriptionHighlights(
      PRICE_ONLY_DESCRIPTION,
      scores
    );

    const priceHighlight = result.find((h) => h.category === "price");
    expect(priceHighlight).toBeDefined();
    expect(priceHighlight!.relevanceScore).toBeCloseTo(0.75, 2);
  });

  test("size category uses dimensionScores.sizeScore × 1.0", () => {
    const description = "Piso amplio de 120 m² muy espacioso y luminoso.";
    const scores = createMockDimensionScores({ sizeScore: 0.65 });
    const result = extractDescriptionHighlights(description, scores);

    const sizeHighlight = result.find((h) => h.category === "size");
    expect(sizeHighlight).toBeDefined();
    expect(sizeHighlight!.relevanceScore).toBeCloseTo(0.65, 2);
  });

  test("bedrooms category uses dimensionScores.bedroomScore × 1.0", () => {
    const description = "Cuenta con 3 habitaciones amplias y un dormitorio de servicio.";
    const scores = createMockDimensionScores({ bedroomScore: 0.8 });
    const result = extractDescriptionHighlights(description, scores);

    const bedroomHighlight = result.find((h) => h.category === "bedrooms");
    expect(bedroomHighlight).toBeDefined();
    expect(bedroomHighlight!.relevanceScore).toBeCloseTo(0.8, 2);
  });

  test("location category uses dimensionScores.locationScore × 1.0", () => {
    const description = "Ubicado en zona céntrica cerca del metro y colegios.";
    const scores = createMockDimensionScores({ locationScore: 0.92 });
    const result = extractDescriptionHighlights(description, scores);

    const locationHighlight = result.find((h) => h.category === "location");
    expect(locationHighlight).toBeDefined();
    expect(locationHighlight!.relevanceScore).toBeCloseTo(0.92, 2);
  });

  test("amenity category uses max(sizeScore, bedroomScore) × 0.7", () => {
    const description = "Terraza con vistas y garaje privado incluido.";
    const scores = createMockDimensionScores({
      sizeScore: 0.6,
      bedroomScore: 0.8,
    });
    const result = extractDescriptionHighlights(description, scores);

    const amenityHighlight = result.find((h) => h.category === "amenity");
    expect(amenityHighlight).toBeDefined();
    // max(0.6, 0.8) × 0.7 = 0.56
    expect(amenityHighlight!.relevanceScore).toBeCloseTo(0.56, 2);
  });

  test("general category mapping function returns 0.3", () => {
    // The implementation skips unmatched sentences (no general fallback in output),
    // so we verify the CATEGORY_DIMENSION_MAP directly for the general formula.
    const scores = createMockDimensionScores();
    const generalRelevance = CATEGORY_DIMENSION_MAP.general(scores);
    expect(generalRelevance).toBeCloseTo(0.3, 2);
  });

  test("sentences with no keyword match are excluded (not assigned general)", () => {
    // Verify that a description without matching keywords returns []
    const description =
      "Esta propiedad tiene características únicas que la hacen interesante para diversos perfiles.";
    const scores = createMockDimensionScores();
    const result = extractDescriptionHighlights(description, scores);

    expect(result).toEqual([]);
  });

  test("relevanceScore is clamped to [0, 1]", () => {
    // Edge case: extreme dimension scores
    const scores = createMockDimensionScores({
      priceScore: 1.5, // artificially above 1
      sizeScore: -0.1, // artificially below 0
    });
    const description = "Precio rebajado. Piso amplio de 120 m².";
    const result = extractDescriptionHighlights(description, scores);

    for (const highlight of result) {
      expect(highlight.relevanceScore).toBeGreaterThanOrEqual(0);
      expect(highlight.relevanceScore).toBeLessThanOrEqual(1);
    }
  });
});

// ─── AC3: TypeScript types exported from @reinder/shared ─────────────────────

describe("Story 10.4 — AC3: type and constant exports", () => {
  test("HIGHLIGHT_KEYWORDS constant is exported and has all categories", () => {
    expect(HIGHLIGHT_KEYWORDS).toBeDefined();

    const expectedCategories: HighlightCategory[] = [
      "price",
      "size",
      "bedrooms",
      "location",
      "amenity",
    ];

    for (const category of expectedCategories) {
      expect(HIGHLIGHT_KEYWORDS).toHaveProperty(category);
      expect(Array.isArray(HIGHLIGHT_KEYWORDS[category])).toBe(true);
      expect(HIGHLIGHT_KEYWORDS[category].length).toBeGreaterThan(0);
    }
  });

  test("HIGHLIGHT_KEYWORDS.price contains expected Spanish keywords", () => {
    const expectedKeywords = [
      "precio",
      "€",
      "euros",
      "financiación",
      "hipoteca",
      "oportunidad",
      "rebajado",
      "negociable",
    ];

    for (const keyword of expectedKeywords) {
      expect(HIGHLIGHT_KEYWORDS.price).toContain(keyword);
    }
  });

  test("HIGHLIGHT_KEYWORDS.size contains expected Spanish keywords", () => {
    const expectedKeywords = [
      "m²",
      "metros",
      "superficie",
      "amplio",
      "espacioso",
      "luminoso",
    ];

    for (const keyword of expectedKeywords) {
      expect(HIGHLIGHT_KEYWORDS.size).toContain(keyword);
    }
  });

  test("HIGHLIGHT_KEYWORDS.bedrooms contains expected Spanish keywords", () => {
    const expectedKeywords = [
      "habitación",
      "habitaciones",
      "dormitorio",
      "dormitorios",
      "suite",
      "estudio",
    ];

    for (const keyword of expectedKeywords) {
      expect(HIGHLIGHT_KEYWORDS.bedrooms).toContain(keyword);
    }
  });

  test("HIGHLIGHT_KEYWORDS.location contains expected Spanish keywords", () => {
    const expectedKeywords = [
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
    ];

    for (const keyword of expectedKeywords) {
      expect(HIGHLIGHT_KEYWORDS.location).toContain(keyword);
    }
  });

  test("HIGHLIGHT_KEYWORDS.amenity contains expected Spanish keywords", () => {
    const expectedKeywords = [
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
    ];

    for (const keyword of expectedKeywords) {
      expect(HIGHLIGHT_KEYWORDS.amenity).toContain(keyword);
    }
  });

  test("extractDescriptionHighlights is a function", () => {
    expect(typeof extractDescriptionHighlights).toBe("function");
  });
});

// ─── AC7: Exhaustive unit test scenarios ──────────────────────────────────────

describe("Story 10.4 — AC7: exhaustive scenarios", () => {
  test("multiple categories detected — highlights correctly categorized", () => {
    const result = extractDescriptionHighlights(
      MULTI_CATEGORY_DESCRIPTION,
      createMockDimensionScores()
    );

    const categorySet = new Set(result.map((h) => h.category));
    // Should have at least 3 different categories from the multi-category description
    expect(categorySet.size).toBeGreaterThanOrEqual(3);
  });

  test("keywords with tildes matched correctly", () => {
    const result = extractDescriptionHighlights(
      TILDES_DESCRIPTION,
      createMockDimensionScores()
    );

    expect(result.length).toBeGreaterThan(0);

    const categories = result.map((h) => h.category);
    expect(categories).toContain("bedrooms"); // "habitación", "dormitorio"
    expect(categories).toContain("location"); // "próximo", "metro", "colegio"
  });

  test("each sentence assigned to single category — no duplicate content", () => {
    const result = extractDescriptionHighlights(
      MULTI_CATEGORY_DESCRIPTION,
      createMockDimensionScores()
    );

    const texts = result.map((h) => h.text);
    const uniqueTexts = new Set(texts);

    // No duplicated highlight text
    expect(uniqueTexts.size).toBe(texts.length);
  });

  test("returns the top-5 most relevant highlights when capped", () => {
    // Craft scores where location is clearly highest and price clearly lowest
    const scores = createMockDimensionScores({
      locationScore: 0.99,
      priceScore: 0.01,
      sizeScore: 0.5,
      bedroomScore: 0.5,
    });

    const result = extractDescriptionHighlights(
      MANY_HIGHLIGHTS_DESCRIPTION,
      scores
    );

    expect(result.length).toBeLessThanOrEqual(5);
    expect(result.length).toBeGreaterThan(0);

    // All returned highlights should be sorted DESC
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].relevanceScore).toBeGreaterThanOrEqual(
        result[i].relevanceScore
      );
    }

    // The lowest returned score should be >= what we'd expect from the highest-scored categories,
    // meaning low-scored categories (price=0.01) should be dropped if there are enough better ones
    const lowestReturned = result[result.length - 1].relevanceScore;
    const priceHighlights = result.filter((h) => h.category === "price");
    // Price (0.01) should not appear if 5+ higher-scored highlights exist
    if (result.length === 5) {
      expect(priceHighlights.length).toBe(0);
    }
  });
});

// ─── Performance assertion ───────────────────────────────────────────────────

describe("Story 10.4 — NFR2: performance < 1ms", () => {
  test("executes in under 1ms for typical description", () => {
    const scores = createMockDimensionScores();
    const start = performance.now();

    for (let i = 0; i < 100; i++) {
      extractDescriptionHighlights(MULTI_CATEGORY_DESCRIPTION, scores);
    }

    const elapsed = (performance.now() - start) / 100;
    expect(elapsed).toBeLessThan(1); // < 1ms average
  });
});
