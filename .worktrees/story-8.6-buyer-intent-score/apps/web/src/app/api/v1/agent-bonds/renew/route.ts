/**
 * apps/web/src/app/api/v1/agent-bonds/renew/route.ts
 *
 * POST /api/v1/agent-bonds/renew
 * Story 3.3 — Buyer renews their bond TTL by REFERRAL_TOKEN_TTL_DAYS.
 * Also updates the associated referral token expiry.
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/supabase/db';
import { agentBuyerBonds, userProfiles, referralTokens } from '@reinder/shared/db/schema';
import { eq, and } from 'drizzle-orm';
import { REFERRAL_TOKEN_TTL_DAYS } from '@reinder/shared/constants';
import { notifyAgent } from '@/features/agent-link/lib/notify-agent';

export async function POST(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 });
  }

  const [buyerProfile] = await db
    .select({ role: userProfiles.role, fullName: userProfiles.fullName })
    .from(userProfiles)
    .where(eq(userProfiles.id, user.id))
    .limit(1);

  if (!buyerProfile || buyerProfile.role !== 'buyer') {
    return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 });
  }

  const [bond] = await db
    .select()
    .from(agentBuyerBonds)
    .where(
      and(
        eq(agentBuyerBonds.buyerId, user.id),
        eq(agentBuyerBonds.status, 'active')
      )
    )
    .limit(1);

  if (!bond) {
    return NextResponse.json({ data: null, error: 'No hay vínculo activo' }, { status: 404 });
  }

  const newExpiry = new Date(Date.now() + REFERRAL_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  // Update bond expiry
  await db
    .update(agentBuyerBonds)
    .set({ expiresAt: newExpiry })
    .where(eq(agentBuyerBonds.id, bond.id));

  // Also update the referral token expiry (so single-use constraint tracks TTL)
  await db
    .update(referralTokens)
    .set({ expiresAt: newExpiry })
    .where(eq(referralTokens.id, bond.referralTokenId));

  const buyerName = buyerProfile.fullName ?? 'Tu cliente';

  // Notify agent of renewal (fire-and-forget)
  void notifyAgent(
    bond.agentId,
    `${buyerName} ha renovado su vínculo contigo`,
    'Vínculo renovado en Reinder 🤝'
  );

  return NextResponse.json({
    data: { bondId: bond.id, newExpiresAt: newExpiry.toISOString(), renewed: true },
    error: null,
  });
}
