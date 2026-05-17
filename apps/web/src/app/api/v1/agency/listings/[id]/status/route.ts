/**
 * apps/web/src/app/api/v1/agency/listings/[id]/status/route.ts
 *
 * PATCH /api/v1/agency/listings/[id]/status
 *
 * Story 5.4: Ciclo de Vida del Listing — Retirada y Vendida
 * Story 6.1: Cache invalidation (revalidateTag) added for SSR listing pages
 *
 * Protected endpoint for agency admins to change listing status.
 * Supports: withdraw (→ withdrawn) | sold (→ sold)
 *
 * Security: only agency_admin of the listing's owning agency can change status.
 * Cache: revalidates `listings-{id}` tag to invalidate SSR page cache (AC4 of 6.1).
 */

import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/supabase/db';
import { listings } from '@reinder/shared/db/schema';
import { and, eq } from 'drizzle-orm';
import { revalidateTag } from 'next/cache';
import type { NextRequest } from 'next/server';

type ListingAction = 'withdraw' | 'sold';

interface StatusChangeBody {
  action: ListingAction;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    );
  }

  // Verify agency_admin role
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, agency_id')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'agency_admin' || !profile.agency_id) {
    return Response.json(
      { data: null, error: { code: 'FORBIDDEN', message: 'Agency Admin role required' } },
      { status: 403 }
    );
  }

  // Parse and validate body
  let body: StatusChangeBody;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { data: null, error: { code: 'BAD_REQUEST', message: 'Invalid JSON body' } },
      { status: 400 }
    );
  }

  if (!body.action || !['withdraw', 'sold'].includes(body.action)) {
    return Response.json(
      { data: null, error: { code: 'BAD_REQUEST', message: 'action must be "withdraw" or "sold"' } },
      { status: 400 }
    );
  }

  const newStatus = body.action === 'withdraw' ? 'withdrawn' : 'sold';

  // Update listing — only for listings belonging to the admin's agency
  const updated = await db
    .update(listings)
    .set({
      status: newStatus,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(listings.id, params.id),
        eq(listings.agencyId, profile.agency_id)
      )
    )
    .returning({ id: listings.id, status: listings.status });

  if (updated.length === 0) {
    return Response.json(
      { data: null, error: { code: 'NOT_FOUND', message: 'Listing not found or access denied' } },
      { status: 404 }
    );
  }

  // AC4 (Story 6.1): Invalidate ISR cache for the public listing SSR page.
  // Tag `listings-{id}` is set in getListingById() via unstable_cache.
  revalidateTag(`listings-${params.id}`);
  revalidateTag('listings'); // invalidate any listing list caches

  return Response.json(
    { data: updated[0], error: null },
    { status: 200 }
  );
}
