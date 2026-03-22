/**
 * apps/mobile/src/features/swipe/components/swipe-actions.test.tsx
 *
 * Tests para SwipeActions.
 * Verifica: callbacks se llaman, labels ARIA correctos, botones presentes.
 *
 * Source: epics.md#Story-2.2 AC5-AC6, UX-DR3
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SwipeActions } from './swipe-actions';

describe('SwipeActions', () => {
  const mockOnReject = jest.fn();
  const mockOnInfo = jest.fn();
  const mockOnMatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('renderiza los 3 botones', () => {
    it('muestra el botón de reject', () => {
      const { getByTestId } = render(
        <SwipeActions
          onReject={mockOnReject}
          onInfo={mockOnInfo}
          onMatch={mockOnMatch}
          testID="actions"
        />,
      );
      expect(getByTestId('actions-reject')).toBeTruthy();
    });

    it('muestra el botón de info', () => {
      const { getByTestId } = render(
        <SwipeActions
          onReject={mockOnReject}
          onInfo={mockOnInfo}
          onMatch={mockOnMatch}
          testID="actions"
        />,
      );
      expect(getByTestId('actions-info')).toBeTruthy();
    });

    it('muestra el botón de match', () => {
      const { getByTestId } = render(
        <SwipeActions
          onReject={mockOnReject}
          onInfo={mockOnInfo}
          onMatch={mockOnMatch}
          testID="actions"
        />,
      );
      expect(getByTestId('actions-match')).toBeTruthy();
    });
  });

  describe('labels ARIA correctos (UX-DR3)', () => {
    it('botón reject tiene accessibilityLabel "No me interesa"', () => {
      const { getByLabelText } = render(
        <SwipeActions
          onReject={mockOnReject}
          onInfo={mockOnInfo}
          onMatch={mockOnMatch}
        />,
      );
      expect(getByLabelText('No me interesa')).toBeTruthy();
    });

    it('botón info tiene accessibilityLabel "Ver detalle"', () => {
      const { getByLabelText } = render(
        <SwipeActions
          onReject={mockOnReject}
          onInfo={mockOnInfo}
          onMatch={mockOnMatch}
        />,
      );
      expect(getByLabelText('Ver detalle')).toBeTruthy();
    });

    it('botón match tiene accessibilityLabel "Me interesa"', () => {
      const { getByLabelText } = render(
        <SwipeActions
          onReject={mockOnReject}
          onInfo={mockOnInfo}
          onMatch={mockOnMatch}
        />,
      );
      expect(getByLabelText('Me interesa')).toBeTruthy();
    });
  });

  describe('callbacks se disparan correctamente', () => {
    it('llama onReject al pulsar el botón de reject', () => {
      const { getByTestId } = render(
        <SwipeActions
          onReject={mockOnReject}
          onInfo={mockOnInfo}
          onMatch={mockOnMatch}
          testID="actions"
        />,
      );
      fireEvent.press(getByTestId('actions-reject'));
      expect(mockOnReject).toHaveBeenCalledTimes(1);
      expect(mockOnInfo).not.toHaveBeenCalled();
      expect(mockOnMatch).not.toHaveBeenCalled();
    });

    it('llama onInfo al pulsar el botón de info', () => {
      const { getByTestId } = render(
        <SwipeActions
          onReject={mockOnReject}
          onInfo={mockOnInfo}
          onMatch={mockOnMatch}
          testID="actions"
        />,
      );
      fireEvent.press(getByTestId('actions-info'));
      expect(mockOnInfo).toHaveBeenCalledTimes(1);
      expect(mockOnReject).not.toHaveBeenCalled();
      expect(mockOnMatch).not.toHaveBeenCalled();
    });

    it('llama onMatch al pulsar el botón de match', () => {
      const { getByTestId } = render(
        <SwipeActions
          onReject={mockOnReject}
          onInfo={mockOnInfo}
          onMatch={mockOnMatch}
          testID="actions"
        />,
      );
      fireEvent.press(getByTestId('actions-match'));
      expect(mockOnMatch).toHaveBeenCalledTimes(1);
      expect(mockOnReject).not.toHaveBeenCalled();
      expect(mockOnInfo).not.toHaveBeenCalled();
    });
  });

  describe('estado disabled', () => {
    it('no dispara callbacks cuando disabled=true', () => {
      const { getByTestId } = render(
        <SwipeActions
          onReject={mockOnReject}
          onInfo={mockOnInfo}
          onMatch={mockOnMatch}
          disabled={true}
          testID="actions"
        />,
      );
      fireEvent.press(getByTestId('actions-match'));
      fireEvent.press(getByTestId('actions-reject'));
      fireEvent.press(getByTestId('actions-info'));
      expect(mockOnMatch).not.toHaveBeenCalled();
      expect(mockOnReject).not.toHaveBeenCalled();
      expect(mockOnInfo).not.toHaveBeenCalled();
    });
  });
});
