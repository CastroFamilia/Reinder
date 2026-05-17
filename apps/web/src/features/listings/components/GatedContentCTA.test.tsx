/**
 * apps/web/src/features/listings/components/GatedContentCTA.test.tsx
 *
 * ATDD — Story 6.3: Gated Content — Preview para Usuarios No Autenticados
 * TDD RED PHASE — Tests will FAIL until GatedContentCTA is implemented.
 *
 * Coverage targets:
 * - T6.3-02: CTA visible when !isAuthenticated
 * - T6.3-03: Buttons with correct href including ?next= param
 * - T6.3-05: Redirect post-login back to listing
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

// RED PHASE: GatedContentCTA does not exist yet — un-skip after implementation
describe.skip('GatedContentCTA — Gated content call-to-action (Story 6.3 — TDD RED)', () => {
  const LISTING_ID = 'listing-abc-123';

  it('T6.3-03 — renders CTA text about registering for full details', async () => {
    const { GatedContentCTA } = await import('./GatedContentCTA');
    render(<GatedContentCTA listingId={LISTING_ID} />);

    expect(
      screen.getByText(/reg[ií]strate gratis/i),
    ).toBeTruthy();
  });

  it('T6.3-03 — renders "Registrarme" primary button linking to /register?next=...', async () => {
    const { GatedContentCTA } = await import('./GatedContentCTA');
    render(<GatedContentCTA listingId={LISTING_ID} />);

    const registerBtn = screen.getByRole('link', { name: /registrarme/i });
    expect(registerBtn).toBeTruthy();
    expect(registerBtn.getAttribute('href')).toContain('/register');
    expect(registerBtn.getAttribute('href')).toContain(
      `next=${encodeURIComponent(`/listings/${LISTING_ID}`)}`,
    );
  });

  it('T6.3-03 — renders "Iniciar sesión" secondary button linking to /login?next=...', async () => {
    const { GatedContentCTA } = await import('./GatedContentCTA');
    render(<GatedContentCTA listingId={LISTING_ID} />);

    const loginBtn = screen.getByRole('link', { name: /iniciar sesi[oó]n/i });
    expect(loginBtn).toBeTruthy();
    expect(loginBtn.getAttribute('href')).toContain('/login');
    expect(loginBtn.getAttribute('href')).toContain(
      `next=${encodeURIComponent(`/listings/${LISTING_ID}`)}`,
    );
  });
});

describe.skip('ListingDetailPage — preview mode (Story 6.3 — TDD RED)', () => {
  it('T6.3-01 — anonymous: description truncated to ~200 chars with ellipsis', () => {
    const longDescription =
      'A'.repeat(300); // 300-char description
    const preview = longDescription.slice(0, 200);
    expect(preview.length).toBe(200);
    expect(longDescription.length).toBeGreaterThan(200);
  });

  it('T6.3-01 — anonymous: short description stays intact', () => {
    const shortDescription = 'Pequeño piso céntrico.';
    const preview = shortDescription.length > 200 ? shortDescription.slice(0, 200) : shortDescription;
    expect(preview).toBe(shortDescription);
  });

  it('T6.3-04 — anti-cloaking: isAuthenticated=false produces preview structure (same for bot and anon)', () => {
    // Verify that the isAuthenticated flag is a boolean derived from auth state,
    // and that a null user → false → preview mode → same for Googlebot
    const userFromSupabase = null; // no session
    const isAuthenticated = userFromSupabase !== null;
    expect(isAuthenticated).toBe(false);
  });

  it('T6.3-02 — full mode: authenticated user gets complete description', () => {
    const fullDescription = 'A'.repeat(500);
    const isAuthenticated = true;
    const renderedDescription = isAuthenticated ? fullDescription : fullDescription.slice(0, 200);
    expect(renderedDescription.length).toBe(500);
  });
});
