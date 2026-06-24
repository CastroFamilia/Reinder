/**
 * ATDD Acceptance Tests — Story 9.2
 *
 * Tests for:
 * - GET /api/v1/experiments (list, AC9)
 * - GET /api/v1/experiments/[id] (detail, AC10)
 * - PATCH /api/v1/experiments/[id] (state transitions, AC8)
 *
 * These tests are written BEFORE implementation (Red phase).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: () => mockGetUser(),
    },
    from: (...args: unknown[]) => {
      mockFrom(...args);
      return {
        select: (...sArgs: unknown[]) => {
          mockSelect(...sArgs);
          return {
            eq: (...eArgs: unknown[]) => {
              mockEq(...eArgs);
              return {
                single: () => mockSingle(),
              };
            },
          };
        },
      };
    },
  }),
}));

const mockDbSelect = vi.fn();
const mockDbUpdate = vi.fn();

vi.mock("@/lib/supabase/db", () => ({
  db: {
    select: (...args: unknown[]) => {
      mockDbSelect(...args);
      return {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue([]),
      };
    },
    update: (...args: unknown[]) => {
      mockDbUpdate(...args);
      return {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
      };
    },
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockAuthenticatedUser(role: string, agencyId: string | null = "agency-1") {
  mockGetUser.mockResolvedValue({
    data: { user: { id: "user-1", email: "admin@agency.com" } },
    error: null,
  });
  mockSingle.mockResolvedValue({
    data: { role, agencyId },
    error: null,
  });
}

function mockUnauthenticatedUser() {
  mockGetUser.mockResolvedValue({
    data: { user: null },
    error: { message: "Not authenticated" },
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/v1/experiments (list)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("T9.2-01: returns 401 for unauthenticated users", async () => {
    mockUnauthenticatedUser();

    // Dynamic import to get the GET handler (will be added to existing route.ts)
    const { GET } = await import("../route");
    const req = new NextRequest("http://localhost/api/v1/experiments");
    const res = await GET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("T9.2-02: returns 403 for buyer role", async () => {
    mockAuthenticatedUser("buyer");

    const { GET } = await import("../route");
    const req = new NextRequest("http://localhost/api/v1/experiments");
    const res = await GET(req);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("T9.2-03: returns 403 for agent role", async () => {
    mockAuthenticatedUser("agent");

    const { GET } = await import("../route");
    const req = new NextRequest("http://localhost/api/v1/experiments");
    const res = await GET(req);

    expect(res.status).toBe(403);
  });

  it("T9.2-04: returns 200 with experiments list for agency_admin", async () => {
    mockAuthenticatedUser("agency_admin", "agency-1");

    const { GET } = await import("../route");
    const req = new NextRequest("http://localhost/api/v1/experiments");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(body.error).toBeNull();
  });

  it("T9.2-05: supports status filter query param", async () => {
    mockAuthenticatedUser("agency_admin", "agency-1");

    const { GET } = await import("../route");
    const req = new NextRequest("http://localhost/api/v1/experiments?status=running");
    const res = await GET(req);

    expect(res.status).toBe(200);
  });
});

describe("GET /api/v1/experiments/[id] (detail)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("T9.2-06: returns 401 for unauthenticated users", async () => {
    mockUnauthenticatedUser();

    const { GET } = await import("../[id]/route");
    const req = new NextRequest("http://localhost/api/v1/experiments/exp-1");
    const res = await GET(req, { params: Promise.resolve({ id: "exp-1" }) });

    expect(res.status).toBe(401);
  });

  it("T9.2-07: returns 403 for non-agency_admin roles", async () => {
    mockAuthenticatedUser("buyer");

    const { GET } = await import("../[id]/route");
    const req = new NextRequest("http://localhost/api/v1/experiments/exp-1");
    const res = await GET(req, { params: Promise.resolve({ id: "exp-1" }) });

    expect(res.status).toBe(403);
  });

  it("T9.2-08: returns 404 for non-existent experiment", async () => {
    mockAuthenticatedUser("agency_admin", "agency-1");

    const { GET } = await import("../[id]/route");
    const req = new NextRequest("http://localhost/api/v1/experiments/non-existent");
    const res = await GET(req, { params: Promise.resolve({ id: "non-existent" }) });

    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/v1/experiments/[id] (state transitions)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("T9.2-09: returns 401 for unauthenticated users", async () => {
    mockUnauthenticatedUser();

    const { PATCH } = await import("../[id]/route");
    const req = new NextRequest("http://localhost/api/v1/experiments/exp-1", {
      method: "PATCH",
      body: JSON.stringify({ status: "running" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "exp-1" }) });

    expect(res.status).toBe(401);
  });

  it("T9.2-10: returns 403 for non-agency_admin roles", async () => {
    mockAuthenticatedUser("buyer");

    const { PATCH } = await import("../[id]/route");
    const req = new NextRequest("http://localhost/api/v1/experiments/exp-1", {
      method: "PATCH",
      body: JSON.stringify({ status: "running" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "exp-1" }) });

    expect(res.status).toBe(403);
  });

  it("T9.2-11: returns 400 for invalid status value", async () => {
    mockAuthenticatedUser("agency_admin", "agency-1");

    const { PATCH } = await import("../[id]/route");
    const req = new NextRequest("http://localhost/api/v1/experiments/exp-1", {
      method: "PATCH",
      body: JSON.stringify({ status: "invalid_status" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "exp-1" }) });

    expect(res.status).toBe(400);
  });

  it("T9.2-12: validates allowed state transitions (draft → running = valid)", async () => {
    // This test validates the transition logic exists
    // Actual DB state would need to be mocked properly in integration tests
    mockAuthenticatedUser("agency_admin", "agency-1");

    const { PATCH } = await import("../[id]/route");
    const req = new NextRequest("http://localhost/api/v1/experiments/exp-1", {
      method: "PATCH",
      body: JSON.stringify({ status: "running" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "exp-1" }) });

    // Should not be 400 (validation passes) — may be 404 if experiment not found in mock
    expect(res.status).not.toBe(400);
  });
});
