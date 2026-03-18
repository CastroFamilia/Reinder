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
