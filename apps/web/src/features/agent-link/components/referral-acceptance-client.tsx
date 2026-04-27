'use client';
/**
 * apps/web/src/features/agent-link/components/referral-acceptance-client.tsx
 *
 * Client Component for the referral acceptance interaction.
 * Story 3.2 — AC1, AC2, AC3, AC5
 *
 * Shows agent info + accept/reject buttons.
 * On accept: calls POST /api/v1/referral-tokens/:token/accept, then redirects.
 * On reject: redirects to /swipe without creating a bond.
 */
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ReferralAcceptanceClientProps {
  tokenValue: string;
  agentName: string;
  agentAvatarUrl: string | null;
}

export function ReferralAcceptanceClient({
  tokenValue,
  agentName,
  agentAvatarUrl,
}: ReferralAcceptanceClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derive initials for avatar fallback
  const initials = agentName
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  async function handleAccept() {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/referral-tokens/${encodeURIComponent(tokenValue)}/accept`, {
        method: 'POST',
      });
      const body = await res.json();

      if (!res.ok || body.error) {
        setError(body.error ?? 'Error al aceptar el vínculo');
        setIsLoading(false);
        return;
      }

      // Redirect to swipe with toast info
      const agentName = body.data.agentName ?? 'Tu agente';
      router.push(`/swipe?toast=bond_accepted&agent=${encodeURIComponent(agentName)}`);
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
      setIsLoading(false);
    }
  }

  function handleReject() {
    router.push('/swipe');
  }

  return (
    <section
      id="referral-acceptance"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px',
        maxWidth: '400px',
        width: '100%',
        textAlign: 'center',
      }}
    >
      {/* Agent avatar */}
      <div
        id="agent-avatar"
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: agentAvatarUrl ? 'transparent' : 'rgba(255,107,0,0.2)',
          border: '3px solid rgba(255,107,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          fontSize: '28px',
          fontWeight: 700,
          color: '#FF6B00',
        }}
      >
        {agentAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={agentAvatarUrl} alt={agentName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          initials
        )}
      </div>

      {/* Explanation */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#FF6B00', margin: 0 }}>
          {agentName}
        </h1>
        <p style={{ color: '#9E9080', margin: 0, lineHeight: 1.6, fontSize: '15px' }}>
          quiere ser tu <strong style={{ color: '#F5F0E8' }}>Agente Representante</strong> en Reinder.
          Esto significa que podrá ver tus matches y actuar como tu representante.
        </p>
      </div>

      {/* Error */}
      {error && (
        <p role="alert" style={{ color: '#8B3A3A', fontSize: '13px', margin: 0 }}>
          {error}
        </p>
      )}

      {/* CTA buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
        <button
          id="accept-bond-btn"
          onClick={handleAccept}
          disabled={isLoading}
          style={{
            padding: '14px 24px',
            borderRadius: '12px',
            border: 'none',
            background: isLoading ? 'rgba(255,107,0,0.4)' : '#FF6B00',
            color: '#0D0D0D',
            fontSize: '15px',
            fontWeight: 700,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            boxShadow: isLoading ? 'none' : '0 0 20px rgba(255,107,0,0.35)',
            transition: 'all 0.15s ease',
            width: '100%',
          }}
        >
          {isLoading ? 'Aceptando...' : 'Aceptar vínculo'}
        </button>

        <button
          id="reject-bond-btn"
          onClick={handleReject}
          disabled={isLoading}
          style={{
            padding: '12px 24px',
            borderRadius: '12px',
            border: '1px solid #2E2820',
            background: 'transparent',
            color: '#9E9080',
            fontSize: '14px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            width: '100%',
          }}
        >
          No gracias
        </button>
      </div>
    </section>
  );
}
