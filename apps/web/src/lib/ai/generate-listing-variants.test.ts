/**
 * Story 9.6 — ATDD Tests: AI Variant Generation Service
 *
 * T9.6-01: generate-listing-variants.test.ts
 * AC1 — Servicio de generación de variantes con IA (server-side)
 * AC5 — Graceful fallback si la API de IA no está disponible
 * AC11 — Validación de seguridad de contenido (retry logic)
 *
 * Test Design Reference: T9.6-04 (titles ≤120 chars, descriptions ≤500 chars),
 *                        T9.6-14 (total AI call ≤10s timeout enforced)
 *
 * All OpenAI calls are mocked — NO live API calls.
 *
 * Run: pnpm --filter @reinder/web test apps/web/src/lib/ai/generate-listing-variants.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mock OpenAI SDK ──────────────────────────────────────────────────────────

const mockParse = vi.fn();

vi.mock("openai", () => {
  const MockOpenAI = vi.fn(function (this: any, _opts: any) {
    this.beta = {
      chat: {
        completions: {
          parse: mockParse,
        },
      },
    };
  });
  return { default: MockOpenAI };
});

vi.mock("openai/helpers/zod", () => ({
  zodResponseFormat: vi.fn().mockReturnValue({ type: "json_schema" }),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_LISTING_FULL = {
  title: "Piso reformado en Malasaña",
  description:
    "Precioso piso de 85m² con terraza y parking en el corazón de Malasaña.",
  bedrooms: 3,
  sizeSqm: "85.00",
  city: "Madrid",
  price: "350000.00",
};

const MOCK_LISTING_NO_DESCRIPTION = {
  title: "Piso en Malasaña",
  description: null,
  bedrooms: 2,
  sizeSqm: "60.00",
  city: "Madrid",
  price: "250000.00",
};

const MOCK_CLEAN_VARIANTS = [
  {
    label: "Emocional",
    title: "Tu refugio soñado en el barrio más vibrante de Madrid",
    description:
      "Imagina despertar cada mañana en un piso lleno de luz, con terraza para tus desayunos.",
  },
  {
    label: "Factual",
    title: "3 hab. 85m² con parking en Malasaña — reformado 2024",
    description:
      "Tres dormitorios, terraza privada, plaza de garaje incluida. Metro Tribunal a 3 minutos.",
  },
  {
    label: "Premium",
    title: "Residencia exclusiva en el corazón de Malasaña",
    description:
      "Para quienes buscan la combinación perfecta de diseño contemporáneo y ubicación privilegiada.",
  },
];

const MOCK_COMPLETION_RESPONSE = {
  choices: [
    {
      message: {
        parsed: { variants: MOCK_CLEAN_VARIANTS },
      },
    },
  ],
  usage: {
    prompt_tokens: 250,
    completion_tokens: 400,
  },
};

const makeCompletionResponse = (variants: any[], usage?: any) => ({
  choices: [{ message: { parsed: { variants } } }],
  usage: usage ?? { prompt_tokens: 250, completion_tokens: 400 },
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("generateListingVariants — AC1, AC5, AC11", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, OPENAI_API_KEY: "sk-test-key-12345" };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ─── AC1: Happy path — returns 3 variants with correct schema ───

  it("[P0] T9.6-01a: returns exactly 3 variants with label, title, description", async () => {
    mockParse.mockResolvedValueOnce(MOCK_COMPLETION_RESPONSE);

    const { generateListingVariants } = await import(
      "./generate-listing-variants"
    );
    const result = await generateListingVariants(MOCK_LISTING_FULL);

    expect(result.variants).toHaveLength(3);
    result.variants.forEach((v) => {
      expect(v).toHaveProperty("label");
      expect(v).toHaveProperty("title");
      expect(v).toHaveProperty("description");
      expect(typeof v.label).toBe("string");
      expect(typeof v.title).toBe("string");
      expect(typeof v.description).toBe("string");
    });
  });

  it("[P0] T9.6-01b: returns usage metadata (promptTokens, completionTokens, model)", async () => {
    mockParse.mockResolvedValueOnce(MOCK_COMPLETION_RESPONSE);

    const { generateListingVariants } = await import(
      "./generate-listing-variants"
    );
    const result = await generateListingVariants(MOCK_LISTING_FULL);

    expect(result.usage).toBeDefined();
    expect(result.usage.promptTokens).toBe(250);
    expect(result.usage.completionTokens).toBe(400);
    expect(result.usage.model).toBe("gpt-4o");
  });

  // ─── AC1: Title ≤120 chars, Description ≤500 chars (T9.6-04) ───

  it("[P0] T9.6-04: returned variants have titles ≤120 chars and descriptions ≤500 chars", async () => {
    mockParse.mockResolvedValueOnce(MOCK_COMPLETION_RESPONSE);

    const { generateListingVariants } = await import(
      "./generate-listing-variants"
    );
    const result = await generateListingVariants(MOCK_LISTING_FULL);

    result.variants.forEach((v) => {
      expect(v.title.length).toBeLessThanOrEqual(120);
      expect(v.description.length).toBeLessThanOrEqual(500);
    });
  });

  // ─── AC1: Each variant has a descriptive label ───

  it("[P0] T9.6-01c: each variant has a non-empty label string", async () => {
    mockParse.mockResolvedValueOnce(MOCK_COMPLETION_RESPONSE);

    const { generateListingVariants } = await import(
      "./generate-listing-variants"
    );
    const result = await generateListingVariants(MOCK_LISTING_FULL);

    result.variants.forEach((v) => {
      expect(v.label.length).toBeGreaterThan(0);
    });
  });

  // ─── AC2 (partial): Listing without description → title-only variants ───

  it("[P1] T9.6-12: listing without description → generates title-only variants (description empty)", async () => {
    const variantsWithEmptyDesc = MOCK_CLEAN_VARIANTS.map((v) => ({
      ...v,
      description: "some text from AI",
    }));
    mockParse.mockResolvedValueOnce(
      makeCompletionResponse(variantsWithEmptyDesc)
    );

    const { generateListingVariants } = await import(
      "./generate-listing-variants"
    );
    const result = await generateListingVariants(MOCK_LISTING_NO_DESCRIPTION);

    result.variants.forEach((v) => {
      expect(v.description).toBe("");
    });
  });

  // ─── AC5: Missing OPENAI_API_KEY → throws AI_NOT_CONFIGURED ───

  it("[P0] T9.6-09: throws AiServiceError with code AI_NOT_CONFIGURED when OPENAI_API_KEY is missing", async () => {
    delete process.env.OPENAI_API_KEY;

    const { generateListingVariants, AiServiceError } = await import(
      "./generate-listing-variants"
    );

    await expect(
      generateListingVariants(MOCK_LISTING_FULL)
    ).rejects.toThrowError();

    try {
      await generateListingVariants(MOCK_LISTING_FULL);
    } catch (e) {
      expect(e).toBeInstanceOf(AiServiceError);
      expect((e as any).code).toBe("AI_NOT_CONFIGURED");
    }
  });

  // ─── AC5: OpenAI API error → throws (caught by route handler as 503) ───

  it("[P0] T9.6-08: throws when OpenAI API returns an error (500/timeout/network)", async () => {
    mockParse.mockRejectedValueOnce(new Error("OpenAI API Error: 500"));

    const { generateListingVariants } = await import(
      "./generate-listing-variants"
    );

    await expect(
      generateListingVariants(MOCK_LISTING_FULL)
    ).rejects.toThrow();
  });

  // ─── AC5: Null parsed response → throws AI_PARSE_ERROR ───

  it("[P0] T9.6-01d: throws AiServiceError AI_PARSE_ERROR when parsed response is null", async () => {
    mockParse.mockResolvedValueOnce({
      choices: [{ message: { parsed: null } }],
      usage: { prompt_tokens: 100, completion_tokens: 0 },
    });

    const { generateListingVariants, AiServiceError } = await import(
      "./generate-listing-variants"
    );

    try {
      await generateListingVariants(MOCK_LISTING_FULL);
      expect.fail("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(AiServiceError);
      expect((e as any).code).toBe("AI_PARSE_ERROR");
    }
  });

  // ─── AC11: Content safety retry — all filtered on first attempt, clean on second ───

  it("[P0] T9.6-01e: retries once when all variants are filtered by content safety", async () => {
    // First call: all variants have prohibited terms
    const unsafeVariants = [
      { label: "Emocional", title: "Inversión garantizado", description: "El mejor precio del mercado" },
      { label: "Factual", title: "Sin vicios ocultos", description: "Rentabilidad asegurada total" },
      { label: "Premium", title: "Inversión segura aquí", description: "Garantizado retorno" },
    ];
    // Second call: clean variants
    mockParse
      .mockResolvedValueOnce(makeCompletionResponse(unsafeVariants))
      .mockResolvedValueOnce(makeCompletionResponse(MOCK_CLEAN_VARIANTS));

    const { generateListingVariants } = await import(
      "./generate-listing-variants"
    );
    const result = await generateListingVariants(MOCK_LISTING_FULL);

    // Should have retried and returned clean variants
    expect(result.variants).toHaveLength(3);
    expect(mockParse).toHaveBeenCalledTimes(2);
  });

  // ─── AC11: Content safety — both attempts fail → CONTENT_SAFETY_FAILED ───

  it("[P0] T9.6-01f: throws CONTENT_SAFETY_FAILED after 2 failed content safety attempts", async () => {
    const unsafeVariants = [
      { label: "A", title: "Inversión garantizado", description: "Rentabilidad asegurada" },
      { label: "B", title: "El mejor precio del mercado", description: "Sin vicios" },
      { label: "C", title: "Solo para inversores", description: "Inversión segura" },
    ];
    mockParse
      .mockResolvedValueOnce(makeCompletionResponse(unsafeVariants))
      .mockResolvedValueOnce(makeCompletionResponse(unsafeVariants));

    const { generateListingVariants, AiServiceError } = await import(
      "./generate-listing-variants"
    );

    try {
      await generateListingVariants(MOCK_LISTING_FULL);
      expect.fail("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(AiServiceError);
      expect((e as any).code).toBe("CONTENT_SAFETY_FAILED");
    }
    expect(mockParse).toHaveBeenCalledTimes(2);
  });

  // ─── AC1: OpenAI instantiated with 10s timeout (T9.6-14) ───

  it("[P1] T9.6-14: instantiates OpenAI client with 10_000ms timeout", async () => {
    mockParse.mockResolvedValueOnce(MOCK_COMPLETION_RESPONSE);

    const OpenAI = (await import("openai")).default;
    const { generateListingVariants } = await import(
      "./generate-listing-variants"
    );
    await generateListingVariants(MOCK_LISTING_FULL);

    expect(OpenAI).toHaveBeenCalledWith(
      expect.objectContaining({ timeout: 10_000 })
    );
  });

  // ─── AC1: Uses gpt-4o model ───

  it("[P1] T9.6-01g: calls OpenAI with model 'gpt-4o'", async () => {
    mockParse.mockResolvedValueOnce(MOCK_COMPLETION_RESPONSE);

    const { generateListingVariants } = await import(
      "./generate-listing-variants"
    );
    await generateListingVariants(MOCK_LISTING_FULL);

    expect(mockParse).toHaveBeenCalledWith(
      expect.objectContaining({ model: "gpt-4o" })
    );
  });
});
