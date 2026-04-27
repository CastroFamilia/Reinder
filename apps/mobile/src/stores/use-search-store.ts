/**
 * apps/mobile/src/stores/use-search-store.ts
 *
 * Zustand store para las preferencias de búsqueda del comprador.
 * - Persiste en AsyncStorage (key: 'reinder-search-prefs')
 * - Al guardar: llama PATCH API + resetea el feed (useSwipeStore.resetFeed)
 *
 * Story 2.9 — Task 6 (AC: 2, 4, 6, 7)
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { SearchPreferences } from '@reinder/shared';
import { saveSearchPreferences } from '../lib/api/listings';

function safeAsyncStorage() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const AS = require('@react-native-async-storage/async-storage').default as {
    getItem: (key: string) => Promise<string | null>;
    setItem: (key: string, value: string) => Promise<void>;
    removeItem: (key: string) => Promise<void>;
  };
  const mem: Record<string, string> = {};
  const wrap = <T>(fn: () => Promise<T>, fallback: T): Promise<T> =>
    fn().catch(() => fallback);
  return {
    getItem: (k: string) => wrap(() => AS.getItem(k), mem[k] ?? null),
    setItem: (k: string, v: string) => {
      mem[k] = v;
      return wrap(() => AS.setItem(k, v), undefined as void);
    },
    removeItem: (k: string) => {
      delete mem[k];
      return wrap(() => AS.removeItem(k), undefined as void);
    },
  };
}

interface SearchStore {
  /** Preferencias activas del comprador (null = sin filtros) */
  preferences: SearchPreferences | null;
  /** True si el comprador ya hizo el onboarding de filtros (primera vez) */
  hasCompletedOnboarding: boolean;

  /**
   * Guarda preferencias → PATCH API → persiste localmente → resetea feed (AC2, AC7).
   * Si la API falla, persiste igualmente localmente para UX offline.
   */
  setPreferences: (prefs: SearchPreferences, token: string) => Promise<void>;
  /** Limpia preferencias (sin filtros activos) */
  clearPreferences: () => void;
  /** Marca el onboarding como completado (no re-mostrar el modal) */
  markOnboardingDone: () => void;
}

export const useSearchStore = create<SearchStore>()(
  persist(
    (set, get) => ({
      preferences: null,
      hasCompletedOnboarding: false,

      setPreferences: async (prefs: SearchPreferences, token: string) => {
        // Persistir localmente primero (UX: inmediato, AC6)
        set({ preferences: prefs, hasCompletedOnboarding: true });

        // Sync con Supabase en segundo plano (AC2)
        await saveSearchPreferences(prefs, token).catch(() => {
          // Silenciar error — la preferencia ya está guardada localmente
        });

        // Resetear el feed con los nuevos filtros (AC7)
        // Importación dinámica para evitar circular deps con use-swipe-store
        try {
          const { useSwipeStore } = require('./use-swipe-store');
          useSwipeStore.getState().resetFeed(token, prefs);
        } catch {
          // useSwipeStore puede no estar disponible en tests
        }
      },

      clearPreferences: () => {
        set({ preferences: null });
      },

      markOnboardingDone: () => {
        set({ hasCompletedOnboarding: true });
      },
    }),
    {
      name: 'reinder-search-prefs',
      storage: createJSONStorage(safeAsyncStorage),
      partialize: (state) => ({
        preferences: state.preferences,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
      }),
    },
  ),
);
