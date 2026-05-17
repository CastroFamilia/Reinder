/**
 * apps/web/src/app/api/v1/admin/agencies/route.ts
 *
 * Story 7.2: Panel de Activación de Agencias
 * AC1: GET — list all agencies with status and listing count
 * AC5: Protected by platform_admin role check
 */
import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/db';
import { agencies, listings } from '@reinder/shared/db/schema';
import { eq, sql, count } from 'drizzle-orm';
import {
  requirePlatformAdmin,
  isPlatformAdminError,
} from '@/lib/auth/require-platform-admin';

/**
 * GET /api/v1/admin/agencies
 *
 * Returns all agencies with their active listing count.
 * AC1: name, isActive, listingCount
 * AC5: 403 for non-platform_admin
 */
export async function GET() {
  // AC5: Auth guard
  const auth = await requirePlatformAdmin();
  if (isPlatformAdminError(auth)) return auth.error;

  // Query agencies with listing count (only active listings counted)
  const result = await db
    .select({
      id: agencies.id,
      name: agencies.name,
      isActive: agencies.isActive,
      createdAt: agencies.createdAt,
      updatedAt: agencies.updatedAt,
      listingCount: count(listings.id),
    })
    .from(agencies)
    .leftJoin(
      listings,
      sql`${listings.agencyId} = ${agencies.id} AND ${listings.status} = 'active'`,
    )
    .groupBy(agencies.id)
    .orderBy(agencies.name);

  return NextResponse.json({ data: result });
}
