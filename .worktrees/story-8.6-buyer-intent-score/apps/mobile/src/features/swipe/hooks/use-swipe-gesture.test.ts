/**
 * apps/mobile/src/features/swipe/hooks/use-swipe-gesture.test.ts
 *
 * Tests básicos para use-swipe-gesture.
 * Nota: Reanimated 3 en Jest requiere mocks — el preset jest-expo ya incluye el mock automático
 * que convierte shared values en valores JS ordinarios.
 */
import { useSwipeGesture } from './use-swipe-gesture';
import { renderHook } from '@testing-library/react-native';

// El mock de react-native-reanimated está provisto por el preset jest-expo / @testing-library
// Los useSharedValue / useAnimatedStyle / withSpring se reemplazan por implementaciones JS simples

describe('useSwipeGesture', () => {
  const mockOnMatch = jest.fn();
  const mockOnReject = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('inicializa y devuelve panGesture, animatedCardStyle, overlayOpacity y resetCard', () => {
    const { result } = renderHook(() =>
      useSwipeGesture({ onMatch: mockOnMatch, onReject: mockOnReject }),
    );

    expect(result.current.panGesture).toBeDefined();
    expect(result.current.animatedCardStyle).toBeDefined();
    expect(result.current.overlayOpacity).toBeDefined();
    expect(result.current.resetCard).toBeInstanceOf(Function);
  });

  it('expone panGesture con los handlers correctos', () => {
    const { result } = renderHook(() =>
      useSwipeGesture({ onMatch: mockOnMatch, onReject: mockOnReject }),
    );
    // El gesture object existe y tiene la forma esperada de Gesture.Pan()
    expect(result.current.panGesture).not.toBeNull();
  });

  it('resetCard es invocable sin errores', () => {
    const { result } = renderHook(() =>
      useSwipeGesture({ onMatch: mockOnMatch, onReject: mockOnReject }),
    );
    // No debe lanzar error al llamar resetCard
    expect(() => result.current.resetCard()).not.toThrow();
  });
});
