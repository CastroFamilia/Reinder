/**
 * apps/web/src/features/agent-link/lib/referral-url.test.ts
 *
 * Unit tests for buildReferralUrl utility.
 * Tests: env var override, default fallback, token interpolation.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildReferralUrl } from './referral-url';

describe('buildReferralUrl', () => {
  const originalEnv = process.env.NEXT_PUBLIC_APP_URL;

  afterEach(() => {
    // Restore original env
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_APP_URL = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_APP_URL;
    }
  });

  it('returns URL with token interpolated into path', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://reinder.app';
    const url = buildReferralUrl('abc123');
    expect(url).toBe('https://reinder.app/referral/abc123');
  });

  it('uses NEXT_PUBLIC_APP_URL when set', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://staging.reinder.app';
    const url = buildReferralUrl('token-xyz');
    expect(url).toBe('https://staging.reinder.app/referral/token-xyz');
  });

  it('falls back to https://reinder.app when env var is not set', () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    const url = buildReferralUrl('fallback-token');
    expect(url).toBe('https://reinder.app/referral/fallback-token');
  });

  it('handles special characters in token', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://reinder.app';
    const url = buildReferralUrl('token-with-dashes-123');
    expect(url).toContain('/referral/token-with-dashes-123');
  });

  it('preserves the base URL path structure', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://custom-domain.com';
    const url = buildReferralUrl('test');
    expect(url).toMatch(/^https:\/\/custom-domain\.com\/referral\/test$/);
  });
});
