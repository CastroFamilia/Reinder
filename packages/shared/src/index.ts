/**
 * packages/shared — barrel export
 * Import from '@reinder/shared' to access types, constants, and design tokens.
 *
 * RULE: apps/web and apps/mobile NEVER duplicate types — always import from here.
 * Source: architecture.md#Code Sharing Boundary
 */

// Types
export type { ApiResponse, ApiError, MatchHistoryItem } from "./types/api";
export type { Listing, ListingStatus, ListingBadge, SwipeAction } from "./types/listing";
export type { SwipeEvent, CreateSwipeEventPayload } from "./types/swipe-event";

// Constants
export {
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
} from "./constants/index";

