/**
 * apps/web/src/app/listings/[id]/page.tsx
 *
 * Story 6.1: Páginas de Listing SSR Indexables por Google
 * Story 6.2: Datos Estructurados Schema.org en Páginas de Listing ← NEW
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
 * AC1 (6.1): HTML rendered with title, price, description, location, image
 * AC2 (6.1): TTFB ≤2s (NFR4) — ensured by ISR caching
 * AC3 (6.1): generateMetadata populates <title>, <meta description>, og:image, og:price
 * AC4 (6.1): Cache invalidated on status change (revalidateTag in status route)
 * AC5 (6.1): withdrawn → 404
 * AC6 (6.1): sold >72h → 404
 * AC1 (6.2): <script type="application/ld+json"> with RealEstateListing schema
 * AC2 (6.2): schema generated from structured-data.ts (testable unit)
 * AC3 (6.2): null fields omitted from JSON-LD
 *
 * [Source: _bmad-output/implementation-artifacts/6-1-paginas-listing-ssr-indexables-google.md]
 * [Source: _bmad-output/implementation-artifacts/6-2-datos-estructurados-schemaorg-paginas-listing.md]
 */
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getListingById, isListingPubliclyVisible } from '@/features/listings/lib/queries';
import { buildListingJsonLd } from '@/features/listings/lib/structured-data';
import { ListingDetailPage } from '@/features/listings/components/ListingDetailPage';

interface ListingPageProps {
  params: { id: string };
}

// ISR fallback: revalidate every hour (tag-based revalidation is the primary mechanism)
export const revalidate = 3600;

/**
 * AC3 (6.1): Generate SEO metadata for the listing page.
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
 * Story 6.1: HTML structure, SSR, metadata, 404 logic
 * Story 6.2: Injects JSON-LD <script> into RSC output (AC1, AC2, AC3)
 */
export default async function ListingPage({ params }: ListingPageProps) {
  const listing = await getListingById(params.id);

  // AC5 (6.1): withdrawn → 404
  // AC6 (6.1): sold >72h → 404
  if (!listing || !isListingPubliclyVisible(listing)) {
    notFound();
  }

  // AC1 (6.2): JSON-LD structured data — injected as <script> in RSC output.
  // Next.js 15 App Router allows <script> directly in Server Components.
  // The script appears in the document <head> area when rendered server-side.
  const jsonLd = buildListingJsonLd(listing);

  return (
    <>
      {/* AC1 (6.2): Schema.org structured data for Google rich snippets */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <ListingDetailPage listing={listing} />
    </>
  );
}
