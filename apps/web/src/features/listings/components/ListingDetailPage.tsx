/**
 * apps/web/src/features/listings/components/ListingDetailPage.tsx
 *
 * Story 6.1: Páginas de Listing SSR Indexables por Google
 *
 * Public listing detail UI — rendered server-side for SEO.
 * Shows property details for authenticated and anonymous visitors alike.
 * Gated content (full gallery, agent info) handled in Story 6.3.
 */
import Image from 'next/image';
import type { ListingForSSR } from '../lib/queries';

interface ListingDetailPageProps {
  listing: ListingForSSR;
}

function formatPrice(price: string | null, currency: string): string {
  if (!price) return 'Precio a consultar';
  const num = parseFloat(price);
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: currency ?? 'EUR',
    maximumFractionDigits: 0,
  }).format(num);
}

export function ListingDetailPage({ listing }: ListingDetailPageProps) {
  const primaryImage = listing.images?.[0] ?? null;
  const isSold = listing.status === 'sold';

  return (
    <main className="listing-detail">
      {/* Hero image — LCP element, priority load */}
      <section className="listing-detail__hero">
        {primaryImage ? (
          <div className="listing-detail__image-wrapper">
            <Image
              src={primaryImage}
              alt={listing.title}
              width={1200}
              height={800}
              priority
              className="listing-detail__image"
              style={{ objectFit: 'cover', width: '100%', height: 'auto' }}
            />
            {isSold && (
              <div className="listing-detail__sold-badge" aria-label="Vendida">
                VENDIDA
              </div>
            )}
          </div>
        ) : (
          <div className="listing-detail__image-placeholder" aria-label="Sin imagen disponible" />
        )}
      </section>

      {/* Core property details */}
      <section className="listing-detail__info">
        <h1 className="listing-detail__title">{listing.title}</h1>

        <p className="listing-detail__price">
          {formatPrice(listing.price, listing.currency)}
        </p>

        {/* Location */}
        {(listing.address || listing.city) && (
          <address className="listing-detail__location">
            {[listing.address, listing.city, listing.country]
              .filter(Boolean)
              .join(', ')}
          </address>
        )}

        {/* Key metrics */}
        <dl className="listing-detail__metrics">
          {listing.bedrooms != null && (
            <>
              <dt>Habitaciones</dt>
              <dd>{listing.bedrooms}</dd>
            </>
          )}
          {listing.sizeSqm != null && (
            <>
              <dt>Superficie</dt>
              <dd>{parseFloat(listing.sizeSqm).toFixed(0)} m²</dd>
            </>
          )}
        </dl>

        {/* Description */}
        {listing.description && (
          <section className="listing-detail__description">
            <h2 className="listing-detail__description-heading">Descripción</h2>
            <p className="listing-detail__description-text">{listing.description}</p>
          </section>
        )}
      </section>
    </main>
  );
}
