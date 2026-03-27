/**
 * packages/shared/src/types/listing.ts
 *
 * Tipo de dominio Listing — fuente de verdad para web y mobile.
 * REGLA: apps/web y apps/mobile NUNCA duplican este tipo — siempre importar desde @reinder/shared.
 *
 * Source: architecture.md#Code Sharing Boundary
 */

/** Estado de ciclo de vida de un listing */
export type ListingStatus = 'active' | 'sold' | 'withdrawn';

/** Tipo de badge visible en la tarjeta */
export type ListingBadge = 'EXCLUSIVA' | 'NUEVA' | 'VENDIDA';

/** Acción de swipe del comprador */
export type SwipeAction = 'match' | 'reject';

/**
 * Listing — propiedad inmobiliaria en el feed de Reinder.
 * Corresponde a la tabla `listings` en Supabase (campos en camelCase para TypeScript).
 * Drizzle ORM transforma automáticamente snake_case DB → camelCase TypeScript.
 */
export interface Listing {
  id: string;
  title: string;
  price: number;          // En euros, sin decimales (ej: 485000)
  location: string;       // Ciudad/barrio (ej: "Malasaña, Madrid")
  rooms: number;
  squareMeters: number;
  floor?: string;         // Ej: "5ª", "Bajo", "Ático"
  imageUrl: string;       // URL de la imagen hero (Supabase Storage CDN)
  imageAlt?: string;      // Alt text para accesibilidad — generado si no viene del CRM
  status: ListingStatus;
  badge?: ListingBadge;   // Badge superpuesto en la tarjeta
  agencyId: string;
  createdAt: string;      // ISO 8601 (arch.md: siempre ISO 8601, nunca Unix timestamp)
  // Campos para vista de detalle (Story 2.5) — todos opcionales para compatibilidad
  description?: string;   // Descripción larga del listing (viene del CRM)
  garage?: boolean;       // ¿Tiene garaje incluido?
  imageUrls?: string[];   // Galería de fotos adicionales (primera es hero si se usa)
}

