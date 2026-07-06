/**
 * Recommendation Expiration Service
 *
 * Determines which pending recommendations should be auto-expired.
 * Pending recommendations older than 14 days are marked as expired
 * to free space for new recommendations.
 *
 * Story 9.5, AC5
 *
 * NOTE: The primary expiration runs in the SQL function
 * `generate_experiment_recommendations()`. This TypeScript module provides
 * the same logic for unit-testable validation.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Recommendation {
  id: string;
  status: "pending" | "accepted" | "dismissed" | "expired";
  createdAt: Date;
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** Number of days after which pending recommendations expire */
const EXPIRATION_DAYS = 14;

// ─── Expiration Logic ───────────────────────────────────────────────────────

/**
 * Determines whether a recommendation should be expired.
 *
 * Only pending recommendations older than 14 days are eligible for expiration.
 * Already-dismissed, accepted, or expired recommendations are never re-expired.
 */
export function shouldExpire(recommendation: Recommendation): boolean {
  // Only pending recommendations can be expired
  if (recommendation.status !== "pending") {
    return false;
  }

  const now = new Date();
  const expiryThreshold = new Date(
    now.getTime() - EXPIRATION_DAYS * 24 * 60 * 60 * 1000,
  );

  return recommendation.createdAt <= expiryThreshold;
}

/**
 * Filters a list of recommendations to return only those that should be expired.
 * Returns only pending recommendations older than 14 days.
 */
export function filterExpired(recommendations: Recommendation[]): Recommendation[] {
  return recommendations.filter(shouldExpire);
}
