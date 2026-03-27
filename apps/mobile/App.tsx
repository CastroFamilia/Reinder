/**
 * apps/mobile/App.tsx
 *
 * Entry point del app mobile Reinder.
 *
 * Story 1.6 — Auth Guard:
 * - `loading` → LoadingScreen
 * - `session === null` → LoginScreen
 * - `session` activa → BuyerTabNavigator
 *
 * Story 2.7 — Historial de Matches y Badge:
 * - BuyerTabNavigator: 2 tabs (Swipe + Matches)
 * - SwipeScreen recibe onNavigateToMatches para navegar desde el badge
 * - Tab bar mínima funcional — diseño definitivo en Story 2.8
 */
import { StatusBar } from "expo-status-bar";
import { StyleSheet, View, ActivityIndicator } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuthSession } from "./src/hooks/useAuthSession";
import { ScreenBackground } from "./src/components/layout/screen-background";
import { SwipeScreen } from "./src/features/swipe/screens/swipe-screen";
import { MatchHistoryScreen } from "./src/features/matches/screens/match-history-screen";
import { LoginScreen } from "./src/features/auth/screens/login-screen";
import { Colors, Typography } from "./src/lib/tokens";

// ─── Tab Navigator ──────────────────────────────────────────────────────────

export type BuyerTabParamList = {
  Swipe: undefined;
  Matches: undefined;
};

const Tab = createBottomTabNavigator<BuyerTabParamList>();

/** Tab bar mínima — estilos definitivos y tab Perfil en Story 2.8 */
function BuyerTabNavigator({ token }: { token: string }) {
  return (
    <Tab.Navigator
      initialRouteName="Swipe"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.bgSurface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: Colors.accentPrimary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: {
          fontSize: Typography.sizeSmall,
          fontWeight: `${Typography.weightMedium}`,
        },
      }}
    >
      <Tab.Screen
        name="Swipe"
        options={{ tabBarLabel: 'Descubrir' }}
      >
        {({ navigation }) => (
          <SwipeScreen
            onNavigateToMatches={() => navigation.navigate('Matches')}
          />
        )}
      </Tab.Screen>

      <Tab.Screen
        name="Matches"
        options={{ tabBarLabel: 'Matches' }}
      >
        {() => <MatchHistoryScreen token={token} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

// ─── Loading Screen ──────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <ScreenBackground>
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.accentPrimary} />
      </View>
    </ScreenBackground>
  );
}

// ─── App Root ────────────────────────────────────────────────────────────────

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
        <NavigationContainer>
          <BuyerTabNavigator token={session.access_token} />
        </NavigationContainer>
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
