/**
 * apps/web/src/app/api/v1/matches/[id]/route.test.ts
 *
 * Unit tests for PATCH /api/v1/matches/{id}/confirm and DELETE /api/v1/matches/{id}.
 * Both are currently stubs — tests document the expected API contract.
 */
import { describe, it, expect } from 'vitest';
import { PATCH, DELETE } from './route';

function makeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

function makeRequest(): Request {
  return new Request('http://localhost:3000/api/v1/matches/test-id', {
    method: 'PATCH',
  });
}

describe('PATCH /api/v1/matches/{id}/confirm', () => {
  it('returns confirmed:true with the matchId', async () => {
    const response = await PATCH(makeRequest(), makeParams('match-abc'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.confirmed).toBe(true);
    expect(body.data.matchId).toBe('match-abc');
  });

  it('returns ApiResponse wrapper format', async () => {
    const response = await PATCH(makeRequest(), makeParams('match-1'));
    const body = await response.json();

    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('error');
  });

  it('echoes back the provided matchId', async () => {
    const response = await PATCH(makeRequest(), makeParams('custom-id-xyz'));
    const body = await response.json();

    expect(body.data.matchId).toBe('custom-id-xyz');
  });
});

describe('DELETE /api/v1/matches/{id}', () => {
  it('returns deleted:true with the matchId', async () => {
    const request = new Request('http://localhost:3000/api/v1/matches/match-del', {
      method: 'DELETE',
    });
    const response = await DELETE(request, makeParams('match-del'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.deleted).toBe(true);
    expect(body.data.matchId).toBe('match-del');
  });

  it('returns ApiResponse wrapper format', async () => {
    const request = new Request('http://localhost:3000/api/v1/matches/m-1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, makeParams('m-1'));
    const body = await response.json();

    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('error');
  });

  it('echoes back the provided matchId', async () => {
    const request = new Request('http://localhost:3000/api/v1/matches/del-id', {
      method: 'DELETE',
    });
    const response = await DELETE(request, makeParams('del-id'));
    const body = await response.json();

    expect(body.data.matchId).toBe('del-id');
  });
});
