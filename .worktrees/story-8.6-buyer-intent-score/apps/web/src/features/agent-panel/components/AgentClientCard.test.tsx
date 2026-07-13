/**
 * Story 4.1 — Component Tests: AgentClientCard
 *
 * Acceptance tests for AgentClientCard component.
 * Covers AC 1, 2, 4, 5 from Story 4.1.
 *
 * Run: pnpm --filter @reinder/web test apps/web/src/features/agent-panel/components/AgentClientCard.test.tsx
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  AgentClientCard,
  AgentClientsEmptyState,
} from "@/features/agent-panel/components/AgentClientCard";
import type { AgentClient } from "@reinder/shared/types/agent";

const mockClientWithNewMatches: AgentClient = {
  bondId: "bond-uuid-1",
  buyerId: "buyer-uuid-1",
  buyerName: "Ana García",
  buyerAvatarUrl: "https://example.com/avatar.jpg",
  bondCreatedAt: "2026-04-01T00:00:00.000Z",
  totalMatches: 5,
  lastMatchAt: "2026-04-27T15:00:00.000Z",
  hasNewMatches: true,
};

const mockClientNoNewMatches: AgentClient = {
  bondId: "bond-uuid-2",
  buyerId: "buyer-uuid-2",
  buyerName: "Carlos Ruiz",
  buyerAvatarUrl: null,
  bondCreatedAt: "2026-03-15T00:00:00.000Z",
  totalMatches: 2,
  lastMatchAt: "2026-04-10T10:00:00.000Z",
  hasNewMatches: false,
};

describe("AgentClientCard", () => {
  // ─── T4.1-02a: badge naranja visible when hasNewMatches = true ───
  it("T4.1-02a: renders orange has-new-matches badge when hasNewMatches is true", () => {
    const onPress = vi.fn();
    render(
      <AgentClientCard client={mockClientWithNewMatches} onPress={onPress} />
    );

    const badge = screen.getByTestId("new-matches-badge");
    expect(badge).toBeInTheDocument();
  });

  // ─── T4.1-02b: no badge when hasNewMatches = false ───
  it("T4.1-02b: does NOT render new-matches badge when hasNewMatches is false", () => {
    const onPress = vi.fn();
    render(
      <AgentClientCard client={mockClientNoNewMatches} onPress={onPress} />
    );

    const badge = screen.queryByTestId("new-matches-badge");
    expect(badge).not.toBeInTheDocument();
  });

  // ─── T4.1-02c: buyer name displayed ───
  it("T4.1-02c: renders buyer full name", () => {
    const onPress = vi.fn();
    render(
      <AgentClientCard client={mockClientWithNewMatches} onPress={onPress} />
    );

    expect(screen.getByText("Ana García")).toBeInTheDocument();
  });

  // ─── T4.1-02d: total matches count displayed ───
  it("T4.1-02d: renders total matches count", () => {
    const onPress = vi.fn();
    render(
      <AgentClientCard client={mockClientWithNewMatches} onPress={onPress} />
    );

    expect(screen.getByText("5")).toBeInTheDocument();
  });

  // ─── T4.1-02e: avatar shown when URL available ───
  it("T4.1-02e: renders avatar image when avatarUrl is provided", () => {
    const onPress = vi.fn();
    render(
      <AgentClientCard client={mockClientWithNewMatches} onPress={onPress} />
    );

    const avatar = screen.getByRole("img", { name: "Ana García" });
    expect(avatar).toHaveAttribute(
      "src",
      mockClientWithNewMatches.buyerAvatarUrl
    );
  });

  // ─── T4.1-02f: initials fallback when no avatar ───
  it("T4.1-02f: renders buyer initials when no avatar URL", () => {
    const onPress = vi.fn();
    render(
      <AgentClientCard client={mockClientNoNewMatches} onPress={onPress} />
    );

    // "Carlos Ruiz" → "CR"
    expect(screen.getByText("CR")).toBeInTheDocument();
  });

  // ─── T4.1-02g: bond creation date displayed ───
  it("T4.1-02g: renders bond creation date", () => {
    const onPress = vi.fn();
    render(
      <AgentClientCard client={mockClientWithNewMatches} onPress={onPress} />
    );

    const dateElement = screen.getByTestId("bond-date");
    expect(dateElement).toBeInTheDocument();
    // Should contain the date somewhere
    expect(dateElement.textContent).toMatch(/2026/);
  });

  // ─── T4.1-05: onPress handler called on card press ───
  it("T4.1-05: calls onPress handler when card is pressed", () => {
    const onPress = vi.fn();
    render(
      <AgentClientCard client={mockClientWithNewMatches} onPress={onPress} />
    );

    const card = screen.getByRole("button");
    fireEvent.click(card);

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

// ─── T4.1-04: empty state component ───
describe("AgentClientsEmptyState", () => {
  it("T4.1-04: renders correct empty state message", () => {
    render(<AgentClientsEmptyState />);
    expect(
      screen.getByText(/Aún no tienes clientes vinculados/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/envía tu link de referral para empezar/i)
    ).toBeInTheDocument();
  });
});
