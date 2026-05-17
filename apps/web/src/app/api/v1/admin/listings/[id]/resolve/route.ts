/**
 * apps/web/src/app/api/v1/admin/listings/[id]/resolve/route.ts
 *
 * Story 7.3: Resolución de Listings Duplicados
 *
 * POST /api/v1/admin/listings/[id]/resolve
 *
 * Actions:
 * - "approve"       → listing status → 'active', audit record created (AC3)
 * - "reject"        → listing status → 'withdrawn', audit record created (AC4)
 * - "approve-both"  → both conflicting listings → 'active', audit for each (AC5)
 *
 * AC6: Resolution record includes admin_id, timestamp, action, listing_ids
 * AC7: Protected by platform_admin
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase/db';
import { listings } from '@reinder/shared/db/schema';
import { eq } from 'drizzle-orm';
import {
  requirePlatformAdmin,
  isPlatformAdminError,
} from '@/lib/auth/require-platform-admin';

const VALID_ACTIONS = ['approve', 'reject', 'approve-both'] as const;
type ResolveAction = (typeof VALID_ACTIONS)[number];

interface ResolveBody {
  action: ResolveAction;
  conflictingListingId?: string; // required for approve-both
}

/**
 * Resolution audit record.
 * In production, this would be stored in a dedicated `listing_resolutions` table.
 * For MVP, we log it and include it in the response.
 */
interface ResolutionRecord {
  listingId: string;
  adminId: string;
  action: ResolveAction;
  timestamp: string;
  affectedListingIds: string[];
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  // AC7: Auth guard
  const auth = await requirePlatformAdmin();
  if (isPlatformAdminError(auth)) return auth.error;

  // Parse body
  let body: ResolveBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!VALID_ACTIONS.includes(body.action as ResolveAction)) {
    return NextResponse.json(
      { error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}` },
      { status: 400 },
    );
  }

  const listingId = params.id;
  const action = body.action as ResolveAction;

  // Verify listing exists and is in pending_review
  const [listing] = await db
    .select({ id: listings.id, status: listings.status, agencyId: listings.agencyId })
    .from(listings)
    .where(eq(listings.id, listingId))
    .limit(1);

  if (!listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  }

  if (listing.status !== 'pending_review') {
    return NextResponse.json(
      { error: 'Listing is not in pending_review status' },
      { status: 409 },
    );
  }

  const affectedListingIds = [listingId];
  const now = new Date();

  await db.transaction(async (tx) => {
    switch (action) {
      case 'approve':
        // AC3: Approve this listing → active
        await tx
          .update(listings)
          .set({ status: 'active', updatedAt: now })
          .where(eq(listings.id, listingId));
        break;

      case 'reject':
        // AC4: Reject this listing → withdrawn
        await tx
          .update(listings)
          .set({ status: 'withdrawn', updatedAt: now })
          .where(eq(listings.id, listingId));
        break;

      case 'approve-both':
        // AC5: Approve both → both active
        if (!body.conflictingListingId) {
          throw new Error('conflictingListingId required for approve-both');
        }
        await tx
          .update(listings)
          .set({ status: 'active', updatedAt: now })
          .where(eq(listings.id, listingId));
        await tx
          .update(listings)
          .set({ status: 'active', updatedAt: now })
          .where(eq(listings.id, body.conflictingListingId));
        affectedListingIds.push(body.conflictingListingId);
        break;
    }
  });

  // AC6: Resolution audit record
  const resolution: ResolutionRecord = {
    listingId,
    adminId: auth.adminId,
    action,
    timestamp: now.toISOString(),
    affectedListingIds,
  };

  // Log for audit trail (production: write to listing_resolutions table)
  console.info('[AUDIT] Listing resolution:', JSON.stringify(resolution));

  return NextResponse.json({ data: { resolution } });
}
