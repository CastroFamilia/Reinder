/**
 * packages/shared/src/types/swipe-event.ts
 *
 * SwipeEvent — registro de una acción de swipe del comprador.
 * Corresponde a las tablas `swipe_events` y `match_events` en Supabase.
 * REGLA: importar siempre desde @reinder/shared — nunca duplicar.
 *
 * Source: architecture.md#Naming Patterns (API: POST /api/v1/swipe-events)
 * Source: epics.md#Story-2.3 (AC4)
 */

// SwipeAction ya está definido en listing.ts — reutilizamos desde allí.
export type { SwipeAction } from './listing';

/**
 * SwipeEvent — evento registrado cuando el comprador hace match o reject.
 * El id lo genera el servidor; el cliente envía action + listingId + buyerId.
 */
export interface SwipeEvent {
  id: string;
  action: 'match' | 'reject';
  listingId: string;
  buyerId: string;
  createdAt: string; // ISO 8601
}

/**
 * Payload enviado por el cliente al hacer POST /api/v1/swipe-events.
 */
export interface CreateSwipeEventPayload {
  action: 'match' | 'reject';
  listingId: string;
  buyerId?: string; // Opcional: el server lo infiere del JWT
}
