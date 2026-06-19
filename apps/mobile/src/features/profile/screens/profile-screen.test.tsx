/**
 * apps/mobile/src/features/profile/screens/profile-screen.test.tsx
 *
 * Story 2.8 — Tests para ProfileScreen
 * Updated to match the expanded ProfileScreen implementation.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { ProfileScreen } from './profile-screen';

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('../../../components/layout/screen-background', () => ({
  ScreenBackground: ({ children, testID }: { children: React.ReactNode; testID?: string }) => {
    const { View } = require('react-native');
    return <View testID={testID}>{children}</View>;
  },
}));

jest.mock('../../../components/ui/glass-panel', () => ({
  GlassPanel: ({ children, style }: { children: React.ReactNode; style?: any }) => {
    const { View } = require('react-native');
    return <View style={style}>{children}</View>;
  },
}));

jest.mock('../../../hooks/useAuthSession', () => ({
  useAuthSession: () => ({ session: null }),
}));

jest.mock('../../../stores/use-search-store', () => ({
  useSearchStore: () => ({
    preferences: null,
    setPreferences: jest.fn(),
  }),
}));

jest.mock('../../../stores/use-swipe-store', () => ({
  useSwipeStore: () => ({
    resetFeed: jest.fn(),
    fullClear: jest.fn(),
  }),
}));

jest.mock('../../../stores/use-match-history-store', () => ({
  useMatchHistoryStore: () => ({
    fullClear: jest.fn(),
  }),
}));

jest.mock('../../search/components/search-filters-modal', () => ({
  SearchFiltersModal: () => null,
}));

jest.mock('../../../lib/supabase', () => ({
  supabase: { auth: { signOut: jest.fn() } },
}));

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('ProfileScreen', () => {
  it('renderiza la pantalla de perfil', () => {
    const { getByTestId } = render(<ProfileScreen />);
    expect(getByTestId('profile-screen')).toBeTruthy();
  });

  it('muestra el título "Mi Perfil"', () => {
    const { getByTestId, getByText } = render(<ProfileScreen />);
    expect(getByTestId('profile-title')).toBeTruthy();
    expect(getByText('Mi Perfil')).toBeTruthy();
  });

  it('muestra sección de búsqueda con CTA cuando no hay preferencias', () => {
    const { getByText, getByTestId } = render(<ProfileScreen />);
    expect(getByText('Mi búsqueda')).toBeTruthy();
    expect(getByText('Sin filtros — viendo todo el catálogo')).toBeTruthy();
    expect(getByTestId('setup-search-btn')).toBeTruthy();
  });
});
