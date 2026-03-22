/**
 * apps/mobile/src/features/auth/screens/login-screen.tsx
 *
 * Pantalla combinada Login + Registro con Google OAuth.
 * Implementa Story 1.3, 1.4 y 1.5 para la app mobile.
 *
 * Flujo Google OAuth (Story 1.4):
 * - signInWithOAuth abre Google en el browser del sistema
 * - Google redirige a reinder://auth-callback?code=...
 * - exchangeCodeForSession intercambia el código por sesión
 * - useAuthSession detecta la sesión y App.tsx renderiza SwipeScreen
 *
 * Source: epics.md#Story-1.3, 1.4 (UX-DR16, NFR5, NFR6)
 */
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '../../../lib/supabase';
import { ScreenBackground } from '../../../components/layout/screen-background';
import { Colors, Radius, Spacing, Typography, SurfaceColors } from '../../../lib/tokens';

WebBrowser.maybeCompleteAuthSession();

type Mode = 'login' | 'register';

export function LoginScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Captura el deep link reinder://auth-callback?code=... al volver de Google
  useEffect(() => {
    const subscription = Linking.addEventListener('url', async ({ url }) => {
      if (!url.includes('auth-callback')) return;
      const { queryParams } = Linking.parse(url);
      const code = queryParams?.code as string | undefined;
      if (code) await supabase.auth.exchangeCodeForSession(code);
    });
    return () => subscription.remove();
  }, []);

  const handleEmailAuth = async () => {
    if (!email || !password) {
      setError('Introduce tu email y contraseña.');
      return;
    }
    if (mode === 'register' && password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    setLoading(true);
    setError(null);
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError('Email o contraseña incorrectos.');
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(
          error.message.includes('already registered')
            ? 'Ya existe una cuenta con este email. ¿Quieres iniciar sesión?'
            : 'Error al crear la cuenta. Inténtalo de nuevo.'
        );
      }
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      // En Expo Go: genera exp://ip:puerto/--/auth-callback
      // En producción: genera reinder://auth-callback
      const redirectTo = makeRedirectUri({ path: 'auth-callback' });
      console.log('[OAuth] redirectTo:', redirectTo); // Copia esta URL a Supabase → Redirect URLs

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error || !data?.url) {
        setError('No se pudo iniciar el login con Google.');
        return;
      }
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type === 'success' && result.url) {
        const url = result.url;
        const { queryParams } = Linking.parse(url);
        const code = queryParams?.code as string | undefined;

        if (code) {
          // PKCE flow: intercambia el código por una sesión
          const { error: se } = await supabase.auth.exchangeCodeForSession(code);
          if (se) setError('Error al completar el login con Google.');
        } else if (url.includes('#')) {
          // Implicit flow: tokens vienen directamente en el fragment (#)
          const fragment = url.split('#')[1] ?? '';
          const params = Object.fromEntries(new URLSearchParams(fragment));
          const { access_token, refresh_token } = params;
          if (access_token && refresh_token) {
            const { error: se } = await supabase.auth.setSession({ access_token, refresh_token });
            if (se) setError('Error al completar el login con Google.');
          }
        }
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const isLogin = mode === 'login';

  return (
    <ScreenBackground>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          {/* Logo */}
          <Text style={styles.logo}>Reinder</Text>
          <Text style={styles.tagline}>Swipe. Match. Move.</Text>

          {/* Toggle Login / Registro */}
          <View style={styles.toggle}>
            <Pressable
              style={[styles.toggleBtn, isLogin && styles.toggleBtnActive]}
              onPress={() => { setMode('login'); setError(null); }}
            >
              <Text style={[styles.toggleText, isLogin && styles.toggleTextActive]}>
                Iniciar sesión
              </Text>
            </Pressable>
            <Pressable
              style={[styles.toggleBtn, !isLogin && styles.toggleBtnActive]}
              onPress={() => { setMode('register'); setError(null); }}
            >
              <Text style={[styles.toggleText, !isLogin && styles.toggleTextActive]}>
                Registrarse
              </Text>
            </Pressable>
          </View>

          {/* Formulario */}
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              returnKeyType="next"
            />
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete={isLogin ? 'password' : 'new-password'}
              returnKeyType="done"
              onSubmitEditing={handleEmailAuth}
            />

            {error && <Text style={styles.errorText}>{error}</Text>}

            {/* Botón Primary (UX-DR11) */}
            <Pressable
              style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPressed]}
              onPress={handleEmailAuth}
              disabled={loading || googleLoading}
              accessibilityRole="button"
              accessibilityLabel={isLogin ? 'Iniciar sesión' : 'Crear cuenta'}
            >
              {loading ? (
                <ActivityIndicator color={Colors.textPrimary} />
              ) : (
                <Text style={styles.btnPrimaryText}>
                  {isLogin ? 'Iniciar sesión' : 'Crear cuenta'}
                </Text>
              )}
            </Pressable>

            {/* Separador */}
            <View style={styles.separator}>
              <View style={styles.separatorLine} />
              <Text style={styles.separatorText}>o</Text>
              <View style={styles.separatorLine} />
            </View>

            {/* Botón Google — Secondary (UX-DR11) */}
            <Pressable
              style={({ pressed }) => [styles.btnGoogle, pressed && styles.btnPressed]}
              onPress={handleGoogleLogin}
              disabled={loading || googleLoading}
              accessibilityRole="button"
              accessibilityLabel="Continuar con Google"
            >
              {googleLoading ? (
                <ActivityIndicator color={Colors.accentPrimary} />
              ) : (
                <Text style={styles.btnGoogleText}>Continuar con Google</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  logo: {
    color: Colors.accentPrimary,
    fontSize: Typography.sizeDisplay,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: Spacing.xs,
  },
  tagline: {
    color: Colors.textMuted,
    fontSize: Typography.sizeCaption,
    letterSpacing: 1.5,
    marginBottom: Spacing.lg,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: SurfaceColors.bgSurfaceOverlay,
    borderRadius: Radius.btn,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
    width: '100%',
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: Radius.btn,
  },
  toggleBtnActive: {
    backgroundColor: Colors.accentPrimary,
  },
  toggleText: {
    color: Colors.textMuted,
    fontSize: Typography.sizeCaption,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: Colors.textPrimary,
  },
  form: {
    width: '100%',
    gap: Spacing.sm,
  },
  input: {
    backgroundColor: SurfaceColors.bgSurfaceOverlay,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.btn,
    color: Colors.textPrimary,
    fontSize: Typography.sizeBody,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + Spacing.xs,
  },
  errorText: {
    color: Colors.accentReject,
    fontSize: Typography.sizeCaption,
    textAlign: 'center',
  },
  btnPrimary: {
    backgroundColor: Colors.accentPrimary,
    borderRadius: Radius.btn,
    paddingVertical: Spacing.sm + Spacing.xs,
    alignItems: 'center',
    marginTop: Spacing.xs,
    shadowColor: Colors.accentPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  btnPressed: { opacity: 0.85 },
  btnPrimaryText: {
    color: Colors.textPrimary,
    fontSize: Typography.sizeBody,
    fontWeight: '700',
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.xs,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  separatorText: {
    color: Colors.textMuted,
    fontSize: Typography.sizeCaption,
    marginHorizontal: Spacing.sm,
  },
  btnGoogle: {
    backgroundColor: SurfaceColors.bgSurfaceOverlay,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.4)',
    borderRadius: Radius.btn,
    paddingVertical: Spacing.sm + Spacing.xs,
    alignItems: 'center',
  },
  btnGoogleText: {
    color: Colors.accentPrimary,
    fontSize: Typography.sizeBody,
    fontWeight: '600',
  },
});
