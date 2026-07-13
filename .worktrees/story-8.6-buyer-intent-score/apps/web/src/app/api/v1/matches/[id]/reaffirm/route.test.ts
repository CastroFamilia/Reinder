/**
 * Story 8.4 — ATDD Tests: POST /api/v1/matches/{id}/reaffirm
 *
 * Tests cover:
 * - T8.4-01: Reaffirm creates match_reaffirm event linked to match
 * - T8.4-02: Creates event + emits Realtime broadcast
 * - T8.4-04: Non-owner buyer → 404 (match not found)
 * - T8.4-05: Already-reaffirmed match → idempotent
 * - Auth: 401 for unauthenticated
 *
 * Run: pnpm --filter @reinder/web test -- src/app/api/v1/matches/[id]/reaffirm/route.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const sendMock = vi.fn().mockResolvedValue({});
const channelMock = vi.fn().mockReturnValue({ send: sendMock });

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

const dbSelectMock = vi.fn();
const dbInsertMock = vi.fn();
const dbUpdateMock = vi.fn();

vi.mock("@/lib/supabase/db", () => ({
  db: {
    select: vi.fn().mockImplementation(() => ({
      from: vi.fn().mockImplementation(() => ({
        where: vi.fn().mockImplementation(() => ({
          limit: dbSelectMock,
        })),
      })),
    })),
    insert: vi.fn().mockImplementation(() => ({
      values: dbInsertMock,
    })),
    update: vi.fn().mockImplementation(() => ({
      set: vi.fn().mockImplementation(() => ({
        where: dbUpdateMock,
      })),
    })),
  },
}));

import { createClient } from "@/lib/supabase/server";
import { POST } from "./route";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const BUYER_USER = { id: "buyer-uuid-1", email: "buyer@test.com" };
const MATCH_ID = "match-uuid-1";
const LISTING_ID = "listing-uuid-1";
const AGENT_ID = "agent-uuid-1";

const makeSupabaseMock = (user: typeof BUYER_USER | null) => ({
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user },
      error: user ? null : { message: "Not authenticated" },
    }),
  },
  channel: channelMock,
});

const makeParams = (id: string) => ({
  params: Promise.resolve({ id }),
});

const makeRequest = () =>
  new Request(`http://localhost:3000/api/v1/matches/${MATCH_ID}/reaffirm`, {
    method: "POST",
  });

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/v1/matches/{id}/reaffirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Auth ─────────────────────────────────────────────────────────────

  it("returns 401 when user is not authenticated", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock(null) as any);

    const res = await POST(makeRequest(), makeParams(MATCH_ID));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  // ─── T8.4-04: Non-owner buyer → 404 ──────────────────────────────────

  it("T8.4-04: returns 404 when match does not belong to buyer", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock(BUYER_USER) as any);
    dbSelectMock.mockResolvedValueOnce([]); // match not found

    const res = await POST(makeRequest(), makeParams(MATCH_ID));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  // ─── T8.4-01: Reaffirm creates event ─────────────────────────────────

  it("T8.4-01: creates match_reaffirm event and confirms match", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock(BUYER_USER) as any);

    // Match exists and belongs to buyer
    dbSelectMock
      .mockResolvedValueOnce([{ id: MATCH_ID, buyerId: BUYER_USER.id, listingId: LISTING_ID }])
      // No existing reaffirmation
      .mockResolvedValueOnce([])
      // No bonded agent
      .mockResolvedValueOnce([]);

    dbInsertMock.mockResolvedValue([]);
    dbUpdateMock.mockResolvedValue([]);

    const res = await POST(makeRequest(), makeParams(MATCH_ID));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.reaffirmed).toBe(true);
    expect(body.data.matchId).toBe(MATCH_ID);
    expect(dbInsertMock).toHaveBeenCalled();
    expect(dbUpdateMock).toHaveBeenCalled();
  });

  // ─── T8.4-02: Creates event + emits Realtime ─────────────────────────

  it("T8.4-02: notifies bonded agent via Realtime when bond exists", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock(BUYER_USER) as any);

    // Match exists
    dbSelectMock
      .mockResolvedValueOnce([{ id: MATCH_ID, buyerId: BUYER_USER.id, listingId: LISTING_ID }])
      // No existing reaffirmation
      .mockResolvedValueOnce([])
      // Active bond with agent
      .mockResolvedValueOnce([{ agentId: AGENT_ID, buyerId: BUYER_USER.id, status: "active" }]);

    dbInsertMock.mockResolvedValue([]);
    dbUpdateMock.mockResolvedValue([]);

    const res = await POST(makeRequest(), makeParams(MATCH_ID));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.agentNotified).toBe(true);
    expect(channelMock).toHaveBeenCalledWith(`agent-${AGENT_ID}`);
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "broadcast",
        event: "match.reaffirmed",
        payload: expect.objectContaining({
          matchId: MATCH_ID,
          type: "urgent",
        }),
      })
    );
  });

  // ─── T8.4-05: Already-reaffirmed → idempotent ────────────────────────

  it("T8.4-05: returns success without duplicate when already reaffirmed", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock(BUYER_USER) as any);

    // Match exists
    dbSelectMock
      .mockResolvedValueOnce([{ id: MATCH_ID, buyerId: BUYER_USER.id, listingId: LISTING_ID }])
      // Existing reaffirmation found
      .mockResolvedValueOnce([{ id: "existing-reaffirm", eventType: "match_reaffirm" }]);

    const res = await POST(makeRequest(), makeParams(MATCH_ID));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.reaffirmed).toBe(true);
    expect(body.data.alreadyReaffirmed).toBe(true);
    // Should NOT insert another event
    expect(dbInsertMock).not.toHaveBeenCalled();
  });

  // ─── No bonded agent → no notification ────────────────────────────────

  it("returns agentNotified=false when no active bond exists", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock(BUYER_USER) as any);

    dbSelectMock
      .mockResolvedValueOnce([{ id: MATCH_ID, buyerId: BUYER_USER.id, listingId: LISTING_ID }])
      .mockResolvedValueOnce([]) // no existing reaffirm
      .mockResolvedValueOnce([]); // no bond

    dbInsertMock.mockResolvedValue([]);
    dbUpdateMock.mockResolvedValue([]);

    const res = await POST(makeRequest(), makeParams(MATCH_ID));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.agentNotified).toBe(false);
    expect(channelMock).not.toHaveBeenCalled();
  });
});
