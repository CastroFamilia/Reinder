/**
 * apps/web/src/app/referral/[token]/page.tsx
 *
 * Public page — /referral/[token]
 * Story 3.2: Aceptación del Vínculo por el Comprador
 *
 * NOT inside (protected) — accessible without auth so the buyer can see
 * the agent info before being asked to log in.
 *
 * Auth flow:
 * - Not authenticated → redirect to /login?next=/referral/{token}
 * - Authenticated (buyer) → show acceptance UI
 * - Token invalid/expired → show error state
 */
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/supabase/db';
import { referralTokens, userProfiles } from '@reinder/shared/db/schema';
import { eq } from 'drizzle-orm';
import type { Metadata } from 'next';
import { ReferralAcceptanceClient } from '@/features/agent-link/components/referral-acceptance-client';

export const metadata: Metadata = {
  title: 'Aceptar vínculo con tu agente — Reinder',
  description: 'Tu agente te ha invitado a vincularte en Reinder como comprador.',
};

type PageProps = { params: Promise<{ token: string }> };

export default async function ReferralAcceptancePage({ params }: PageProps) {
  const { token: tokenValue } = await params;

  // Auth check — redirect to login preserving the referral URL
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/referral/${encodeURIComponent(tokenValue)}`);
  }

  // Validate token
  const [token] = await db
    .select()
    .from(referralTokens)
    .where(eq(referralTokens.token, tokenValue))
    .limit(1);

  const isInvalid = !token || token.used || token.expiresAt < new Date();

  if (isInvalid) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(ellipse at center, rgba(139,58,58,0.15) 0%, #0D0D0D 70%)',
          color: '#F5F0E8',
          fontFamily: "'Inter', system-ui, sans-serif",
          gap: '16px',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '48px' }}>⚠️</div>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#FF6B00', margin: 0 }}>
          Link no válido
        </h1>
        <p style={{ color: '#9E9080', margin: 0, maxWidth: '360px', lineHeight: 1.6 }}>
          Este link ya no es válido. Pídele a tu agente que genere uno nuevo.
        </p>
      </main>
    );
  }

  // Fetch agent profile for display
  const [agentProfile] = await db
    .select({ fullName: userProfiles.fullName, avatarUrl: userProfiles.avatarUrl })
    .from(userProfiles)
    .where(eq(userProfiles.id, token.agentId))
    .limit(1);

  const agentName = agentProfile?.fullName ?? 'Tu agente';

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at center, rgba(255,107,0,0.12) 0%, #0D0D0D 70%)',
        color: '#F5F0E8',
        fontFamily: "'Inter', system-ui, sans-serif",
        padding: '32px 24px',
      }}
    >
      <ReferralAcceptanceClient
        tokenValue={tokenValue}
        agentName={agentName}
        agentAvatarUrl={agentProfile?.avatarUrl ?? null}
      />
    </main>
  );
}
