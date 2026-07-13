/**
 * apps/mobile/src/components/navigation/buyer-tab-bar.test.tsx
 * Story 2.8 — Acceptance Tests (green after implementation)
 *
 * AC1: TabBar muestra 3 tabs: "Swipe", "Matches" y "Perfil"
 * AC2: Tab activo en naranja #FF6B00
 * AC3: TabBar 60px de alto con GlassPanel como fondo
 * AC4: Badge numérico en tab "Matches" cuando hay no leídos
 */
import React from 'react';
import { render } from '@testing-library/react-native';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../ui/glass-panel', () => ({
  GlassPanel: ({ children, style, intensity, testID }: any) => {
    const { View } = require('react-native');
    return (
      <View style={style} testID={testID || `glass-panel-${intensity}`}>
        {children}
      </View>
    );
  },
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name, size, color, testID }: any) => {
    const { View } = require('react-native');
    return <View testID={testID || `icon-${name}`} accessibilityLabel={`icon-${name}`} />;
  },
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

// ─── AC2: Tab activo naranja ──────────────────────────────────────────────────
describe('Story 2.8: BuyerTabBar — AC2: Tab activo en naranja', () => {
  it('Colors.accentPrimary es #FF6B00', () => {
    const { Colors } = require('../../lib/tokens');
    expect(Colors.accentPrimary).toBe('#FF6B00');
  });
});

// ─── AC3: Height 60px y GlassPanel ───────────────────────────────────────────
describe('Story 2.8: BuyerTabBar — AC3: 60px alto con GlassPanel', () => {
  it('getBuyerTabBarScreenOptions existe y devuelve tabBarStyle con height 60', () => {
    const { getBuyerTabBarScreenOptions, TAB_BAR_HEIGHT } = require('./buyer-tab-bar');
    expect(getBuyerTabBarScreenOptions).toBeDefined();
    expect(TAB_BAR_HEIGHT).toBe(60);
    const options = getBuyerTabBarScreenOptions();
    expect(options.tabBarStyle?.height).toBe(60);
  });

  it('getBuyerTabBarScreenOptions devuelve tabBarBackground como función', () => {
    const { getBuyerTabBarScreenOptions } = require('./buyer-tab-bar');
    const options = getBuyerTabBarScreenOptions();
    expect(typeof options.tabBarBackground).toBe('function');
  });

  it('tabBarBackground renderiza GlassPanel con intensity light', () => {
    const { getBuyerTabBarScreenOptions } = require('./buyer-tab-bar');
    const options = getBuyerTabBarScreenOptions();
    const background = options.tabBarBackground!();
    const { getByTestId } = render(background as React.ReactElement);
    // GlassPanel mock renderiza con testID "tab-bar-glass-panel"
    expect(getByTestId('tab-bar-glass-panel')).toBeTruthy();
  });
});

// ─── AC3: tabBarActiveTintColor naranja ──────────────────────────────────────
describe('Story 2.8: BuyerTabBar — AC2+3: tintColor naranja', () => {
  it('getBuyerTabBarScreenOptions devuelve tabBarActiveTintColor naranja', () => {
    const { getBuyerTabBarScreenOptions } = require('./buyer-tab-bar');
    const { Colors } = require('../../lib/tokens');
    const options = getBuyerTabBarScreenOptions();
    expect(options.tabBarActiveTintColor).toBe(Colors.accentPrimary);
  });

  it('getBuyerTabBarScreenOptions devuelve tabBarStyle con backgroundColor transparent', () => {
    const { getBuyerTabBarScreenOptions } = require('./buyer-tab-bar');
    const options = getBuyerTabBarScreenOptions();
    expect(options.tabBarStyle?.backgroundColor).toBe('transparent');
  });
});

// ─── AC2: tabBarActiveTintColor check (additional) ───────────────────────────
describe('Story 2.8: BuyerTabBar — AC2+3 additional: tint config', () => {
  it('getBuyerTabBarScreenOptions devuelve tabBarInactiveTintColor', () => {
    const { getBuyerTabBarScreenOptions } = require('./buyer-tab-bar');
    const { Colors } = require('../../lib/tokens');
    const options = getBuyerTabBarScreenOptions();
    expect(options.tabBarInactiveTintColor).toBe(Colors.textMuted);
  });

  it('TAB_BAR_HEIGHT es 60', () => {
    const { TAB_BAR_HEIGHT } = require('./buyer-tab-bar');
    expect(TAB_BAR_HEIGHT).toBe(60);
  });
});
