'use client';
/**
 * apps/web/src/features/agent-link/components/referral-link-generator.tsx
 *
 * Client Component — Referral link generation and management UI.
 * Story 3.1 — Task 3
 *
 * AC2: shows full link + copy button
 * AC4: expired tokens show "Generar nuevo" CTA
 * AC5: lists all tokens with status badges
 */

import { useReferralTokens } from '../hooks/use-referral-tokens';
import type { ReferralTokenWithStatus } from '@/app/api/v1/referral-tokens/route';

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  accepted: 'Aceptado',
  expired: 'Expirado',
};

const STATUS_COLOR: Record<string, string> = {
  pending: '#FF6B00',
  accepted: '#22c55e',
  expired: '#9E9080',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: '999px',
        fontSize: '12px',
        fontWeight: 600,
        color: STATUS_COLOR[status] ?? '#9E9080',
        border: `1px solid ${STATUS_COLOR[status] ?? '#9E9080'}`,
        background: 'rgba(255,255,255,0.05)',
      }}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

// ─── Token row ────────────────────────────────────────────────────────────────

function TokenRow({
  token,
  isCopied,
  onCopy,
  onRegenerate,
}: {
  token: ReferralTokenWithStatus;
  isCopied: boolean;
  onCopy: (id: string, url: string) => void;
  onRegenerate: () => void;
}) {
  const shortUrl = token.referralUrl.replace(/^https?:\/\//, '');
  const expiresLabel = new Date(token.expiresAt).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <div
      id={`referral-token-${token.id}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '14px 16px',
        background: 'rgba(30,26,21,0.6)',
        border: '1px solid #2E2820',
        borderRadius: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: '13px',
            color: '#F5F0E8',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}
          title={token.referralUrl}
        >
          {shortUrl}
        </span>
        <StatusBadge status={token.status} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <span style={{ fontSize: '12px', color: '#9E9080' }}>
          {token.status === 'expired'
            ? `Expiró el ${expiresLabel}`
            : `Expira el ${expiresLabel}`}
        </span>

        <div style={{ display: 'flex', gap: '8px' }}>
          {token.status === 'pending' && (
            <button
              id={`copy-link-${token.id}`}
              onClick={() => onCopy(token.id, token.referralUrl)}
              style={{
                padding: '5px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(255,107,0,0.4)',
                background: 'rgba(255,107,0,0.1)',
                color: '#FF6B00',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {isCopied ? '✓ Copiado' : 'Copiar'}
            </button>
          )}
          {token.status === 'expired' && (
            <button
              id={`regenerate-token-${token.id}`}
              onClick={onRegenerate}
              style={{
                padding: '5px 12px',
                borderRadius: '8px',
                border: '1px solid #2E2820',
                background: 'rgba(255,255,255,0.05)',
                color: '#9E9080',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Generar nuevo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ReferralLinkGeneratorProps {
  initialTokens: ReferralTokenWithStatus[];
}

export function ReferralLinkGenerator({ initialTokens }: ReferralLinkGeneratorProps) {
  const { tokens, isGenerating, isCopied, error, generateToken, copyLink } =
    useReferralTokens(initialTokens);

  return (
    <section
      id="referral-link-generator"
      style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '600px' }}
    >
      {/* Generate CTA */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          id="generate-referral-link-btn"
          onClick={generateToken}
          disabled={isGenerating}
          style={{
            padding: '14px 24px',
            borderRadius: '12px',
            border: 'none',
            background: isGenerating ? 'rgba(255,107,0,0.4)' : '#FF6B00',
            color: '#0D0D0D',
            fontSize: '15px',
            fontWeight: 700,
            cursor: isGenerating ? 'not-allowed' : 'pointer',
            boxShadow: isGenerating ? 'none' : '0 0 20px rgba(255,107,0,0.35)',
            transition: 'all 0.15s ease',
            width: '100%',
          }}
        >
          {isGenerating ? 'Generando...' : '+ Generar link para cliente'}
        </button>

        {error && (
          <p
            role="alert"
            style={{ fontSize: '13px', color: '#8B3A3A', margin: 0, textAlign: 'center' }}
          >
            {error}
          </p>
        )}
      </div>

      {/* Token list */}
      {tokens.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#9E9080', margin: 0, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Tus links de referral ({tokens.length})
          </h2>
          {tokens.map((token) => (
            <TokenRow
              key={token.id}
              token={token}
              isCopied={isCopied === token.id}
              onCopy={copyLink}
              onRegenerate={generateToken}
            />
          ))}
        </div>
      ) : (
        <p style={{ color: '#9E9080', fontSize: '14px', textAlign: 'center', margin: 0 }}>
          Genera tu primer link de referral para vincular a tu primer cliente.
        </p>
      )}
    </section>
  );
}
