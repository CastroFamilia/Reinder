/**
 * apps/web/src/app/listings/[id]/page.tsx
 *
 * Story 6.1: Páginas de Listing SSR Indexables por Google
 * Story 6.2: Datos Estructurados Schema.org en Páginas de Listing
 * Story 6.3: Gated Content — Preview para Usuarios No Autenticados ← NEW
 *
 * PUBLIC route — not nested in (protected) or (auth) route groups.
 * Accessible by Google bot, crawlers, and unauthenticated users.
 *
 * Anti-cloaking architecture (AC4 of 6.3):
 *   Server renders the SAME HTML for bots and anonymous users.
 *   isAuthenticated is determined server-side via Supabase auth.getUser().
 *   Google bot has no session → isAuthenticated = false → preview mode.
 *   Anonymous visitor has no session → same preview mode.
 *   → No cloaking. Same HTML response for both.
 *
 * [Source: _bmad-output/implementation-artifacts/6-3-gated-content-preview-usuarios-no-autenticados.md]
 */
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
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
 * Story 6.1: SSR + 404 logic
 * Story 6.2: JSON-LD structured data
 * Story 6.3: Auth check → isAuthenticated prop → preview vs. full content
 *
 * AC4 (6.3): Parallel fetch of listing data and auth state.
 *            Bot and anonymous both get isAuthenticated=false → identical preview HTML.
 */
export default async function ListingPage({ params }: ListingPageProps) {
  // Parallel fetch: listing data + auth check (AC4 — anti-cloaking, non-blocking)
  const [listing, supabase] = await Promise.all([
    getListingById(params.id),
    createClient(),
  ]);

  // AC5, AC6 (6.1): withdrawn → 404, sold >72h → 404
  if (!listing || !isListingPubliclyVisible(listing)) {
    notFound();
  }

  // AC4 (6.3): Server-side auth check. user=null → preview mode.
  // Google bot has no cookies → getUser() returns null → isAuthenticated=false
  // Anonymous visitor → same → no cloaking.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthenticated = user !== null;

  // AC1 (6.2): JSON-LD structured data
  const jsonLd = buildListingJsonLd(listing);

  return (
    <>
      {/* AC1 (6.2): Schema.org structured data for Google rich snippets */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      {/* AC1-AC3 (6.3): Preview mode for anon, full mode for authenticated */}
      <ListingDetailPage listing={listing} isAuthenticated={isAuthenticated} />
    </>
  );
}
