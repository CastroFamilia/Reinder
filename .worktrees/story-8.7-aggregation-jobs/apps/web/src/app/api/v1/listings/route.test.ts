/**
 * apps/web/src/app/api/v1/listings/route.test.ts
 *
 * Unit tests for GET /api/v1/listings.
 * Tests: all listings, zone filter, price filter, rooms filter, sqm filter, combined.
 */
import { describe, it, expect } from 'vitest';
import { GET } from './route';

function makeRequest(params: Record<string, string | string[]> = {}): Request {
  const url = new URL('http://localhost:3000/api/v1/listings');
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((v) => url.searchParams.append(key, v));
    } else {
      url.searchParams.set(key, value);
    }
  });
  return new Request(url.toString());
}

describe('GET /api/v1/listings', () => {
  it('returns all mock listings when no filters are applied', async () => {
    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toBeInstanceOf(Array);
    expect(body.data.length).toBeGreaterThan(0);
  });

  it('returns ApiResponse wrapper format', async () => {
    const response = await GET(makeRequest());
    const body = await response.json();

    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('error');
  });

  it('filters by single zone', async () => {
    const response = await GET(makeRequest({ zone: 'Malasaña' }));
    const body = await response.json();

    expect(body.data.length).toBeGreaterThan(0);
    body.data.forEach((listing: { location: string }) => {
      expect(listing.location.toLowerCase()).toContain('malasaña');
    });
  });

  it('filters by multiple zones', async () => {
    const response = await GET(makeRequest({ zone: ['Malasaña', 'Chamberí'] }));
    const body = await response.json();

    expect(body.data.length).toBeGreaterThanOrEqual(2);
    body.data.forEach((listing: { location: string }) => {
      const loc = listing.location.toLowerCase();
      expect(loc.includes('malasaña') || loc.includes('chamberí')).toBe(true);
    });
  });

  it('filters by max_price', async () => {
    const response = await GET(makeRequest({ max_price: '300000' }));
    const body = await response.json();

    expect(body.data.length).toBeGreaterThan(0);
    body.data.forEach((listing: { price: number }) => {
      expect(listing.price).toBeLessThanOrEqual(300000);
    });
  });

  it('filters by min_rooms', async () => {
    const response = await GET(makeRequest({ min_rooms: '3' }));
    const body = await response.json();

    expect(body.data.length).toBeGreaterThan(0);
    body.data.forEach((listing: { rooms: number }) => {
      expect(listing.rooms).toBeGreaterThanOrEqual(3);
    });
  });

  it('filters by min_sqm', async () => {
    const response = await GET(makeRequest({ min_sqm: '80' }));
    const body = await response.json();

    expect(body.data.length).toBeGreaterThan(0);
    body.data.forEach((listing: { squareMeters: number }) => {
      expect(listing.squareMeters).toBeGreaterThanOrEqual(80);
    });
  });

  it('applies combined filters correctly', async () => {
    const response = await GET(
      makeRequest({
        zone: 'Madrid',
        max_price: '400000',
        min_rooms: '2',
        min_sqm: '60',
      }),
    );
    const body = await response.json();

    body.data.forEach((listing: { location: string; price: number; rooms: number; squareMeters: number }) => {
      expect(listing.location.toLowerCase()).toContain('madrid');
      expect(listing.price).toBeLessThanOrEqual(400000);
      expect(listing.rooms).toBeGreaterThanOrEqual(2);
      expect(listing.squareMeters).toBeGreaterThanOrEqual(60);
    });
  });

  it('returns empty array when no listings match filters', async () => {
    const response = await GET(makeRequest({ max_price: '1' }));
    const body = await response.json();

    expect(body.data).toEqual([]);
    expect(body.error).toBeNull();
  });

  it('zone filter is case insensitive', async () => {
    const response = await GET(makeRequest({ zone: 'malasaña' }));
    const body = await response.json();

    expect(body.data.length).toBeGreaterThan(0);
  });

  it('all listings have required fields', async () => {
    const response = await GET(makeRequest());
    const body = await response.json();

    body.data.forEach((listing: Record<string, unknown>) => {
      expect(listing).toHaveProperty('id');
      expect(listing).toHaveProperty('title');
      expect(listing).toHaveProperty('price');
      expect(listing).toHaveProperty('location');
      expect(listing).toHaveProperty('rooms');
      expect(listing).toHaveProperty('squareMeters');
      expect(listing).toHaveProperty('imageUrl');
      expect(listing).toHaveProperty('status');
      expect(listing).toHaveProperty('agencyId');
      expect(listing).toHaveProperty('createdAt');
    });
  });
});
