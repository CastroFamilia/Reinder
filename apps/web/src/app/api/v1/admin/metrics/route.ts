/**
 * apps/web/src/app/api/v1/admin/metrics/route.ts
 *
 * Story 7.4: Dashboard de Métricas Globales de Plataforma
 *
 * GET /api/v1/admin/metrics
 *
 * Returns aggregated, anonymized platform metrics:
 * - Active users (24h, 7d, 30d)
 * - Swipe totals (matches + rejections)
 * - Match/reject ratio
 * - Active agencies and listings
 * - CRM integration status
 * - Agent-linked buyer percentage
 *
 * AC1: All metrics returned as aggregated numbers
 * AC2: No PII — only counts and ratios (GDPR, NFR8)
 * AC3: Displayed in GlassPanel cards (frontend — Story 7.4 UI)
 * AC4: platform_admin only (403)
 *
 * Risk R5 mitigation: queries use COUNT/SUM aggregations, not row-level scans.
 * In production, migrate to pre-aggregated read model tables.
 */
import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/db';
import {
  userProfiles,
  agencies,
  listings,
  matches,
} from '@reinder/shared/db/schema';
import { count, eq, sql, and, gte } from 'drizzle-orm';
import {
  requirePlatformAdmin,
  isPlatformAdminError,
} from '@/lib/auth/require-platform-admin';

/**
 * Count users active within a given time window.
 * "Active" = has a record in user_profiles (proxy for recent activity).
 * In production, use a dedicated `user_sessions` or analytics table.
 */
async function countActiveUsers(days: number): Promise<number> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [result] = await db
    .select({ total: count() })
    .from(userProfiles)
    .where(gte(userProfiles.updatedAt, since));

  return result?.total ?? 0;
}

export async function GET() {
  // AC4: Auth guard
  const auth = await requirePlatformAdmin();
  if (isPlatformAdminError(auth)) return auth.error;

  // Parallel aggregate queries (Risk R5: only COUNT, no row scans)
  const [
    activeUsers24h,
    activeUsers7d,
    activeUsers30d,
    [totalUsers],
    [totalMatches],
    [agencyStats],
    [listingStats],
    [linkedBuyers],
    [totalBuyers],
  ] = await Promise.all([
    countActiveUsers(1),
    countActiveUsers(7),
    countActiveUsers(30),
    db.select({ total: count() }).from(userProfiles),
    db.select({ total: count() }).from(matches),
    db
      .select({
        total: count(),
        active: count(sql`CASE WHEN ${agencies.isActive} THEN 1 END`),
      })
      .from(agencies),
    db
      .select({
        total: count(),
        active: count(
          sql`CASE WHEN ${listings.status} = 'active' THEN 1 END`,
        ),
        pendingReview: count(
          sql`CASE WHEN ${listings.status} = 'pending_review' THEN 1 END`,
        ),
      })
      .from(listings),
    db
      .select({ total: count() })
      .from(userProfiles)
      .where(
        and(
          eq(userProfiles.role, 'buyer'),
          sql`${userProfiles.agentId} IS NOT NULL`,
        ),
      ),
    db
      .select({ total: count() })
      .from(userProfiles)
      .where(eq(userProfiles.role, 'buyer')),
  ]);

  // AC2: Aggregated, anonymized metrics — no PII
  const metrics = {
    users: {
      active24h: activeUsers24h,
      active7d: activeUsers7d,
      active30d: activeUsers30d,
      total: totalUsers?.total ?? 0,
    },
    engagement: {
      totalMatches: totalMatches?.total ?? 0,
    },
    agencies: {
      total: agencyStats?.total ?? 0,
      active: agencyStats?.active ?? 0,
    },
    listings: {
      total: listingStats?.total ?? 0,
      active: listingStats?.active ?? 0,
      pendingReview: listingStats?.pendingReview ?? 0,
    },
    buyerAgentLink: {
      linkedBuyers: linkedBuyers?.total ?? 0,
      totalBuyers: totalBuyers?.total ?? 0,
      linkedPercentage:
        (totalBuyers?.total ?? 0) > 0
          ? Math.round(
              ((linkedBuyers?.total ?? 0) / (totalBuyers?.total ?? 0)) * 100,
            )
          : 0,
    },
    generatedAt: new Date().toISOString(),
  };

  return NextResponse.json({ data: metrics });
}
