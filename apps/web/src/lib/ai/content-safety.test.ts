/**
 * Story 9.6 — ATDD Tests: Content Safety Filter
 *
 * T9.6-02 (content-safety.test.ts): Filters variants with prohibited terms; passes clean variants.
 * AC11 — Validación de seguridad de contenido.
 *
 * Test Design Reference: T9.6-05 (Content safety: no prohibited terms in generated content)
 *
 * Run: pnpm --filter @reinder/web test apps/web/src/lib/ai/content-safety.test.ts
 */

import { describe, it, expect } from "vitest";
import { filterUnsafeVariants, detectLanguage } from "./content-safety";
import type { AiVariant } from "@reinder/shared/types/ai-variant";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const CLEAN_VARIANT_ES: AiVariant = {
  label: "Emocional",
  title: "Tu nuevo hogar en el corazón de Madrid",
  description:
    "Descubre este luminoso piso reformado con vistas al parque del Retiro y terraza privada.",
};

const CLEAN_VARIANT_FACTUAL: AiVariant = {
  label: "Factual",
  title: "Piso 3 hab. 85m² en Malasaña con parking",
  description:
    "Tres dormitorios, baño completo, cocina equipada. A 5 minutos del metro Tribunal.",
};

const CLEAN_VARIANT_PREMIUM: AiVariant = {
  label: "Premium",
  title: "Exclusiva residencia en el barrio más deseado de la capital",
  description:
    "Una oportunidad única para quienes buscan un estilo de vida sofisticado en el centro.",
};

const VARIANT_WITH_LEGAL_CLAIM_ES: AiVariant = {
  label: "Emocional",
  title: "Tu inversión garantizado en Madrid",
  description: "Un piso con el mejor precio del mercado y sin vicios ocultos.",
};

const VARIANT_WITH_DISCRIMINATION_ES: AiVariant = {
  label: "Factual",
  title: "Piso amplio en zona residencial",
  description: "Zona tranquila, solo para familias con niños.",
};

const VARIANT_WITH_LEGAL_CLAIM_EN: AiVariant = {
  label: "Premium",
  title: "Guaranteed best price apartment in downtown",
  description: "This is a safe investment with assured return on your money.",
};

const VARIANT_WRONG_LANGUAGE: AiVariant = {
  label: "Emocional",
  title: "Beautiful and spacious apartment with amazing views",
  description:
    "This stunning property has everything you need for comfortable living.",
};

// ─── Tests: filterUnsafeVariants ──────────────────────────────────────────────

describe("filterUnsafeVariants — AC11", () => {
  it("[P0] T9.6-05a: passes through clean variants without modification", () => {
    const variants = [CLEAN_VARIANT_ES, CLEAN_VARIANT_FACTUAL, CLEAN_VARIANT_PREMIUM];
    const result = filterUnsafeVariants(variants, "es");

    expect(result).toHaveLength(3);
    expect(result).toEqual(variants);
  });

  it("[P0] T9.6-05b: filters variant containing ES legal claim 'garantizado'", () => {
    const variants = [CLEAN_VARIANT_ES, VARIANT_WITH_LEGAL_CLAIM_ES, CLEAN_VARIANT_PREMIUM];
    const result = filterUnsafeVariants(variants, "es");

    expect(result).toHaveLength(2);
    expect(result).not.toContainEqual(VARIANT_WITH_LEGAL_CLAIM_ES);
  });

  it("[P0] T9.6-05c: filters variant containing ES discriminatory term 'solo para'", () => {
    const variants = [CLEAN_VARIANT_ES, VARIANT_WITH_DISCRIMINATION_ES];
    const result = filterUnsafeVariants(variants, "es");

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(CLEAN_VARIANT_ES);
  });

  it("[P0] T9.6-05d: filters variant containing EN prohibited terms 'guaranteed', 'safe investment', 'assured return'", () => {
    const variants = [CLEAN_VARIANT_ES, VARIANT_WITH_LEGAL_CLAIM_EN];
    const result = filterUnsafeVariants(variants, "en");

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(CLEAN_VARIANT_ES);
  });

  it("[P0] T9.6-05e: filters ALL variants when all contain prohibited terms", () => {
    const variants = [VARIANT_WITH_LEGAL_CLAIM_ES, VARIANT_WITH_DISCRIMINATION_ES];
    const result = filterUnsafeVariants(variants, "es");

    expect(result).toHaveLength(0);
  });

  it("[P1] T9.6-05f: filters variant in wrong language (EN variant when original is ES)", () => {
    const variants = [CLEAN_VARIANT_ES, VARIANT_WRONG_LANGUAGE];
    const result = filterUnsafeVariants(variants, "es");

    // VARIANT_WRONG_LANGUAGE is English but original is Spanish — should be filtered
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(CLEAN_VARIANT_ES);
  });

  it("[P1] T9.6-05g: does not filter by language when original language is 'unknown'", () => {
    const variants = [CLEAN_VARIANT_ES, VARIANT_WRONG_LANGUAGE];
    const result = filterUnsafeVariants(variants, "unknown");

    // When original lang is unknown, skip language check — both should pass
    expect(result).toHaveLength(2);
  });

  it("[P0] T9.6-05h: returns empty array when given empty input", () => {
    const result = filterUnsafeVariants([], "es");
    expect(result).toHaveLength(0);
  });

  it("[P0] T9.6-05i: check is case-insensitive — catches 'GARANTIZADO' in uppercase", () => {
    const upperCaseVariant: AiVariant = {
      label: "Emocional",
      title: "GARANTIZADO el mejor piso",
      description: "Increíble oportunidad.",
    };
    const result = filterUnsafeVariants([upperCaseVariant], "es");
    expect(result).toHaveLength(0);
  });
});

// ─── Tests: detectLanguage ────────────────────────────────────────────────────

describe("detectLanguage — AC11 (language validation)", () => {
  it("[P1] detects Spanish text correctly", () => {
    const text =
      "Piso luminoso en el corazón de la ciudad, con vistas al parque y terraza para disfrutar del sol.";
    expect(detectLanguage(text)).toBe("es");
  });

  it("[P1] detects English text correctly", () => {
    const text =
      "This beautiful apartment has stunning views from the terrace and is located near the park.";
    expect(detectLanguage(text)).toBe("en");
  });

  it("[P1] returns 'unknown' when language cannot be determined", () => {
    const text = "Lorem ipsum dolor sit amet";
    expect(detectLanguage(text)).toBe("unknown");
  });

  it("[P1] returns 'unknown' for very short text without stop words", () => {
    const text = "Piso Madrid";
    expect(detectLanguage(text)).toBe("unknown");
  });
});
