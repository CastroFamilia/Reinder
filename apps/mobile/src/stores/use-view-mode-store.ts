/**
 * apps/mobile/src/stores/use-view-mode-store.ts
 *
 * Zustand store for the swipe card view mode preference.
 * - Persiste en AsyncStorage (key: 'reinder-view-mode')
 * - Controla si las tarjetas muestran solo la foto (cover) o detalles (detail)
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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

interface ViewModeState {
  /** Current card view mode: 'cover' (photo only) or 'detail' (photo + info) */
  viewMode: 'cover' | 'detail';
  /** Update the view mode preference */
  setViewMode: (mode: 'cover' | 'detail') => void;
}

export const useViewModeStore = create<ViewModeState>()(
  persist(
    (set) => ({
      viewMode: 'cover',

      setViewMode: (mode: 'cover' | 'detail') => {
        set({ viewMode: mode });
      },
    }),
    {
      name: 'reinder-view-mode',
      storage: createJSONStorage(safeAsyncStorage),
      partialize: (state) => ({
        viewMode: state.viewMode,
      }),
    },
  ),
);
