/**
 * apps/mobile/src/components/ui/glass-panel.test.tsx
 *
 * Tests unitarios para GlassPanel.
 * Verifican: render por variante de intensidad, testID, y que children se renderiza.
 */
import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { GlassPanel } from './glass-panel';

describe('GlassPanel', () => {
  it('renderiza sin errores con intensidad por defecto (medium)', () => {
    const { getByTestId } = render(
      <GlassPanel testID="glass-panel">
        <Text>Contenido</Text>
      </GlassPanel>
    );
    expect(getByTestId('glass-panel')).toBeTruthy();
  });

  it('renderiza con intensidad light', () => {
    const { getByTestId } = render(
      <GlassPanel intensity="light" testID="glass-light">
        <Text>Light</Text>
      </GlassPanel>
    );
    expect(getByTestId('glass-light')).toBeTruthy();
  });

  it('renderiza con intensidad medium', () => {
    const { getByTestId } = render(
      <GlassPanel intensity="medium" testID="glass-medium">
        <Text>Medium</Text>
      </GlassPanel>
    );
    expect(getByTestId('glass-medium')).toBeTruthy();
  });

  it('renderiza con intensidad heavy', () => {
    const { getByTestId } = render(
      <GlassPanel intensity="heavy" testID="glass-heavy">
        <Text>Heavy</Text>
      </GlassPanel>
    );
    expect(getByTestId('glass-heavy')).toBeTruthy();
  });

  it('renderiza los children correctamente', () => {
    const { getByText } = render(
      <GlassPanel>
        <Text>Hijo de GlassPanel</Text>
      </GlassPanel>
    );
    expect(getByText('Hijo de GlassPanel')).toBeTruthy();
  });
});
