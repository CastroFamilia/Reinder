/**
 * apps/web/src/app/api/v1/referral-tokens/route.ts
 *
 * API Route Handler — POST /api/v1/referral-tokens | GET /api/v1/referral-tokens
 *
 * Story 3.1: Generación de Link de Referral por el Agente
 *
 * POST — Creates a new single-use referral token for the authenticated agent.
 * GET  — Lists all referral tokens for the authenticated agent, with computed status.
 *
 * Auth: Supabase JWT + role check (agent only)
 * RLS: enforced at DB level via rls-referral-tokens-policies.sql
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/supabase/db';
import { referralTokens, userProfiles } from '@reinder/shared/db/schema';
import { REFERRAL_TOKEN_TTL_DAYS } from '@reinder/shared/constants';
import { eq, desc } from 'drizzle-orm';

// ─── Types ───────────────────────────────────────────────────────────────────

export type TokenStatus = 'pending' | 'accepted' | 'expired';

export interface ReferralTokenWithStatus {
  id: string;
  agentId: string;
  buyerId: string | null;
  token: string;
  referralUrl: string;
  used: boolean;
  expiresAt: string;
  createdAt: string;
  status: TokenStatus;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeStatus(used: boolean, expiresAt: Date): TokenStatus {
  if (used) return 'accepted';
  if (expiresAt < new Date()) return 'expired';
  return 'pending';
}

function buildReferralUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://reinder.app';
  return `${base}/referral/${token}`;
}

/**
 * Verify the authenticated user has the `agent` role.
 * Returns the user object on success, or a NextResponse error on failure.
 */
async function requireAgent(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, error: NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 }) };
  }

  const [profile] = await db
    .select({ role: userProfiles.role })
    .from(userProfiles)
    .where(eq(userProfiles.id, user.id))
    .limit(1);

  if (!profile || profile.role !== 'agent') {
    return { user: null, error: NextResponse.json({ data: null, error: 'Forbidden — agent role required' }, { status: 403 }) };
  }

  return { user, error: null };
}

// ─── POST /api/v1/referral-tokens ────────────────────────────────────────────

/**
 * Generate a new referral token for the authenticated agent.
 * Returns the token, full referral URL, and expiry date.
 */
export async function POST(_req: NextRequest) {
  const supabase = await createClient();
  const { user, error: authError } = await requireAgent(supabase);
  if (authError) return authError;

  // Calculate expiry: now + REFERRAL_TOKEN_TTL_DAYS
  const expiresAt = new Date(Date.now() + REFERRAL_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  // Generate a unique token using Node.js crypto
  const { randomUUID } = await import('crypto');
  const token = randomUUID();

  const [inserted] = await db
    .insert(referralTokens)
    .values({
      agentId: user!.id,
      token,
      expiresAt,
      used: false,
    })
    .returning();

  if (!inserted) {
    return NextResponse.json({ data: null, error: 'Failed to create referral token' }, { status: 500 });
  }

  const referralUrl = buildReferralUrl(inserted.token);

  return NextResponse.json(
    {
      data: {
        id: inserted.id,
        agentId: inserted.agentId,
        token: inserted.token,
        referralUrl,
        used: inserted.used,
        expiresAt: inserted.expiresAt.toISOString(),
        createdAt: inserted.createdAt.toISOString(),
        status: computeStatus(inserted.used, inserted.expiresAt) as TokenStatus,
      },
      error: null,
    },
    { status: 201 }
  );
}

// ─── GET /api/v1/referral-tokens ─────────────────────────────────────────────

/**
 * List all referral tokens for the authenticated agent, ordered by creation date (newest first).
 * Each token includes a computed `status` field: 'pending' | 'accepted' | 'expired'.
 */
export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { user, error: authError } = await requireAgent(supabase);
  if (authError) return authError;

  const tokens = await db
    .select()
    .from(referralTokens)
    .where(eq(referralTokens.agentId, user!.id))
    .orderBy(desc(referralTokens.createdAt));

  const tokensWithStatus: ReferralTokenWithStatus[] = tokens.map((t) => ({
    id: t.id,
    agentId: t.agentId,
    buyerId: t.buyerId ?? null,
    token: t.token,
    referralUrl: buildReferralUrl(t.token),
    used: t.used,
    expiresAt: t.expiresAt.toISOString(),
    createdAt: t.createdAt.toISOString(),
    status: computeStatus(t.used, t.expiresAt),
  }));

  return NextResponse.json({ data: tokensWithStatus, error: null }, { status: 200 });
}
