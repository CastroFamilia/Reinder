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
 * AC: 4 — "el root layout de Expo protege todas las tabs mobile
 *          y redirige al flujo de auth si no hay sesión activa"
 */
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { useAuthSession } from "./src/hooks/useAuthSession";

/** Pantalla de loading mientras se comprueba la sesión inicial */
function LoadingScreen() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#FF6B00" />
    </View>
  );
}

/**
 * Pantalla de autenticación requerida.
 * Placeholder hasta que se implemente el flujo de login nativo mobile (Epic 2+).
 * El usuario puede iniciar sesión desde la web y la sesión se compartirá.
 */
function AuthGateScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Reinder</Text>
      <Text style={styles.message}>Inicia sesión para continuar</Text>
      <Text style={styles.hint}>
        Accede desde reinder.app en tu navegador para iniciar sesión.
      </Text>
    </View>
  );
}

/** Contenido principal — solo visible cuando el usuario está autenticado */
function ProtectedContent() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Reinder</Text>
      <Text style={styles.message}>¡Bienvenido!</Text>
      <StatusBar style="auto" />
    </View>
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
    backgroundColor: "#0D0D0D",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  logo: {
    color: "#FF6B00",
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  message: {
    color: "#F5F0E8",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  hint: {
    color: "#9E9080",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});

