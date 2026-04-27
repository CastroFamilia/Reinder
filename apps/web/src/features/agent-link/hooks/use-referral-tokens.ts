'use client';
/**
 * apps/web/src/features/agent-link/hooks/use-referral-tokens.ts
 *
 * Client-side hook for managing referral token generation and listing.
 * Story 3.1 — Task 4
 */

import { useState, useCallback } from 'react';
import type { ReferralTokenWithStatus } from '@/app/api/v1/referral-tokens/route';

interface UseReferralTokensReturn {
  tokens: ReferralTokenWithStatus[];
  isGenerating: boolean;
  isCopied: string | null; // token ID that was just copied
  error: string | null;
  generateToken: () => Promise<ReferralTokenWithStatus | null>;
  copyLink: (tokenId: string, url: string) => Promise<void>;
}

export function useReferralTokens(
  initialTokens: ReferralTokenWithStatus[] = []
): UseReferralTokensReturn {
  const [tokens, setTokens] = useState<ReferralTokenWithStatus[]>(initialTokens);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateToken = useCallback(async (): Promise<ReferralTokenWithStatus | null> => {
    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/referral-tokens', { method: 'POST' });
      const body = await res.json();

      if (!res.ok || body.error) {
        setError(body.error ?? 'Error al generar el link');
        return null;
      }

      const newToken: ReferralTokenWithStatus = body.data;
      setTokens((prev) => [newToken, ...prev]);
      return newToken;
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const copyLink = useCallback(async (tokenId: string, url: string): Promise<void> => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback for non-secure contexts (dev HTTP)
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setIsCopied(tokenId);
      setTimeout(() => setIsCopied(null), 2000);
    } catch {
      setError('No se pudo copiar al portapapeles');
    }
  }, []);

  return { tokens, isGenerating, isCopied, error, generateToken, copyLink };
}
