/**
 * apps/mobile/src/components/ui/button.tsx
 *
 * Jerarquía de botones de Reinder (UX-DR11):
 * - primary     → naranja sólido + glow naranja
 * - secondary   → glass + borde naranja translúcido
 * - destructive → glass + borde rojo apagado
 * - ghost       → solo texto naranja, sin fondo
 *
 * Touch targets: minHeight 44px (WCAG AA mínimo)
 */
import {
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Colors, Radius, Typography, SurfaceColors } from '../../lib/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  variant?: ButtonVariant;
  children: React.ReactNode;
  testID?: string;
}

type VariantConfig = {
  container: ViewStyle;
  text: TextStyle;
};

const VARIANTS: Record<ButtonVariant, VariantConfig> = {
  primary: {
    container: {
      backgroundColor: Colors.accentPrimary,
      borderRadius: Radius.btn,
      // Glow sutil via shadow
      shadowColor: Colors.accentPrimary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 4,
    },
    text: {
      color: Colors.textPrimary,
      fontWeight: '700',
    },
  },
  secondary: {
    container: {
      backgroundColor: SurfaceColors.bgSurfaceOverlay,
      borderRadius: Radius.btn,
      borderWidth: 1,
      borderColor: SurfaceColors.accentSoft,
    },
    text: {
      color: Colors.textPrimary,
      fontWeight: '500',
    },
  },
  destructive: {
    container: {
      backgroundColor: SurfaceColors.bgSurfaceOverlay,
      borderRadius: Radius.btn,
      borderWidth: 1,
      borderColor: Colors.accentReject,
    },
    text: {
      color: Colors.textPrimary,
      fontWeight: '500',
    },
  },
  ghost: {
    container: {
      backgroundColor: 'transparent',
    },
    text: {
      color: Colors.accentPrimary,
      fontWeight: '500',
    },
  },
};

export function Button({
  variant = 'primary',
  children,
  testID,
  disabled,
  ...rest
}: ButtonProps) {
  const config = VARIANTS[variant];

  return (
    <Pressable
      {...rest}
      disabled={disabled}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        config.container,
        pressed && styles.pressed,
        disabled === true && styles.disabled,
      ]}
    >
      <Text style={[styles.text, config.text]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  text: {
    fontSize: Typography.sizeBody, // 16
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.4,
  },
});
