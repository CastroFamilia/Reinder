/**
 * apps/mobile/src/components/ui/glass-panel.tsx
 *
 * Componente base glassmorphism reutilizable con 3 niveles de blur.
 * Úsalo como base para tarjetas, modales y paneles. (UX-DR7)
 *
 * - light  → 20 intensity (~8px)
 * - medium → 50 intensity (~16px)
 * - heavy  → 80 intensity (~24px)
 *
 * Fallback: si BlurView no soportado → rgba(30,26,21,0.95) sólido.
 */
import { BlurView } from 'expo-blur';
import { StyleSheet, type ViewStyle } from 'react-native';
import { BlurIntensity, Colors, Radius, type GlassPanelIntensity } from '../../lib/tokens';

interface GlassPanelProps {
  intensity?: GlassPanelIntensity;
  style?: ViewStyle;
  children?: React.ReactNode;
  testID?: string;
}

export function GlassPanel({
  intensity = 'medium',
  style,
  children,
  testID,
}: GlassPanelProps) {
  const blurAmount = BlurIntensity[intensity];

  return (
    <BlurView
      intensity={blurAmount}
      tint="dark"
      style={[styles.container, style]}
      testID={testID}
    >
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.panel,
    overflow: 'hidden',
    // Fallback background visible when BlurView isn't supported (Android, tests)
    backgroundColor: Colors.bgSurface,
    borderWidth: 1,
    borderColor: 'rgba(46, 40, 32, 0.6)',
  },
});
