/**
 * apps/web/src/app/api/v1/agent-bonds/route.ts
 *
 * Story 3.3: Reconfirmación Periódica y Desvinculación Voluntaria
 *
 * GET  /api/v1/agent-bonds — buyer gets their active bond (if any)
 * POST /api/v1/agent-bonds/renew — buyer renews the bond TTL
 * DELETE /api/v1/agent-bonds — buyer unlinks from their agent
 *
 * All routes require buyer role.
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/supabase/db';
import { agentBuyerBonds, userProfiles, referralTokens } from '@reinder/shared/db/schema';
import { eq, and } from 'drizzle-orm';
import { REFERRAL_TOKEN_TTL_DAYS } from '@reinder/shared/constants';
import { notifyAgent } from '@/features/agent-link/lib/notify-agent';

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function requireBuyer() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };

  const [profile] = await db
    .select({ role: userProfiles.role, fullName: userProfiles.fullName })
    .from(userProfiles)
    .where(eq(userProfiles.id, user.id))
    .limit(1);

  if (!profile || profile.role !== 'buyer') return { user: null, profile: null };
  return { user, profile };
}

// ─── GET /api/v1/agent-bonds ──────────────────────────────────────────────────

export async function GET(_req: NextRequest) {
  const { user } = await requireBuyer();
  if (!user) {
    return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 });
  }

  const [bond] = await db
    .select({
      id: agentBuyerBonds.id,
      agentId: agentBuyerBonds.agentId,
      status: agentBuyerBonds.status,
      expiresAt: agentBuyerBonds.expiresAt,
      createdAt: agentBuyerBonds.createdAt,
    })
    .from(agentBuyerBonds)
    .where(
      and(
        eq(agentBuyerBonds.buyerId, user.id),
        eq(agentBuyerBonds.status, 'active')
      )
    )
    .limit(1);

  if (!bond) {
    return NextResponse.json({ data: null, error: null }, { status: 200 });
  }

  // Fetch agent name for display
  const [agentProfile] = await db
    .select({ fullName: userProfiles.fullName, avatarUrl: userProfiles.avatarUrl })
    .from(userProfiles)
    .where(eq(userProfiles.id, bond.agentId))
    .limit(1);

  const isExpiring = bond.expiresAt < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // < 7 days

  return NextResponse.json({
    data: {
      ...bond,
      expiresAt: bond.expiresAt.toISOString(),
      createdAt: bond.createdAt.toISOString(),
      agentName: agentProfile?.fullName ?? 'Tu agente',
      agentAvatarUrl: agentProfile?.avatarUrl ?? null,
      isExpiring,
    },
    error: null,
  });
}

// ─── DELETE /api/v1/agent-bonds ───────────────────────────────────────────────

export async function DELETE(_req: NextRequest) {
  const { user, profile } = await requireBuyer();
  if (!user || !profile) {
    return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 });
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

  // Mark bond as revoked
  await db
    .update(agentBuyerBonds)
    .set({ status: 'revoked' })
    .where(eq(agentBuyerBonds.id, bond.id));

  const buyerName = profile.fullName ?? 'Tu cliente';

  // Notify agent (fire-and-forget)
  void notifyAgent(
    bond.agentId,
    `${buyerName} ha cancelado el vínculo`,
    'Vínculo cancelado en Reinder'
  );

  return NextResponse.json({ data: { unlinked: true }, error: null });
}
