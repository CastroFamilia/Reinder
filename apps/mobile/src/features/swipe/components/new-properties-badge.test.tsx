/**
 * apps/mobile/src/features/swipe/components/new-properties-badge.test.tsx
 * Story 2.7 — Task 6
 */
import { render, fireEvent } from '@testing-library/react-native';
import { NewPropertiesBadge } from './new-properties-badge';

jest.mock('../../../components/ui/glass-panel', () => ({
  GlassPanel: ({ children, style }: any) => {
    const { View } = require('react-native');
    return <View style={style}>{children}</View>;
  },
}));

describe('NewPropertiesBadge', () => {
  it('no renderiza cuando count es 0', () => {
    const { toJSON } = render(
      <NewPropertiesBadge count={0} onPress={jest.fn()} onDismiss={jest.fn()} />,
    );
    expect(toJSON()).toBeNull();
  });

  it('renderiza con texto correcto cuando count es 1', () => {
    const { getByText } = render(
      <NewPropertiesBadge count={1} onPress={jest.fn()} onDismiss={jest.fn()} />,
    );
    expect(getByText(/1 nueva propiedad/)).toBeTruthy();
  });

  it('renderiza con texto plural cuando count es 3', () => {
    const { getByText } = render(
      <NewPropertiesBadge count={3} onPress={jest.fn()} onDismiss={jest.fn()} />,
    );
    expect(getByText(/3 nuevas propiedades/)).toBeTruthy();
  });

  it('llama a onPress al pulsar el banner', () => {
    const mockOnPress = jest.fn();
    const { getByLabelText } = render(
      <NewPropertiesBadge count={2} onPress={mockOnPress} onDismiss={jest.fn()} />,
    );
    fireEvent.press(getByLabelText(/2 nuevas propiedades/));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('llama a onDismiss al pulsar ✕', () => {
    const mockOnDismiss = jest.fn();
    const { getByLabelText } = render(
      <NewPropertiesBadge count={2} onPress={jest.fn()} onDismiss={mockOnDismiss} />,
    );
    fireEvent.press(getByLabelText('Cerrar notificación'));
    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });
});
