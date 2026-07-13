/**
 * apps/web/src/app/api/v1/matches/route.ts
 *
 * GET /api/v1/matches — Retorna el historial completo de matches del comprador autenticado.
 * Ordenado por fecha descendente (más recientes primero).
 *
 * NOTA: Este endpoint es un stub. La consulta real a Supabase (match_events JOIN listings)
 * y verificación RLS (buyer_id === auth.uid()) se activarán en Epic 3.
 *
 * Source: architecture.md#API & Communication Patterns
 * Source: story 2-7-historial-matches-badge-nuevas-propiedades.md (Task 1)
 */
import { NextResponse } from 'next/server';
import type { ApiResponse, MatchHistoryItem } from '@reinder/shared';

/** Datos de prueba — sustituir por consulta Supabase en Epic 3 */
const MOCK_MATCHES: MatchHistoryItem[] = [
  {
    matchId: 'match-1',
    listingId: 'listing-1',
    imageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800',
    price: 285000,
    address: 'Calle Gran Vía 45, Madrid',
    listingStatus: 'active',
    matchedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    confirmed: true,
  },
  {
    matchId: 'match-2',
    listingId: 'listing-2',
    imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',
    price: 420000,
    address: 'Paseo de la Castellana 120, Madrid',
    listingStatus: 'sold',
    matchedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    confirmed: true,
  },
  {
    matchId: 'match-3',
    listingId: 'listing-3',
    imageUrl: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
    price: 195000,
    address: 'Calle Serrano 22, Madrid',
    listingStatus: 'active',
    matchedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    confirmed: false,
  },
];

/**
 * GET /api/v1/matches
 * Retorna el historial de matches del comprador autenticado, por fecha descendente.
 */
export async function GET(
  _request: Request,
): Promise<NextResponse<ApiResponse<MatchHistoryItem[]>>> {
  try {
    // TODO (Epic 3): implementar con Supabase join match_events + listings
    return NextResponse.json({ data: MOCK_MATCHES, error: null });
  } catch {
    return NextResponse.json(
      { data: null, error: { code: 'SERVER_ERROR', message: 'Error interno del servidor' } },
      { status: 500 },
    );
  }
}
