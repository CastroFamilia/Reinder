/**
 * apps/mobile/src/features/search/components/search-onboarding-modal.test.tsx
 * Story 2.9 — ATDD: Modal onboarding de búsqueda
 *
 * AC1: modal aparece primera vez con campos zona/precio/habitaciones/m²
 * AC5: botón "Saltar" cierra sin guardar
 * AC8: usa GlassPanel level heavy
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('../../../components/ui/glass-panel', () => ({
  GlassPanel: ({ children, intensity, testID }: any) => {
    const { View } = require('react-native');
    return <View testID={testID || `glass-panel-${intensity}`}>{children}</View>;
  },
}));

jest.mock('../../../components/layout/screen-background', () => ({
  ScreenBackground: ({ children }: any) => {
    const { View } = require('react-native');
    return <View>{children}</View>;
  },
}));

describe('Story 2.9: SearchOnboardingModal — AC1/AC5/AC8', () => {
  it('ATDD: SearchOnboardingModal es importable', () => {
    let imported = false;
    try {
      require('./search-onboarding-modal');
      imported = true;
    } catch {
      imported = false;
    }
    expect(imported).toBe(true);
  });

  it('ATDD: renderiza el header "¿Qué estás buscando?"', () => {
    let rendered = false;
    try {
      const { SearchOnboardingModal } = require('./search-onboarding-modal');
      const { getByText } = render(
        <SearchOnboardingModal
          visible={true}
          onSave={jest.fn()}
          onSkip={jest.fn()}
        />,
      );
      rendered = !!getByText('¿Qué estás buscando?');
    } catch {
      rendered = false;
    }
    expect(rendered).toBe(true);
  });

  it('ATDD: botón "Ver todo el catálogo" llama onSkip', () => {
    let skipCalled = false;
    try {
      const { SearchOnboardingModal } = require('./search-onboarding-modal');
      const onSkip = jest.fn(() => { skipCalled = true; });
      const { getByTestId } = render(
        <SearchOnboardingModal
          visible={true}
          onSave={jest.fn()}
          onSkip={onSkip}
        />,
      );
      fireEvent.press(getByTestId('skip-button'));
      skipCalled = onSkip.mock.calls.length > 0;
    } catch {
      skipCalled = false;
    }
    expect(skipCalled).toBe(true);
  });

  it('ATDD: usa GlassPanel como fondo del modal', () => {
    let hasGlassPanel = false;
    try {
      const { SearchOnboardingModal } = require('./search-onboarding-modal');
      const { queryByTestId } = render(
        <SearchOnboardingModal visible={true} onSave={jest.fn()} onSkip={jest.fn()} />,
      );
      hasGlassPanel = !!queryByTestId('search-modal-glass');
    } catch {
      hasGlassPanel = false;
    }
    expect(hasGlassPanel).toBe(true);
  });
});

describe('Story 2.9: SearchFiltersModal — AC4', () => {
  it('ATDD: SearchFiltersModal es importable', () => {
    let imported = false;
    try {
      require('./search-filters-modal');
      imported = true;
    } catch {
      imported = false;
    }
    expect(imported).toBe(true);
  });
});
