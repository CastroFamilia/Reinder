/**
 * apps/web/src/features/agent-link/components/referral-link-generator.test.tsx
 *
 * Unit tests for ReferralLinkGenerator.
 * Tests: render with tokens, empty state, generate button, copy button, status badges.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReferralLinkGenerator } from './referral-link-generator';

// Mock the useReferralTokens hook
const mockGenerateToken = vi.fn();
const mockCopyLink = vi.fn();

vi.mock('../hooks/use-referral-tokens', () => ({
  useReferralTokens: vi.fn((initialTokens) => ({
    tokens: initialTokens,
    isGenerating: false,
    isCopied: null,
    error: null,
    generateToken: mockGenerateToken,
    copyLink: mockCopyLink,
  })),
}));

const pendingToken = {
  id: 'token-1',
  token: 'abc123',
  referralUrl: 'https://reinder.app/referral/abc123',
  status: 'pending',
  expiresAt: '2026-07-01T00:00:00Z',
  createdAt: '2026-06-01T00:00:00Z',
};

const expiredToken = {
  id: 'token-2',
  token: 'xyz789',
  referralUrl: 'https://reinder.app/referral/xyz789',
  status: 'expired',
  expiresAt: '2026-01-01T00:00:00Z',
  createdAt: '2025-12-01T00:00:00Z',
};

const acceptedToken = {
  id: 'token-3',
  token: 'def456',
  referralUrl: 'https://reinder.app/referral/def456',
  status: 'accepted',
  expiresAt: '2026-07-15T00:00:00Z',
  createdAt: '2026-06-15T00:00:00Z',
};

describe('ReferralLinkGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the generate button', () => {
    render(<ReferralLinkGenerator initialTokens={[]} />);
    expect(screen.getByText('+ Generar link para cliente')).toBeTruthy();
  });

  it('renders empty state when no tokens', () => {
    render(<ReferralLinkGenerator initialTokens={[]} />);
    expect(
      screen.getByText('Genera tu primer link de referral para vincular a tu primer cliente.'),
    ).toBeTruthy();
  });

  it('renders token count header when tokens exist', () => {
    render(<ReferralLinkGenerator initialTokens={[pendingToken]} />);
    expect(screen.getByText(/Tus links de referral \(1\)/)).toBeTruthy();
  });

  it('renders pending token with Copiar button', () => {
    render(<ReferralLinkGenerator initialTokens={[pendingToken]} />);
    expect(screen.getByText('Copiar')).toBeTruthy();
    expect(screen.getByText('Pendiente')).toBeTruthy();
  });

  it('renders expired token with Generar nuevo button', () => {
    render(<ReferralLinkGenerator initialTokens={[expiredToken]} />);
    expect(screen.getByText('Generar nuevo')).toBeTruthy();
    expect(screen.getByText('Expirado')).toBeTruthy();
  });

  it('renders accepted token with Aceptado badge', () => {
    render(<ReferralLinkGenerator initialTokens={[acceptedToken]} />);
    expect(screen.getByText('Aceptado')).toBeTruthy();
  });

  it('calls generateToken when generate button is clicked', () => {
    render(<ReferralLinkGenerator initialTokens={[]} />);
    fireEvent.click(screen.getByText('+ Generar link para cliente'));
    expect(mockGenerateToken).toHaveBeenCalledTimes(1);
  });

  it('calls copyLink when copy button is clicked', () => {
    render(<ReferralLinkGenerator initialTokens={[pendingToken]} />);
    fireEvent.click(screen.getByText('Copiar'));
    expect(mockCopyLink).toHaveBeenCalledWith('token-1', 'https://reinder.app/referral/abc123');
  });

  it('renders multiple tokens', () => {
    render(
      <ReferralLinkGenerator initialTokens={[pendingToken, expiredToken, acceptedToken]} />,
    );
    expect(screen.getByText(/Tus links de referral \(3\)/)).toBeTruthy();
    expect(screen.getByText('Pendiente')).toBeTruthy();
    expect(screen.getByText('Expirado')).toBeTruthy();
    expect(screen.getByText('Aceptado')).toBeTruthy();
  });

  it('renders token URLs without protocol prefix', () => {
    render(<ReferralLinkGenerator initialTokens={[pendingToken]} />);
    expect(screen.getByText('reinder.app/referral/abc123')).toBeTruthy();
  });

  it('has correct section ID', () => {
    render(<ReferralLinkGenerator initialTokens={[]} />);
    expect(document.getElementById('referral-link-generator')).toBeTruthy();
  });
});
