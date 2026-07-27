/**
 * apps/web/src/app/api/v1/listings/route.ts
 *
 * API Route Handler — GET /api/v1/listings
 * Devuelve el feed de listings activos para el comprador.
 *
 * Conectado a Supabase vía Drizzle ORM.
 * Acepta query params de filtrado: zone, max_price, min_rooms, min_sqm.
 *
 * Story 10.3: Personalized cover photo — LEFT JOIN with listing_fit_scores
 * to resolve recommended_photo_index per buyer.
 *
 * Formato respuesta: ApiResponse<Listing[]> — wrapper obligatorio (arch.md)
 */
import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/db';
import { listings, listingFitScores, userProfiles } from '@reinder/shared/db/schema';
import { eq, gte, lte, ilike, or, and, desc, type SQL } from 'drizzle-orm';
import type { Listing, ApiResponse } from '@reinder/shared';
import { authenticateApiRequest } from '@/lib/supabase/api-auth';

/**
 * GET /api/v1/listings
 * Devuelve listings activos para el feed del comprador.
 *   ?zone=Malasaña&zone=Chamberí → filtra por location (address/city)
 *   ?max_price=400000            → filtra por price
 *   ?min_rooms=2                 → filtra por bedrooms
 *   ?min_sqm=60                  → filtra por sizeSqm
 *
 * Story 10.3: If buyer is authenticated and personalization_enabled=true,
 * resolves imageUrl from listing_fit_scores.recommended_photo_index.
 */
export async function GET(request: Request): Promise<NextResponse<ApiResponse<Listing[]>>> {
  try {
    const { searchParams } = new URL(request.url);
    const zones = searchParams.getAll('zone');
    const maxPrice = searchParams.get('max_price') ? Number(searchParams.get('max_price')) : null;
    const minRooms = searchParams.get('min_rooms') ? Number(searchParams.get('min_rooms')) : null;
    const minSqm = searchParams.get('min_sqm') ? Number(searchParams.get('min_sqm')) : null;

    // ─── Story 10.3: Authenticate buyer (optional — unauthenticated = no personalization)
    let userId: string | null = null;
    let personalizationEnabled = false;

    const authResult = await authenticateApiRequest(request);
    if (authResult.user) {
      userId = authResult.user.id;

      // Check personalization_enabled in user_profiles
      const [profile] = await db
        .select({ personalizationEnabled: userProfiles.personalizationEnabled })
        .from(userProfiles)
        .where(eq(userProfiles.id, userId))
        .limit(1);

      personalizationEnabled = profile?.personalizationEnabled ?? false;
    }

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
    // Story 10.3: LEFT JOIN with listing_fit_scores when personalization is enabled
    let rows: Array<{
      listing: typeof listings.$inferSelect;
      recommendedPhotoIndex: number | null;
    }>;

    if (personalizationEnabled && userId) {
      rows = await db
        .select({
          listing: listings,
          recommendedPhotoIndex: listingFitScores.recommendedPhotoIndex,
        })
        .from(listings)
        .leftJoin(
          listingFitScores,
          and(
            eq(listingFitScores.listingId, listings.id),
            eq(listingFitScores.buyerId, userId),
          ),
        )
        .where(and(...conditions))
        .orderBy(desc(listings.createdAt))
        .limit(50);
    } else {
      // No personalization — simple query, no JOIN needed
      const simpleRows = await db
        .select()
        .from(listings)
        .where(and(...conditions))
        .orderBy(desc(listings.createdAt))
        .limit(50);

      rows = simpleRows.map((row) => ({
        listing: row,
        recommendedPhotoIndex: null,
      }));
    }

    // ─── Map DB rows → Listing type ──────────────────────────────────────────
    const data: Listing[] = rows.map((row) => {
      const images = (row.listing.images as string[] | null) ?? [];
      const photoIndex = personalizationEnabled
        ? (row.recommendedPhotoIndex ?? 0)
        : 0;
      const safeIndex = photoIndex < images.length ? photoIndex : 0;
      const firstImage = images.length > 0 ? images[safeIndex] : '';

      return {
        id: row.listing.id,
        title: row.listing.title,
        price: row.listing.price ? Number(row.listing.price) : 0,
        location: [row.listing.address, row.listing.city].filter(Boolean).join(', ') || '',
        rooms: row.listing.bedrooms ?? 0,
        squareMeters: row.listing.sizeSqm ? Number(row.listing.sizeSqm) : 0,
        imageUrl: firstImage,
        imageUrls: images.length > 0 ? images : undefined,
        status: row.listing.status as Listing['status'],
        agencyId: row.listing.agencyId,
        createdAt: row.listing.createdAt.toISOString(),
        description: row.listing.description ?? undefined,
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
