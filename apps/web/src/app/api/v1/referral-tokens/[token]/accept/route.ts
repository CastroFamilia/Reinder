/**
 * apps/web/src/app/api/v1/referral-tokens/[token]/accept/route.ts
 *
 * POST /api/v1/referral-tokens/:token/accept
 *
 * Story 3.2: Aceptación del Vínculo por el Comprador vía Referral Link
 *
 * Creates an agent-buyer bond atomically:
 *   1. Validates the referral token (not used, not expired)
 *   2. Marks token as used (with buyerId)
 *   3. Creates bond in agent_buyer_bonds
 *   4. Sends push notification to agent
 *
 * Auth: buyer role required (agents cannot accept their own tokens)
 * Atomicity: Drizzle transaction ensures used + bond creation are atomic
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/supabase/db';
import { referralTokens, agentBuyerBonds, userProfiles } from '@reinder/shared/db/schema';
import { eq, and } from 'drizzle-orm';
import { notifyAgent } from '@/features/agent-link/lib/notify-agent';

// ─── Route params ─────────────────────────────────────────────────────────────

type RouteParams = { params: Promise<{ token: string }> };

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(_req: NextRequest, { params }: RouteParams) {
  const { token: tokenValue } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch buyer profile — must be role 'buyer'
  const [buyerProfile] = await db
    .select({ role: userProfiles.role, fullName: userProfiles.fullName })
    .from(userProfiles)
    .where(eq(userProfiles.id, user.id))
    .limit(1);

  if (!buyerProfile || buyerProfile.role !== 'buyer') {
    return NextResponse.json(
      { data: null, error: 'Solo los compradores pueden aceptar un vínculo' },
      { status: 403 }
    );
  }

  // ─── Atomic transaction ────────────────────────────────────────────────────

  try {
    const result = await db.transaction(async (tx) => {
      // 1. Validate token (re-check inside transaction for atomicity)
      const [token] = await tx
        .select()
        .from(referralTokens)
        .where(
          and(
            eq(referralTokens.token, tokenValue),
          )
        )
        .limit(1);

      if (!token) {
        throw Object.assign(new Error('TOKEN_NOT_FOUND'), { status: 400 });
      }

      if (token.used) {
        throw Object.assign(new Error('TOKEN_USED'), { status: 400 });
      }

      if (token.expiresAt < new Date()) {
        throw Object.assign(new Error('TOKEN_EXPIRED'), { status: 400 });
      }

      // 2. Mark token as used
      await tx
        .update(referralTokens)
        .set({ used: true, buyerId: user.id })
        .where(eq(referralTokens.id, token.id));

      // 3. Create bond
      const [bond] = await tx
        .insert(agentBuyerBonds)
        .values({
          agentId: token.agentId,
          buyerId: user.id,
          referralTokenId: token.id,
          status: 'active',
          expiresAt: token.expiresAt, // Bond TTL = token TTL
        })
        .returning();

      return { bond, agentId: token.agentId };
    });

    // 4. Fetch agent name for response + notification (outside transaction)
    const [agentProfile] = await db
      .select({ fullName: userProfiles.fullName })
      .from(userProfiles)
      .where(eq(userProfiles.id, result.agentId))
      .limit(1);

    const agentName = agentProfile?.fullName ?? 'Tu agente';
    const buyerName = buyerProfile.fullName ?? 'Tu cliente';

    // 5. Push notification to agent (fire-and-forget, never fails request)
    void notifyAgent(
      result.agentId,
      `${buyerName} ha aceptado el vínculo`,
      'Nuevo vínculo Reinder 🤝'
    );

    return NextResponse.json(
      {
        data: {
          bondId: result.bond!.id,
          agentId: result.agentId,
          agentName,
          redirectTo: '/swipe',
          toastMessage: `${agentName} es ahora tu agente representante`,
        },
        error: null,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const error = err as Error & { status?: number };

    const errorMessages: Record<string, string> = {
      TOKEN_NOT_FOUND: 'Este link ya no es válido. Pídele a tu agente que genere uno nuevo.',
      TOKEN_USED: 'Este link ya no es válido. Pídele a tu agente que genere uno nuevo.',
      TOKEN_EXPIRED: 'Este link ya no es válido. Pídele a tu agente que genere uno nuevo.',
    };

    const clientMessage = errorMessages[error.message] ?? 'Error al procesar el vínculo';
    const status = error.status ?? 500;

    return NextResponse.json({ data: null, error: clientMessage }, { status });
  }
}
