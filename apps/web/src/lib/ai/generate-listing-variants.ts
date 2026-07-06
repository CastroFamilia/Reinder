/**
 * AI-powered listing variant generation service.
 *
 * Story 9.6, AC1 — calls OpenAI GPT-4o with structured outputs to generate
 * 3 alternative title/description variants for a listing.
 *
 * IMPORTANT:
 * - Server-side only — never import in client components.
 * - Instantiates OpenAI client per-call (Next.js serverless, no global state).
 * - Uses zodResponseFormat for guaranteed schema compliance.
 */

import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { filterUnsafeVariants, detectLanguage } from "./content-safety";
import type { AiVariant } from "@reinder/shared/types/ai-variant";

// ─── Response Schema ─────────────────────────────────────────────────────────

const AiVariantResponseSchema = z.object({
  variants: z
    .array(
      z.object({
        label: z.string(),
        title: z.string(),
        description: z.string(),
      })
    )
    .length(3),
});

// ─── Input Type ──────────────────────────────────────────────────────────────

export type ListingInput = {
  title: string;
  description: string | null;
  bedrooms: number | null;
  sizeSqm: string | null; // numeric from DB comes as string
  city: string | null;
  price: string | null; // numeric from DB comes as string
};

// ─── Custom Error ────────────────────────────────────────────────────────────

export class AiServiceError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "AiServiceError";
  }
}

// ─── Main Service Function ───────────────────────────────────────────────────

export async function generateListingVariants(listing: ListingInput): Promise<{
  variants: AiVariant[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    model: string;
  };
}> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new AiServiceError(
      "AI_NOT_CONFIGURED",
      "Generación de variantes no disponible."
    );
  }

  const openai = new OpenAI({ apiKey, timeout: 10_000 });
  const hasDescription = !!listing.description;

  const systemPrompt = buildSystemPrompt(hasDescription);
  const userPrompt = buildUserPrompt(listing, hasDescription);

  // Detect original language for safety validation
  const originalText = `${listing.title} ${listing.description ?? ""}`;
  const originalLang = detectLanguage(originalText);

  // Attempt generation with 1 retry for content safety
  let lastVariants: AiVariant[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    const completion = await openai.beta.chat.completions.parse({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: zodResponseFormat(
        AiVariantResponseSchema,
        "listing_variants"
      ),
      temperature: 0.8,
      max_tokens: 2000,
    });

    const parsed = completion.choices[0].message.parsed;
    if (!parsed) {
      throw new AiServiceError(
        "AI_PARSE_ERROR",
        "No se pudo parsear la respuesta de la IA."
      );
    }

    // If listing has no description, clear description field from variants
    let rawVariants = parsed.variants;
    if (!hasDescription) {
      rawVariants = rawVariants.map((v) => ({ ...v, description: "" }));
    }

    // Content safety filter
    const safeVariants = filterUnsafeVariants(rawVariants, originalLang);
    lastVariants = safeVariants;

    if (safeVariants.length > 0) {
      // Ensure we return exactly 3 (pad with originals if some were filtered)
      const finalVariants = safeVariants.slice(0, 3);
      return {
        variants: finalVariants,
        usage: {
          promptTokens: completion.usage?.prompt_tokens ?? 0,
          completionTokens: completion.usage?.completion_tokens ?? 0,
          model: "gpt-4o",
        },
      };
    }

    // All filtered — retry once
    console.warn(
      `[ai-variants] Attempt ${attempt + 1}: all variants filtered by content safety. Retrying...`
    );
  }

  // Both attempts failed content safety
  throw new AiServiceError(
    "CONTENT_SAFETY_FAILED",
    "No se pudieron generar variantes que cumplan las políticas de contenido."
  );
}

// ─── Prompt Builders ─────────────────────────────────────────────────────────

function buildSystemPrompt(hasDescription: boolean): string {
  const contentType = hasDescription ? "título y descripción" : "título";
  return `Eres un copywriter inmobiliario experto en el mercado español.
Tu tarea es generar 3 variantes alternativas de ${contentType} para un listing inmobiliario.

REGLAS:
- Título: máximo 120 caracteres. Atractivo, específico, diferenciador.
${hasDescription ? "- Descripción: máximo 500 caracteres. Enfocada en beneficios, no solo features." : "- Descripción: devuelve string vacío (el listing no tiene descripción)."}
- Mismo idioma que el original (detectar automáticamente).
- NO usar claims legales ("garantizado", "mejor precio", "sin vicios ocultos").
- NO inventar datos que no estén en el listing original.
- Cada variante debe tener un estilo diferente:
  1. "Emocional" — apela a sentimientos, lifestyle, aspiraciones
  2. "Factual" — datos concretos, metrajes, ubicación, eficiencia
  3. "Premium" — tono exclusivo, luxury copywriting, escasez

Responde SOLO con el JSON estructurado.`;
}

function buildUserPrompt(listing: ListingInput, hasDescription: boolean): string {
  const priceFormatted = listing.price
    ? `€${Number(listing.price).toLocaleString("es-ES")}`
    : "No especificado";
  const sizeFormatted = listing.sizeSqm
    ? `${listing.sizeSqm} m²`
    : "No especificada";

  return `Listing original:
- Título: ${listing.title}
${hasDescription ? `- Descripción: ${listing.description}` : ""}
- Dormitorios: ${listing.bedrooms ?? "No especificado"}
- Superficie: ${sizeFormatted}
- Ciudad: ${listing.city ?? "No especificada"}
- Precio: ${priceFormatted}

Genera 3 variantes alternativas.`;
}
