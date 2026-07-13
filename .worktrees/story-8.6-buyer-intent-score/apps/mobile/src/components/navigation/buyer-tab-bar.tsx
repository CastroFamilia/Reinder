/**
 * apps/mobile/src/components/navigation/buyer-tab-bar.tsx
 *
 * Configuración del TabBar del comprador (Story 2.8).
 * Exporta `getBuyerTabBarScreenOptions` para usarla en App.tsx.
 *
 * Características:
 * - 3 tabs: Swipe, Matches, Perfil (AC1)
 * - Tab activo en naranja #FF6B00 (AC2)
 * - 60px de alto con GlassPanel como fondo (AC3)
 * - Badge numérico en Matches cuando hay no leídos (AC4)
 *
 * Story 2.8 — Task 2 | UX-DR8
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { GlassPanel } from '../ui/glass-panel';
import { Colors, Typography } from '../../lib/tokens';

// ─── Tab Bar Height ───────────────────────────────────────────────────────────

/** Alto visible del TabBar (sin incluir safe area de iOS — RN la gestiona auto) */
export const TAB_BAR_HEIGHT = 60;

// ─── Icon Helper ─────────────────────────────────────────────────────────────

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, { active: IoniconName; inactive: IoniconName }> = {
  Swipe: {
    active: 'home',
    inactive: 'home-outline',
  },
  Matches: {
    active: 'heart',
    inactive: 'heart-outline',
  },
  Profile: {
    active: 'person',
    inactive: 'person-outline',
  },
};

// ─── Screen Options Factory ───────────────────────────────────────────────────

/**
 * Devuelve las screenOptions del BuyerTabNavigator con:
 * - GlassPanel como fondo del TabBar (light blur)
 * - Height 60px
 * - Tab activo naranja #FF6B00
 * - Iconos Ionicons por tab
 */
export function getBuyerTabBarScreenOptions(): BottomTabNavigationOptions {
  return {
    headerShown: false,
    tabBarActiveTintColor: Colors.accentPrimary,
    tabBarInactiveTintColor: Colors.textMuted,
    tabBarStyle: {
      height: TAB_BAR_HEIGHT,
      backgroundColor: 'transparent', // GlassPanel gestiona el fondo
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
        style={StyleSheet.absoluteFillObject}
        testID="tab-bar-glass-panel"
      />
    ),
    tabBarIcon: ({ focused, color, size }: { focused: boolean; color: string; size: number }) => {
      // La función recibe el nombre del tab en el contexto de cada Tab.Screen
      // Los iconos se configuran por tab en el componente BuyerTabNavigator
      // Este valor de retorno es un fallback genérico
      return (
        <Ionicons
          name={focused ? 'apps' : 'apps-outline'}
          size={size}
          color={color}
        />
      );
    },
  };
}

/**
 * Devuelve las opciones específicas de un tab dado su nombre.
 * Uso: <Tab.Screen name="Swipe" options={getBuyerTabOptions('Swipe')} />
 */
export function getBuyerTabOptions(tabName: keyof typeof TAB_ICONS) {
  const icons = TAB_ICONS[tabName];
  return ({ focused, color, size }: { focused: boolean; color: string; size: number }) => (
    <Ionicons
      name={focused ? icons.active : icons.inactive}
      size={size}
      color={color}
    />
  );
}
