/**
 * apps/web/src/app/api/v1/swipe-events/route.ts
 *
 * Stub: POST /api/v1/swipe-events — registra una acción de swipe (match o reject).
 *
 * NOTA (Story 2.3): Este endpoint es un stub sin persistencia real.
 * La persistencia en Supabase (tablas swipe_events / match_events) + validación
 * de Auth JWT se implementará en Epic 3 junto con el panel del agente.
 *
 * Source: architecture.md#Naming Patterns (POST /api/v1/swipe-events)
 * Source: epics.md#Story-2.3 (AC4)
 */
import { NextResponse } from 'next/server';
import type { ApiResponse } from '@reinder/shared';
import type { SwipeEvent } from '@reinder/shared';

export async function POST(request: Request): Promise<NextResponse<ApiResponse<SwipeEvent>>> {
  try {
    const body = await request.json() as { action?: string; listingId?: string; buyerId?: string };
    const { action, listingId, buyerId } = body;

    // Validación mínima de input
    if (!action || !listingId) {
      return NextResponse.json(
        { data: null, error: { code: 'INVALID_INPUT', message: 'action y listingId son requeridos' } },
        { status: 400 },
      );
    }

    if (action !== 'match' && action !== 'reject') {
      return NextResponse.json(
        { data: null, error: { code: 'INVALID_ACTION', message: 'action debe ser "match" o "reject"' } },
        { status: 400 },
      );
    }

    // TODO (Epic 3): insertar en tabla swipe_events / match_events via Supabase + JWT Auth
    // El buyerId real se obtendrá del JWT: const { data: { user } } = await supabase.auth.getUser(token)
    const mockEvent: SwipeEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      action: action as 'match' | 'reject',
      listingId,
      buyerId: buyerId ?? 'anon',
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({ data: mockEvent, error: null });
  } catch {
    return NextResponse.json(
      { data: null, error: { code: 'SERVER_ERROR', message: 'Error interno del servidor' } },
      { status: 500 },
    );
  }
}
