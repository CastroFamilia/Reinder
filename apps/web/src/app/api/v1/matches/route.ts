/**
 * apps/web/src/app/api/v1/matches/route.ts
 *
 * GET /api/v1/matches — Retorna el historial completo de matches del comprador autenticado.
 * Ordenado por fecha descendente (más recientes primero).
 *
 * Consulta match_events JOIN listings para construir MatchHistoryItem[].
 * Filtra por buyer_id = authenticated user.
 *
 * Source: architecture.md#API & Communication Patterns
 * Source: story 2-7-historial-matches-badge-nuevas-propiedades.md (Task 1)
 */
import { NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/supabase/api-auth';
import { db } from '@/lib/supabase/db';
import { matchEvents, listings } from '@reinder/shared/db/schema';
import { eq, desc } from 'drizzle-orm';
import type { ApiResponse, MatchHistoryItem } from '@reinder/shared';

/**
 * GET /api/v1/matches
 * Retorna el historial de matches del comprador autenticado, por fecha descendente.
 */
export async function GET(
  request: Request,
): Promise<NextResponse<ApiResponse<MatchHistoryItem[]>>> {
  try {
    // Auth: supports both cookies (web) and Bearer token (mobile)
    const auth = await authenticateApiRequest(request);

    if (!auth.user) {
      return NextResponse.json(
        {
          data: null,
          error: { code: 'UNAUTHORIZED', message: auth.error },
        },
        { status: 401 },
      );
    }

    const user = auth.user;

    // Query: match_events JOIN listings, filtered by buyer_id
    const rows = await db
      .select({
        matchId: matchEvents.id,
        listingId: matchEvents.listingId,
        confirmedAt: matchEvents.confirmedAt,
        matchedAt: matchEvents.createdAt,
        // Listing fields
        title: listings.title,
        description: listings.description,
        price: listings.price,
        address: listings.address,
        city: listings.city,
        status: listings.status,
        images: listings.images,
        bedrooms: listings.bedrooms,
        sizeSqm: listings.sizeSqm,
      })
      .from(matchEvents)
      .innerJoin(listings, eq(matchEvents.listingId, listings.id))
      .where(eq(matchEvents.buyerId, user.id))
      .orderBy(desc(matchEvents.createdAt));

    // Map DB rows → MatchHistoryItem type
    const data: MatchHistoryItem[] = rows.map((row) => {
      const images = (row.images as string[] | null) ?? [];
      const firstImage = images.length > 0 ? images[0]! : '';

      return {
        matchId: row.matchId,
        listingId: row.listingId,
        imageUrl: firstImage,
        price: row.price ? Number(row.price) : 0,
        address: [row.address, row.city].filter(Boolean).join(', ') || row.title,
        listingStatus: row.status as 'active' | 'sold' | 'withdrawn',
        matchedAt: row.matchedAt.toISOString(),
        confirmed: row.confirmedAt !== null,
        // Extended fields for detail view
        title: row.title,
        description: row.description ?? undefined,
        rooms: row.bedrooms ?? undefined,
        squareMeters: row.sizeSqm ? Number(row.sizeSqm) : undefined,
        imageUrls: images.length > 0 ? images : undefined,
      };
    });

    return NextResponse.json({ data, error: null });
  } catch (err) {
    console.error('[matches] Error:', err);
    return NextResponse.json(
      {
        data: null,
        error: { code: 'SERVER_ERROR', message: 'Error interno del servidor' },
      },
      { status: 500 },
    );
  }
}
