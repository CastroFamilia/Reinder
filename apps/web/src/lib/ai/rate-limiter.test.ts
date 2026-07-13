/**
 * Story 9.6 — ATDD Tests: Rate Limiter
 *
 * T9.6-03: rate-limiter.test.ts
 * AC3 — Rate limiting por agencia: max 10 generaciones en 24h.
 *
 * Test Design Reference: T9.6-06 (11th request → 429 + Retry-After header),
 *                        T9.6-07 (failed AI call does NOT increment counter)
 *
 * Run: pnpm --filter @reinder/web test apps/web/src/lib/ai/rate-limiter.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { MAX_AI_GENERATIONS_PER_DAY } from "@reinder/shared/constants";

// ─── Mock Drizzle DB ──────────────────────────────────────────────────────────

const mockWhere = vi.fn();
const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });
const mockValues = vi.fn().mockResolvedValue(undefined);
const mockInsert = vi.fn().mockReturnValue({ values: mockValues });

vi.mock("@/lib/supabase/db", () => ({
  db: {
    select: (...args: any[]) => mockSelect(...args),
    insert: (...args: any[]) => mockInsert(...args),
  },
}));

vi.mock("@reinder/shared/db/schema", () => ({
  aiGenerationUsage: {
    agencyId: "agency_id",
    createdAt: "created_at",
    listingId: "listing_id",
    userId: "user_id",
    model: "model",
    promptTokens: "prompt_tokens",
    completionTokens: "completion_tokens",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a: any, b: any) => ({ op: "eq", a, b })),
  and: vi.fn((...args: any[]) => ({ op: "and", args })),
  gte: vi.fn((a: any, b: any) => ({ op: "gte", a, b })),
  count: vi.fn(() => "count_fn"),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const AGENCY_ID = "agency-uuid-001";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("checkRateLimit — AC3", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("[P0] T9.6-06a: allows generation when usage count is 0 (fresh agency)", async () => {
    mockWhere.mockResolvedValueOnce([{ total: 0 }]);

    const { checkRateLimit } = await import("./rate-limiter");
    const result = await checkRateLimit(AGENCY_ID);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(MAX_AI_GENERATIONS_PER_DAY);
  });

  it("[P0] T9.6-06b: allows generation when usage count is below limit (9 out of 10)", async () => {
    mockWhere.mockResolvedValueOnce([{ total: 9 }]);

    const { checkRateLimit } = await import("./rate-limiter");
    const result = await checkRateLimit(AGENCY_ID);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
  });

  it("[P0] T9.6-06c: denies generation when usage count reaches limit (10 out of 10)", async () => {
    mockWhere.mockResolvedValueOnce([{ total: 10 }]);

    const { checkRateLimit } = await import("./rate-limiter");
    const result = await checkRateLimit(AGENCY_ID);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterSeconds).toBeDefined();
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("[P0] T9.6-06d: denies generation when usage count exceeds limit (11+)", async () => {
    mockWhere.mockResolvedValueOnce([{ total: 15 }]);

    const { checkRateLimit } = await import("./rate-limiter");
    const result = await checkRateLimit(AGENCY_ID);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("[P1] T9.6-06e: handles null/undefined DB result gracefully (treats as 0 usage)", async () => {
    mockWhere.mockResolvedValueOnce([{ total: undefined }]);

    const { checkRateLimit } = await import("./rate-limiter");
    const result = await checkRateLimit(AGENCY_ID);

    // Should default to 0 usage → allowed
    expect(result.allowed).toBe(true);
  });
});

describe("recordUsage — AC3 (post-success recording)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("[P0] T9.6-07a: records usage with correct params (agency, listing, user, model, tokens)", async () => {
    const { recordUsage } = await import("./rate-limiter");

    await recordUsage({
      agencyId: "agency-uuid-001",
      listingId: "listing-uuid-001",
      userId: "user-uuid-001",
      model: "gpt-4o",
      promptTokens: 250,
      completionTokens: 400,
    });

    expect(mockInsert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        agencyId: "agency-uuid-001",
        listingId: "listing-uuid-001",
        userId: "user-uuid-001",
        model: "gpt-4o",
        promptTokens: 250,
        completionTokens: 400,
      })
    );
  });
});

describe("MAX_AI_GENERATIONS_PER_DAY constant — AC3", () => {
  it("[P0] T9.6-06f: MAX_AI_GENERATIONS_PER_DAY is 10", () => {
    expect(MAX_AI_GENERATIONS_PER_DAY).toBe(10);
  });
});
