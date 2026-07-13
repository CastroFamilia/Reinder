/**
 * packages/shared/src/design-tokens.test.ts
 *
 * Verifies that design tokens are properly re-exported from the JSON source
 * and that critical color/typography values match the design spec.
 */
import {
  designTokens,
  colors,
  typography,
  spacing,
  animation,
  radii,
  glassmorphism,
} from './design-tokens';
import rawTokens from './design-tokens.json';

describe('design tokens', () => {
  describe('re-export integrity', () => {
    it('designTokens matches the raw JSON import', () => {
      expect(designTokens).toEqual(rawTokens);
    });

    it('convenience re-exports reference the correct token groups', () => {
      expect(colors).toBe(designTokens.colors);
      expect(typography).toBe(designTokens.typography);
      expect(spacing).toBe(designTokens.spacing);
      expect(animation).toBe(designTokens.animation);
      expect(radii).toBe(designTokens.radii);
      expect(glassmorphism).toBe(designTokens.glassmorphism);
    });
  });

  describe('color palette (design spec)', () => {
    it('bgPrimary is #0D0D0D', () => {
      expect(colors.bgPrimary).toBe('#0D0D0D');
    });

    it('accentPrimary is #FF6B00', () => {
      expect(colors.accentPrimary).toBe('#FF6B00');
    });

    it('textPrimary is #F5F0E8', () => {
      expect(colors.textPrimary).toBe('#F5F0E8');
    });

    it('surface is #1E1A15', () => {
      expect(colors.surface).toBe('#1E1A15');
    });

    it('accentWarm is #FF8C00', () => {
      expect(colors.accentWarm).toBe('#FF8C00');
    });

    it('accentReject is #8B3A3A', () => {
      expect(colors.accentReject).toBe('#8B3A3A');
    });

    it('accentSold is #6B4E00', () => {
      expect(colors.accentSold).toBe('#6B4E00');
    });

    it('all color values are valid hex codes', () => {
      const hexPattern = /^#[0-9A-Fa-f]{6}$/;
      const colorValues = [
        colors.bgPrimary,
        colors.accentPrimary,
        colors.accentWarm,
        colors.textPrimary,
        colors.surface,
        colors.accentReject,
        colors.accentSold,
        colors.textMuted,
        colors.border,
      ];
      colorValues.forEach((c) => {
        expect(c).toMatch(hexPattern);
      });
    });
  });

  describe('typography', () => {
    it('uses Clash Display for display font', () => {
      expect(typography.fontDisplay).toBe('Clash Display');
    });

    it('uses Inter for body font', () => {
      expect(typography.fontBody).toBe('Inter');
    });

    it('font weights are standard numeric values', () => {
      expect(typography.fontWeightBold).toBe(700);
      expect(typography.fontWeightMedium).toBe(500);
      expect(typography.fontWeightRegular).toBe(400);
    });

    it('price font size is 32', () => {
      expect(typography.priceFontSize).toBe(32);
    });

    it('badge font size is 13', () => {
      expect(typography.badgeFontSize).toBe(13);
    });
  });

  describe('spacing', () => {
    it('base spacing unit is 8px', () => {
      expect(spacing.base).toBe(8);
      expect(spacing.unit).toBe('px');
    });

    it('scale starts at 0 and includes standard multiples', () => {
      expect(spacing.scale[0]).toBe(0);
      expect(spacing.scale).toContain(8);  // 1×base
      expect(spacing.scale).toContain(16); // 2×base
      expect(spacing.scale).toContain(24); // 3×base
      expect(spacing.scale).toContain(32); // 4×base
    });
  });

  describe('animation', () => {
    it('fast duration is 150ms', () => {
      expect(animation.durationFast).toBe('150ms');
    });

    it('normal duration is 300ms', () => {
      expect(animation.durationNormal).toBe('300ms');
    });

    it('payoff duration is 600ms', () => {
      expect(animation.durationPayoff).toBe('600ms');
    });

    it('spring easing is defined', () => {
      expect(animation.easeSpring).toContain('cubic-bezier');
    });
  });

  describe('radii', () => {
    it('card radius is 24px', () => {
      expect(radii.card).toBe('24px');
    });

    it('button radius is 12px', () => {
      expect(radii.button).toBe('12px');
    });

    it('pill radius is 999px', () => {
      expect(radii.pill).toBe('999px');
    });
  });

  describe('glassmorphism', () => {
    it('blur levels increase in order: light < medium < heavy', () => {
      const light = parseInt(glassmorphism.blurLight);
      const medium = parseInt(glassmorphism.blurMedium);
      const heavy = parseInt(glassmorphism.blurHeavy);
      expect(light).toBeLessThan(medium);
      expect(medium).toBeLessThan(heavy);
    });

    it('fallback background is semi-transparent surface color', () => {
      expect(glassmorphism.fallbackBackground).toContain('rgba');
      expect(glassmorphism.fallbackBackground).toContain('0.95');
    });
  });
});
