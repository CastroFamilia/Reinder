/**
 * apps/mobile/App.tsx
 *
 * Entry point del app mobile Reinder.
 *
 * Story 1.6 — Auth Guard:
 * El hook `useAuthSession` suscribe al estado de sesión de Supabase.
 * - Si `loading` → muestra LoadingScreen (comprobando sesión inicial)
 * - Si `session === null` → muestra LoginScreen (formulario email/contraseña)
 * - Si `session` activa → muestra SwipeScreen
 *
 * Story 2.1 — Design Foundation:
 * - Usa design tokens de `tokens.ts` (sin colores hardcodeados)
 * - Envuelve las pantallas con `ScreenBackground` (gradiente radial UX-DR13)
 *
 * Story 2.2 — Feed de Propiedades:
 * - GestureHandlerRootView envuelve toda la app (requerido por react-native-gesture-handler)
 * - SwipeScreen: feed con PropertyCard + SwipeActions
 */
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useAuthSession } from "./src/hooks/useAuthSession";
import { ScreenBackground } from "./src/components/layout/screen-background";
import { SwipeScreen } from "./src/features/swipe/screens/swipe-screen";
import { LoginScreen } from "./src/features/auth/screens/login-screen";
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



export default function App() {
  const { session, loading } = useAuthSession();

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <StatusBar style="light" />
      {loading ? (
        <LoadingScreen />
      ) : !session ? (
        <LoginScreen />
      ) : (
        <SwipeScreen />
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

