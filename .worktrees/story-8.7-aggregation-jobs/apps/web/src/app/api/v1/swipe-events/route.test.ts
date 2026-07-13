/**
 * Story 4.2 — API Route Tests: POST /api/v1/swipe-events
 *
 * Tests cover real implementation (replaces stub tests from Story 2.3).
 * Uses vi.mock for Supabase + Drizzle DB + notifyAgent.
 *
 * Run: pnpm --filter @reinder/web test apps/web/src/app/api/v1/swipe-events/route.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/db", () => ({
  db: {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([
      {
        id: "evt-uuid-1",
        buyerId: "buyer-uuid-1",
        listingId: "listing-uuid-1",
        action: "match",
        createdAt: new Date("2026-04-28T10:00:00Z"),
      },
    ]),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@/features/agent-link/lib/notify-agent", () => ({
  notifyAgent: vi.fn().mockResolvedValue(undefined),
}));

import { createClient } from "@/lib/supabase/server";
import { POST } from "@/app/api/v1/swipe-events/route";
import { notifyAgent } from "@/features/agent-link/lib/notify-agent";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const BUYER_USER = { id: "buyer-uuid-1", email: "buyer@test.com" };

const makeSupabaseMock = (user: typeof BUYER_USER | null) => ({
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user },
      error: user ? null : { message: "Not authenticated" },
    }),
  },
});

const makeRequest = (body: object) =>
  new Request("http://localhost:3000/api/v1/swipe-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/v1/swipe-events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── T4.2-01: match persists and notifies agent ───
  it("T4.2-01: returns 200 with match event when action=match", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(BUYER_USER) as any
    );

    const req = makeRequest({ action: "match", listingId: "listing-uuid-1" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.action).toBe("match");
    expect(body.data.buyerId).toBe(BUYER_USER.id);
    expect(body.error).toBeNull();
  });

  // ─── T4.2-02: reject persists without agent notification ───
  it("T4.2-02: returns 200 with reject event when action=reject", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(BUYER_USER) as any
    );

    // Override mock: reject event
    const { db } = await import("@/lib/supabase/db");
    vi.mocked(db.insert(null as any).values(null as any).returning as any).mockResolvedValueOnce([
      {
        id: "evt-uuid-2",
        buyerId: BUYER_USER.id,
        listingId: "listing-uuid-1",
        action: "reject",
        createdAt: new Date("2026-04-28T10:00:00Z"),
      },
    ]);

    const req = makeRequest({ action: "reject", listingId: "listing-uuid-1" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.action).toBe("reject");
    // notifyAgent should NOT be called for rejects
    expect(notifyAgent).not.toHaveBeenCalled();
  });

  // ─── T4.2-03: 401 when not authenticated ───
  it("T4.2-03: returns 401 when user is not authenticated", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(null) as any
    );

    const req = makeRequest({ action: "match", listingId: "listing-uuid-1" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  // ─── T4.2-04: 400 when action is invalid ───
  it("T4.2-04: returns 400 for invalid action", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(BUYER_USER) as any
    );

    const req = makeRequest({ action: "like", listingId: "listing-uuid-1" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("INVALID_ACTION");
  });

  // ─── T4.2-05: 400 when required fields missing ───
  it("T4.2-05: returns 400 when listingId is missing", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(BUYER_USER) as any
    );

    const req = makeRequest({ action: "match" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("INVALID_INPUT");
  });
});
