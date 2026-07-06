/**
 * Story 9.6 — ATDD Tests: POST /api/v1/experiments/generate-variants
 *
 * T9.6-04: API integration test (mock)
 * AC2 — API endpoint de generación de variantes
 * AC3 — Rate limiting
 * AC5 — Graceful fallback
 *
 * Test Design Reference: T9.6-02, T9.6-06–T9.6-13
 *
 * Run: pnpm --filter @reinder/web test apps/web/src/app/api/v1/experiments/generate-variants/route.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/lib/ai/generate-listing-variants", () => ({
  generateListingVariants: vi.fn(),
  AiServiceError: class AiServiceError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
      this.name = "AiServiceError";
    }
  },
}));

vi.mock("@/lib/ai/rate-limiter", () => ({
  checkRateLimit: vi.fn(),
  recordUsage: vi.fn(),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
}));

vi.mock("@reinder/shared/db/schema", () => ({
  listings: {
    id: "id",
    agencyId: "agency_id",
    title: "title",
    description: "description",
    bedrooms: "bedrooms",
    sizeSqm: "size_sqm",
    city: "city",
    price: "price",
  },
}));

import { createClient } from "@/lib/supabase/server";
import { generateListingVariants, AiServiceError } from "@/lib/ai/generate-listing-variants";
import { checkRateLimit, recordUsage } from "@/lib/ai/rate-limiter";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const AGENCY_ADMIN_USER = { id: "admin-uuid-001", email: "admin@agency.com" };
const BUYER_USER = { id: "buyer-uuid-001", email: "buyer@test.com" };
const AGENT_USER = { id: "agent-uuid-001", email: "agent@test.com" };
const AGENCY_ID = "agency-uuid-001";
const LISTING_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

const MOCK_LISTING = {
  id: LISTING_ID,
  agencyId: AGENCY_ID,
  title: "Piso en Malasaña",
  description: "Precioso piso reformado con terraza.",
  bedrooms: 3,
  sizeSqm: "85.00",
  city: "Madrid",
  price: "350000.00",
};

const MOCK_VARIANTS = [
  { label: "Emocional", title: "Tu refugio soñado", description: "Imagina despertar cada mañana..." },
  { label: "Factual", title: "3 hab. 85m² Malasaña", description: "Metro Tribunal a 3 min." },
  { label: "Premium", title: "Exclusiva residencia", description: "Diseño contemporáneo." },
];

const makeSupabaseMock = (
  user: { id: string; email: string } | null,
  role?: string,
  agencyId?: string
) => ({
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user },
      error: user ? null : { message: "Not authenticated" },
    }),
  },
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: role
            ? { role, agency_id: agencyId || AGENCY_ID }
            : null,
          error: null,
        }),
      }),
    }),
  }),
});

const makeRequest = (body: object) =>
  new Request("http://localhost:3000/api/v1/experiments/generate-variants", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/v1/experiments/generate-variants — AC2, AC3, AC5", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, OPENAI_API_KEY: "sk-test-key" };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ─── AC2: Happy path — 200 with 3 variants ───

  it("[P0] T9.6-02a: returns 200 with 3 variants for authenticated agency_admin", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(AGENCY_ADMIN_USER, "agency_admin", AGENCY_ID) as any
    );

    const { db } = await import("@/lib/supabase/db");
    vi.mocked(db.select().from(null as any).where(null as any).limit as any)
      .mockResolvedValueOnce([MOCK_LISTING]);

    vi.mocked(checkRateLimit).mockResolvedValueOnce({
      allowed: true,
      remaining: 5,
    });

    vi.mocked(generateListingVariants).mockResolvedValueOnce({
      variants: MOCK_VARIANTS,
      usage: { promptTokens: 250, completionTokens: 400, model: "gpt-4o" },
    });

    vi.mocked(recordUsage).mockResolvedValueOnce(undefined);

    const { POST } = await import(
      "@/app/api/v1/experiments/generate-variants/route"
    );
    const res = await POST(makeRequest({ listingId: LISTING_ID }) as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.variants).toHaveLength(3);
    expect(body.data.variants[0]).toHaveProperty("label");
    expect(body.data.variants[0]).toHaveProperty("title");
    expect(body.data.variants[0]).toHaveProperty("description");
  });

  // ─── AC2: 401 when not authenticated ───

  it("[P0] T9.6-10a: returns 401 when user is not authenticated", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(null) as any
    );

    const { POST } = await import(
      "@/app/api/v1/experiments/generate-variants/route"
    );
    const res = await POST(makeRequest({ listingId: LISTING_ID }) as any);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  // ─── AC2: 403 when user is buyer ───

  it("[P0] T9.6-10b: returns 403 when user role is buyer", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(BUYER_USER, "buyer") as any
    );

    const { POST } = await import(
      "@/app/api/v1/experiments/generate-variants/route"
    );
    const res = await POST(makeRequest({ listingId: LISTING_ID }) as any);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  // ─── AC2: 403 when user is agent ───

  it("[P0] T9.6-10c: returns 403 when user role is agent", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(AGENT_USER, "agent") as any
    );

    const { POST } = await import(
      "@/app/api/v1/experiments/generate-variants/route"
    );
    const res = await POST(makeRequest({ listingId: LISTING_ID }) as any);

    expect(res.status).toBe(403);
  });

  // ─── AC2: 404 when listing not found ───

  it("[P0] T9.6-11a: returns 404 LISTING_NOT_FOUND when listing does not exist", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(AGENCY_ADMIN_USER, "agency_admin", AGENCY_ID) as any
    );

    const { db } = await import("@/lib/supabase/db");
    vi.mocked(db.select().from(null as any).where(null as any).limit as any)
      .mockResolvedValueOnce([]); // no listing found

    const { POST } = await import(
      "@/app/api/v1/experiments/generate-variants/route"
    );
    const res = await POST(makeRequest({ listingId: LISTING_ID }) as any);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe("LISTING_NOT_FOUND");
  });

  // ─── AC2: 404 when listing belongs to different agency ───

  it("[P0] T9.6-11b: returns 404 when listing belongs to a different agency", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(AGENCY_ADMIN_USER, "agency_admin", AGENCY_ID) as any
    );

    const { db } = await import("@/lib/supabase/db");
    vi.mocked(db.select().from(null as any).where(null as any).limit as any)
      .mockResolvedValueOnce([{ ...MOCK_LISTING, agencyId: "other-agency-uuid" }]);

    const { POST } = await import(
      "@/app/api/v1/experiments/generate-variants/route"
    );
    const res = await POST(makeRequest({ listingId: LISTING_ID }) as any);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe("LISTING_NOT_FOUND");
  });

  // ─── AC3: 429 when rate limit exceeded ───

  it("[P0] T9.6-06: returns 429 with RATE_LIMIT_EXCEEDED when 10+ generations in 24h", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(AGENCY_ADMIN_USER, "agency_admin", AGENCY_ID) as any
    );

    const { db } = await import("@/lib/supabase/db");
    vi.mocked(db.select().from(null as any).where(null as any).limit as any)
      .mockResolvedValueOnce([MOCK_LISTING]);

    vi.mocked(checkRateLimit).mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 3600,
    });

    const { POST } = await import(
      "@/app/api/v1/experiments/generate-variants/route"
    );
    const res = await POST(makeRequest({ listingId: LISTING_ID }) as any);
    const body = await res.json();

    expect(res.status).toBe(429);
    expect(body.error.code).toBe("RATE_LIMIT_EXCEEDED");
    expect(res.headers.get("Retry-After")).toBe("3600");
  });

  // ─── AC5: 503 when OPENAI_API_KEY missing ───

  it("[P0] T9.6-09: returns 503 AI_NOT_CONFIGURED when OPENAI_API_KEY is missing", async () => {
    delete process.env.OPENAI_API_KEY;

    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(AGENCY_ADMIN_USER, "agency_admin", AGENCY_ID) as any
    );

    const { db } = await import("@/lib/supabase/db");
    vi.mocked(db.select().from(null as any).where(null as any).limit as any)
      .mockResolvedValueOnce([MOCK_LISTING]);

    vi.mocked(checkRateLimit).mockResolvedValueOnce({
      allowed: true,
      remaining: 5,
    });

    const { POST } = await import(
      "@/app/api/v1/experiments/generate-variants/route"
    );
    const res = await POST(makeRequest({ listingId: LISTING_ID }) as any);
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.error.code).toBe("AI_NOT_CONFIGURED");
  });

  // ─── AC5: 503 when OpenAI API errors (network/timeout/500) ───

  it("[P0] T9.6-08: returns 503 AI_SERVICE_UNAVAILABLE when OpenAI API throws", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(AGENCY_ADMIN_USER, "agency_admin", AGENCY_ID) as any
    );

    const { db } = await import("@/lib/supabase/db");
    vi.mocked(db.select().from(null as any).where(null as any).limit as any)
      .mockResolvedValueOnce([MOCK_LISTING]);

    vi.mocked(checkRateLimit).mockResolvedValueOnce({
      allowed: true,
      remaining: 5,
    });

    vi.mocked(generateListingVariants).mockRejectedValueOnce(
      new Error("OpenAI API timeout")
    );

    const { POST } = await import(
      "@/app/api/v1/experiments/generate-variants/route"
    );
    const res = await POST(makeRequest({ listingId: LISTING_ID }) as any);
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.error.code).toBe("AI_SERVICE_UNAVAILABLE");
  });

  // ─── AC3: recordUsage called ONLY after success (T9.6-07) ───

  it("[P0] T9.6-07: does NOT call recordUsage when AI generation fails", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(AGENCY_ADMIN_USER, "agency_admin", AGENCY_ID) as any
    );

    const { db } = await import("@/lib/supabase/db");
    vi.mocked(db.select().from(null as any).where(null as any).limit as any)
      .mockResolvedValueOnce([MOCK_LISTING]);

    vi.mocked(checkRateLimit).mockResolvedValueOnce({
      allowed: true,
      remaining: 5,
    });

    vi.mocked(generateListingVariants).mockRejectedValueOnce(
      new Error("OpenAI error")
    );

    const { POST } = await import(
      "@/app/api/v1/experiments/generate-variants/route"
    );
    await POST(makeRequest({ listingId: LISTING_ID }) as any);

    expect(recordUsage).not.toHaveBeenCalled();
  });

  // ─── AC2: Response follows ApiResponse<T> format ───

  it("[P1] T9.6-02b: response follows ApiResponse wrapper { data, error }", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(AGENCY_ADMIN_USER, "agency_admin", AGENCY_ID) as any
    );

    const { db } = await import("@/lib/supabase/db");
    vi.mocked(db.select().from(null as any).where(null as any).limit as any)
      .mockResolvedValueOnce([MOCK_LISTING]);

    vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: true, remaining: 5 });
    vi.mocked(generateListingVariants).mockResolvedValueOnce({
      variants: MOCK_VARIANTS,
      usage: { promptTokens: 100, completionTokens: 200, model: "gpt-4o" },
    });
    vi.mocked(recordUsage).mockResolvedValueOnce(undefined);

    const { POST } = await import(
      "@/app/api/v1/experiments/generate-variants/route"
    );
    const res = await POST(makeRequest({ listingId: LISTING_ID }) as any);
    const body = await res.json();

    expect(body).toHaveProperty("data");
    expect(body).toHaveProperty("error");
  });

  // ─── AC2: 400 on invalid body (missing listingId) ───

  it("[P1] T9.6-02c: returns 400 when listingId is missing from body", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(AGENCY_ADMIN_USER, "agency_admin", AGENCY_ID) as any
    );

    const { POST } = await import(
      "@/app/api/v1/experiments/generate-variants/route"
    );
    const res = await POST(makeRequest({}) as any);

    expect(res.status).toBe(400);
  });

  // ─── AC2: 400 on invalid UUID format ───

  it("[P1] T9.6-02d: returns 400 when listingId is not a valid UUID", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(AGENCY_ADMIN_USER, "agency_admin", AGENCY_ID) as any
    );

    const { POST } = await import(
      "@/app/api/v1/experiments/generate-variants/route"
    );
    const res = await POST(makeRequest({ listingId: "not-a-uuid" }) as any);

    expect(res.status).toBe(400);
  });

  // ─── AC2/AC3: recordUsage IS called on success (T9.6-13) ───

  it("[P1] T9.6-13: records AI usage with agency_id, listing_id, model, token counts on success", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(AGENCY_ADMIN_USER, "agency_admin", AGENCY_ID) as any
    );

    const { db } = await import("@/lib/supabase/db");
    vi.mocked(db.select().from(null as any).where(null as any).limit as any)
      .mockResolvedValueOnce([MOCK_LISTING]);

    vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: true, remaining: 5 });
    vi.mocked(generateListingVariants).mockResolvedValueOnce({
      variants: MOCK_VARIANTS,
      usage: { promptTokens: 250, completionTokens: 400, model: "gpt-4o" },
    });
    vi.mocked(recordUsage).mockResolvedValueOnce(undefined);

    const { POST } = await import(
      "@/app/api/v1/experiments/generate-variants/route"
    );
    await POST(makeRequest({ listingId: LISTING_ID }) as any);

    expect(recordUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        agencyId: AGENCY_ID,
        listingId: LISTING_ID,
        userId: AGENCY_ADMIN_USER.id,
        model: "gpt-4o",
        promptTokens: 250,
        completionTokens: 400,
      })
    );
  });
});
