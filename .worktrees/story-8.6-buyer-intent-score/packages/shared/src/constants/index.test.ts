/**
 * packages/shared/src/constants/index.test.ts
 *
 * Validates that all shared constants are correctly defined
 * and maintain their expected values across the monorepo.
 */
import {
  REFERRAL_TOKEN_TTL_DAYS,
  MAX_SWIPE_PREFETCH,
  MIN_PASSWORD_LENGTH,
  MATCH_RECAP_TRIGGER_COUNT,
  MATCH_RECAP_MIN_COUNT,
  SOLD_LISTING_VISIBILITY_HOURS,
  API_BASE_PATH,
  SWIPE_THRESHOLD,
  PAYOFF_DURATION_MS,
  PAYOFF_AUTOHIDE_MS,
} from './index';

describe('shared constants', () => {
  describe('business rules', () => {
    it('REFERRAL_TOKEN_TTL_DAYS is 30', () => {
      expect(REFERRAL_TOKEN_TTL_DAYS).toBe(30);
    });

    it('MAX_SWIPE_PREFETCH is 10 (NFR1)', () => {
      expect(MAX_SWIPE_PREFETCH).toBe(10);
    });

    it('MIN_PASSWORD_LENGTH is 8', () => {
      expect(MIN_PASSWORD_LENGTH).toBe(8);
    });

    it('MATCH_RECAP_TRIGGER_COUNT is 5', () => {
      expect(MATCH_RECAP_TRIGGER_COUNT).toBe(5);
    });

    it('MATCH_RECAP_MIN_COUNT is 3', () => {
      expect(MATCH_RECAP_MIN_COUNT).toBe(3);
    });

    it('SOLD_LISTING_VISIBILITY_HOURS is 72', () => {
      expect(SOLD_LISTING_VISIBILITY_HOURS).toBe(72);
    });
  });

  describe('API configuration', () => {
    it('API_BASE_PATH is /api/v1', () => {
      expect(API_BASE_PATH).toBe('/api/v1');
    });
  });

  describe('swipe UX thresholds', () => {
    it('SWIPE_THRESHOLD is 50px', () => {
      expect(SWIPE_THRESHOLD).toBe(50);
    });

    it('PAYOFF_DURATION_MS is 600ms', () => {
      expect(PAYOFF_DURATION_MS).toBe(600);
    });

    it('PAYOFF_AUTOHIDE_MS is 450ms', () => {
      expect(PAYOFF_AUTOHIDE_MS).toBe(450);
    });

    it('PAYOFF_AUTOHIDE_MS is less than PAYOFF_DURATION_MS', () => {
      expect(PAYOFF_AUTOHIDE_MS).toBeLessThan(PAYOFF_DURATION_MS);
    });
  });

  describe('type narrowing (as const)', () => {
    it('all constants are numbers or strings (no undefined)', () => {
      const constants = [
        REFERRAL_TOKEN_TTL_DAYS,
        MAX_SWIPE_PREFETCH,
        MIN_PASSWORD_LENGTH,
        MATCH_RECAP_TRIGGER_COUNT,
        MATCH_RECAP_MIN_COUNT,
        SOLD_LISTING_VISIBILITY_HOURS,
        API_BASE_PATH,
        SWIPE_THRESHOLD,
        PAYOFF_DURATION_MS,
        PAYOFF_AUTOHIDE_MS,
      ];
      constants.forEach((c) => {
        expect(c).toBeDefined();
        expect(['number', 'string']).toContain(typeof c);
      });
    });
  });
});
