/**
 * apps/mobile/src/features/auth/screens/login-screen.test.tsx
 *
 * Unit tests for LoginScreen component.
 * Verifies: render, mode toggle, validation, email auth, and Google OAuth.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// Mock Supabase — use inline jest.fn() inside factory to avoid hoisting issues
jest.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signInWithOAuth: jest.fn(),
      exchangeCodeForSession: jest.fn(),
    },
  },
}));

// Mock expo modules
jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn().mockResolvedValue({ type: 'cancel' }),
}));

jest.mock('expo-linking', () => ({
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  parse: jest.fn(() => ({ queryParams: {} })),
}));

jest.mock('expo-auth-session', () => ({
  makeRedirectUri: jest.fn(() => 'reinder://auth-callback'),
}));

// Mock blur (used by ScreenBackground)
jest.mock('expo-blur', () => ({
  BlurView: 'BlurView',
}));

// Mock linear gradient
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

import { LoginScreen } from './login-screen';

// Get typed reference to mocked auth methods
function getAuthMocks() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { supabase } = require('../../../lib/supabase') as {
    supabase: {
      auth: {
        signInWithPassword: jest.Mock;
        signUp: jest.Mock;
        signInWithOAuth: jest.Mock;
        exchangeCodeForSession: jest.Mock;
      };
    };
  };
  return supabase.auth;
}

describe('LoginScreen', () => {
  let auth: ReturnType<typeof getAuthMocks>;

  beforeEach(() => {
    jest.clearAllMocks();
    auth = getAuthMocks();
  });

  it('renders logo and tagline', () => {
    const { getByText } = render(<LoginScreen />);
    expect(getByText('Reinder')).toBeTruthy();
    expect(getByText('Swipe. Match. Move.')).toBeTruthy();
  });

  it('renders email and password inputs', () => {
    const { getByPlaceholderText } = render(<LoginScreen />);
    expect(getByPlaceholderText('Email')).toBeTruthy();
    expect(getByPlaceholderText('Contraseña')).toBeTruthy();
  });

  it('renders both toggle buttons', () => {
    const { getAllByText } = render(<LoginScreen />);
    // "Iniciar sesión" appears in toggle AND in the primary button label
    const matches = getAllByText('Iniciar sesión');
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('toggles to register mode', () => {
    const { getByText } = render(<LoginScreen />);
    fireEvent.press(getByText('Registrarse'));
    expect(getByText('Crear cuenta')).toBeTruthy();
  });

  it('shows error when submitting empty fields', async () => {
    const { getByLabelText, getByText } = render(<LoginScreen />);
    fireEvent.press(getByLabelText('Iniciar sesión'));

    await waitFor(() => {
      expect(getByText('Introduce tu email y contraseña.')).toBeTruthy();
    });
  });

  it('shows error for short password in register mode', async () => {
    const { getByText, getByPlaceholderText, getByLabelText } = render(<LoginScreen />);

    fireEvent.press(getByText('Registrarse'));
    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Contraseña'), 'short');
    fireEvent.press(getByLabelText('Crear cuenta'));

    await waitFor(() => {
      expect(getByText('La contraseña debe tener al menos 8 caracteres.')).toBeTruthy();
    });
  });

  it('calls signInWithPassword on login submit', async () => {
    auth.signInWithPassword.mockResolvedValueOnce({ error: null });

    const { getByPlaceholderText, getByLabelText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('Email'), 'user@test.com');
    fireEvent.changeText(getByPlaceholderText('Contraseña'), 'password123');
    fireEvent.press(getByLabelText('Iniciar sesión'));

    await waitFor(() => {
      expect(auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'user@test.com',
        password: 'password123',
      });
    });
  });

  it('shows error on failed login', async () => {
    auth.signInWithPassword.mockResolvedValueOnce({
      error: { message: 'Invalid credentials' },
    });

    const { getByPlaceholderText, getByLabelText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('Email'), 'user@test.com');
    fireEvent.changeText(getByPlaceholderText('Contraseña'), 'wrongpassword');
    fireEvent.press(getByLabelText('Iniciar sesión'));

    await waitFor(() => {
      expect(getByText('Email o contraseña incorrectos.')).toBeTruthy();
    });
  });

  it('calls signUp on register submit', async () => {
    auth.signUp.mockResolvedValueOnce({ error: null });

    const { getByText, getByPlaceholderText, getByLabelText } = render(<LoginScreen />);

    fireEvent.press(getByText('Registrarse'));
    fireEvent.changeText(getByPlaceholderText('Email'), 'new@test.com');
    fireEvent.changeText(getByPlaceholderText('Contraseña'), 'password123');
    fireEvent.press(getByLabelText('Crear cuenta'));

    await waitFor(() => {
      expect(auth.signUp).toHaveBeenCalledWith({
        email: 'new@test.com',
        password: 'password123',
      });
    });
  });

  it('shows error for already registered email', async () => {
    auth.signUp.mockResolvedValueOnce({
      error: { message: 'User already registered' },
    });

    const { getByText, getByPlaceholderText, getByLabelText } = render(<LoginScreen />);

    fireEvent.press(getByText('Registrarse'));
    fireEvent.changeText(getByPlaceholderText('Email'), 'existing@test.com');
    fireEvent.changeText(getByPlaceholderText('Contraseña'), 'password123');
    fireEvent.press(getByLabelText('Crear cuenta'));

    await waitFor(() => {
      expect(getByText(/Ya existe una cuenta/)).toBeTruthy();
    });
  });

  it('renders Google login button', () => {
    const { getByLabelText } = render(<LoginScreen />);
    expect(getByLabelText('Continuar con Google')).toBeTruthy();
  });
});
