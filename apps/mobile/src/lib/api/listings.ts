/**
 * apps/mobile/src/lib/api/listings.ts
 *
 * Cliente API para el endpoint de listings.
 * Llama a GET /api/v1/listings en apps/web.
 *
 * En desarrollo local: usa EXPO_PUBLIC_API_URL (default: http://localhost:3000)
 * Source: architecture.md#API & Communication Patterns
 */
import type { ApiResponse, Listing, SearchPreferences } from '@reinder/shared';

/**
 * URL base de la API web.
 * En dev: http://localhost:3000
 * En prod: https://reinder.app (configurar via EXPO_PUBLIC_API_URL)
 */
const API_BASE_URL =
  (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000') + '/api/v1';

/**
 * Fetch de listings del feed para el comprador autenticado.
 * @param token - JWT de sesión Supabase
 * @param cursor - cursor de paginación (opcional)
 * @param filters - preferencias de búsqueda activas (opcional, Story 2.9)
 */
export async function fetchListings(
  token: string,
  cursor?: string,
  filters?: SearchPreferences,
): Promise<ApiResponse<Listing[]>> {
  try {
    const url = new URL(`${API_BASE_URL}/listings`);
    if (cursor) {
      url.searchParams.set('cursor', cursor);
    }
    // Story 2.9: añadir filtros como query params
    if (filters) {
      filters.zones.forEach((z) => url.searchParams.append('zone', z));
      if (filters.maxPrice != null) url.searchParams.set('max_price', String(filters.maxPrice));
      if (filters.minRooms != null) url.searchParams.set('min_rooms', String(filters.minRooms));
      if (filters.minSqm != null) url.searchParams.set('min_sqm', String(filters.minSqm));
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return {
        data: null,
        error: {
          code: `HTTP_${response.status}`,
          message: `Error al cargar propiedades: ${response.statusText}`,
        },
      };
    }

    return (await response.json()) as ApiResponse<Listing[]>;
  } catch (err) {
    return {
      data: null,
      error: {
        code: 'NETWORK_ERROR',
        message: 'Sin conexión — guardando para cuando vuelvas',
      },
    };
  }
}

/**
 * Guarda/actualiza las preferencias de búsqueda del comprador en Supabase.
 * PATCH /api/v1/buyer/preferences
 * Story 2.9 — Task 5 (AC: 2)
 */
export async function saveSearchPreferences(
  prefs: SearchPreferences,
  token: string,
): Promise<ApiResponse<SearchPreferences>> {
  try {
    const response = await fetch(`${API_BASE_URL}/buyer/preferences`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(prefs),
    });

    if (!response.ok) {
      return {
        data: null,
        error: {
          code: `HTTP_${response.status}`,
          message: `Error al guardar preferencias: ${response.statusText}`,
        },
      };
    }

    return (await response.json()) as ApiResponse<SearchPreferences>;
  } catch {
    return {
      data: null,
      error: {
        code: 'NETWORK_ERROR',
        message: 'Sin conexión al guardar preferencias',
      },
    };
  }
}

/**
 * Datos mock para usar cuando el backend no está disponible.
 * Permite desarrollar y testear la UI sin un server corriendo.
 */
export const MOCK_LISTINGS: Listing[] = [
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
