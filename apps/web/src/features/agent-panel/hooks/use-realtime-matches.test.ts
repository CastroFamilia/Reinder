/**
 * Story 4.2 — Hook Tests: useRealtimeMatches
 *
 * Tests cover:
 * - Channel subscription with correct filter on mount
 * - onNewMatch callback called on INSERT event
 * - Channel removal (cleanup) on unmount — prevents memory leaks (Risk R2)
 *
 * Run: pnpm --filter @reinder/web test apps/web/src/features/agent-panel/hooks/use-realtime-matches.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import {
  useRealtimeMatches,
  type MatchPayload,
} from "@/features/agent-panel/hooks/use-realtime-matches";

// ─── Supabase Realtime mock ────────────────────────────────────────────────────

const mockSubscribe = vi.fn().mockReturnThis();
const mockOn = vi.fn().mockReturnThis();
const mockChannel = vi.fn().mockReturnValue({
  on: mockOn,
  subscribe: mockSubscribe,
});
const mockRemoveChannel = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  })),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const AGENT_ID = "agent-uuid-1";

const mockMatchPayload: MatchPayload = {
  id: "match-uuid-1",
  buyer_id: "buyer-uuid-1",
  listing_id: "listing-uuid-1",
  agent_id: AGENT_ID,
  confirmed_at: null,
  created_at: "2026-04-28T10:00:00Z",
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useRealtimeMatches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore default mock behavior
    mockChannel.mockReturnValue({ on: mockOn, subscribe: mockSubscribe });
    mockOn.mockReturnThis();
    mockSubscribe.mockReturnThis();
  });

  // ─── T4.2-10: channel subscribed on mount ───
  it("T4.2-10: subscribes to match_events channel with correct agentId filter", () => {
    const onNewMatch = vi.fn();
    renderHook(() => useRealtimeMatches(AGENT_ID, onNewMatch));

    expect(mockChannel).toHaveBeenCalledWith(
      `match_events:agent:${AGENT_ID}`
    );
    expect(mockOn).toHaveBeenCalledWith(
      "postgres_changes",
      expect.objectContaining({
        event: "INSERT",
        schema: "public",
        table: "match_events",
        filter: `agent_id=eq.${AGENT_ID}`,
      }),
      expect.any(Function)
    );
    expect(mockSubscribe).toHaveBeenCalled();
  });

  // ─── T4.2-11: onNewMatch called on INSERT event ───
  it("T4.2-11: calls onNewMatch when a new match INSERT event arrives", () => {
    const onNewMatch = vi.fn();

    // Capture the callback passed to .on()
    let capturedCallback: ((payload: { new: MatchPayload }) => void) | null = null;
    mockOn.mockImplementation((_event: string, _config: object, cb: (payload: { new: MatchPayload }) => void) => {
      capturedCallback = cb;
      return { on: mockOn, subscribe: mockSubscribe };
    });

    renderHook(() => useRealtimeMatches(AGENT_ID, onNewMatch));

    // Simulate a Realtime INSERT event
    expect(capturedCallback).not.toBeNull();
    capturedCallback!({ new: mockMatchPayload });

    expect(onNewMatch).toHaveBeenCalledTimes(1);
    expect(onNewMatch).toHaveBeenCalledWith(mockMatchPayload);
  });

  // ─── T4.2-12: channel removed on unmount (memory leak prevention) ───
  it("T4.2-12: removes channel on unmount to prevent memory leaks", () => {
    const onNewMatch = vi.fn();
    const { unmount } = renderHook(() =>
      useRealtimeMatches(AGENT_ID, onNewMatch)
    );

    unmount();

    expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
  });

  // ─── T4.2-13: no subscription when agentId is null ───
  it("T4.2-13: does not subscribe when agentId is null", () => {
    const onNewMatch = vi.fn();
    renderHook(() => useRealtimeMatches(null, onNewMatch));

    expect(mockChannel).not.toHaveBeenCalled();
    expect(mockSubscribe).not.toHaveBeenCalled();
  });
});
