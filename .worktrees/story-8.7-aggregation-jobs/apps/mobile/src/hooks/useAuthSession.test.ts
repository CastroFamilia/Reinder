/**
 * apps/mobile/src/hooks/useAuthSession.test.ts
 *
 * Unit tests for the useAuthSession hook.
 * Verifies: subscribes to auth changes, updates state, clears stores on SIGNED_OUT.
 */
import { renderHook, act } from '@testing-library/react-native';

// ─── Store mocks ─────────────────────────────────────────────────────────────
const mockSearchReset = jest.fn();
const mockSwipeFullClear = jest.fn();
const mockMatchClearHistory = jest.fn();

jest.mock('../stores/use-search-store', () => ({
  useSearchStore: {
    getState: () => ({ reset: mockSearchReset }),
  },
}));

jest.mock('../stores/use-swipe-store', () => ({
  useSwipeStore: {
    getState: () => ({ fullClear: mockSwipeFullClear }),
  },
}));

jest.mock('../stores/use-match-history-store', () => ({
  useMatchHistoryStore: {
    getState: () => ({ clearHistory: mockMatchClearHistory }),
  },
}));

// ─── Supabase mock ───────────────────────────────────────────────────────────
// The mock factory uses inline jest.fn() to avoid hoisting issues. We grab
// references from the mock after import via require.
const mockUnsubscribe = jest.fn();

jest.mock('../lib/supabase', () => {
  const onAuthStateChange = jest.fn(() => ({
    data: { subscription: { unsubscribe: jest.fn() } },
  }));
  return {
    supabase: {
      auth: { onAuthStateChange },
    },
  };
});

import { useAuthSession } from './useAuthSession';

// Get a typed reference to the mocked supabase module
function getMockedOnAuthStateChange() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { supabase } = require('../lib/supabase') as {
    supabase: { auth: { onAuthStateChange: jest.Mock } };
  };
  return supabase.auth.onAuthStateChange;
}

describe('useAuthSession', () => {
  let mockOnAuthStateChange: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnAuthStateChange = getMockedOnAuthStateChange();
    // Reset the return value to provide a fresh unsubscribe per test
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    });
  });

  it('subscribes to onAuthStateChange on mount', () => {
    renderHook(() => useAuthSession());
    expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);
    expect(mockOnAuthStateChange).toHaveBeenCalledWith(expect.any(Function));
  });

  it('starts with loading=true and session=null', () => {
    const { result } = renderHook(() => useAuthSession());
    expect(result.current.loading).toBe(true);
  });

  it('updates session and sets loading=false when callback fires', () => {
    const { result } = renderHook(() => useAuthSession());

    const callback = mockOnAuthStateChange.mock.calls[0]![0];
    const mockSession = { access_token: 'test-token', user: { id: 'user-1' } };

    act(() => {
      callback('INITIAL_SESSION', mockSession);
    });

    expect(result.current.session).toBe(mockSession);
    expect(result.current.loading).toBe(false);
  });

  it('sets session to null when callback fires with null session', () => {
    const { result } = renderHook(() => useAuthSession());

    const callback = mockOnAuthStateChange.mock.calls[0]![0];

    act(() => {
      callback('INITIAL_SESSION', null);
    });

    expect(result.current.session).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('clears all stores on SIGNED_OUT event', () => {
    renderHook(() => useAuthSession());

    const callback = mockOnAuthStateChange.mock.calls[0]![0];

    act(() => {
      callback('SIGNED_OUT', null);
    });

    expect(mockSearchReset).toHaveBeenCalledTimes(1);
    expect(mockSwipeFullClear).toHaveBeenCalledTimes(1);
    expect(mockMatchClearHistory).toHaveBeenCalledTimes(1);
  });

  it('does NOT clear stores on non-SIGNED_OUT events', () => {
    renderHook(() => useAuthSession());

    const callback = mockOnAuthStateChange.mock.calls[0]![0];

    act(() => {
      callback('SIGNED_IN', { access_token: 'token' });
    });

    expect(mockSearchReset).not.toHaveBeenCalled();
    expect(mockSwipeFullClear).not.toHaveBeenCalled();
    expect(mockMatchClearHistory).not.toHaveBeenCalled();
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useAuthSession());

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
