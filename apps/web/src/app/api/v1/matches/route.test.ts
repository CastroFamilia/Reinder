/**
 * apps/web/src/app/api/v1/matches/route.test.ts
 *
 * Tests for GET /api/v1/matches
 * Story 2.7 — Task 1
 */
import { GET } from './route';

describe('GET /api/v1/matches', () => {
  it('retorna 200 con array de matches', async () => {
    const response = await GET(new Request('http://localhost/api/v1/matches'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });

  it('cada ítem tiene la forma MatchHistoryItem', async () => {
    const response = await GET(new Request('http://localhost/api/v1/matches'));
    const body = await response.json();
    const item = body.data[0];

    expect(item).toHaveProperty('matchId');
    expect(item).toHaveProperty('listingId');
    expect(item).toHaveProperty('imageUrl');
    expect(item).toHaveProperty('price');
    expect(item).toHaveProperty('address');
    expect(['active', 'sold', 'withdrawn']).toContain(item.listingStatus);
    expect(item).toHaveProperty('matchedAt');
    expect(typeof item.confirmed).toBe('boolean');
  });

  // M3: TODO (Epic 3) — cuando se implemente autenticación real con Supabase,
  // este test debe verificar que GET sin Authorization header retorna 401.
  it.todo('GET sin autenticación retorna 401 (implementar auth en Epic 3)');

  it('los matches están ordenados por fecha descendente', async () => {
    const response = await GET(new Request('http://localhost/api/v1/matches'));
    const body = await response.json();
    const matches = body.data as Array<{ matchedAt: string }>;

    for (let i = 0; i < matches.length - 1; i++) {
      const current = new Date(matches[i]!.matchedAt).getTime();
      const next = new Date(matches[i + 1]!.matchedAt).getTime();
      expect(current).toBeGreaterThanOrEqual(next);
    }
  });
});
