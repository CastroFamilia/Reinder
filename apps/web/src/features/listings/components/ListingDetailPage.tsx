/**
 * apps/web/src/features/listings/components/ListingDetailPage.tsx
 *
 * Story 6.1: Public listing detail UI — rendered server-side for SEO.
 * Story 6.3: Gated content — preview mode for anonymous visitors.
 *
 * AC1 (6.3): Anonymous: image, price, location, description preview (~200 chars)
 * AC2 (6.3): GatedContentCTA shown when !isAuthenticated
 * AC3 (6.3): Full content hidden until authentication (galería, desc completa, datos agente)
 * AC4 (6.3): Same HTML for bot and anon — no cloaking (isAuthenticated from server auth check)
 */
import Image from 'next/image';
import type { ListingForSSR } from '../lib/queries';
import { GatedContentCTA } from './GatedContentCTA';
import './listing-detail.css';

/** Preview description limit in characters (AC1 — "primeras 2 líneas") */
const DESCRIPTION_PREVIEW_LENGTH = 200;

interface ListingDetailPageProps {
  listing: ListingForSSR;
  /** Server-determined auth state. false → preview mode. Same value for bot and anonymous user. */
  isAuthenticated: boolean;
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

/**
 * Truncate description for preview mode (AC1 of 6.3).
 * Cuts at word boundary when possible to avoid mid-word breaks.
 */
function truncateDescription(
  description: string | null,
  maxLength: number,
): string | null {
  if (!description) return null;
  if (description.length <= maxLength) return description;

  // Find the last space before maxLength to avoid mid-word cut
  const truncated = description.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  const breakPoint = lastSpace > maxLength * 0.7 ? lastSpace : maxLength;

  return description.slice(0, breakPoint) + '…';
}

export function ListingDetailPage({
  listing,
  isAuthenticated,
}: ListingDetailPageProps) {
  const primaryImage = listing.images?.[0] ?? null;
  const isSold = listing.status === 'sold';

  // AC1 (6.3): Preview mode — truncate description
  const displayDescription = isAuthenticated
    ? listing.description
    : truncateDescription(listing.description, DESCRIPTION_PREVIEW_LENGTH);

  return (
    <main className="listing-detail">
      {/* Hero image — always visible (preview + full) — LCP element */}
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
              <div
                className="listing-detail__sold-badge"
                aria-label="Vendida"
              >
                VENDIDA
              </div>
            )}
          </div>
        ) : (
          <div
            className="listing-detail__image-placeholder"
            aria-label="Sin imagen disponible"
          />
        )}
      </section>

      {/* Core property details — always visible (preview + full) */}
      <section className="listing-detail__info">
        <h1 className="listing-detail__title">{listing.title}</h1>

        <p className="listing-detail__price">
          {formatPrice(listing.price, listing.currency)}
        </p>

        {/* Location — always visible */}
        {(listing.address || listing.city) && (
          <address className="listing-detail__location">
            {[listing.address, listing.city, listing.country]
              .filter(Boolean)
              .join(', ')}
          </address>
        )}

        {/* Key metrics — always visible */}
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

        {/* Description — preview (truncated) or full */}
        {displayDescription && (
          <section className="listing-detail__description">
            <h2 className="listing-detail__description-heading">
              Descripción
            </h2>
            <p className="listing-detail__description-text">
              {displayDescription}
            </p>
          </section>
        )}

        {/* AC2, AC3 (6.3): Gated content CTA — shown only to anonymous visitors */}
        {!isAuthenticated && <GatedContentCTA listingId={listing.id} />}

        {/* AC3 (6.3): Full content — only rendered for authenticated users */}
        {isAuthenticated && (
          <section className="listing-detail__full-content">
            {/* Full gallery (future: Story 6.3 extended) */}
            {listing.images && listing.images.length > 1 && (
              <div className="listing-detail__gallery">
                <h2 className="listing-detail__gallery-heading">Galería</h2>
                <div className="listing-detail__gallery-grid">
                  {listing.images.slice(1).map((imgUrl, idx) => (
                    <Image
                      key={imgUrl}
                      src={imgUrl}
                      alt={`${listing.title} - Foto ${idx + 2}`}
                      width={600}
                      height={400}
                      className="listing-detail__gallery-image"
                      style={{
                        objectFit: 'cover',
                        width: '100%',
                        height: 'auto',
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </section>
    </main>
  );
}
