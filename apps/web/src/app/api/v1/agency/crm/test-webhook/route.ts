/**
 * POST /api/v1/agency/crm/test-webhook
 *
 * Dev/testing endpoint to simulate a CRM webhook without needing Inmovilla.
 * Only available in non-production environments (NODE_ENV !== 'production').
 *
 * Story 5.2 — Task 5 (dev-only)
 */

import { NextRequest, NextResponse } from 'next/server';

const WEBHOOK_FUNCTION_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL + '/functions/v1/crm-webhook';

export async function POST(req: NextRequest) {
  // Guard: only in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
  }

  const apiKey = req.headers.get('X-Inmovilla-Api-Key');
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Missing X-Inmovilla-Api-Key header' },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Forward to the actual Edge Function
  const response = await fetch(WEBHOOK_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Inmovilla-Api-Key': apiKey,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const result = await response.json();

  return NextResponse.json(
    { forwarded: true, edge_function_response: result },
    { status: response.status }
  );
}
