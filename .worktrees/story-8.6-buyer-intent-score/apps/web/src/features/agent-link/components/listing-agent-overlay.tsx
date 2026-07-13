'use client';
/**
 * apps/web/src/features/agent-link/components/listing-agent-overlay.tsx
 *
 * Story 3.4: Overrides the listing agent display when a buyer has an active bond.
 *
 * AC:
 *   - If buyer has bond: shows representative agent name/avatar (NOT the listing agent)
 *   - If buyer has NO bond: shows "¿Tienes un agente? Pídele tu link de Reinder" banner
 *   - Used in: PropertyDetailSheet, Match Recap, matches history cards
 *
 * Usage:
 *   <ListingAgentOverlay listingAgent={{ name, avatarUrl }} />
 *   The component fetches the bond internally via useBuyerBond hook.
 *   Pass `compact={true}` for card view (no banner).
 */
interface ListingAgentProps {
  name: string;
  avatarUrl?: string | null;
  phone?: string | null;
}

interface ListingAgentOverlayProps {
  listingAgent: ListingAgentProps;
  compact?: boolean;
  /** If true, never shows the "get referral" banner — useful in swipe cards */
  hideBanner?: boolean;
}

// We can't use hooks in a server component, so this is a pure presentational
// wrapper. The actual data fetching is done by the parent via useBuyerBond.
// This component renders the final agent display.
export function AgentContactCard({
  name,
  avatarUrl,
  phone,
  isRepresentative = false,
  compact = false,
}: {
  name: string;
  avatarUrl?: string | null;
  phone?: string | null;
  isRepresentative?: boolean;
  compact?: boolean;
}) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (compact) {
    return (
      <div
        id="agent-contact-compact"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          background: isRepresentative ? 'rgba(255,107,0,0.1)' : 'rgba(30,25,20,0.8)',
          borderRadius: '10px',
          border: isRepresentative ? '1px solid rgba(255,107,0,0.3)' : 'none',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: avatarUrl ? 'transparent' : 'rgba(255,107,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 700,
            color: '#FF6B00',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#F5F0E8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
          {isRepresentative && (
            <div style={{ fontSize: '10px', color: '#FF6B00' }}>Tu agente representante</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      id="agent-contact-full"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 16px',
        background: isRepresentative ? 'rgba(255,107,0,0.08)' : 'rgba(30,25,20,0.6)',
        borderRadius: '14px',
        border: isRepresentative ? '1px solid rgba(255,107,0,0.25)' : '1px solid #2E2820',
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: avatarUrl ? 'transparent' : 'rgba(255,107,0,0.2)',
          border: isRepresentative ? '2px solid rgba(255,107,0,0.4)' : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          fontWeight: 700,
          color: '#FF6B00',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {isRepresentative && (
          <div style={{ fontSize: '11px', color: '#FF6B00', fontWeight: 600, marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Tu Agente Representante
          </div>
        )}
        <div style={{ fontSize: '15px', fontWeight: 700, color: '#F5F0E8' }}>{name}</div>
        {phone && (
          <div style={{ fontSize: '13px', color: '#9E9080', marginTop: '2px' }}>{phone}</div>
        )}
      </div>
    </div>
  );
}

/**
 * Banner shown to buyers without an agent bond.
 * AC: "¿Tienes un agente? Pídele tu link de Reinder"
 */
export function NoAgentBanner() {
  return (
    <div
      id="no-agent-banner"
      style={{
        padding: '12px 16px',
        background: 'rgba(30,25,20,0.8)',
        borderRadius: '12px',
        border: '1px solid #2E2820',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '13px',
        color: '#9E9080',
      }}
    >
      <span style={{ fontSize: '18px' }}>🤝</span>
      <span>
        ¿Tienes un agente?{' '}
        <strong style={{ color: '#FF6B00' }}>Pídele tu link de Reinder</strong>
      </span>
    </div>
  );
}
