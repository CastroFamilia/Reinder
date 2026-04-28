"use client";

/**
 * apps/web/src/features/agent-panel/hooks/use-realtime-matches.ts
 *
 * Supabase Realtime subscription hook for the Agent Panel.
 * Listens to INSERT events on `match_events` filtered by agentId.
 *
 * CRITICAL: Cleanup on unmount via supabase.removeChannel() to prevent
 * WebSocket memory leaks. (Risk R2 — test-design-epic-4.md)
 *
 * Story 4.2 — Task 3
 * Source: architecture.md#Realtime — Supabase Realtime WebSocket pattern
 */

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimePostgresInsertPayload } from "@supabase/supabase-js";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Shape of a match_events row as returned by Supabase Realtime */
export interface MatchPayload {
  id: string;
  buyer_id: string;
  listing_id: string;
  agent_id: string | null;
  confirmed_at: string | null;
  created_at: string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Subscribes to new match events for the given agent via Supabase Realtime.
 *
 * Usage:
 * ```tsx
 * useRealtimeMatches(agentId, (match) => {
 *   // update local state — mark client as hasNewMatches
 *   setClients(prev => prev.map(c =>
 *     c.buyerId === match.buyer_id ? { ...c, hasNewMatches: true } : c
 *   ));
 * });
 * ```
 *
 * @param agentId    - UUID of the authenticated agent (null → subscription disabled)
 * @param onNewMatch - Called when a new match INSERT arrives from Realtime
 */
export function useRealtimeMatches(
  agentId: string | null,
  onNewMatch: (payload: MatchPayload) => void
): void {
  useEffect(() => {
    // Guard: disable subscription if no agentId
    if (!agentId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`match_events:agent:${agentId}`)
      .on<MatchPayload>(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "match_events",
          filter: `agent_id=eq.${agentId}`,
        },
        (payload: RealtimePostgresInsertPayload<MatchPayload>) => {
          onNewMatch(payload.new);
        }
      )
      .subscribe();

    // CRITICAL: cleanup to prevent memory leaks on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId, onNewMatch]);
}
