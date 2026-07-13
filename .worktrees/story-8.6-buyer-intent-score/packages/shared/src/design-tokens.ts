/**
 * Design tokens re-exported as a typed TypeScript constant.
 *
 * Usage (web):
 *   import { designTokens } from '@reinder/shared/design-tokens';
 *   const color = designTokens.colors.accentPrimary; // '#FF6B00'
 *
 * Usage (mobile):
 *   import { designTokens } from '@reinder/shared/design-tokens';
 *   const blurLevel = designTokens.glassmorphism.blurMedium; // '16px'
 *
 * Source: epics.md#UX-DR1, architecture.md#Frontend Architecture
 */
import tokens from "./design-tokens.json";

export const designTokens = tokens as typeof tokens;

// Convenience re-exports for common token groups
export const colors = designTokens.colors;
export const typography = designTokens.typography;
export const spacing = designTokens.spacing;
export const animation = designTokens.animation;
export const radii = designTokens.radii;
export const glassmorphism = designTokens.glassmorphism;

export default designTokens;
