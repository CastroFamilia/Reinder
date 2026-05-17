/**
 * apps/web/src/features/listings/lib/structured-data.ts
 *
 * Story 6.2: Datos Estructurados Schema.org en Páginas de Listing
 *
 * Pure function — generates JSON-LD string for schema.org RealEstateListing.
 * No side effects, no async, testable without JSDOM.
 *
 * Usage in page.tsx (RSC):
 *   <script
 *     type="application/ld+json"
 *     dangerouslySetInnerHTML={{ __html: buildListingJsonLd(listing) }}
 *   />
 *
 * Schema reference: https://schema.org/RealEstateListing
 * Validates with: https://search.google.com/test/rich-results
 *
 * AC1: RealEstateListing type with required fields
 * AC2: Generated in this module (testable unit)
 * AC3: Null/undefined optional fields omitted from output
 * AC4: NFR14 ≤24h freshness covered by ISR tag from Story 6.1 — no code needed here
 */
import type { ListingForSSR } from './queries';

/** Base URL for canonical listing URLs. Override via env in production. */
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://reinder.app';

/**
 * Builds a schema.org RealEstateListing JSON-LD string for a listing.
 * Returns a JSON string ready for injection into <script type="application/ld+json">.
 *
 * AC3 compliance: only includes fields with non-null values.
 */
export function buildListingJsonLd(listing: ListingForSSR): string {
  // Build schema object incrementally — only add fields that have data
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: listing.title,
    url: `${BASE_URL}/listings/${listing.id}`,
  };

  // Optional: description
  if (listing.description) {
    schema.description = listing.description;
  }

  // Optional: price → priceSpecification block
  if (listing.price != null) {
    schema.priceSpecification = {
      '@type': 'UnitPriceSpecification',
      price: parseFloat(listing.price),
      priceCurrency: listing.currency ?? 'EUR',
    };
  }

  // Optional: address → PostalAddress block
  // Only emit block if at least one address component is non-null
  if (listing.address || listing.city || listing.country) {
    const address: Record<string, string> = { '@type': 'PostalAddress' };
    if (listing.address) address.streetAddress = listing.address;
    if (listing.city) address.addressLocality = listing.city;
    // Default country to Spain (ES) if address block is being emitted
    address.addressCountry = listing.country ?? 'ES';
    schema.address = address;
  }

  // Optional: numberOfRooms
  if (listing.bedrooms != null) {
    schema.numberOfRooms = listing.bedrooms;
  }

  // Optional: floorSize → QuantitativeValue block
  if (listing.sizeSqm != null) {
    schema.floorSize = {
      '@type': 'QuantitativeValue',
      value: parseFloat(listing.sizeSqm),
      unitCode: 'MTK', // ISO 80000-3: square metres
    };
  }

  // Optional: photo → array of ImageObject
  const images = listing.images ?? [];
  if (images.length > 0) {
    schema.photo = images.map((imageUrl) => ({
      '@type': 'ImageObject',
      url: imageUrl,
    }));
  }

  return JSON.stringify(schema);
}
