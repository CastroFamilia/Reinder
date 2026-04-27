/**
 * apps/web/src/app/(protected)/agent/page.tsx
 *
 * Panel del Agente — Story 3.1: Generación de Links de Referral
 *
 * Server Component: loads existing tokens via Drizzle (SSR).
 * Client Component: ReferralLinkGenerator handles generation + interactions.
 *
 * Guard: only `agent` role can access — redirects otherwise.
 */
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/supabase/db';
import { referralTokens, userProfiles } from '@reinder/shared/db/schema';
import { eq, desc } from 'drizzle-orm';
import type { Metadata } from 'next';
import { ReferralLinkGenerator } from '@/features/agent-link/components/referral-link-generator';
import type { ReferralTokenWithStatus } from '@/app/api/v1/referral-tokens/route';

export const metadata: Metadata = {
  title: 'Panel del Agente — Reinder',
  description: 'Panel de gestión de clientes y links de referral del agente representante.',
};

// ─── Status helper (same logic as API route) ──────────────────────────────────

type TokenStatus = 'pending' | 'accepted' | 'expired';

function computeStatus(used: boolean, expiresAt: Date): TokenStatus {
  if (used) return 'accepted';
  if (expiresAt < new Date()) return 'expired';
  return 'pending';
}

function buildReferralUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://reinder.app';
  return `${base}/referral/${token}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AgentDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Verify role — only agents can access this route
  const [profile] = await db
    .select({ role: userProfiles.role })
    .from(userProfiles)
    .where(eq(userProfiles.id, user.id))
    .limit(1);

  if (!profile || profile.role !== 'agent') {
    redirect('/swipe');
  }

  // Load existing referral tokens (SSR)
  const rawTokens = await db
    .select()
    .from(referralTokens)
    .where(eq(referralTokens.agentId, user.id))
    .orderBy(desc(referralTokens.createdAt));

  const initialTokens: ReferralTokenWithStatus[] = rawTokens.map((t) => ({
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

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '48px 24px',
        background: 'radial-gradient(ellipse at center, rgba(255,107,0,0.12) 0%, #0D0D0D 70%)',
        color: '#F5F0E8',
        fontFamily: "'Inter', system-ui, sans-serif",
        gap: '32px',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontSize: '40px' }}>🤝</div>
        <h1
          style={{
            fontSize: '28px',
            fontWeight: 700,
            color: '#FF6B00',
            margin: 0,
          }}
        >
          Panel del Agente
        </h1>
        <p style={{ color: '#9E9080', margin: 0, fontSize: '14px' }}>
          Vincula a tus clientes compradores con tu link de referral
        </p>
        <p style={{ color: '#9E9080', margin: 0, fontSize: '12px' }}>
          Sesión: {user.email}
        </p>
      </div>

      {/* Referral link section */}
      <ReferralLinkGenerator initialTokens={initialTokens} />
    </main>
  );
}
