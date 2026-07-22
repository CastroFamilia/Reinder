/**
 * Story 10.2 — ATDD Tests: Admin Fit Scores Compute API Endpoint
 *
 * AC6: Manual trigger endpoint — auth, params, response shape
 * AC7: RLS policies (buyer/agent/admin access)
 *
 * TDD RED PHASE: All tests use test.skip() — they MUST fail until
 * the feature is implemented. Do NOT remove test.skip().
 *
 * Run: pnpm --filter web test apps/web/src/app/api/v1/admin/fit-scores/compute/route.test.ts
 */

import { describe, it, expect, test, vi, beforeEach, afterEach } from "vitest";

// ─── Mock Setup ───────────────────────────────────────────────────────────────

// Mock the Supabase SSR createServerClient
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}));

// Mock Next.js request/response
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
  test.skip(
    "[P0] T10.2-44: POST /api/v1/admin/fit-scores/compute — platform_admin succeeds",
    async () => {
      const { POST } = await import("./route");
      const req = createMockRequest("POST", {});

      // Mock: authenticated platform_admin
      // Implementation should check role via createServerClient
      const response = await POST(req);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json).toHaveProperty("data");
      expect(json.error).toBeNull();
    }
  );

  test.skip(
    "[P0] T10.2-45: POST returns 403 for buyer role",
    async () => {
      const { POST } = await import("./route");
      const req = createMockRequest("POST", {});

      // Mock: authenticated buyer
      const response = await POST(req);

      expect(response.status).toBe(403);
    }
  );

  test.skip(
    "[P0] T10.2-46: POST returns 403 for agent role",
    async () => {
      const { POST } = await import("./route");
      const req = createMockRequest("POST", {});

      // Mock: authenticated agent
      const response = await POST(req);

      expect(response.status).toBe(403);
    }
  );

  test.skip(
    "[P0] T10.2-47: POST returns 403 for agency_admin role",
    async () => {
      const { POST } = await import("./route");
      const req = createMockRequest("POST", {});

      // Mock: authenticated agency_admin
      const response = await POST(req);

      expect(response.status).toBe(403);
    }
  );

  test.skip(
    "[P0] T10.2-48: POST returns 401 for unauthenticated request",
    async () => {
      const { POST } = await import("./route");
      const req = createMockRequest("POST", {});

      // Mock: no auth session
      const response = await POST(req);

      expect(response.status).toBe(401);
    }
  );
});

// ─── AC6: Request Body Handling ───────────────────────────────────────────────

describe("Story 10.2 — AC6: Request Body Handling", () => {
  test.skip(
    "[P0] T10.2-49: accepts buyerId param — computes for that buyer × all active listings",
    async () => {
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

  test.skip(
    "[P0] T10.2-50: accepts listingId param — computes for that listing × all buyers with vector",
    async () => {
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

  test.skip(
    "[P0] T10.2-51: accepts both buyerId and listingId — computes specific pair",
    async () => {
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

  test.skip(
    "[P0] T10.2-52: accepts empty body — triggers full batch compute",
    async () => {
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
  test.skip(
    "[P0] T10.2-53: response shape matches ApiResponse<{ processedCount, skippedCount, durationMs }>",
    async () => {
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

  test.skip(
    "[P1] T10.2-54: durationMs is a positive number",
    async () => {
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
  test.skip(
    "[P1] T10.2-55: rejects invalid buyerId format",
    async () => {
      const { POST } = await import("./route");
      const req = createMockRequest("POST", {
        buyerId: "not-a-uuid",
      });

      const response = await POST(req);
      expect(response.status).toBe(400);
    }
  );

  test.skip(
    "[P1] T10.2-56: rejects invalid listingId format",
    async () => {
      const { POST } = await import("./route");
      const req = createMockRequest("POST", {
        listingId: "not-a-uuid",
      });

      const response = await POST(req);
      expect(response.status).toBe(400);
    }
  );
});
