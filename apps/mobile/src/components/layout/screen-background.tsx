/**
 * apps/mobile/src/components/layout/screen-background.tsx
 *
 * Fondo global en gradiente radial naranja → negro. (UX-DR13)
 * Envuelve toda pantalla para consistencia visual en la app.
 *
 * Especificación UX-DR13:
 *   radial-gradient desde rgba(255,107,0,0.12) hacia #0D0D0D
 * Implementación: LinearGradient con 3 stops simula el efecto radial.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, type ViewStyle } from 'react-native';

interface ScreenBackgroundProps {
  children: React.ReactNode;
  style?: ViewStyle;
  testID?: string;
}

export function ScreenBackground({ children, style, testID }: ScreenBackgroundProps) {
  return (
    <LinearGradient
      // Stop 0: naranja muy tenue en esquina superior
      // Stop 1: transición a oscuro cálido
      // Stop 2: negro casi puro
      colors={['rgba(255, 107, 0, 0.12)', '#1A0F08', '#0D0D0D']}
      locations={[0, 0.35, 1]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={[styles.container, style]}
      testID={testID}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
