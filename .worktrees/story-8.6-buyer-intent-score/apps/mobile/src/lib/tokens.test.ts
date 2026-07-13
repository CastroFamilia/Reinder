/**
 * apps/mobile/src/lib/tokens.test.ts
 *
 * Verifies that mobile design tokens map correctly to shared design-tokens.json.
 * Ensures no accidental drift between the shared source and mobile constants.
 */
import { designTokens } from '@reinder/shared/design-tokens';
import {
  Colors,
  Typography,
  Spacing,
  Animation,
  Radius,
  BlurIntensity,
  SurfaceColors,
} from './tokens';

describe('Colors', () => {
  it('bgPrimary maps to designTokens.colors.bgPrimary', () => {
    expect(Colors.bgPrimary).toBe(designTokens.colors.bgPrimary);
  });

  it('bgSurface maps to designTokens.colors.surface', () => {
    expect(Colors.bgSurface).toBe(designTokens.colors.surface);
  });

  it('accentPrimary maps to designTokens.colors.accentPrimary', () => {
    expect(Colors.accentPrimary).toBe(designTokens.colors.accentPrimary);
  });

  it('accentWarm maps to designTokens.colors.accentWarm', () => {
    expect(Colors.accentWarm).toBe(designTokens.colors.accentWarm);
  });

  it('accentReject maps to designTokens.colors.accentReject', () => {
    expect(Colors.accentReject).toBe(designTokens.colors.accentReject);
  });

  it('accentSold maps to designTokens.colors.accentSold', () => {
    expect(Colors.accentSold).toBe(designTokens.colors.accentSold);
  });

  it('textPrimary maps to designTokens.colors.textPrimary', () => {
    expect(Colors.textPrimary).toBe(designTokens.colors.textPrimary);
  });

  it('textMuted maps to designTokens.colors.textMuted', () => {
    expect(Colors.textMuted).toBe(designTokens.colors.textMuted);
  });

  it('border maps to designTokens.colors.border', () => {
    expect(Colors.border).toBe(designTokens.colors.border);
  });
});

describe('Typography', () => {
  it('sizeDisplay maps to priceFontSize (32)', () => {
    expect(Typography.sizeDisplay).toBe(designTokens.typography.priceFontSize);
    expect(Typography.sizeDisplay).toBe(32);
  });

  it('sizeSmall maps to badgeFontSize (13)', () => {
    expect(Typography.sizeSmall).toBe(designTokens.typography.badgeFontSize);
    expect(Typography.sizeSmall).toBe(13);
  });

  it('font weights map to design spec', () => {
    expect(Typography.weightBold).toBe(700);
    expect(Typography.weightMedium).toBe(500);
    expect(Typography.weightRegular).toBe(400);
  });

  it('custom sizes are defined', () => {
    expect(Typography.sizeH1).toBe(24);
    expect(Typography.sizeH2).toBe(20);
    expect(Typography.sizeBody).toBe(16);
    expect(Typography.sizeSubtitle).toBe(18);
    expect(Typography.sizeCaption).toBe(14);
  });
});

describe('Spacing', () => {
  it('uses 8px base unit multiples', () => {
    expect(Spacing.xs).toBe(4);
    expect(Spacing.sm).toBe(8);
    expect(Spacing.md).toBe(16);
    expect(Spacing.lg).toBe(24);
    expect(Spacing.xl).toBe(32);
  });

  it('all spacing values are positive numbers', () => {
    Object.values(Spacing).forEach((v) => {
      expect(typeof v).toBe('number');
      expect(v).toBeGreaterThan(0);
    });
  });
});

describe('Animation', () => {
  it('durationFast is 150ms', () => {
    expect(Animation.durationFast).toBe(150);
  });

  it('durationNormal is 300ms', () => {
    expect(Animation.durationNormal).toBe(300);
  });

  it('durationPayoff is 600ms', () => {
    expect(Animation.durationPayoff).toBe(600);
  });
});

describe('Radius', () => {
  it('card radius is 24', () => {
    expect(Radius.card).toBe(24);
  });

  it('btn radius is 12', () => {
    expect(Radius.btn).toBe(12);
  });

  it('pill radius is 999', () => {
    expect(Radius.pill).toBe(999);
  });

  it('badge radius is 6', () => {
    expect(Radius.badge).toBe(6);
  });

  it('panel radius is 16', () => {
    expect(Radius.panel).toBe(16);
  });
});

describe('BlurIntensity', () => {
  it('light < medium < heavy', () => {
    expect(BlurIntensity.light).toBeLessThan(BlurIntensity.medium);
    expect(BlurIntensity.medium).toBeLessThan(BlurIntensity.heavy);
  });

  it('values are within expo-blur range (0-100)', () => {
    Object.values(BlurIntensity).forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    });
  });
});

describe('SurfaceColors', () => {
  it('bgSurfaceAlpha is rgba with 0.95 opacity', () => {
    expect(SurfaceColors.bgSurfaceAlpha).toContain('rgba');
    expect(SurfaceColors.bgSurfaceAlpha).toContain('0.95');
  });

  it('bgSurfaceOverlay is rgba with 0.6 opacity', () => {
    expect(SurfaceColors.bgSurfaceOverlay).toContain('rgba');
    expect(SurfaceColors.bgSurfaceOverlay).toContain('0.6');
  });

  it('accentSoft is rgba with 0.4 opacity', () => {
    expect(SurfaceColors.accentSoft).toContain('rgba');
    expect(SurfaceColors.accentSoft).toContain('0.4');
  });
});
