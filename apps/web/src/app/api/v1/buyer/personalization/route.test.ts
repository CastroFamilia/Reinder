/**
 * Story 10.5 — ATDD Tests: PATCH /api/v1/buyer/personalization
 *
 * AC2: API endpoint for toggling personalization on/off
 *      - buyer only (403 for agent, agency_admin, platform_admin)
 *      - 401 for unauthenticated
 *      - Toggle to disabled: { enabled: false }
 *      - Toggle to enabled: { enabled: true }
 *      - Response shape: { data: { personalizationEnabled, updatedAt }, error: null }
 *
 * AC1: Schema field personalization_enabled exists in user_profiles
 *
 * Run: pnpm --filter @reinder/web test apps/web/src/app/api/v1/buyer/personalization/route.test.ts
 */

import { describe, expect, vi, beforeEach, test } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";

/*
 * Provider Scrutiny Evidence:
 * - Handler: NEW — not yet implemented (TDD red phase)
 * - Route file: apps/web/src/app/api/v1/buyer/personalization/route.ts (does not exist yet)
 * - Expected from acceptance criteria (Story 10.5, AC2):
 *   - Endpoint: PATCH /api/v1/buyer/personalization
 *   - Auth: buyer role required (403 for agent/agency_admin/platform_admin, 401 for unauth)
 *   - Request body: { enabled: boolean }
 *   - Response: { data: { personalizationEnabled: boolean, updatedAt: string }, error: null }
 */

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const BUYER_USER = { id: "buyer-uuid-001", email: "buyer@test.com" };
const AGENT_USER = { id: "agent-uuid-001", email: "agent@test.com" };
const AGENCY_ADMIN_USER = {
  id: "agency-admin-uuid-001",
  email: "agencyadmin@test.com",
};
const PLATFORM_ADMIN_USER = {
  id: "admin-uuid-001",
  email: "admin@reinder.com",
};

const API_URL = "http://localhost:3000/api/v1/buyer/personalization";

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
      update: vi.fn().mockReturnThis(),
    }),
  };
  (createClient as any).mockResolvedValue(mockClient);
  return mockClient;
}

function makeRequest(body: unknown): Request {
  return new Request(API_URL, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ─── AC2: Auth Guard — buyer only ─────────────────────────────────────────────

describe("PATCH /api/v1/buyer/personalization — Auth (AC2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  test("[P0] T10.5-01: returns 401 when no user session exists", async () => {
    const mockClient = {
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: null }, error: null }),
      },
    };
    (createClient as any).mockResolvedValue(mockClient);

    const { PATCH } = await import("./route");

    const response = await PATCH(makeRequest({ enabled: false }));
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.data).toBeNull();
    expect(body.error).toBeDefined();
    expect(body.error.code).toBeDefined();
  });

  test("[P0] T10.5-02: returns 403 when agent attempts access", async () => {
    mockSupabaseClient(AGENT_USER, "agent");

    const { PATCH } = await import("./route");

    const response = await PATCH(makeRequest({ enabled: false }));
    expect(response.status).toBe(403);

    const body = await response.json();
    expect(body.data).toBeNull();
    expect(body.error).toBeDefined();
  });

  test("[P0] T10.5-03: returns 403 when agency_admin attempts access", async () => {
    mockSupabaseClient(AGENCY_ADMIN_USER, "agency_admin");

    const { PATCH } = await import("./route");

    const response = await PATCH(makeRequest({ enabled: false }));
    expect(response.status).toBe(403);

    const body = await response.json();
    expect(body.data).toBeNull();
    expect(body.error).toBeDefined();
  });

  test("[P0] T10.5-04: returns 403 when platform_admin attempts access", async () => {
    mockSupabaseClient(PLATFORM_ADMIN_USER, "platform_admin");

    const { PATCH } = await import("./route");

    const response = await PATCH(makeRequest({ enabled: false }));
    expect(response.status).toBe(403);

    const body = await response.json();
    expect(body.data).toBeNull();
    expect(body.error).toBeDefined();
  });
});

// ─── AC2: Disable personalization ─────────────────────────────────────────────

describe("PATCH /api/v1/buyer/personalization — Disable (AC2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  test("[P0] T10.5-05: buyer disables personalization successfully", async () => {
    mockSupabaseClient(BUYER_USER, "buyer");

    const { PATCH } = await import("./route");

    const response = await PATCH(makeRequest({ enabled: false }));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.error).toBeNull();
    expect(body.data).toBeDefined();
    expect(body.data.personalizationEnabled).toBe(false);
    expect(body.data.updatedAt).toBeDefined();
    expect(typeof body.data.updatedAt).toBe("string");
  });

  test("[P0] T10.5-06: buyer enables personalization successfully", async () => {
    mockSupabaseClient(BUYER_USER, "buyer");

    const { PATCH } = await import("./route");

    const response = await PATCH(makeRequest({ enabled: true }));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.error).toBeNull();
    expect(body.data).toBeDefined();
    expect(body.data.personalizationEnabled).toBe(true);
    expect(body.data.updatedAt).toBeDefined();
  });

  test("[P1] T10.5-07: response follows ApiResponse<T> convention", async () => {
    mockSupabaseClient(BUYER_USER, "buyer");

    const { PATCH } = await import("./route");

    const response = await PATCH(makeRequest({ enabled: false }));
    const body = await response.json();

    // ApiResponse<T> = { data: T | null, error: { code: string, message: string } | null }
    expect(body).toHaveProperty("data");
    expect(body).toHaveProperty("error");
    expect(typeof body.data.personalizationEnabled).toBe("boolean");
    expect(typeof body.data.updatedAt).toBe("string");
  });
});

// ─── AC2: Input validation ────────────────────────────────────────────────────

describe("PATCH /api/v1/buyer/personalization — Validation (AC2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  test("[P1] T10.5-08: rejects request with missing enabled field", async () => {
    mockSupabaseClient(BUYER_USER, "buyer");

    const { PATCH } = await import("./route");

    const response = await PATCH(makeRequest({}));
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.data).toBeNull();
    expect(body.error).toBeDefined();
  });

  test("[P1] T10.5-09: rejects request with non-boolean enabled field", async () => {
    mockSupabaseClient(BUYER_USER, "buyer");

    const { PATCH } = await import("./route");

    const response = await PATCH(makeRequest({ enabled: "yes" }));
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.data).toBeNull();
    expect(body.error).toBeDefined();
  });

  test("[P2] T10.5-10: rejects request with invalid JSON body", async () => {
    mockSupabaseClient(BUYER_USER, "buyer");

    const { PATCH } = await import("./route");

    const req = new Request(API_URL, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "not-valid-json",
    });

    const response = await PATCH(req);
    expect(response.status).toBe(400);
  });
});

// ─── AC2: Updates only the caller's own record ───────────────────────────────

describe("PATCH /api/v1/buyer/personalization — Own Record (AC2, AC7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  test("[P0] T10.5-11: update targets auth.uid() — buyer updates own profile only", async () => {
    const mockClient = mockSupabaseClient(BUYER_USER, "buyer");

    // Track chained calls on the "user_profiles" table
    const mockEq = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    mockClient.from.mockImplementation((table: string) => {
      if (table === "user_profiles") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { role: "buyer" }, error: null }),
          update: mockUpdate,
        };
      }
      return {};
    });

    const { PATCH } = await import("./route");

    const response = await PATCH(makeRequest({ enabled: false }));
    expect(response.status).toBe(200);

    // Verify update was called with the correct payload
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ personalization_enabled: false })
    );
    // Verify eq filter targets the buyer's own ID (auth.uid())
    expect(mockEq).toHaveBeenCalledWith("id", BUYER_USER.id);

    const body = await response.json();
    expect(body.data.personalizationEnabled).toBe(false);
  });
});
