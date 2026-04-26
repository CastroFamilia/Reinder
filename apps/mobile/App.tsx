/**
 * apps/mobile/App.tsx
 *
 * Entry point del app mobile Reinder.
 *
 * Story 1.6 — Auth Guard:
 * - `loading` → LoadingScreen
 * - `session === null` → LoginScreen
 * - `session` activa → BuyerTabNavigator (o AgentTabNavigator en Epic 4)
 *
 * Story 2.7 — Historial de Matches y Badge:
 * - BuyerTabNavigator: 2 tabs (Swipe + Matches)
 * - SwipeScreen recibe onNavigateToMatches para navegar desde el badge
 *
 * Story 2.8 — TabBar de Comprador con Navegación Rol-Based:
 * - BuyerTabNavigator: 3 tabs (Swipe + Matches + Perfil) — diseño definitivo
 * - TabBar 60px alto con GlassPanel como fondo (UX-DR8)
 * - Tab activo naranja #FF6B00
 * - Badge numérico en Matches para no leídos
 * - useUserRole hook para routing por rol (AgentTabNavigator pendiente Epic 4)
 */
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuthSession } from './src/hooks/useAuthSession';
import { useUserRole } from './src/hooks/useUserRole';
import { ScreenBackground } from './src/components/layout/screen-background';
import { SwipeScreen } from './src/features/swipe/screens/swipe-screen';
import { MatchHistoryScreen } from './src/features/matches/screens/match-history-screen';
import { ProfileScreen } from './src/features/profile/screens/profile-screen';
import { LoginScreen } from './src/features/auth/screens/login-screen';
import { GlassPanel } from './src/components/ui/glass-panel';
import { Colors, Typography } from './src/lib/tokens';
import { useMatchHistoryStore } from './src/stores/use-match-history-store';
import { TAB_BAR_HEIGHT } from './src/components/navigation/buyer-tab-bar';

// ─── Tab Navigator ──────────────────────────────────────────────────────────

export type BuyerTabParamList = {
  Swipe: undefined;
  Matches: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<BuyerTabParamList>();

/**
 * TabNavigator del comprador con 3 tabs y diseño glassmorphism.
 * Rol-based: agente usará AgentTabNavigator — Epic 4.
 *
 * Story 2.8 — Task 4 (AC: 1, 2, 3, 4)
 */
function BuyerTabNavigator({ token }: { token: string }) {
  const unreadMatchCount = useMatchHistoryStore((s) => s.newMatchesSinceLastVisit);
  const markVisited = useMatchHistoryStore((s) => s.markVisited);

  return (
    <Tab.Navigator
      initialRouteName="Swipe"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.accentPrimary,   // #FF6B00 (AC2)
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          height: TAB_BAR_HEIGHT,                       // 60px (AC3)
          backgroundColor: 'transparent',              // GlassPanel gestiona el fondo
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: Colors.border,
        },
        tabBarLabelStyle: {
          fontSize: Typography.sizeSmall,
          fontWeight: `${Typography.weightMedium}`,
        },
        tabBarBackground: () => (
          <GlassPanel
            intensity="light"
            style={StyleSheet.absoluteFillObject}   // GlassPanel como fondo (AC3)
            testID="tab-bar-glass-panel"
          />
        ),
      }}
    >
      {/* Tab 1: Swipe (AC1) */}
      <Tab.Screen
        name="Swipe"
        options={{
          tabBarLabel: 'Swipe',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      >
        {({ navigation }) => (
          <SwipeScreen
            onNavigateToMatches={() => navigation.navigate('Matches')}
          />
        )}
      </Tab.Screen>

      {/* Tab 2: Matches con badge de no leídos (AC1, AC4) */}
      <Tab.Screen
        name="Matches"
        options={{
          tabBarLabel: 'Matches',
          tabBarBadge: unreadMatchCount > 0 ? unreadMatchCount : undefined, // badge (AC4)
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? 'heart' : 'heart-outline'}
              size={size}
              color={color}
            />
          ),
        }}
        listeners={{
          tabPress: () => {
            // Al entrar a Matches, marcar como leídos (resetea badge)
            markVisited();
          },
        }}
      >
        {() => <MatchHistoryScreen token={token} />}
      </Tab.Screen>

      {/* Tab 3: Perfil (AC1) */}
      <Tab.Screen
        name="Profile"
        options={{
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      >
        {() => <ProfileScreen />}
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
  const role = useUserRole(); // Story 2.8 — rol-based routing (AC5)

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <StatusBar style="light" />
      {loading ? (
        <LoadingScreen />
      ) : !session ? (
        <LoginScreen />
      ) : (
        <NavigationContainer>
          {/* Rol-based: buyer → BuyerTabNavigator, agent → AgentTabNavigator (Epic 4) */}
          {role === 'buyer' ? (
            <BuyerTabNavigator token={session.access_token} />
          ) : (
            /* AgentTabNavigator pendiente Epic 4 — fallback a buyer para roles no soportados */
            <BuyerTabNavigator token={session.access_token} />
          )}
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
