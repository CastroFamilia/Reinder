"use client";

/**
 * apps/web/src/features/agent-panel/components/AgentDashboard.tsx
 *
 * Client Component wrapper for the Agent Panel client list.
 * Receives initial clients data from Server Component (SSR)
 * and subscribes to Supabase Realtime for live badge updates (Story 4.2).
 *
 * When a new match arrives via WebSocket:
 * - The affected client's `hasNewMatches` flag is set to true
 * - The card updates instantly without page reload (≤5s requirement, NFR3)
 *
 * Story 4.2 — Task 4
 * Source: architecture.md#frontend-architecture
 */

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  AgentClientCard,
  AgentClientsEmptyState,
} from "@/features/agent-panel/components/AgentClientCard";
import {
  useRealtimeMatches,
  type MatchPayload,
} from "@/features/agent-panel/hooks/use-realtime-matches";
import type { AgentClient } from "@reinder/shared/types/agent";

// ─── Props ────────────────────────────────────────────────────────────────────

interface AgentDashboardProps {
  /** SSR-loaded client list (initial state from Server Component) */
  initialClients: AgentClient[];
  /** Agent's authenticated user ID for Realtime subscription */
  agentId: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AgentDashboard({ initialClients, agentId }: AgentDashboardProps) {
  // Local state: starts from SSR data, updated by Realtime events
  const [clients, setClients] = useState<AgentClient[]>(initialClients);

  // Realtime handler — marks affected buyer as hasNewMatches
  const handleNewMatch = useCallback((payload: MatchPayload) => {
    setClients((prev) =>
      prev.map((client) =>
        client.buyerId === payload.buyer_id
          ? { ...client, hasNewMatches: true }
          : client
      )
    );
  }, []);

  // Subscribe to match_events for this agent via Supabase Realtime
  useRealtimeMatches(agentId, handleNewMatch);

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (clients.length === 0) {
    return <AgentClientsEmptyState />;
  }

  return (
    <div className="w-full flex flex-col gap-3">
      {clients.map((client) => (
        <Link
          key={client.bondId}
          href={`/agent/clients/${client.buyerId}`}
          className="no-underline"
        >
          <AgentClientCard
            client={client}
            onPress={() => {/* handled by Link wrapper */}}
          />
        </Link>
      ))}
    </div>
  );
}
