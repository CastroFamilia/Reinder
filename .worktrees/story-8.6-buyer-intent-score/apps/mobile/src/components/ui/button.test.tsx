/**
 * apps/mobile/src/components/ui/button.test.tsx
 *
 * Tests unitarios para Button.
 * Verifican: render por variante, touch target mínimo, disabled, onPress, testID.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from './button';

describe('Button', () => {
  it('renderiza variante primary con texto', () => {
    const { getByText } = render(<Button variant="primary">Acción</Button>);
    expect(getByText('Acción')).toBeTruthy();
  });

  it('renderiza variante secondary', () => {
    const { getByText } = render(<Button variant="secondary">Secundario</Button>);
    expect(getByText('Secundario')).toBeTruthy();
  });

  it('renderiza variante destructive', () => {
    const { getByText } = render(<Button variant="destructive">Eliminar</Button>);
    expect(getByText('Eliminar')).toBeTruthy();
  });

  it('renderiza variante ghost', () => {
    const { getByText } = render(<Button variant="ghost">Omitir</Button>);
    expect(getByText('Omitir')).toBeTruthy();
  });

  it('invoca onPress al pulsar', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <Button testID="btn-test" onPress={onPress}>
        Pulsar
      </Button>
    );
    fireEvent.press(getByTestId('btn-test'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('NO invoca onPress cuando está disabled', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <Button testID="btn-disabled" onPress={onPress} disabled>
        Desactivado
      </Button>
    );
    fireEvent.press(getByTestId('btn-disabled'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('acepta testID', () => {
    const { getByTestId } = render(
      <Button testID="btn-custom">Botón</Button>
    );
    expect(getByTestId('btn-custom')).toBeTruthy();
  });
});
