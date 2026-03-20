/**
 * apps/mobile/src/lib/tokens.ts
 *
 * Design tokens re-exported as typed TypeScript constants for mobile use.
 * Source of truth: packages/shared/src/design-tokens.json (UX-DR1)
 *
 * Rule: NEVER hardcode color values in components — always use these constants.
 */
import { designTokens } from '@reinder/shared/design-tokens';

/** Color tokens */
export const Colors = {
  bgPrimary: designTokens.colors.bgPrimary,       // '#0D0D0D'
  bgSurface: designTokens.colors.surface,         // '#1E1A15'
  accentPrimary: designTokens.colors.accentPrimary, // '#FF6B00'
  accentWarm: '#FF8C00',                           // warm hover (not in JSON, added here)
  accentReject: designTokens.colors.accentReject,  // '#8B3A3A'
  accentSold: designTokens.colors.accentSold,      // '#6B4E00'
  textPrimary: designTokens.colors.textPrimary,    // '#F5F0E8'
  textMuted: designTokens.colors.textMuted,        // '#9E9080'
  border: designTokens.colors.border,              // '#2E2820'
} as const;

/** Typography integer sizes (React Native uses numbers, not strings) */
export const Typography = {
  sizeDisplay: designTokens.typography.priceFontSize,  // 32
  sizeH1: 24,
  sizeH2: 20,
  sizeBody: 16,
  sizeSmall: designTokens.typography.badgeFontSize,    // 13
  weightBold: designTokens.typography.fontWeightBold as 700,        // 700
  weightMedium: designTokens.typography.fontWeightMedium as 500,    // 500
  weightRegular: designTokens.typography.fontWeightRegular as 400,  // 400
} as const;

/** Spacing (multiples of 8px base unit) */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

/** Animation durations in ms (React Native uses numbers) */
export const Animation = {
  durationFast: 150,
  durationNormal: 300,
  durationPayoff: 600,
  // easeSpring: cubic-bezier(0.34, 1.56, 0.64, 1) — use in Reanimated withSpring
} as const;

/** Border radius (React Native uses numbers) */
export const Radius = {
  card: 24,
  btn: 12,
  pill: 999,
  badge: 6,
  panel: 16,
} as const;

/**
 * Glassmorphism blur intensity values.
 * Maps design spec levels to expo-blur intensity (0–100 scale).
 * Note: expo-blur intensity is perceptual, not px — these values produce the desired effect.
 */
export const BlurIntensity = {
  light: 20,    // ~8px equivalent
  medium: 50,   // ~16px equivalent
  heavy: 80,    // ~24px equivalent
} as const;

export type GlassPanelIntensity = keyof typeof BlurIntensity;
