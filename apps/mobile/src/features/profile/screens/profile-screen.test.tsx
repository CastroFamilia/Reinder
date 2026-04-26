/**
 * apps/mobile/src/features/profile/screens/profile-screen.test.tsx
 *
 * Story 2.8 — Task 1: Tests para ProfileScreen placeholder
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { ProfileScreen } from './profile-screen';

jest.mock('../../../components/layout/screen-background', () => ({
  ScreenBackground: ({ children, testID }: { children: React.ReactNode; testID?: string }) => {
    const { View } = require('react-native');
    return <View testID={testID}>{children}</View>;
  },
}));

describe('ProfileScreen', () => {
  it('renderiza la pantalla de perfil', () => {
    const { getByTestId } = render(<ProfileScreen />);
    expect(getByTestId('profile-screen')).toBeTruthy();
  });

  it('muestra el título "Perfil"', () => {
    const { getByTestId } = render(<ProfileScreen />);
    expect(getByTestId('profile-title')).toBeTruthy();
  });

  it('muestra texto de próxima disponibilidad', () => {
    const { getByText } = render(<ProfileScreen />);
    expect(getByText('Tu perfil estará disponible próximamente')).toBeTruthy();
  });
});
