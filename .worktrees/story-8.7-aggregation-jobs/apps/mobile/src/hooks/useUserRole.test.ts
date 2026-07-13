/**
 * apps/mobile/src/hooks/useUserRole.test.ts
 * Story 2.8 — ATDD: hook para routing por rol
 *
 * AC5: usuario con rol 'agent' ve TabBar diferente (agente)
 *      → esta story solo prepara el hook; la UI de agente es Epic 4
 */
import { renderHook } from '@testing-library/react-native';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../hooks/useAuthSession', () => ({
  useAuthSession: jest.fn(),
}));

describe('Story 2.8: useUserRole', () => {
  const { useAuthSession } = require('../hooks/useAuthSession');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('FAILING: debe devolver "buyer" por defecto cuando no hay session', () => {
    useAuthSession.mockReturnValue({ session: null, loading: false });

    let role: string | undefined;
    try {
      const { useUserRole } = require('./useUserRole');
      const { result } = renderHook(() => useUserRole());
      role = result.current;
    } catch {
      role = undefined;
    }
    expect(role).toBe('buyer');
  });

  it('FAILING: debe devolver "buyer" cuando el rol en metadata es buyer', () => {
    useAuthSession.mockReturnValue({
      session: {
        access_token: 'mock-token',
        user: {
          id: 'user-1',
          user_metadata: { role: 'buyer' },
        },
      },
      loading: false,
    });

    let role: string | undefined;
    try {
      const { useUserRole } = require('./useUserRole');
      const { result } = renderHook(() => useUserRole());
      role = result.current;
    } catch {
      role = undefined;
    }
    expect(role).toBe('buyer');
  });

  it('FAILING: debe devolver "agent" cuando el rol en metadata es agent', () => {
    useAuthSession.mockReturnValue({
      session: {
        access_token: 'mock-token',
        user: {
          id: 'user-2',
          user_metadata: { role: 'agent' },
        },
      },
      loading: false,
    });

    let role: string | undefined;
    try {
      const { useUserRole } = require('./useUserRole');
      const { result } = renderHook(() => useUserRole());
      role = result.current;
    } catch {
      role = undefined;
    }
    expect(role).toBe('agent');
  });

  it('FAILING: debe devolver "buyer" cuando no hay user_metadata.role (fallback)', () => {
    useAuthSession.mockReturnValue({
      session: {
        access_token: 'mock-token',
        user: {
          id: 'user-3',
          user_metadata: {},
        },
      },
      loading: false,
    });

    let role: string | undefined;
    try {
      const { useUserRole } = require('./useUserRole');
      const { result } = renderHook(() => useUserRole());
      role = result.current;
    } catch {
      role = undefined;
    }
    expect(role).toBe('buyer');
  });
});
