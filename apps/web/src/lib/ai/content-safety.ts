/**
 * Content safety filter for AI-generated listing variants.
 *
 * Story 9.6, AC11 — filters prohibited terms, legal claims, and language mismatches.
 *
 * Keep this module lightweight — no NLP library, just heuristic checks.
 */

import type { AiVariant } from "@reinder/shared/types/ai-variant";

// ─── Prohibited Terms ────────────────────────────────────────────────────────

const PROHIBITED_TERMS_ES = [
  // Legal claims
  "garantizado",
  "sin vicios",
  "mejor precio del mercado",
  "rentabilidad asegurada",
  "inversión segura",
  // Discrimination
  "solo para",
  "no se admiten",
  "preferentemente",
];

const PROHIBITED_TERMS_EN = [
  "guaranteed",
  "no defects",
  "best price",
  "assured return",
  "safe investment",
];

const ALL_PROHIBITED = [...PROHIBITED_TERMS_ES, ...PROHIBITED_TERMS_EN];

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Filters out variants that contain prohibited content.
 * Returns only the variants that pass all safety checks.
 */
export function filterUnsafeVariants(
  variants: AiVariant[],
  originalLanguage: "es" | "en" | "unknown" = "es"
): AiVariant[] {
  return variants.filter((v) => {
    const text = `${v.title} ${v.description}`.toLowerCase();

    // Check prohibited terms
    const hasProhibited = ALL_PROHIBITED.some((term) =>
      text.includes(term.toLowerCase())
    );
    if (hasProhibited) return false;

    // Check language match (only if we can detect both with high confidence)
    if (originalLanguage !== "unknown") {
      const variantLang = detectLanguage(text);
      if (variantLang !== "unknown" && variantLang !== originalLanguage) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Detect dominant language using stop-word frequency heuristic.
 * MVP approach — no external NLP library.
 *
 * Requires a strong signal (≥5 stop word matches with clear gap) to declare
 * a language. Short or ambiguous texts return 'unknown'.
 */
export function detectLanguage(text: string): "es" | "en" | "unknown" {
  const lower = ` ${text.toLowerCase()} `;
  const esWords = [
    "de",
    "en",
    "con",
    "los",
    "las",
    "del",
    "una",
    "para",
    "por",
    "que",
  ];
  const enWords = [
    "the",
    "and",
    "with",
    "for",
    "this",
    "from",
    "has",
    "are",
    "you",
  ];

  const esCount = esWords.filter((w) => lower.includes(` ${w} `)).length;
  const enCount = enWords.filter((w) => lower.includes(` ${w} `)).length;

  // Require strong signal: minimum 5 stop word matches and a clear gap
  if (esCount >= 5 && esCount > enCount + 1) return "es";
  if (enCount >= 5 && enCount > esCount + 1) return "en";
  return "unknown";
}
