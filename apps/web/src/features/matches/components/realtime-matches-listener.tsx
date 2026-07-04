/**
 * apps/web/src/features/matches/components/realtime-matches-listener.tsx
 *
 * Client component that subscribes to Supabase Realtime for new match_events.
 * When a new match is created (from the mobile app), triggers a router.refresh()
 * to revalidate the Server Components and show updated data without manual refresh.
 *
 * Backlog Item 2: Sync de Matches entre App y Web
 */
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface RealtimeMatchesListenerProps {
  /** The current authenticated user's ID to filter events */
  userId: string;
}

export function RealtimeMatchesListener({ userId }: RealtimeMatchesListenerProps) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    // Subscribe to INSERT events on match_events for this buyer
    const channel = supabase
      .channel(`match_events:buyer_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "match_events",
          filter: `buyer_id=eq.${userId}`,
        },
        (_payload) => {
          // New match detected — revalidate the page to show updated data
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, router]);

  // This component renders nothing — it's purely a side-effect listener
  return null;
}
