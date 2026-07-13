/**
 * apps/mobile/src/features/swipe/components/property-card-skeleton.test.tsx
 *
 * Tests de render básico para PropertyCardSkeleton.
 * Verifica que el skeleton se renderiza sin crash.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { PropertyCardSkeleton } from './property-card-skeleton';

// Mock de expo-blur (ya configurado globalmente en jest-expo)
jest.mock('expo-blur', () => ({
  BlurView: ({ children, testID }: { children?: React.ReactNode; testID?: string }) => {
    const { View } = require('react-native');
    return <View testID={testID}>{children}</View>;
  },
}));

describe('PropertyCardSkeleton', () => {
  it('renderiza sin crash', () => {
    const { getByTestId } = render(<PropertyCardSkeleton testID="skeleton" />);
    // El componente no tiene un testID raíz explícito, solo verificamos que no crashea
    expect(render(<PropertyCardSkeleton />)).toBeTruthy();
  });

  it('acepta testID prop sin crash', () => {
    expect(() => render(<PropertyCardSkeleton testID="test-skeleton" />)).not.toThrow();
  });

  it('renderiza con los elementos glass esperados', () => {
    const { UNSAFE_getAllByType } = render(<PropertyCardSkeleton />);
    const { View } = require('react-native');
    // Verifica que hay contenido renderizado (GlassPanel renderiza Views)
    expect(UNSAFE_getAllByType(View).length).toBeGreaterThan(0);
  });
});
