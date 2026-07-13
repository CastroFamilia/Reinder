'use client';
/**
 * apps/web/src/features/agent-link/hooks/use-buyer-bond.ts
 *
 * Story 3.4: Hook for buyers to fetch their active bond and display
 * their representative agent instead of the listing agent.
 *
 * Used in: property cards, PropertyDetailSheet, Match Recap, matches history.
 */
import { useState, useEffect, useCallback } from 'react';

export interface ActiveBond {
  id: string;
  agentId: string;
  agentName: string;
  agentAvatarUrl: string | null;
  isExpiring: boolean;
  expiresAt: string;
  status: string;
}

interface UseBuyerBondReturn {
  bond: ActiveBond | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Fetches the buyer's active bond with their representative agent.
 * Returns null if buyer has no active bond.
 * Client-side only — uses SWR-like pattern with manual refetch.
 */
export function useBuyerBond(): UseBuyerBondReturn {
  const [bond, setBond] = useState<ActiveBond | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBond = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/agent-bonds');
      const body = await res.json();

      if (!res.ok) {
        setError(body.error ?? 'Error al cargar el vínculo');
        setBond(null);
      } else {
        setBond(body.data ?? null);
      }
    } catch {
      setError('Error de conexión');
      setBond(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchBond();
  }, [fetchBond]);

  return { bond, isLoading, error, refetch: fetchBond };
}
