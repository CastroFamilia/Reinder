/**
 * apps/web/src/features/agent-link/hooks/use-referral-tokens.test.ts
 *
 * Unit tests for useReferralTokens hook.
 * Story 3.1 — Step 4 Test Review addition.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReferralTokens } from './use-referral-tokens';
import type { ReferralTokenWithStatus } from '@/app/api/v1/referral-tokens/route';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const now = new Date().toISOString();
const future = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();

function makeToken(overrides: Partial<ReferralTokenWithStatus> = {}): ReferralTokenWithStatus {
  return {
    id: 'tok-1',
    agentId: 'agent-1',
    buyerId: null,
    token: 'abc123',
    referralUrl: 'https://reinder.app/referral/abc123',
    used: false,
    expiresAt: future,
    createdAt: now,
    status: 'pending',
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useReferralTokens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset clipboard mock
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      writable: true,
    });
    Object.defineProperty(window, 'isSecureContext', { value: true, writable: true });
  });

  it('initializes with provided tokens', () => {
    const initial = [makeToken({ id: 'tok-1' }), makeToken({ id: 'tok-2', status: 'accepted', used: true })];
    const { result } = renderHook(() => useReferralTokens(initial));
    expect(result.current.tokens).toHaveLength(2);
    expect(result.current.isGenerating).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('initializes with empty list when no tokens provided', () => {
    const { result } = renderHook(() => useReferralTokens());
    expect(result.current.tokens).toHaveLength(0);
  });

  it('generateToken — adds new token to front of list on success', async () => {
    const newToken = makeToken({ id: 'new-tok', token: 'new-uuid' });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: newToken, error: null }),
    } as Response);

    const { result } = renderHook(() => useReferralTokens([makeToken()]));

    await act(async () => {
      await result.current.generateToken();
    });

    expect(result.current.tokens[0]).toEqual(newToken);
    expect(result.current.tokens).toHaveLength(2);
    expect(result.current.error).toBeNull();
  });

  it('generateToken — sets error on API failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ data: null, error: 'Forbidden' }),
    } as Response);

    const { result } = renderHook(() => useReferralTokens());

    await act(async () => {
      await result.current.generateToken();
    });

    expect(result.current.error).toBe('Forbidden');
    expect(result.current.tokens).toHaveLength(0);
  });

  it('generateToken — sets error on network failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useReferralTokens());

    await act(async () => {
      await result.current.generateToken();
    });

    expect(result.current.error).toBe('Error de conexión. Intenta de nuevo.');
  });

  it('copyLink — sets isCopied for 2 seconds then clears it', async () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => useReferralTokens([makeToken()]));

    await act(async () => {
      await result.current.copyLink('tok-1', 'https://reinder.app/referral/abc123');
    });

    expect(result.current.isCopied).toBe('tok-1');

    act(() => { vi.advanceTimersByTime(2001); });
    expect(result.current.isCopied).toBeNull();

    vi.useRealTimers();
  });

  it('copyLink — uses clipboard API in secure context', async () => {
    const { result } = renderHook(() => useReferralTokens([makeToken()]));
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, writable: true });

    await act(async () => {
      await result.current.copyLink('tok-1', 'https://reinder.app/referral/abc123');
    });

    expect(writeText).toHaveBeenCalledWith('https://reinder.app/referral/abc123');
  });
});
