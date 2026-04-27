/**
 * apps/web/src/features/agent-link/hooks/use-buyer-bond.test.ts
 *
 * ATDD — Story 3.4: useBuyerBond hook
 *
 * AC coverage:
 *   - Bond exists: hook returns agent data (name, avatarUrl)
 *   - No bond: hook returns null (buyer has no representative)
 *   - API error: hook returns error state
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBuyerBond } from './use-buyer-bond';
import type { ActiveBond } from './use-buyer-bond';

const mockBond: ActiveBond = {
  id: 'bond-1',
  agentId: 'agent-1',
  agentName: 'Elena García',
  agentAvatarUrl: 'https://example.com/elena.jpg',
  isExpiring: false,
  expiresAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
  status: 'active',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useBuyerBond', () => {
  it('AC — returns agent bond data when buyer has active bond', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockBond, error: null }),
    } as Response);

    const { result } = renderHook(() => useBuyerBond());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.bond).toEqual(mockBond);
    expect(result.current.bond?.agentName).toBe('Elena García');
    expect(result.current.isLoading).toBe(false);
  });

  it('AC — returns null when buyer has no active bond', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: null, error: null }),
    } as Response);

    const { result } = renderHook(() => useBuyerBond());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.bond).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('AC — returns error state on API failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ data: null, error: 'Unauthorized' }),
    } as Response);

    const { result } = renderHook(() => useBuyerBond());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.bond).toBeNull();
    expect(result.current.error).toBe('Unauthorized');
  });

  it('AC — returns isExpiring: true when bond expiry < 7 days', async () => {
    const expiringBond: ActiveBond = { ...mockBond, isExpiring: true };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: expiringBond, error: null }),
    } as Response);

    const { result } = renderHook(() => useBuyerBond());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.bond?.isExpiring).toBe(true);
  });

  it('refetch triggers a new API call', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockBond, error: null }),
    } as Response);
    global.fetch = fetchMock;

    const { result } = renderHook(() => useBuyerBond());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      result.current.refetch();
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
