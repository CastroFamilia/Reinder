/**
 * API response wrapper — ALL Route Handlers in apps/web MUST return this type.
 *
 * ✅ CORRECT:   return { data: { listing }, error: null }
 * ❌ FORBIDDEN: return { listing }  // without wrapper
 *
 * Source: architecture.md#Format Patterns
 */
export type ApiResponse<T> = { data: T; error: null } | { data: null; error: ApiError };

export type ApiError = {
  code: string;
  message: string;
};

/**
 * Un ítem del historial de matches del comprador.
 * Retornado por GET /api/v1/matches
 *
 * Source: story 2-7-historial-matches-badge-nuevas-propiedades.md (Task 1)
 */
export type MatchHistoryItem = {
  matchId: string;
  listingId: string;
  imageUrl: string;
  price: number;
  address: string;
  listingStatus: 'active' | 'sold' | 'withdrawn';
  matchedAt: string; // ISO 8601
  confirmed: boolean;
};
