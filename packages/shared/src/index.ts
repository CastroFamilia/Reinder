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
export type { SearchPreferences } from "./types/search-preferences";
export type { AgentClient } from "./types/agent";
export type {
  Experiment,
  ExperimentAssignment,
  ExperimentResult,
  VariantContent,
  ExperimentVariantMetrics,
  ExperimentDeltaMetric,
  ExperimentDeltas,
  ExperimentConfidence,
  ExperimentBaselineMetrics,
  ExperimentTimeseriesEntry,
  ExperimentResultsResponse,
  ExperimentRecommendation,
  ExperimentRecommendationWithListing,
  UnderperformingMetrics,
} from "./types/experiment";
export {
  ExperimentStatus,
  ExperimentType,
  RecommendationStatus,
  UnderperformingMetricDetail,
} from "./types/experiment";

// Experiments
export { assignVariant } from "./experiments/assign-variant";
export {
  computeVariantMetrics,
  shouldProcessExperiment,
  calculateDeltas,
  calculateConfidence,
  getConfidenceBadge,
  processAllExperiments,
} from "./experiments/aggregate-experiment-results";
export { calculateBaseline } from "./experiments/calculate-baseline";
export { validateExperimentResultsAccess } from "./experiments/experiment-results-access";
export { formatMetric, formatDelta, formatDeltaPP } from "./experiments/format-metrics";

// Story 9.5: Recommendation engine
export {
  detectUnderperformance,
  shouldExcludeListing,
} from "./experiments/underperformance-detector";
export {
  determineExperimentType,
  calculatePriorityScore,
  selectTopRecommendations,
  getCurrentISOWeek,
  shouldGenerateForAgency,
} from "./experiments/recommendation-engine";
export {
  shouldExpire,
  filterExpired,
} from "./experiments/recommendation-expiration";

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
