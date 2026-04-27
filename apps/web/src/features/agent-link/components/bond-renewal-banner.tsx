'use client';
/**
 * apps/web/src/features/agent-link/components/bond-renewal-banner.tsx
 *
 * Story 3.3: Non-blocking bond expiry banner shown to buyer.
 * Displayed when bond.isExpiring === true.
 * AC: "Tu vínculo con Elena caduca pronto — ¿deseas renovarlo?"
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface BondRenewalBannerProps {
  agentName: string;
  onDismiss?: () => void;
}

export function BondRenewalBanner({ agentName, onDismiss }: BondRenewalBannerProps) {
  const router = useRouter();
  const [isRenewing, setIsRenewing] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  async function handleRenew() {
    setIsRenewing(true);
    try {
      await fetch('/api/v1/agent-bonds/renew', { method: 'POST' });
      setDismissed(true);
      onDismiss?.();
    } catch {
      // silently fail — non-blocking
    } finally {
      setIsRenewing(false);
    }
  }

  async function handleUnlink() {
    setIsUnlinking(true);
    try {
      await fetch('/api/v1/agent-bonds', { method: 'DELETE' });
      setDismissed(true);
      onDismiss?.();
      router.refresh();
    } catch {
      // silently fail
    } finally {
      setIsUnlinking(false);
    }
  }

  return (
    <div
      id="bond-renewal-banner"
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(30, 25, 20, 0.95)',
        border: '1px solid rgba(255,107,0,0.3)',
        borderRadius: '14px',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        maxWidth: '360px',
        width: 'calc(100% - 32px)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        zIndex: 100,
        fontFamily: "'Inter', system-ui, sans-serif",
        color: '#F5F0E8',
      }}
    >
      <span style={{ fontSize: '20px', flexShrink: 0 }}>⏳</span>
      <div style={{ flex: 1, fontSize: '13px', lineHeight: 1.5 }}>
        <strong>Tu vínculo con {agentName} caduca pronto</strong>
        <div style={{ color: '#9E9080', marginTop: '2px' }}>¿Deseas renovarlo?</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
        <button
          id="renew-bond-btn"
          onClick={handleRenew}
          disabled={isRenewing || isUnlinking}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            border: 'none',
            background: '#FF6B00',
            color: '#0D0D0D',
            fontSize: '12px',
            fontWeight: 600,
            cursor: isRenewing ? 'not-allowed' : 'pointer',
          }}
        >
          {isRenewing ? '...' : 'Renovar'}
        </button>
        <button
          id="unlink-bond-btn"
          onClick={handleUnlink}
          disabled={isRenewing || isUnlinking}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            border: '1px solid #2E2820',
            background: 'transparent',
            color: '#9E9080',
            fontSize: '12px',
            cursor: isUnlinking ? 'not-allowed' : 'pointer',
          }}
        >
          {isUnlinking ? '...' : 'Desvincular'}
        </button>
      </div>
    </div>
  );
}
