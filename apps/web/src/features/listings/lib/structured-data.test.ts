/**
 * apps/web/src/features/listings/lib/structured-data.test.ts
 *
 * ATDD — Story 6.2: Datos Estructurados Schema.org en Páginas de Listing
 * TDD RED PHASE — Tests will FAIL until structured-data.ts is implemented.
 *
 * Coverage targets:
 * - T6.2-01: <script type="application/ld+json"> present with RealEstateListing type
 * - T6.2-02: JSON-LD includes all required fields
 * - T6.2-03: Null optional fields omitted from output
 */
import { describe, it, expect } from 'vitest';

// RED PHASE: buildListingJsonLd does not exist yet
// describe.skip ensures tests compile but do not run until implementation
describe.skip('buildListingJsonLd — Schema.org structured data (Story 6.2 — TDD RED)', () => {
  // RED: import will fail — function not implemented yet
  // Un-skip after structured-data.ts is created

  const FULL_LISTING = {
    id: 'listing-active-1',
    title: 'Ático con terraza en Malasaña',
    description: 'Espectacular ático a estrenar en el corazón de Malasaña con terraza privada.',
    price: '485000.00',
    currency: 'EUR',
    bedrooms: 3,
    sizeSqm: '95.00',
    address: 'Calle Fuencarral 42',
    city: 'Madrid',
    country: 'España',
    images: [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
    ],
    status: 'active',
    agencyId: 'agency-1',
    updatedAt: new Date(),
    createdAt: new Date(),
  };

  const MINIMAL_LISTING = {
    id: 'listing-minimal',
    title: 'Piso en Madrid',
    description: null,
    price: null,
    currency: 'EUR',
    bedrooms: null,
    sizeSqm: null,
    address: null,
    city: null,
    country: null,
    images: [],
    status: 'active',
    agencyId: 'agency-1',
    updatedAt: new Date(),
    createdAt: new Date(),
  };

  it('T6.2-01 — output is valid JSON containing @type RealEstateListing', async () => {
    // RED: buildListingJsonLd not implemented
    const { buildListingJsonLd } = await import('./structured-data');
    const jsonString = buildListingJsonLd(FULL_LISTING as never);

    expect(() => JSON.parse(jsonString)).not.toThrow();
    const parsed = JSON.parse(jsonString);
    expect(parsed['@context']).toBe('https://schema.org');
    expect(parsed['@type']).toBe('RealEstateListing');
  });

  it('T6.2-02 — full listing: JSON-LD includes name, description, price, address, numberOfRooms, floorSize, photo', async () => {
    const { buildListingJsonLd } = await import('./structured-data');
    const parsed = JSON.parse(buildListingJsonLd(FULL_LISTING as never));

    // name (required)
    expect(parsed.name).toBe(FULL_LISTING.title);

    // description
    expect(parsed.description).toBe(FULL_LISTING.description);

    // price
    expect(parsed.priceSpecification).toBeDefined();
    expect(parsed.priceSpecification.price).toBe(485000);
    expect(parsed.priceSpecification.priceCurrency).toBe('EUR');

    // address
    expect(parsed.address).toBeDefined();
    expect(parsed.address['@type']).toBe('PostalAddress');
    expect(parsed.address.streetAddress).toBe(FULL_LISTING.address);
    expect(parsed.address.addressLocality).toBe(FULL_LISTING.city);

    // numberOfRooms
    expect(parsed.numberOfRooms).toBe(FULL_LISTING.bedrooms);

    // floorSize
    expect(parsed.floorSize).toBeDefined();
    expect(parsed.floorSize.value).toBe(95);
    expect(parsed.floorSize.unitCode).toBe('MTK');

    // photo (array of ImageObject)
    expect(parsed.photo).toHaveLength(2);
    expect(parsed.photo[0]['@type']).toBe('ImageObject');
    expect(parsed.photo[0].url).toBe(FULL_LISTING.images[0]);
  });

  it('T6.2-03 — minimal listing: null optional fields NOT present in JSON-LD output', async () => {
    const { buildListingJsonLd } = await import('./structured-data');
    const parsed = JSON.parse(buildListingJsonLd(MINIMAL_LISTING as never));

    // Required fields always present
    expect(parsed.name).toBe(MINIMAL_LISTING.title);
    expect(parsed['@type']).toBe('RealEstateListing');

    // Optional fields — must be ABSENT (not null, not undefined — not present at all)
    expect(parsed).not.toHaveProperty('description');
    expect(parsed).not.toHaveProperty('priceSpecification');
    expect(parsed).not.toHaveProperty('numberOfRooms');
    expect(parsed).not.toHaveProperty('floorSize');
    expect(parsed).not.toHaveProperty('photo');
    // address block should be omitted when all address fields are null
    expect(parsed).not.toHaveProperty('address');
  });

  it('T6.2-02b — url field contains canonical listing URL', async () => {
    const { buildListingJsonLd } = await import('./structured-data');
    const parsed = JSON.parse(buildListingJsonLd(FULL_LISTING as never));

    expect(parsed.url).toContain(FULL_LISTING.id);
    expect(parsed.url).toMatch(/^https?:\/\//);
  });

  it('T6.2-02c — price is parsed to number (not string)', async () => {
    const { buildListingJsonLd } = await import('./structured-data');
    const parsed = JSON.parse(buildListingJsonLd(FULL_LISTING as never));

    expect(typeof parsed.priceSpecification.price).toBe('number');
    expect(parsed.priceSpecification.price).toBe(485000);
  });

  it('T6.2-03b — listing with city only (no address) includes addressLocality but not streetAddress', async () => {
    const { buildListingJsonLd } = await import('./structured-data');
    const CITY_ONLY = {
      ...MINIMAL_LISTING,
      city: 'Barcelona',
    };
    const parsed = JSON.parse(buildListingJsonLd(CITY_ONLY as never));

    expect(parsed.address).toBeDefined();
    expect(parsed.address.addressLocality).toBe('Barcelona');
    expect(parsed.address).not.toHaveProperty('streetAddress');
  });
});
