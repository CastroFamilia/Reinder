/**
 * apps/mobile/src/features/swipe/components/view-mode-toggle.tsx
 *
 * Pill-shaped toggle for switching between 'cover' and 'detail' card view modes.
 * Designed as a floating control matching the SwipeScreen filter button aesthetic.
 */
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

interface ViewModeToggleProps {
  viewMode: 'cover' | 'detail';
  onToggle: (mode: 'cover' | 'detail') => void;
  testID?: string;
}

export function ViewModeToggle({ viewMode, onToggle, testID }: ViewModeToggleProps) {
  return (
    <View style={styles.container} testID={testID}>
      <TouchableOpacity
        style={[styles.iconBtn, viewMode === 'cover' && styles.iconBtnActive]}
        onPress={() => onToggle('cover')}
        activeOpacity={0.7}
        testID={testID ? `${testID}-cover` : undefined}
      >
        <Text style={styles.icon}>🖼️</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.iconBtn, viewMode === 'detail' && styles.iconBtnActive]}
        onPress={() => onToggle('detail')}
        activeOpacity={0.7}
        testID={testID ? `${testID}-detail` : undefined}
      >
        <Text style={styles.icon}>📋</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 3,
    gap: 2,
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnActive: {
    backgroundColor: 'rgba(255, 107, 0, 0.3)',
  },
  icon: {
    fontSize: 16,
  },
});
