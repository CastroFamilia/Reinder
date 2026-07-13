/**
 * apps/mobile/src/components/ui/property-badge.test.tsx
 *
 * Tests unitarios para PropertyBadge.
 * Verifican: render por tipo, texto correcto, accessibilityLabel, testID.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { PropertyBadge } from './property-badge';

describe('PropertyBadge', () => {
  it('renderiza badge EXCLUSIVA con texto correcto', () => {
    const { getByText } = render(<PropertyBadge type="EXCLUSIVA" />);
    expect(getByText('EXCLUSIVA')).toBeTruthy();
  });

  it('renderiza badge VENDIDA con texto correcto', () => {
    const { getByText } = render(<PropertyBadge type="VENDIDA" />);
    expect(getByText('VENDIDA')).toBeTruthy();
  });

  it('renderiza badge NUEVA con texto correcto', () => {
    const { getByText } = render(<PropertyBadge type="NUEVA" />);
    expect(getByText('NUEVA')).toBeTruthy();
  });

  it('EXCLUSIVA tiene accessibilityLabel correcto', () => {
    const { getByLabelText } = render(<PropertyBadge type="EXCLUSIVA" />);
    expect(getByLabelText('EXCLUSIVA')).toBeTruthy();
  });

  it('VENDIDA tiene accessibilityLabel correcto', () => {
    const { getByLabelText } = render(<PropertyBadge type="VENDIDA" />);
    expect(getByLabelText('VENDIDA')).toBeTruthy();
  });

  it('NUEVA tiene accessibilityLabel correcto', () => {
    const { getByLabelText } = render(<PropertyBadge type="NUEVA" />);
    expect(getByLabelText('NUEVA')).toBeTruthy();
  });

  it('acepta testID', () => {
    const { getByTestId } = render(
      <PropertyBadge type="EXCLUSIVA" testID="badge-exclusiva" />
    );
    expect(getByTestId('badge-exclusiva')).toBeTruthy();
  });
});
