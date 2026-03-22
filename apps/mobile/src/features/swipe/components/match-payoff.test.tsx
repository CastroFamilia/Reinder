/**
 * apps/mobile/src/features/swipe/components/match-payoff.test.tsx
 *
 * Tests para MatchPayoff — overlay de celebración de match.
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';
import { MatchPayoff } from './match-payoff';

// Avanzar timers para testear el auto-dismiss
jest.useFakeTimers();

describe('MatchPayoff', () => {
  const mockOnDismiss = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  it('no renderiza nada cuando visible=false', () => {
    const { queryByTestId } = render(
      <MatchPayoff visible={false} onDismiss={mockOnDismiss} testID="match-payoff" />,
    );
    // Cuando visible=false y scale=0, retorna null
    expect(queryByTestId('match-payoff')).toBeNull();
  });

  it('renderiza el overlay cuando visible=true', () => {
    const { getByTestId } = render(
      <MatchPayoff visible={true} onDismiss={mockOnDismiss} testID="match-payoff" />,
    );
    expect(getByTestId('match-payoff')).toBeTruthy();
  });

  it('muestra el texto "¡Match!" cuando visible=true', () => {
    const { getByText } = render(
      <MatchPayoff visible={true} onDismiss={mockOnDismiss} />,
    );
    expect(getByText('¡Match!')).toBeTruthy();
  });

  it('llama a onDismiss después de PAYOFF_DURATION_MS (450ms) + fade-out (150ms)', () => {
    render(<MatchPayoff visible={true} onDismiss={mockOnDismiss} />);

    // Antes de avanzar los timers, onDismiss no debe haber sido llamado
    expect(mockOnDismiss).not.toHaveBeenCalled();

    // Avanzar 450ms (PAYOFF_DURATION_MS) + 200ms margen para el withTiming fade-out (150ms)
    act(() => {
      jest.advanceTimersByTime(450 + 200);
    });

    // onDismiss debería haber sido llamado (via runOnJS en la animación)
    // En el entorno de test con mocks de Reanimated, runOnJS se ejecuta sincrónicamente
    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  it('cancela el timer cuando visible pasa a false antes del auto-dismiss', () => {
    const { rerender } = render(
      <MatchPayoff visible={true} onDismiss={mockOnDismiss} />,
    );

    act(() => {
      jest.advanceTimersByTime(200); // antes del auto-dismiss (450ms)
    });

    // Cambiar a invisible — debe cancelar el timer pendiente
    rerender(<MatchPayoff visible={false} onDismiss={mockOnDismiss} />);

    act(() => {
      jest.advanceTimersByTime(2000); // más tiempo extra
    });

    // onDismiss NO debe haberse llamado porque el timer fue cancelado
    // Nota: si el Reanimated mock llama onDismiss sincrónicamente en withTiming,
    // puede que se llame 0 o 1 veces dependiendo del timing del mock.
    // Lo que importa es que no se llame por el timer pendiente cancelado.
    expect(mockOnDismiss).toHaveBeenCalledTimes(0);
  });
});
