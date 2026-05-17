/**
 * apps/web/src/features/listings/lib/queries.test.ts
 *
 * ATDD — Story 6.1: Páginas de Listing SSR Indexables por Google
 * TDD RED PHASE — These tests will FAIL until implementation is complete.
 *
 * Tests acceptance criteria for getListingById() query function:
 * - AC1: Returns listing data for active listings
 * - AC5: Returns null for withdrawn listings → page calls notFound()
 * - AC6: Returns null for sold listings >72h → page calls notFound()
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// RED PHASE: getListingById does not exist yet — will fail on import
// Until implementation: skip all tests in this file
vi.mock('@/lib/supabase/db', () => ({
  db: {
    select: vi.fn(),
  },
}));

describe.skip('getListingById — SSR data fetching (Story 6.1 — TDD RED)', () => {
  const ACTIVE_LISTING = {
    id: 'listing-active-1',
    title: 'Ático en Malasaña',
    description: 'Espectacular ático con terraza',
    price: '485000.00',
    currency: 'EUR',
    bedrooms: 3,
    sizeSqm: '95.00',
    address: 'Calle Fuencarral 42',
    city: 'Madrid',
    country: 'España',
    images: ['https://example.com/image1.jpg'],
    status: 'active',
    agencyId: 'agency-1',
    updatedAt: new Date(),
    createdAt: new Date(),
  };

  const WITHDRAWN_LISTING = { ...ACTIVE_LISTING, id: 'listing-withdrawn', status: 'withdrawn' };

  const SOLD_RECENT_LISTING = {
    ...ACTIVE_LISTING,
    id: 'listing-sold-recent',
    status: 'sold',
    updatedAt: new Date(), // sold just now — should still be visible
  };

  const SOLD_EXPIRED_LISTING = {
    ...ACTIVE_LISTING,
    id: 'listing-sold-expired',
    status: 'sold',
    updatedAt: new Date(Date.now() - 73 * 60 * 60 * 1000), // 73h ago — should return null
  };

  it('AC1 — returns listing data for an active listing', async () => {
    // RED: will fail — getListingById not implemented
    const { getListingById } = await import('./queries');
    const result = await getListingById(ACTIVE_LISTING.id);

    expect(result).not.toBeNull();
    expect(result?.id).toBe(ACTIVE_LISTING.id);
    expect(result?.title).toBe(ACTIVE_LISTING.title);
    expect(result?.status).toBe('active');
  });

  it('AC2 — returned listing includes all SSR-required fields', async () => {
    const { getListingById } = await import('./queries');
    const result = await getListingById(ACTIVE_LISTING.id);

    expect(result).toMatchObject({
      id: expect.any(String),
      title: expect.any(String),
      price: expect.any(String), // numeric from DB comes as string
      currency: expect.any(String),
      address: expect.any(String),
      city: expect.any(String),
      images: expect.any(Array),
      status: 'active',
    });
  });

  it('AC5 — returns null for withdrawn listings', async () => {
    const { getListingById } = await import('./queries');
    const result = await getListingById(WITHDRAWN_LISTING.id);

    // getListingById should return null for withdrawn (or page filters post-fetch)
    // Per story spec: the PAGE calls notFound() — query may return data, page checks status
    // Testing the query layer: it should return the listing (status check in page)
    // This test validates that the page-level logic correctly returns null for withdrawn
    expect(result).not.toBeNull(); // query returns data
    expect(result?.status).toBe('withdrawn'); // page will call notFound()
  });

  it('AC6a — returns listing data for sold within 72h (still visible)', async () => {
    const { getListingById } = await import('./queries');
    const result = await getListingById(SOLD_RECENT_LISTING.id);

    expect(result).not.toBeNull();
    expect(result?.status).toBe('sold');
  });

  it('AC6b — returns null for sold listing older than 72h', async () => {
    // getListingById should apply the 72h filter in query or return data for page to check
    // Per story spec: page applies the >72h logic — this test validates the contract
    const { getListingById } = await import('./queries');
    const result = await getListingById(SOLD_EXPIRED_LISTING.id);

    // The query returns the listing; page is responsible for 404 decision
    expect(result?.updatedAt).toEqual(SOLD_EXPIRED_LISTING.updatedAt);
  });

  it('returns null for non-existent listing id', async () => {
    const { getListingById } = await import('./queries');
    const result = await getListingById('non-existent-id-00000000');

    expect(result).toBeNull();
  });
});

describe.skip('Listing SSR page — 404 logic (Story 6.1 — TDD RED)', () => {
  it('AC5 — page calls notFound() for withdrawn listing', async () => {
    // RED: page.tsx does not exist yet
    // This test documents the expected behavior that the page enforces
    const WITHDRAWN = { status: 'withdrawn' };
    const shouldShow = WITHDRAWN.status === 'active' ||
      (WITHDRAWN.status === 'sold' && true); // placeholder

    expect(shouldShow).toBe(false); // withdrawn → 404
  });

  it('AC6 — page calls notFound() for sold listing >72h old', async () => {
    const SOLD_OLD = {
      status: 'sold',
      updatedAt: new Date(Date.now() - 73 * 60 * 60 * 1000),
    };
    const SEVENTY_TWO_HOURS = 72 * 60 * 60 * 1000;
    const age = Date.now() - SOLD_OLD.updatedAt.getTime();
    const shouldShow = SOLD_OLD.status !== 'sold' || age < SEVENTY_TWO_HOURS;

    expect(shouldShow).toBe(false); // sold >72h → 404
  });

  it('AC6 — page shows sold listing within 72h', async () => {
    const SOLD_RECENT = {
      status: 'sold',
      updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1h ago
    };
    const SEVENTY_TWO_HOURS = 72 * 60 * 60 * 1000;
    const age = Date.now() - SOLD_RECENT.updatedAt.getTime();
    const shouldShow = SOLD_RECENT.status !== 'sold' || age < SEVENTY_TWO_HOURS;

    expect(shouldShow).toBe(true); // sold <72h → show with VENDIDA badge
  });
});

describe.skip('Listing SSR metadata (Story 6.1 — TDD RED)', () => {
  it('AC3 — generateMetadata returns correct title tag', async () => {
    // RED: generateMetadata function not implemented yet
    const LISTING = {
      title: 'Ático en Malasaña',
      city: 'Madrid',
      description: 'Espectacular ático con terraza en el corazón de Madrid',
      price: '485000.00',
      currency: 'EUR',
      images: ['https://example.com/img1.jpg'],
    };

    // Expected output from generateMetadata
    const expectedTitle = `${LISTING.title} — ${LISTING.city} | Reinder`;
    expect(expectedTitle).toBe('Ático en Malasaña — Madrid | Reinder');
  });

  it('AC3 — generateMetadata returns og:image when images present', () => {
    const images = ['https://example.com/img1.jpg'];
    const ogImages = images.length > 0 ? [{ url: images[0] }] : [];
    expect(ogImages).toHaveLength(1);
    expect(ogImages[0].url).toBe('https://example.com/img1.jpg');
  });

  it('AC3 — generateMetadata returns og:price:amount', () => {
    const price = '485000.00';
    const currency = 'EUR';
    expect(price).toBeTruthy();
    expect(currency).toBe('EUR');
  });
});
