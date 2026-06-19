/**
 * PATCH /api/v1/agency/listings/[id]/status
 *
 * Story 5.4: Ciclo de Vida del Listing — Retirada y Vendida
 *
 * Protected endpoint for agency admins to change listing status.
 * Supports: withdraw (→ withdrawn) | sold (→ sold)
 *
 * Security: only agency_admin of the listing's owning agency can change status.
 * Realtime: Supabase emits listing.updated automatically on row change.
 */

import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/supabase/db';
import { listings } from '@reinder/shared/db/schema';
import { and, eq } from 'drizzle-orm';
import { NextResponse, type NextRequest } from 'next/server';

type ListingAction = 'withdraw' | 'sold';

interface StatusChangeBody {
  action: ListingAction;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    );
  }

  // Verify agency_admin role and get agency_id from user_profiles
  // BUG FIX: The worktree assumed agency_id existed in user_profiles but it didn't.
  // Migration 20260619000003 adds this column.
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, agency_id')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'agency_admin' || !profile.agency_id) {
    return NextResponse.json(
      { data: null, error: { code: 'FORBIDDEN', message: 'Agency Admin role required' } },
      { status: 403 }
    );
  }

  // Parse and validate body
  let body: StatusChangeBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { data: null, error: { code: 'BAD_REQUEST', message: 'Invalid JSON body' } },
      { status: 400 }
    );
  }

  const { action } = body;
  if (!action || !['withdraw', 'sold'].includes(action)) {
    return NextResponse.json(
      { data: null, error: { code: 'BAD_REQUEST', message: 'action must be "withdraw" or "sold"' } },
      { status: 400 }
    );
  }

  const { id: listingId } = await params;

  try {
    // Build update payload based on action
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (action === 'withdraw') {
      updateData.status = 'withdrawn';
    } else if (action === 'sold') {
      updateData.status = 'sold';
      updateData.soldAt = new Date(); // Used by auto-removal job after 72h (FR27)
    }

    // Update only if the listing belongs to this agency (ownership guard)
    const updated = await db
      .update(listings)
      .set(updateData)
      .where(
        and(
          eq(listings.id, listingId),
          eq(listings.agencyId, profile.agency_id)
        )
      )
      .returning();

    if (!updated || updated.length === 0) {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: 'Listing not found or access denied' } },
        { status: 404 }
      );
    }

    // Realtime event (listing.updated / listing.removed) is emitted automatically
    // by Supabase when the row is updated (Realtime is enabled on listings table)

    return NextResponse.json({ data: updated[0], error: null }, { status: 200 });

  } catch (error: unknown) {
    console.error('[listing-status] Error updating listing status:', error);
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: (error as Error).message } },
      { status: 500 }
    );
  }
}
