/**
 * Story 4.2 — Component Tests: AgentDashboard
 *
 * Tests cover:
 * - Initial render with SSR data
 * - Realtime badge update when new match arrives
 * - Empty state when no clients
 *
 * Run: pnpm --filter @reinder/web test apps/web/src/features/agent-panel/components/AgentDashboard.test.tsx
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { AgentDashboard } from "@/features/agent-panel/components/AgentDashboard";
import type { AgentClient } from "@reinder/shared/types/agent";

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock Supabase client for Realtime (prevent real WebSocket connections)
const mockRemoveChannel = vi.fn().mockResolvedValue(undefined);
const mockSubscribe = vi.fn().mockReturnThis();
const mockOn = vi.fn().mockReturnThis();
const mockChannel = vi.fn().mockReturnValue({
  on: mockOn,
  subscribe: mockSubscribe,
});

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  })),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const AGENT_ID = "agent-uuid-1";

const mockClients: AgentClient[] = [
  {
    bondId: "bond-uuid-1",
    buyerId: "buyer-uuid-1",
    buyerName: "Ana García",
    buyerAvatarUrl: null,
    bondCreatedAt: "2026-04-01T00:00:00Z",
    totalMatches: 3,
    lastMatchAt: "2026-04-27T10:00:00Z",
    hasNewMatches: false,
  },
  {
    bondId: "bond-uuid-2",
    buyerId: "buyer-uuid-2",
    buyerName: "Carlos Ruiz",
    buyerAvatarUrl: null,
    bondCreatedAt: "2026-03-15T00:00:00Z",
    totalMatches: 1,
    lastMatchAt: null,
    hasNewMatches: false,
  },
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("AgentDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChannel.mockReturnValue({ on: mockOn, subscribe: mockSubscribe });
    mockOn.mockReturnThis();
    mockSubscribe.mockReturnThis();
  });

  // ─── T4.2-20: renders initial client list ───
  it("T4.2-20: renders all initial clients from SSR data", () => {
    render(
      <AgentDashboard initialClients={mockClients} agentId={AGENT_ID} />
    );

    expect(screen.getByText("Ana García")).toBeInTheDocument();
    expect(screen.getByText("Carlos Ruiz")).toBeInTheDocument();
  });

  // ─── T4.2-21: empty state when no clients ───
  it("T4.2-21: renders empty state when no clients provided", () => {
    render(
      <AgentDashboard initialClients={[]} agentId={AGENT_ID} />
    );

    expect(
      screen.getByText(/Aún no tienes clientes vinculados/i)
    ).toBeInTheDocument();
  });

  // ─── T4.2-22: realtime subscription started on mount ───
  it("T4.2-22: subscribes to Realtime channel on mount", () => {
    render(
      <AgentDashboard initialClients={mockClients} agentId={AGENT_ID} />
    );

    expect(mockChannel).toHaveBeenCalledWith(
      `match_events:agent:${AGENT_ID}`
    );
    expect(mockSubscribe).toHaveBeenCalled();
  });

  // ─── T4.2-23: badge updates on new match event ───
  it("T4.2-23: marks affected client as hasNewMatches when Realtime event arrives", async () => {
    // Capture the on() callback so we can trigger it
    let realtimeCallback: ((payload: { new: { buyer_id: string } }) => void) | null = null;
    mockOn.mockImplementation((_event: string, _config: object, cb: typeof realtimeCallback) => {
      realtimeCallback = cb;
      return { on: mockOn, subscribe: mockSubscribe };
    });

    render(
      <AgentDashboard initialClients={mockClients} agentId={AGENT_ID} />
    );

    // Initially no new-matches badge for Ana
    expect(screen.queryAllByTestId("new-matches-badge")).toHaveLength(0);

    // Simulate Realtime INSERT for Ana's buyer_id
    await act(async () => {
      realtimeCallback?.({
        new: {
          buyer_id: "buyer-uuid-1",
        },
      });
    });

    // Now Ana should have the badge
    expect(screen.queryAllByTestId("new-matches-badge")).toHaveLength(1);
  });
});
