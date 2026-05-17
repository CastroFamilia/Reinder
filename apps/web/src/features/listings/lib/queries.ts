/**
 * apps/web/src/features/listings/lib/queries.ts
 *
 * Server-side data fetching for public listing SSR pages.
 * Story 6.1: Páginas de Listing SSR Indexables por Google
 *
 * Uses Drizzle ORM + unstable_cache for tag-based ISR revalidation.
 * NEVER import this in client components.
 */
import 'server-only';
import { unstable_cache } from 'next/cache';
import { db } from '@/lib/supabase/db';
import { listings } from '@reinder/shared/db/schema';
import { eq } from 'drizzle-orm';

export type ListingForSSR = {
  id: string;
  title: string;
  description: string | null;
  price: string | null;
  currency: string;
  bedrooms: number | null;
  sizeSqm: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  images: string[];
  status: string;
  agencyId: string;
  updatedAt: Date;
  createdAt: Date;
};

/**
 * Fetches a listing by ID for SSR rendering.
 * Returns null if the listing does not exist.
 *
 * Caching: tag-based ISR via unstable_cache.
 * Tag: `listings-{id}` — invalidated via revalidateTag() in status PATCH route.
 *
 * NOTE: sold_at column not yet in schema (Story 5.4 worktree not merged).
 * Using updatedAt as proxy: if status='sold' AND updatedAt < now-72h → 404.
 * [Source: _bmad-output/implementation-artifacts/6-1-paginas-listing-ssr-indexables-google.md]
 */
export function getListingById(id: string): Promise<ListingForSSR | null> {
  return unstable_cache(
    async () => {
      const rows = await db
        .select({
          id: listings.id,
          title: listings.title,
          description: listings.description,
          price: listings.price,
          currency: listings.currency,
          bedrooms: listings.bedrooms,
          sizeSqm: listings.sizeSqm,
          address: listings.address,
          city: listings.city,
          country: listings.country,
          images: listings.images,
          status: listings.status,
          agencyId: listings.agencyId,
          updatedAt: listings.updatedAt,
          createdAt: listings.createdAt,
        })
        .from(listings)
        .where(eq(listings.id, id))
        .limit(1);

      if (rows.length === 0) return null;
      return rows[0] as ListingForSSR;
    },
    [`listing-${id}`],
    {
      tags: [`listings-${id}`, 'listings'],
      revalidate: 3600, // 1-hour fallback revalidation (NFR4)
    }
  )();
}

/**
 * Determines if a listing should be shown publicly (AC5, AC6).
 * Returns true if the listing should render; false if it should 404.
 */
export function isListingPubliclyVisible(listing: ListingForSSR): boolean {
  if (listing.status === 'withdrawn') return false;
  if (listing.status === 'pending_review') return false;

  if (listing.status === 'sold') {
    const SEVENTY_TWO_HOURS_MS = 72 * 60 * 60 * 1000;
    const ageMs = Date.now() - new Date(listing.updatedAt).getTime();
    // Sold listings are visible for 72h after status change (using updatedAt as proxy for sold_at)
    return ageMs < SEVENTY_TWO_HOURS_MS;
  }

  return listing.status === 'active';
}
