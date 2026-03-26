/**
 * apps/web/src/app/api/v1/matches/[id]/route.ts
 *
 * PATCH /api/v1/matches/{id}/confirm — Confirma un match desde el recap.
 *   Marca el match como confirmado y notifica al agente representante (si existe vínculo).
 *
 * DELETE /api/v1/matches/{id} — Descarta un match desde el recap.
 *   Elimina el match del historial del comprador.
 *
 * NOTA: Este endpoint es un stub de confirmación. La persistencia real en Supabase
 * (UPDATE match_events SET confirmed = true) y la verificación RLS (buyer_id === userId del JWT)
 * se activarán junto con la autenticación completa en Epic 3.
 *
 * Source: architecture.md#API & Communication Patterns
 * Source: epics.md#Story-2.6 (AC3, AC4)
 * Source: story 2-6-match-recap-screen.md (Task 5)
 */
import { NextResponse } from 'next/server';
import type { ApiResponse } from '@reinder/shared';

interface RouteParams {
  params: { id: string };
}

/**
 * PATCH /api/v1/matches/{id}/confirm
 * Confirma un match desde el recap — marca como reforzado y notifica al agente.
 */
export async function PATCH(
  _request: Request,
  { params }: RouteParams,
): Promise<NextResponse<ApiResponse<{ confirmed: boolean; matchId: string }>>> {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { data: null, error: { code: 'INVALID_INPUT', message: 'matchId es requerido' } },
        { status: 400 },
      );
    }

    // TODO (Epic 3): implementar con Supabase:
    // 1. Obtener userId del JWT: const { data: { user } } = await supabase.auth.getUser(token)
    // 2. Verificar que match_events.buyer_id === userId (RLS protege pero conviene verificar explícitamente)
    // 3. UPDATE match_events SET confirmed = true, confirmed_at = now() WHERE id = {id}
    // 4. Si buyer tiene agente vinculado (leftjoin referral_tokens), emitir:
    //    supabase.channel('agent-{agentId}').send({ type: 'broadcast', event: 'match.created', payload: { matchId: id } })

    return NextResponse.json({
      data: { confirmed: true, matchId: id },
      error: null,
    });
  } catch {
    return NextResponse.json(
      { data: null, error: { code: 'SERVER_ERROR', message: 'Error interno del servidor' } },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/v1/matches/{id}
 * Descarta un match desde el recap — elimina del historial del comprador.
 */
export async function DELETE(
  _request: Request,
  { params }: RouteParams,
): Promise<NextResponse<ApiResponse<{ deleted: boolean; matchId: string }>>> {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { data: null, error: { code: 'INVALID_INPUT', message: 'matchId es requerido' } },
        { status: 400 },
      );
    }

    // TODO (Epic 3): implementar con Supabase:
    // 1. Obtener userId del JWT
    // 2. DELETE FROM match_events WHERE id = {id} AND buyer_id = userId (RLS garantiza esto)
    // 3. Verificar que se eliminó al menos 1 fila (si 0, retornar 404)
    // 4. No emitir evento Realtime — el agente no recibe notificación de descarte

    return NextResponse.json({
      data: { deleted: true, matchId: id },
      error: null,
    });
  } catch {
    return NextResponse.json(
      { data: null, error: { code: 'SERVER_ERROR', message: 'Error interno del servidor' } },
      { status: 500 },
    );
  }
}
