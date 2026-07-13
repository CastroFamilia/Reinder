/**
 * apps/mobile/src/stores/use-search-store.test.ts
 * Story 2.9 — ATDD Acceptance Tests (red phase)
 *
 * AC2: preferencias persisten en Supabase + localmente
 * AC4: permite editar filtros en cualquier momento
 * AC6: filtros persisten entre sesiones
 * AC7: reset del feed al cambiar filtros
 */
import { useMatchHistoryStore } from './use-match-history-store';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('../lib/api/listings', () => ({
  fetchListings: jest.fn().mockResolvedValue({ data: [], error: null }),
  saveSearchPreferences: jest.fn().mockResolvedValue({ data: {}, error: null }),
  MOCK_LISTINGS: [],
}));

describe('Story 2.9: useSearchStore — AC2/AC6: persist preferences', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('ATDD: useSearchStore es importable y tiene preferences null por defecto', () => {
    let store: any;
    try {
      const { useSearchStore } = require('./use-search-store');
      store = useSearchStore.getState();
    } catch {
      store = null;
    }
    expect(store).not.toBeNull();
    expect(store.preferences).toBeNull();
  });

  it('ATDD: useSearchStore tiene hasCompletedOnboarding false por defecto', () => {
    let hasCompleted: boolean | undefined;
    try {
      const { useSearchStore } = require('./use-search-store');
      hasCompleted = useSearchStore.getState().hasCompletedOnboarding;
    } catch {
      hasCompleted = undefined;
    }
    expect(hasCompleted).toBe(false);
  });

  it('ATDD: setPreferences actualiza el estado del store', async () => {
    let storeState: any;
    try {
      const { useSearchStore } = require('./use-search-store');
      const prefs = { zones: ['Malasaña'], maxPrice: 400000 };
      await useSearchStore.getState().setPreferences(prefs, 'mock-token');
      storeState = useSearchStore.getState();
    } catch {
      storeState = null;
    }
    expect(storeState?.preferences?.zones).toEqual(['Malasaña']);
  });

  it('ATDD: markOnboardingDone cambia hasCompletedOnboarding a true', () => {
    let hasCompleted: boolean | undefined;
    try {
      const { useSearchStore } = require('./use-search-store');
      useSearchStore.getState().markOnboardingDone();
      hasCompleted = useSearchStore.getState().hasCompletedOnboarding;
    } catch {
      hasCompleted = undefined;
    }
    expect(hasCompleted).toBe(true);
  });

  it('ATDD: clearPreferences resetea preferences a null', async () => {
    let prefs: any;
    try {
      const { useSearchStore } = require('./use-search-store');
      await useSearchStore.getState().setPreferences({ zones: ['Centro'] }, 'tok');
      useSearchStore.getState().clearPreferences();
      prefs = useSearchStore.getState().preferences;
    } catch {
      prefs = 'ERROR';
    }
    expect(prefs).toBeNull();
  });
});

describe('Story 2.9: SearchPreferences type — AC1', () => {
  it('ATDD: SearchPreferences puede importarse de @reinder/shared', () => {
    let hasType = false;
    try {
      // Solo verificamos que el módulo compila; los tipos son compile-time
      const shared = require('@reinder/shared');
      hasType = typeof shared !== 'undefined';
    } catch {
      hasType = false;
    }
    expect(hasType).toBe(true);
  });
});
