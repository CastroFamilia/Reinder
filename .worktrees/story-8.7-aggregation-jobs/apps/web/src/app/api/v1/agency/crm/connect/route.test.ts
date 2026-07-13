/**
 * Story 5.1 — API Route Tests: POST /api/v1/agency/crm/connect
 *
 * TDD RED PHASE: These tests are intentionally failing (test.skip).
 * They define the expected behavior BEFORE implementation.
 *
 * Run: pnpm --filter @reinder/web test apps/web/src/app/api/v1/agency/crm/connect/route.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { mockInsert, mockOnConflictDoUpdate, mockReturning } = vi.hoisted(() => {
  const mockReturning = vi.fn().mockResolvedValue([]);
  const mockOnConflictDoUpdate = vi.fn().mockReturnValue({
    returning: mockReturning,
  });
  const mockInsert = vi.fn().mockReturnValue({
    values: vi.fn().mockReturnValue({
      onConflictDoUpdate: mockOnConflictDoUpdate,
    }),
  });
  return { mockInsert, mockOnConflictDoUpdate, mockReturning };
});

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/db', () => ({
  db: {
    insert: mockInsert,
  },
}));

import { createClient } from '@/lib/supabase/server';
import { POST } from '@/app/api/v1/agency/crm/connect/route';

// Fixtures
const AGENCY_ADMIN_USER = { id: 'admin-uuid-1', email: 'admin@agency.com' };
const AGENT_USER = { id: 'agent-uuid-1', email: 'agent@agency.com' };
const AGENCY_ID = 'agency-uuid-1';

const mockAgencyAdminProfile = { role: 'agency_admin', agency_id: AGENCY_ID };
const mockAgentProfile = { role: 'agent', agency_id: AGENCY_ID };

const makeSupabaseMock = (
  user: { id: string; email: string } | null,
  profile: { role: string; agency_id?: string } | null,
) => ({
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user },
      error: user ? null : { message: 'Not authenticated' },
    }),
  },
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: profile }),
      }),
    }),
  }),
});

const makeRequest = (body: any) =>
  new Request('http://localhost:3000/api/v1/agency/crm/connect', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  }) as unknown as NextRequest;

describe('POST /api/v1/agency/crm/connect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── T5.1-01: Configurar Inmovilla con credenciales correctas activa pending_sync ───
  it('T5.1-01: accepts valid credentials and sets pending_sync status', async () => {
    const supabase = makeSupabaseMock(AGENCY_ADMIN_USER, mockAgencyAdminProfile);
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    mockReturning.mockResolvedValueOnce([{ id: 'conn-1', status: 'pending_sync' }]);

    const req = makeRequest({ crmType: 'inmovilla', apiKey: 'valid-api-key', webhookUrl: 'https://test.com/hook' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.status).toBe('pending_sync');
    expect(body.error).toBeNull();
    expect(mockInsert).toHaveBeenCalled(); // Should insert into agencyCrmConnections
  });

  // ─── T5.1-02: Credenciales incorrectas son rechazadas ───
  it('T5.1-02: rejects invalid payload (missing apiKey)', async () => {
    const supabase = makeSupabaseMock(AGENCY_ADMIN_USER, mockAgencyAdminProfile);
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const req = makeRequest({ crmType: 'inmovilla', webhookUrl: 'https://test.com/hook' }); // missing apiKey
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.data).toBeNull();
    expect(body.error.code).toBe('BAD_REQUEST');
  });

  // ─── Auth: 401 when not authenticated ───
  it('returns 401 when user is not authenticated', async () => {
    const supabase = makeSupabaseMock(null, null);
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const req = makeRequest({ crmType: 'inmovilla', apiKey: 'valid' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.data).toBeNull();
  });

  // ─── Auth: 403 when non-admin calls route ───
  it('returns 403 when agent tries to configure CRM', async () => {
    const supabase = makeSupabaseMock(AGENT_USER, mockAgentProfile);
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const req = makeRequest({ crmType: 'inmovilla', apiKey: 'valid' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.data).toBeNull();
    expect(body.error.code).toBe('FORBIDDEN');
  });
});
