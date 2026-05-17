/**
 * apps/web/src/app/api/v1/admin/agencies/[id]/route.ts
 *
 * Story 7.2: Panel de Activación de Agencias
 * AC2: PATCH — toggle agency isActive status
 * AC3: Deactivating → all listings set to 'withdrawn'
 * AC4: Activating → all listings set to 'active'
 * AC5: Protected by platform_admin role check
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase/db';
import { agencies, listings } from '@reinder/shared/db/schema';
import { eq, and } from 'drizzle-orm';
import {
  requirePlatformAdmin,
  isPlatformAdminError,
} from '@/lib/auth/require-platform-admin';

interface PatchBody {
  isActive: boolean;
}

/**
 * PATCH /api/v1/admin/agencies/[id]
 *
 * Toggle agency activation. When deactivated, all listings become 'withdrawn'.
 * When activated, withdrawn listings become 'active'.
 *
 * Risk R3 mitigation: agency toggle + listing cascade in single transaction.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  // AC5: Auth guard
  const auth = await requirePlatformAdmin();
  if (isPlatformAdminError(auth)) return auth.error;

  // Parse and validate body
  let body: PatchBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  if (typeof body.isActive !== 'boolean') {
    return NextResponse.json(
      { error: 'isActive must be a boolean' },
      { status: 400 },
    );
  }

  const agencyId = params.id;

  // Verify agency exists
  const [existing] = await db
    .select({ id: agencies.id, isActive: agencies.isActive })
    .from(agencies)
    .where(eq(agencies.id, agencyId))
    .limit(1);

  if (!existing) {
    return NextResponse.json(
      { error: 'Agency not found' },
      { status: 404 },
    );
  }

  // AC2, AC3, AC4: Transaction — update agency + cascade listings
  const result = await db.transaction(async (tx) => {
    // Update agency status
    const [updated] = await tx
      .update(agencies)
      .set({
        isActive: body.isActive,
        updatedAt: new Date(),
      })
      .where(eq(agencies.id, agencyId))
      .returning();

    if (body.isActive) {
      // AC4: Activating — restore withdrawn listings to active
      await tx
        .update(listings)
        .set({ status: 'active', updatedAt: new Date() })
        .where(
          and(
            eq(listings.agencyId, agencyId),
            eq(listings.status, 'withdrawn'),
          ),
        );
    } else {
      // AC3: Deactivating — withdraw all active listings
      await tx
        .update(listings)
        .set({ status: 'withdrawn', updatedAt: new Date() })
        .where(
          and(
            eq(listings.agencyId, agencyId),
            eq(listings.status, 'active'),
          ),
        );
    }

    return updated;
  });

  return NextResponse.json({ data: result });
}
