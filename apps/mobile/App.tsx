/**
 * apps/mobile/App.tsx
 *
 * Entry point del app mobile Reinder.
 *
 * Story 1.6 — Auth Guard:
 * El hook `useAuthSession` suscribe al estado de sesión de Supabase.
 * - Si `loading` → muestra LoadingScreen (comprobando sesión inicial)
 * - Si `session === null` → muestra AuthGateScreen (no autenticado)
 * - Si `session` activa → muestra el contenido protegido
 *
 * Story 2.1 — Design Foundation:
 * - Usa design tokens de `tokens.ts` (sin colores hardcodeados)
 * - Envuelve las pantallas con `ScreenBackground` (gradiente radial UX-DR13)
 */
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { useAuthSession } from "./src/hooks/useAuthSession";
import { ScreenBackground } from "./src/components/layout/screen-background";
import { Colors, Typography, Spacing } from "./src/lib/tokens";

/** Pantalla de loading mientras se comprueba la sesión inicial */
function LoadingScreen() {
  return (
    <ScreenBackground>
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.accentPrimary} />
      </View>
    </ScreenBackground>
  );
}

/**
 * Pantalla de autenticación requerida.
 * Placeholder hasta que se implemente el flujo de login nativo mobile (Epic 2+).
 */
function AuthGateScreen() {
  return (
    <ScreenBackground>
      <View style={styles.container}>
        <Text style={styles.logo}>Reinder</Text>
        <Text style={styles.message}>Inicia sesión para continuar</Text>
        <Text style={styles.hint}>
          Accede desde reinder.app en tu navegador para iniciar sesión.
        </Text>
      </View>
    </ScreenBackground>
  );
}

/** Contenido principal — solo visible cuando el usuario está autenticado */
function ProtectedContent() {
  return (
    <ScreenBackground>
      <View style={styles.container}>
        <Text style={styles.logo}>Reinder</Text>
        <Text style={styles.message}>¡Bienvenido!</Text>
        <StatusBar style="light" />
      </View>
    </ScreenBackground>
  );
}

export default function App() {
  const { session, loading } = useAuthSession();

  if (loading) return <LoadingScreen />;
  if (!session) return <AuthGateScreen />;
  return <ProtectedContent />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  logo: {
    color: Colors.accentPrimary,
    fontSize: Typography.sizeDisplay,
    fontWeight: "700",
    marginBottom: Spacing.md,
    letterSpacing: -0.5,
  },
  message: {
    color: Colors.textPrimary,
    fontSize: Typography.sizeSubtitle, // 18
    fontWeight: "600",
    marginBottom: Spacing.sm + Spacing.xs, // 12px
    textAlign: "center",
  },
  hint: {
    color: Colors.textMuted,
    fontSize: Typography.sizeCaption, // 14
    textAlign: "center",
    lineHeight: 20,
  },
});

