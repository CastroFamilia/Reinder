/**
 * apps/web/src/app/api/v1/buyer/preferences/route.test.ts
 *
 * Unit tests for PATCH /api/v1/buyer/preferences.
 * Tests: valid body, missing zones, invalid JSON body.
 */
import { describe, it, expect } from 'vitest';
import { PATCH } from './route';

function makeRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/v1/buyer/preferences', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('PATCH /api/v1/buyer/preferences', () => {
  it('returns saved preferences on valid body', async () => {
    const response = await PATCH(
      makeRequest({ zones: ['Madrid', 'Barcelona'], maxPrice: 400000 }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.zones).toEqual(['Madrid', 'Barcelona']);
    expect(body.data.maxPrice).toBe(400000);
  });

  it('returns zones only when optional fields are absent', async () => {
    const response = await PATCH(makeRequest({ zones: ['Valencia'] }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.zones).toEqual(['Valencia']);
    expect(body.data.maxPrice).toBeUndefined();
    expect(body.data.minRooms).toBeUndefined();
    expect(body.data.minSqm).toBeUndefined();
  });

  it('includes all optional fields when provided', async () => {
    const response = await PATCH(
      makeRequest({
        zones: ['Madrid'],
        maxPrice: 500000,
        minRooms: 3,
        minSqm: 80,
      }),
    );
    const body = await response.json();

    expect(body.data.zones).toEqual(['Madrid']);
    expect(body.data.maxPrice).toBe(500000);
    expect(body.data.minRooms).toBe(3);
    expect(body.data.minSqm).toBe(80);
  });

  it('returns 400 VALIDATION_ERROR when zones is missing', async () => {
    const response = await PATCH(makeRequest({ maxPrice: 300000 }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.data).toBeNull();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toContain('zones');
  });

  it('returns 400 VALIDATION_ERROR when zones is not an array', async () => {
    const response = await PATCH(makeRequest({ zones: 'Madrid' }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 INVALID_BODY when body is not valid JSON', async () => {
    const request = new Request('http://localhost:3000/api/v1/buyer/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    });

    const response = await PATCH(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.data).toBeNull();
    expect(body.error.code).toBe('INVALID_BODY');
  });

  it('handles empty zones array', async () => {
    const response = await PATCH(makeRequest({ zones: [] }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.zones).toEqual([]);
  });
});
