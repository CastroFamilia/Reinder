/**
 * apps/web/src/app/api/v1/listings/route.ts
 *
 * API Route Handler — GET /api/v1/listings
 * Devuelve el feed de listings activos para el comprador.
 *
 * Conectado a Supabase vía Drizzle ORM.
 * Acepta query params de filtrado: zone, max_price, min_rooms, min_sqm.
 *
 * Formato respuesta: ApiResponse<Listing[]> — wrapper obligatorio (arch.md)
 */
import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/db';
import { listings } from '@reinder/shared/db/schema';
import { eq, gte, lte, ilike, or, and, desc, type SQL } from 'drizzle-orm';
import type { Listing, ApiResponse } from '@reinder/shared';

/**
 * GET /api/v1/listings
 * Devuelve listings activos para el feed del comprador.
 *   ?zone=Malasaña&zone=Chamberí → filtra por location (address/city)
 *   ?max_price=400000            → filtra por price
 *   ?min_rooms=2                 → filtra por bedrooms
 *   ?min_sqm=60                  → filtra por sizeSqm
 */
export async function GET(request: Request): Promise<NextResponse<ApiResponse<Listing[]>>> {
  try {
    const { searchParams } = new URL(request.url);
    const zones = searchParams.getAll('zone');
    const maxPrice = searchParams.get('max_price') ? Number(searchParams.get('max_price')) : null;
    const minRooms = searchParams.get('min_rooms') ? Number(searchParams.get('min_rooms')) : null;
    const minSqm = searchParams.get('min_sqm') ? Number(searchParams.get('min_sqm')) : null;

    // ─── Build WHERE conditions ───────────────────────────────────────────────
    const conditions: SQL[] = [eq(listings.status, 'active')];

    // Zone filter: ilike match on address or city for each zone, combined with OR
    if (zones.length > 0) {
      const zoneConditions = zones.map((zone) =>
        or(
          ilike(listings.address, `%${zone}%`),
          ilike(listings.city, `%${zone}%`),
        )
      );
      const combinedZones = or(...zoneConditions);
      if (combinedZones) {
        conditions.push(combinedZones);
      }
    }

    // price is stored as numeric(15,2) — compare as string
    if (maxPrice != null) {
      conditions.push(lte(listings.price, String(maxPrice)));
    }

    if (minRooms != null) {
      conditions.push(gte(listings.bedrooms, minRooms));
    }

    // sizeSqm is stored as numeric(10,2) — compare as string
    if (minSqm != null) {
      conditions.push(gte(listings.sizeSqm, String(minSqm)));
    }

    // ─── Execute query ────────────────────────────────────────────────────────
    const rows = await db
      .select()
      .from(listings)
      .where(and(...conditions))
      .orderBy(desc(listings.createdAt))
      .limit(50);

    // ─── Map DB rows → Listing type ──────────────────────────────────────────
    const data: Listing[] = rows.map((row) => {
      const images = (row.images as string[] | null) ?? [];
      const firstImage = images.length > 0 ? images[0] : '';

      return {
        id: row.id,
        title: row.title,
        price: row.price ? Number(row.price) : 0,
        location: [row.address, row.city].filter(Boolean).join(', ') || '',
        rooms: row.bedrooms ?? 0,
        squareMeters: row.sizeSqm ? Number(row.sizeSqm) : 0,
        imageUrl: firstImage,
        imageUrls: images.length > 0 ? images : undefined,
        status: row.status as Listing['status'],
        agencyId: row.agencyId,
        createdAt: row.createdAt.toISOString(),
        description: row.description ?? undefined,
      };
    });

    return NextResponse.json({ data, error: null }, { status: 200 });
  } catch (err) {
    console.error('[listings] Error querying listings:', err);
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error fetching listings',
        },
      },
      { status: 500 },
    );
  }
}
