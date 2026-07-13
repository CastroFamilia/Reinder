/**
 * packages/shared/src/types/search-preferences.ts
 *
 * Tipos para las preferencias de búsqueda del comprador.
 * Persisten en Supabase: user_profiles.search_preferences (jsonb)
 *
 * Story 2.9 — Task 1 (AC: 2)
 */

export interface SearchPreferences {
  /** Zonas de búsqueda (requerido — al menos 1 para guardar) */
  zones: string[];
  /** Precio máximo en euros (opcional) */
  maxPrice?: number;
  /** Mínimo número de habitaciones (opcional) */
  minRooms?: number;
  /** Mínimos m² (opcional) */
  minSqm?: number;
}
