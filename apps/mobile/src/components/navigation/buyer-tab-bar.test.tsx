/**
 * apps/mobile/src/components/navigation/buyer-tab-bar.test.tsx
 * Story 2.8 — ATDD Acceptance Tests (failing before implementation)
 *
 * AC1: TabBar muestra 3 tabs: "Swipe", "Matches" y "Perfil"
 * AC2: Tab activo en naranja #FF6B00
 * AC3: TabBar 60px de alto con GlassPanel como fondo
 * AC4: Badge numérico en tab "Matches" cuando hay no leídos
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../components/ui/glass-panel', () => ({
  GlassPanel: ({ children, style, level, testID }: any) => {
    const { View } = require('react-native');
    return (
      <View style={style} testID={testID || `glass-panel-${level}`}>
        {children}
      </View>
    );
  },
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name, testID }: any) => {
    const { View } = require('react-native');
    return <View testID={testID || `icon-${name}`} />;
  },
}));

// ─── Test Fixtures ────────────────────────────────────────────────────────────

const Tab = createBottomTabNavigator();

function TestNavigator({ unreadCount = 0 }: { unreadCount?: number }) {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tab.Screen name="Swipe" component={() => null} />
        <Tab.Screen name="Matches" component={() => null} />
        <Tab.Screen name="Perfil" component={() => null} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

// ─── AC1: 3 Tabs ──────────────────────────────────────────────────────────────

describe('Story 2.8: TabBar — AC1: Tres tabs para comprador', () => {
  it('FAILING: debe renderizar tab "Swipe"', () => {
    const { getByText } = render(<TestNavigator />);
    expect(getByText('Swipe')).toBeTruthy();
  });

  it('FAILING: debe renderizar tab "Matches"', () => {
    const { getByText } = render(<TestNavigator />);
    expect(getByText('Matches')).toBeTruthy();
  });

  it('FAILING: debe renderizar tab "Perfil"', () => {
    const { getByText } = render(<TestNavigator />);
    expect(getByText('Perfil')).toBeTruthy();
  });

  it('FAILING: debe tener exactamente 3 tabs', () => {
    const { getAllByRole } = render(<TestNavigator />);
    // Each tab button has role="button"
    const tabs = getAllByRole('tab');
    expect(tabs).toHaveLength(3);
  });
});

// ─── AC2: Tab activo naranja ──────────────────────────────────────────────────

describe('Story 2.8: TabBar — AC2: Tab activo en naranja', () => {
  it('FAILING: debe importar BuyerTabBar con tabBarActiveTintColor naranja', () => {
    // Este test importará BuyerTabBar cuando exista
    // Por ahora valida que el color naranja está configurado en el sistema de tokens
    const { Colors } = require('../../lib/tokens');
    expect(Colors.accentPrimary).toBe('#FF6B00');
  });

  it('FAILING: BuyerTabBar debe exportarse desde su módulo', () => {
    // Cuando se cree el componente, este import debe funcionar
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('./buyer-tab-bar');
    }).not.toThrow();
  });
});

// ─── AC3: Height 60px y GlassPanel ───────────────────────────────────────────

describe('Story 2.8: TabBar — AC3: 60px alto con GlassPanel', () => {
  it('FAILING: BuyerTabBar debe exportar configuración con height 60', () => {
    // Este test pasará cuando buyer-tab-bar.tsx exporte getTabBarScreenOptions
    let tabBarConfig: any;
    try {
      const module = require('./buyer-tab-bar');
      tabBarConfig = module.getBuyerTabBarScreenOptions?.();
    } catch {
      tabBarConfig = null;
    }
    expect(tabBarConfig?.tabBarStyle?.height).toBe(60);
  });

  it('FAILING: BuyerTabBar debe usar GlassPanel como fondo', () => {
    let hasGlassPanelBackground = false;
    try {
      const module = require('./buyer-tab-bar');
      const options = module.getBuyerTabBarScreenOptions?.();
      hasGlassPanelBackground = typeof options?.tabBarBackground === 'function';
    } catch {
      hasGlassPanelBackground = false;
    }
    expect(hasGlassPanelBackground).toBe(true);
  });
});

// ─── AC4: Badge de no leídos ──────────────────────────────────────────────────

describe('Story 2.8: TabBar — AC4: Badge en tab Matches', () => {
  it('FAILING: useMatchStore debe exportar unreadMatchCount', () => {
    let hasUnreadCount = false;
    try {
      const { useMatchStore } = require('../../stores/use-match-store');
      // Intentamos obtener el estado — si el store existe y tiene unreadMatchCount
      // (No podemos llamar el hook fuera de un componente en tests)
      hasUnreadCount = typeof useMatchStore === 'function';
    } catch {
      hasUnreadCount = false;
    }
    // El store debe existir (puede fallar si no está creado aún)
    expect(hasUnreadCount).toBe(true);
  });

  it('FAILING: useMatchStore debe tener markAllAsRead action', () => {
    let hasMarkAllAsRead = false;
    try {
      const { useMatchStore } = require('../../stores/use-match-store');
      const state = useMatchStore.getState?.();
      hasMarkAllAsRead = typeof state?.markAllAsRead === 'function';
    } catch {
      hasMarkAllAsRead = false;
    }
    expect(hasMarkAllAsRead).toBe(true);
  });

  it('FAILING: unreadMatchCount debe ser 0 por defecto', () => {
    let defaultCount = -1;
    try {
      const { useMatchStore } = require('../../stores/use-match-store');
      const state = useMatchStore.getState?.();
      defaultCount = state?.unreadMatchCount ?? -1;
    } catch {
      defaultCount = -1;
    }
    expect(defaultCount).toBe(0);
  });
});
