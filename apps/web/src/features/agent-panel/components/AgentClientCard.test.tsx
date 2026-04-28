/**
 * Story 4.1 — Component Tests: AgentClientCard
 *
 * TDD RED PHASE: These tests are intentionally failing (test.skip).
 * They define the expected UI behavior BEFORE implementation.
 *
 * Run: pnpm --filter @reinder/web test apps/web/src/features/agent-panel/components/AgentClientCard.test.tsx
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { AgentClient } from '@reinder/shared/types/agent';

// TDD RED: AgentClientCard does not exist yet — will fail to import
// import { AgentClientCard } from '@/features/agent-panel/components/AgentClientCard';

// Mock component for test structure clarity (remove when real component exists)
const AgentClientCard = vi.fn(() => null);

const mockClientWithNewMatches: AgentClient = {
  bondId: 'bond-uuid-1',
  buyerId: 'buyer-uuid-1',
  buyerName: 'Ana García',
  buyerAvatarUrl: 'https://example.com/avatar.jpg',
  bondCreatedAt: '2026-04-01T00:00:00.000Z',
  totalMatches: 5,
  lastMatchAt: '2026-04-27T15:00:00.000Z',
  hasNewMatches: true,
};

const mockClientNoNewMatches: AgentClient = {
  bondId: 'bond-uuid-2',
  buyerId: 'buyer-uuid-2',
  buyerName: 'Carlos Ruiz',
  buyerAvatarUrl: null,
  bondCreatedAt: '2026-03-15T00:00:00.000Z',
  totalMatches: 2,
  lastMatchAt: '2026-04-10T10:00:00.000Z',
  hasNewMatches: false,
};

const mockClientNoMatches: AgentClient = {
  bondId: 'bond-uuid-3',
  buyerId: 'buyer-uuid-3',
  buyerName: 'María López',
  buyerAvatarUrl: null,
  bondCreatedAt: '2026-04-20T00:00:00.000Z',
  totalMatches: 0,
  lastMatchAt: null,
  hasNewMatches: false,
};

describe('AgentClientCard', () => {
  // ─── T4.1-02a: badge naranja visible when hasNewMatches = true ───
  it.skip('T4.1-02a: renders orange has-new-matches badge when hasNewMatches is true', () => {
    const onPress = vi.fn();
    render(<AgentClientCard client={mockClientWithNewMatches} onPress={onPress} />);

    // Badge should be visible
    const badge = screen.getByTestId('new-matches-badge');
    expect(badge).toBeInTheDocument();
    // Badge should have orange styling
    expect(badge).toHaveClass('bg-orange'); // or check for specific tailwind class
  });

  // ─── T4.1-02b: no badge when hasNewMatches = false ───
  it.skip('T4.1-02b: does NOT render new-matches badge when hasNewMatches is false', () => {
    const onPress = vi.fn();
    render(<AgentClientCard client={mockClientNoNewMatches} onPress={onPress} />);

    const badge = screen.queryByTestId('new-matches-badge');
    expect(badge).not.toBeInTheDocument();
  });

  // ─── T4.1-02c: buyer name displayed ───
  it.skip('T4.1-02c: renders buyer full name', () => {
    const onPress = vi.fn();
    render(<AgentClientCard client={mockClientWithNewMatches} onPress={onPress} />);

    expect(screen.getByText('Ana García')).toBeInTheDocument();
  });

  // ─── T4.1-02d: total matches count displayed ───
  it.skip('T4.1-02d: renders total matches count', () => {
    const onPress = vi.fn();
    render(<AgentClientCard client={mockClientWithNewMatches} onPress={onPress} />);

    // Should display match count somewhere (e.g., "5 matches" or "5")
    expect(screen.getByText(/5/)).toBeInTheDocument();
  });

  // ─── T4.1-02e: avatar shown when URL available ───
  it.skip('T4.1-02e: renders avatar image when avatarUrl is provided', () => {
    const onPress = vi.fn();
    render(<AgentClientCard client={mockClientWithNewMatches} onPress={onPress} />);

    const avatar = screen.getByRole('img', { name: /Ana García/i });
    expect(avatar).toHaveAttribute('src', mockClientWithNewMatches.buyerAvatarUrl);
  });

  // ─── T4.1-02f: initials fallback when no avatar ───
  it.skip('T4.1-02f: renders buyer initials when no avatar URL', () => {
    const onPress = vi.fn();
    render(<AgentClientCard client={mockClientNoNewMatches} onPress={onPress} />);

    // Should show "CR" initials for "Carlos Ruiz"
    expect(screen.getByText('CR')).toBeInTheDocument();
  });

  // ─── T4.1-02g: bond creation date displayed ───
  it.skip('T4.1-02g: renders bond creation date', () => {
    const onPress = vi.fn();
    render(<AgentClientCard client={mockClientWithNewMatches} onPress={onPress} />);

    // Should show formatted date like "1 abr 2026" or similar
    const dateElement = screen.getByTestId('bond-date');
    expect(dateElement).toBeInTheDocument();
  });

  // ─── T4.1-05: onPress handler called on card press ───
  it.skip('T4.1-05: calls onPress handler when card is pressed', () => {
    const onPress = vi.fn();
    render(<AgentClientCard client={mockClientWithNewMatches} onPress={onPress} />);

    const card = screen.getByRole('button');
    fireEvent.click(card);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  // ─── T4.1-04: empty state component ───
  it.skip('T4.1-04: AgentClientsEmptyState renders correct empty state message', () => {
    // import { AgentClientsEmptyState } from '@/features/agent-panel/components/AgentClientsEmptyState';
    // render(<AgentClientsEmptyState />);
    // expect(screen.getByText(/Aún no tienes clientes vinculados/)).toBeInTheDocument();
    // expect(screen.getByText(/envía tu link de referral/i)).toBeInTheDocument();

    // Placeholder until component exists
    expect(true).toBe(false); // Force fail
  });
});
