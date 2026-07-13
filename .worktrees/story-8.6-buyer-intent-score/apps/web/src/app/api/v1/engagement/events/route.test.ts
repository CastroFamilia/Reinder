/**
 * Story 8.1 — ATDD Tests: POST /api/v1/engagement/events
 *
 * Tests cover:
 * - T8.1-04: Batch event submission
 * - T8.1-05: 401 for unauthenticated requests
 * - T8.1-06: 403 for non-buyer roles
 * - T8.1-07: buyer_id enforced from auth.uid()
 *
 * Run: pnpm --filter @reinder/web test apps/web/src/app/api/v1/engagement/events/route.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/db", () => ({
  db: {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue([]),
  },
}));

import { createClient } from "@/lib/supabase/server";
import { POST } from "@/app/api/v1/engagement/events/route";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const BUYER_USER = { id: "buyer-uuid-1", email: "buyer@test.com" };
const AGENT_USER = { id: "agent-uuid-1", email: "agent@test.com" };

const makeSupabaseMock = (
  user: typeof BUYER_USER | null,
  role: string = "buyer"
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
        maybeSingle: vi.fn().mockResolvedValue({
          data: user ? { role } : null,
          error: null,
        }),
      }),
    }),
  }),
});

const validEvents = [
  {
    listingId: "listing-uuid-1",
    sessionId: "session-uuid-1",
    eventType: "photo_view",
    payload: { photo_index: 0, duration_ms: 2500 },
    createdAt: "2026-05-17T10:00:00Z",
  },
  {
    listingId: "listing-uuid-1",
    sessionId: "session-uuid-1",
    eventType: "scroll_depth",
    payload: { max_depth_pct: 75 },
    createdAt: "2026-05-17T10:00:05Z",
  },
];

const makeRequest = (body: unknown) =>
  new Request("http://localhost:3000/api/v1/engagement/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/v1/engagement/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── T8.1-04: Batch event submission ──────────────────────────────────

  it("T8.1-04: returns 200 and inserts batch of valid events", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(BUYER_USER, "buyer") as any
    );

    const req = makeRequest({ events: validEvents });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.inserted).toBe(2);
    expect(body.error).toBeNull();
  });

  // ─── T8.1-05: 401 for unauthenticated ────────────────────────────────

  it("T8.1-05: returns 401 when user is not authenticated", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(null) as any
    );

    const req = makeRequest({ events: validEvents });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  // ─── T8.1-06: 403 for non-buyer roles ────────────────────────────────

  it("T8.1-06: returns 403 when user role is agent", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(AGENT_USER, "agent") as any
    );

    const req = makeRequest({ events: validEvents });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("T8.1-06b: returns 403 when user role is agency_admin", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(AGENT_USER, "agency_admin") as any
    );

    const req = makeRequest({ events: validEvents });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("T8.1-06c: returns 403 when user role is platform_admin", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(AGENT_USER, "platform_admin") as any
    );

    const req = makeRequest({ events: validEvents });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  // ─── Validation ───────────────────────────────────────────────────────

  it("returns 400 when events array is missing", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(BUYER_USER, "buyer") as any
    );

    const req = makeRequest({});
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("INVALID_INPUT");
  });

  it("returns 400 when events array is empty", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(BUYER_USER, "buyer") as any
    );

    const req = makeRequest({ events: [] });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("INVALID_INPUT");
  });

  it("returns 400 for invalid event type", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(BUYER_USER, "buyer") as any
    );

    const req = makeRequest({
      events: [
        {
          listingId: "listing-uuid-1",
          sessionId: "session-uuid-1",
          eventType: "invalid_type",
          payload: {},
          createdAt: "2026-05-17T10:00:00Z",
        },
      ],
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("INVALID_EVENT_TYPE");
  });

  it("returns 400 when event is missing required fields", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(BUYER_USER, "buyer") as any
    );

    const req = makeRequest({
      events: [
        {
          // missing listingId, sessionId
          eventType: "photo_view",
          payload: { photo_index: 0, duration_ms: 2500 },
        },
      ],
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("INVALID_INPUT");
  });

  // ─── T8.1-07: buyer_id enforced from auth.uid() ──────────────────────

  it("T8.1-07: uses auth.uid() as buyer_id, not client-provided value", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(BUYER_USER, "buyer") as any
    );

    const { db } = await import("@/lib/supabase/db");
    const valuesSpy = vi.mocked(db.insert(null as any).values as any);

    const req = makeRequest({
      events: [
        {
          listingId: "listing-uuid-1",
          sessionId: "session-uuid-1",
          eventType: "photo_view",
          payload: { photo_index: 0, duration_ms: 2500 },
          createdAt: "2026-05-17T10:00:00Z",
          // Client tries to spoof buyer_id — should be ignored
          buyerId: "spoofed-buyer-id",
        },
      ],
    });

    await POST(req);

    // Verify that the insert was called with auth user's ID
    expect(valuesSpy).toHaveBeenCalled();
    const insertedRows = valuesSpy.mock.calls[0][0];
    expect(insertedRows[0].buyerId).toBe(BUYER_USER.id);
  });
});
