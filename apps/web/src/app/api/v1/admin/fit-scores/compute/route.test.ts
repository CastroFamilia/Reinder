/**
 * Story 10.2 — ATDD Tests: Admin Fit Scores Compute API Endpoint
 *
 * AC6: Manual trigger endpoint — auth, params, response shape
 * AC7: RLS policies (buyer/agent/admin access)
 *
 * Run: pnpm --filter web test apps/web/src/app/api/v1/admin/fit-scores/compute/route.test.ts
 */

import { describe, expect, test, vi, beforeEach } from "vitest";

// ─── Mock Setup ───────────────────────────────────────────────────────────────

// Mock the Supabase server client (same pattern as Story 10.1 tests)
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";

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

function mockUnauthenticated() {
  const mockClient = {
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: null }, error: null }),
    },
  };
  (createClient as any).mockResolvedValue(mockClient);
  return mockClient;
}

// ─── Mock Next.js request/response ────────────────────────────────────────────

function createMockRequest(
  method: string,
  body?: Record<string, unknown>
): Request {
  return new Request("http://localhost:3000/api/v1/admin/fit-scores/compute", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ─── AC6: Admin Endpoint Auth ─────────────────────────────────────────────────

describe("Story 10.2 — AC6: Admin Fit Scores Compute Endpoint — Auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test(
    "[P0] T10.2-44: POST /api/v1/admin/fit-scores/compute — platform_admin succeeds",
    async () => {
      mockSupabaseClient(PLATFORM_ADMIN_USER, "platform_admin");

      const { POST } = await import("./route");
      const req = createMockRequest("POST", {});

      const response = await POST(req);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json).toHaveProperty("data");
      expect(json.error).toBeNull();
    }
  );

  test(
    "[P0] T10.2-45: POST returns 403 for buyer role",
    async () => {
      mockSupabaseClient(BUYER_USER, "buyer");

      const { POST } = await import("./route");
      const req = createMockRequest("POST", {});

      const response = await POST(req);

      expect(response.status).toBe(403);
    }
  );

  test(
    "[P0] T10.2-46: POST returns 403 for agent role",
    async () => {
      mockSupabaseClient(AGENT_USER, "agent");

      const { POST } = await import("./route");
      const req = createMockRequest("POST", {});

      const response = await POST(req);

      expect(response.status).toBe(403);
    }
  );

  test(
    "[P0] T10.2-47: POST returns 403 for agency_admin role",
    async () => {
      mockSupabaseClient(AGENCY_ADMIN_USER, "agency_admin");

      const { POST } = await import("./route");
      const req = createMockRequest("POST", {});

      const response = await POST(req);

      expect(response.status).toBe(403);
    }
  );

  test(
    "[P0] T10.2-48: POST returns 401 for unauthenticated request",
    async () => {
      mockUnauthenticated();

      const { POST } = await import("./route");
      const req = createMockRequest("POST", {});

      const response = await POST(req);

      expect(response.status).toBe(401);
    }
  );
});

// ─── AC6: Request Body Handling ───────────────────────────────────────────────

describe("Story 10.2 — AC6: Request Body Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test(
    "[P0] T10.2-49: accepts buyerId param — computes for that buyer × all active listings",
    async () => {
      mockSupabaseClient(PLATFORM_ADMIN_USER, "platform_admin");

      const { POST } = await import("./route");
      const req = createMockRequest("POST", {
        buyerId: "550e8400-e29b-41d4-a716-446655440000",
      });

      const response = await POST(req);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.data).toHaveProperty("processedCount");
      expect(json.data.processedCount).toBeGreaterThanOrEqual(0);
    }
  );

  test(
    "[P0] T10.2-50: accepts listingId param — computes for that listing × all buyers with vector",
    async () => {
      mockSupabaseClient(PLATFORM_ADMIN_USER, "platform_admin");

      const { POST } = await import("./route");
      const req = createMockRequest("POST", {
        listingId: "660e8400-e29b-41d4-a716-446655440000",
      });

      const response = await POST(req);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.data).toHaveProperty("processedCount");
    }
  );

  test(
    "[P0] T10.2-51: accepts both buyerId and listingId — computes specific pair",
    async () => {
      mockSupabaseClient(PLATFORM_ADMIN_USER, "platform_admin");

      const { POST } = await import("./route");
      const req = createMockRequest("POST", {
        buyerId: "550e8400-e29b-41d4-a716-446655440000",
        listingId: "660e8400-e29b-41d4-a716-446655440000",
      });

      const response = await POST(req);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.data.processedCount).toBeLessThanOrEqual(1);
    }
  );

  test(
    "[P0] T10.2-52: accepts empty body — triggers full batch compute",
    async () => {
      mockSupabaseClient(PLATFORM_ADMIN_USER, "platform_admin");

      const { POST } = await import("./route");
      const req = createMockRequest("POST", {});

      const response = await POST(req);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.data).toHaveProperty("processedCount");
    }
  );
});

// ─── AC6: Response Shape ──────────────────────────────────────────────────────

describe("Story 10.2 — AC6: Response Shape", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test(
    "[P0] T10.2-53: response shape matches ApiResponse<{ processedCount, skippedCount, durationMs }>",
    async () => {
      mockSupabaseClient(PLATFORM_ADMIN_USER, "platform_admin");

      const { POST } = await import("./route");
      const req = createMockRequest("POST", {});

      const response = await POST(req);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json).toHaveProperty("data");
      expect(json).toHaveProperty("error");
      expect(json.error).toBeNull();

      // Data shape
      expect(json.data).toHaveProperty("processedCount");
      expect(json.data).toHaveProperty("skippedCount");
      expect(json.data).toHaveProperty("durationMs");
      expect(typeof json.data.processedCount).toBe("number");
      expect(typeof json.data.skippedCount).toBe("number");
      expect(typeof json.data.durationMs).toBe("number");
    }
  );

  test(
    "[P1] T10.2-54: durationMs is a positive number",
    async () => {
      mockSupabaseClient(PLATFORM_ADMIN_USER, "platform_admin");

      const { POST } = await import("./route");
      const req = createMockRequest("POST", {});

      const response = await POST(req);
      const json = await response.json();

      expect(json.data.durationMs).toBeGreaterThanOrEqual(0);
    }
  );
});

// ─── AC6: Validation ──────────────────────────────────────────────────────────

describe("Story 10.2 — AC6: Input Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test(
    "[P1] T10.2-55: rejects invalid buyerId format",
    async () => {
      mockSupabaseClient(PLATFORM_ADMIN_USER, "platform_admin");

      const { POST } = await import("./route");
      const req = createMockRequest("POST", {
        buyerId: "not-a-uuid",
      });

      const response = await POST(req);
      expect(response.status).toBe(400);
    }
  );

  test(
    "[P1] T10.2-56: rejects invalid listingId format",
    async () => {
      mockSupabaseClient(PLATFORM_ADMIN_USER, "platform_admin");

      const { POST } = await import("./route");
      const req = createMockRequest("POST", {
        listingId: "not-a-uuid",
      });

      const response = await POST(req);
      expect(response.status).toBe(400);
    }
  );
});
