/**
 * apps/web/src/app/listings/[id]/page.tsx
 *
 * Story 6.1: Páginas de Listing SSR Indexables por Google
 *
 * PUBLIC route — not nested in (protected) or (auth) route groups.
 * Accessible by Google bot, crawlers, and unauthenticated users.
 *
 * SSR Strategy:
 * - Fetches listing data server-side via Drizzle ORM
 * - ISR: revalidate every 3600s as fallback
 * - Tag-based revalidation: `listings-{id}` tag invalidated by PATCH /api/v1/agency/listings/[id]/status
 * - 404: notFound() for withdrawn listings, or sold listings >72h old
 *
 * AC1: HTML rendered with title, price, description, location, image
 * AC2: TTFB ≤2s (NFR4) — ensured by ISR caching
 * AC3: generateMetadata populates <title>, <meta description>, og:image, og:price
 * AC4: Cache invalidated on status change (revalidateTag in status route)
 * AC5: withdrawn → 404
 * AC6: sold >72h → 404
 *
 * [Source: _bmad-output/implementation-artifacts/6-1-paginas-listing-ssr-indexables-google.md]
 */
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getListingById, isListingPubliclyVisible } from '@/features/listings/lib/queries';
import { ListingDetailPage } from '@/features/listings/components/ListingDetailPage';

interface ListingPageProps {
  params: { id: string };
}

// ISR fallback: revalidate every hour (tag-based revalidation is the primary mechanism)
export const revalidate = 3600;

/**
 * AC3: Generate SEO metadata for the listing page.
 * Executed server-side before rendering.
 */
export async function generateMetadata({ params }: ListingPageProps): Promise<Metadata> {
  const listing = await getListingById(params.id);

  if (!listing || !isListingPubliclyVisible(listing)) {
    return {
      title: 'Propiedad no encontrada | Reinder',
    };
  }

  const description =
    listing.description?.slice(0, 155) ??
    `${listing.title}${listing.city ? ` en ${listing.city}` : ''}. ${listing.price ? `${listing.price} ${listing.currency}.` : ''}`;

  return {
    title: `${listing.title} — ${listing.city ?? 'España'} | Reinder`,
    description,
    openGraph: {
      title: listing.title,
      description,
      images: listing.images?.[0] ? [{ url: listing.images[0] }] : [],
      type: 'article',
    },
    other: {
      'og:price:amount': listing.price ?? '',
      'og:price:currency': listing.currency ?? 'EUR',
    },
  };
}

/**
 * Public SSR listing page.
 *
 * AC1: Google bot receives full HTML with listing data
 * AC5, AC6: notFound() for withdrawn and sold >72h listings
 */
export default async function ListingPage({ params }: ListingPageProps) {
  const listing = await getListingById(params.id);

  // AC5: withdrawn → 404
  // AC6: sold >72h → 404
  if (!listing || !isListingPubliclyVisible(listing)) {
    notFound();
  }

  return <ListingDetailPage listing={listing} />;
}
