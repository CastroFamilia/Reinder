/**
 * apps/web/src/app/api/v1/listings/route.ts
 *
 * API Route Handler — GET /api/v1/listings
 * Devuelve el feed de listings activos para el comprador autenticado.
 *
 * Story 2.2: implementación stub con datos mock para desarrollo.
 * Story 2.9: filtrado por query params (zone, max_price, min_rooms, min_sqm)
 *
 * Formato respuesta: ApiResponse<Listing[]> — wrapper obligatorio (arch.md)
 */
import { NextResponse } from 'next/server';
import type { Listing } from '@reinder/shared';

/**
 * Datos mock de listings — para desarrollo local mientras se integra Supabase.
 * Se mantendrá hasta Story 2.x de producción que conecte Drizzle+Supabase.
 */
const MOCK_LISTINGS: Listing[] = [
  {
    id: 'listing-1',
    title: 'Ático con terraza en Malasaña',
    price: 485000,
    location: 'Malasaña, Madrid',
    rooms: 3,
    squareMeters: 95,
    floor: 'Ático',
    imageUrl: 'https://picsum.photos/800/1200?random=1',
    imageAlt: 'Ático luminoso en Malasaña con terraza privada',
    status: 'active',
    badge: 'EXCLUSIVA',
    agencyId: 'agency-1',
    createdAt: '2026-03-20T10:00:00Z',
  },
  {
    id: 'listing-2',
    title: 'Piso reformado en Chamberí',
    price: 350000,
    location: 'Chamberí, Madrid',
    rooms: 2,
    squareMeters: 75,
    floor: '3ª',
    imageUrl: 'https://picsum.photos/800/1200?random=2',
    imageAlt: 'Piso moderno reformado en Chamberí con luz natural',
    status: 'active',
    badge: 'NUEVA',
    agencyId: 'agency-1',
    createdAt: '2026-03-19T15:30:00Z',
  },
  {
    id: 'listing-3',
    title: 'Loft industrial en Lavapiés',
    price: 290000,
    location: 'Lavapiés, Madrid',
    rooms: 1,
    squareMeters: 60,
    imageUrl: 'https://picsum.photos/800/1200?random=3',
    imageAlt: 'Loft de estilo industrial en el corazón de Lavapiés',
    status: 'active',
    agencyId: 'agency-2',
    createdAt: '2026-03-18T09:00:00Z',
  },
  {
    id: 'listing-4',
    title: 'Casa con jardín en La Moraleja',
    price: 890000,
    location: 'La Moraleja, Madrid',
    rooms: 5,
    squareMeters: 280,
    imageUrl: 'https://picsum.photos/800/1200?random=4',
    imageAlt: 'Casa familiar con jardín privado en La Moraleja',
    status: 'active',
    badge: 'EXCLUSIVA',
    agencyId: 'agency-1',
    createdAt: '2026-03-17T12:00:00Z',
  },
  {
    id: 'listing-5',
    title: 'Estudio en Retiro',
    price: 195000,
    location: 'Retiro, Madrid',
    rooms: 1,
    squareMeters: 42,
    floor: '7ª',
    imageUrl: 'https://picsum.photos/800/1200?random=5',
    imageAlt: 'Estudio con vistas en el barrio de Retiro',
    status: 'sold',
    badge: 'VENDIDA',
    agencyId: 'agency-2',
    createdAt: '2026-03-16T08:00:00Z',
  },
];

/**
 * GET /api/v1/listings
 * Devuelve listings activos para el feed del comprador.
 * Story 2.9: acepta query params de filtrado (AC3)
 *   ?zone=Malasaña&zone=Chamberí → filtra por location
 *   ?max_price=400000            → filtra por price
 *   ?min_rooms=2                 → filtra por rooms
 *   ?min_sqm=60                  → filtra por squareMeters
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const zones = searchParams.getAll('zone');
  const maxPrice = searchParams.get('max_price') ? Number(searchParams.get('max_price')) : null;
  const minRooms = searchParams.get('min_rooms') ? Number(searchParams.get('min_rooms')) : null;
  const minSqm = searchParams.get('min_sqm') ? Number(searchParams.get('min_sqm')) : null;

  let result: Listing[] = MOCK_LISTINGS;

  // Aplicar filtros (AC3)
  if (zones.length > 0) {
    result = result.filter((l) => zones.some((z) => l.location.toLowerCase().includes(z.toLowerCase())));
  }
  if (maxPrice != null) {
    result = result.filter((l) => (l.price ?? Infinity) <= maxPrice);
  }
  if (minRooms != null) {
    result = result.filter((l) => (l.rooms ?? 0) >= minRooms);
  }
  if (minSqm != null) {
    result = result.filter((l) => (l.squareMeters ?? 0) >= minSqm);
  }

  return NextResponse.json({ data: result, error: null }, { status: 200 });
}
