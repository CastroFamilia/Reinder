/**
 * Story 10.1 — ATDD Tests: POST /api/v1/admin/preference-vectors/compute
 *
 * AC5: API endpoint for manual trigger of preference vector computation
 *      - platform_admin only (403 for buyer, agent, agency_admin)
 *      - Single buyer computation (with buyerId)
 *      - Batch computation (without buyerId)
 *
 * TDD RED PHASE: All tests use it.skip() — will fail until route is implemented.
 * Remove .skip() after implementing apps/web/src/app/api/v1/admin/preference-vectors/compute/route.ts
 *
 * Run: pnpm --filter @reinder/web test apps/web/src/app/api/v1/admin/preference-vectors/compute/route.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

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
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  },
}));

import { createClient } from "@/lib/supabase/server";

/*
 * Provider Scrutiny Evidence:
 * - Handler: NEW — not yet implemented (TDD red phase)
 * - Expected from acceptance criteria:
 *   - Endpoint: POST /api/v1/admin/preference-vectors/compute
 *   - Auth: platform_admin role required (403 for others)
 *   - Request body: { buyerId?: "uuid" } (optional)
 *   - Response shapes:
 *     - Single: { data: { buyerId, vectorComputed, swipeCount, engagementEventCount }, error: null }
 *     - Batch: { data: { processedCount, skippedCount, durationMs }, error: null }
 */

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PLATFORM_ADMIN_USER = {
  id: "admin-uuid-001",
  email: "admin@reinder.com",
};
const BUYER_USER = { id: "buyer-uuid-001", email: "buyer@test.com" };
const AGENT_USER = { id: "agent-uuid-001", email: "agent@test.com" };
const AGENCY_ADMIN_USER = {
  id: "agency-admin-uuid-001",
  email: "agencyadmin@test.com",
};

const VALID_BUYER_ID = "550e8400-e29b-41d4-a716-446655440000";

// ─── Helper: Create mock Supabase client ──────────────────────────────────────

function mockSupabaseClient(user: any, role: string) {
  const mockClient = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { role },
        error: null,
      }),
    }),
  };
  (createClient as any).mockResolvedValue(mockClient);
  return mockClient;
}

// ─── AC5: Auth Guard — platform_admin only ────────────────────────────────────

describe("POST /api/v1/admin/preference-vectors/compute — Auth (AC5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.skip(
    "[P0] T10.1-35: returns 403 when buyer attempts access",
    async () => {
      mockSupabaseClient(BUYER_USER, "buyer");

      const { POST } = await import("./route");

      const req = new Request(
        "http://localhost:3000/api/v1/admin/preference-vectors/compute",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );

      const response = await POST(req);
      expect(response.status).toBe(403);
    }
  );

  it.skip(
    "[P0] T10.1-36: returns 403 when agent attempts access",
    async () => {
      mockSupabaseClient(AGENT_USER, "agent");

      const { POST } = await import("./route");

      const req = new Request(
        "http://localhost:3000/api/v1/admin/preference-vectors/compute",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );

      const response = await POST(req);
      expect(response.status).toBe(403);
    }
  );

  it.skip(
    "[P0] T10.1-37: returns 403 when agency_admin attempts access",
    async () => {
      mockSupabaseClient(AGENCY_ADMIN_USER, "agency_admin");

      const { POST } = await import("./route");

      const req = new Request(
        "http://localhost:3000/api/v1/admin/preference-vectors/compute",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );

      const response = await POST(req);
      expect(response.status).toBe(403);
    }
  );

  it.skip(
    "[P0] T10.1-38: returns 401 when no user session exists",
    async () => {
      const mockClient = {
        auth: {
          getUser: vi
            .fn()
            .mockResolvedValue({ data: { user: null }, error: null }),
        },
      };
      (createClient as any).mockResolvedValue(mockClient);

      const { POST } = await import("./route");

      const req = new Request(
        "http://localhost:3000/api/v1/admin/preference-vectors/compute",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );

      const response = await POST(req);
      expect(response.status).toBe(401);
    }
  );
});

// ─── AC5: Single buyer computation ────────────────────────────────────────────

describe("POST /api/v1/admin/preference-vectors/compute — Single Buyer (AC5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.skip(
    "[P0] T10.1-39: returns success with vector details when buyerId provided",
    async () => {
      mockSupabaseClient(PLATFORM_ADMIN_USER, "platform_admin");

      const { POST } = await import("./route");

      const req = new Request(
        "http://localhost:3000/api/v1/admin/preference-vectors/compute",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ buyerId: VALID_BUYER_ID }),
        }
      );

      const response = await POST(req);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.error).toBeNull();
      expect(body.data).toHaveProperty("buyerId", VALID_BUYER_ID);
      expect(body.data).toHaveProperty("vectorComputed");
      expect(body.data).toHaveProperty("swipeCount");
      expect(body.data).toHaveProperty("engagementEventCount");
    }
  );

  it.skip(
    "[P1] T10.1-40: response shape follows ApiResponse convention for single buyer",
    async () => {
      mockSupabaseClient(PLATFORM_ADMIN_USER, "platform_admin");

      const { POST } = await import("./route");

      const req = new Request(
        "http://localhost:3000/api/v1/admin/preference-vectors/compute",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ buyerId: VALID_BUYER_ID }),
        }
      );

      const response = await POST(req);
      const body = await response.json();

      // ApiResponse<T> = { data: T | null, error: { code: string, message: string } | null }
      expect(body).toHaveProperty("data");
      expect(body).toHaveProperty("error");
      expect(typeof body.data.vectorComputed).toBe("boolean");
      expect(typeof body.data.swipeCount).toBe("number");
      expect(typeof body.data.engagementEventCount).toBe("number");
    }
  );
});

// ─── AC5: Batch computation ───────────────────────────────────────────────────

describe("POST /api/v1/admin/preference-vectors/compute — Batch (AC5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.skip(
    "[P0] T10.1-41: returns batch result when no buyerId provided",
    async () => {
      mockSupabaseClient(PLATFORM_ADMIN_USER, "platform_admin");

      const { POST } = await import("./route");

      const req = new Request(
        "http://localhost:3000/api/v1/admin/preference-vectors/compute",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );

      const response = await POST(req);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.error).toBeNull();
      expect(body.data).toHaveProperty("processedCount");
      expect(body.data).toHaveProperty("skippedCount");
      expect(body.data).toHaveProperty("durationMs");
    }
  );

  it.skip(
    "[P1] T10.1-42: batch response has correct types for processedCount, skippedCount, durationMs",
    async () => {
      mockSupabaseClient(PLATFORM_ADMIN_USER, "platform_admin");

      const { POST } = await import("./route");

      const req = new Request(
        "http://localhost:3000/api/v1/admin/preference-vectors/compute",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );

      const response = await POST(req);
      const body = await response.json();

      expect(typeof body.data.processedCount).toBe("number");
      expect(typeof body.data.skippedCount).toBe("number");
      expect(typeof body.data.durationMs).toBe("number");
      expect(body.data.processedCount).toBeGreaterThanOrEqual(0);
      expect(body.data.skippedCount).toBeGreaterThanOrEqual(0);
      expect(body.data.durationMs).toBeGreaterThanOrEqual(0);
    }
  );
});
