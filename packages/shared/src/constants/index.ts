/**
 * Global constants for the Reinder platform.
 * Source: architecture.md#Naming Patterns
 */

/** Number of days before a referral token expires and requires reconfirmation. */
export const REFERRAL_TOKEN_TTL_DAYS = 30 as const;

/** Maximum number of property cards pre-fetched in the swipe feed buffer (NFR1). */
export const MAX_SWIPE_PREFETCH = 10 as const;

/** Minimum password length for email/password registration. */
export const MIN_PASSWORD_LENGTH = 8 as const;

/** Maximum number of matches before MatchRecapScreen is triggered. */
export const MATCH_RECAP_TRIGGER_COUNT = 5 as const;

/** Minimum number of matches before MatchRecapScreen is triggered. */
export const MATCH_RECAP_MIN_COUNT = 3 as const;

/** Hours a "Vendida" listing stays visible in the feed with its badge before removal. */
export const SOLD_LISTING_VISIBILITY_HOURS = 72 as const;

/** Base API path for all Route Handlers in apps/web. */
export const API_BASE_PATH = "/api/v1" as const;
