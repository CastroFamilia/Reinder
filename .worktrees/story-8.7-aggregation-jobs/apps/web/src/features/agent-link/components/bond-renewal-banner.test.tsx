/**
 * apps/web/src/features/agent-link/components/bond-renewal-banner.test.tsx
 *
 * Unit tests for BondRenewalBanner.
 * Tests: render, renew, unlink, dismiss behavior.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BondRenewalBanner } from './bond-renewal-banner';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('BondRenewalBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders agent name in expiry warning', () => {
    render(<BondRenewalBanner agentName="Elena García" />);

    expect(screen.getByText(/Tu vínculo con Elena García caduca pronto/)).toBeTruthy();
    expect(screen.getByText('¿Deseas renovarlo?')).toBeTruthy();
  });

  it('renders renew and unlink buttons', () => {
    render(<BondRenewalBanner agentName="Elena" />);

    expect(screen.getByText('Renovar')).toBeTruthy();
    expect(screen.getByText('Desvincular')).toBeTruthy();
  });

  it('calls fetch with renew endpoint when Renovar is clicked', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    render(<BondRenewalBanner agentName="Elena" />);

    fireEvent.click(screen.getByText('Renovar'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/v1/agent-bonds/renew', { method: 'POST' });
    });
  });

  it('calls fetch with DELETE endpoint when Desvincular is clicked', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    render(<BondRenewalBanner agentName="Elena" />);

    fireEvent.click(screen.getByText('Desvincular'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/v1/agent-bonds', { method: 'DELETE' });
    });
  });

  it('calls onDismiss after successful renewal', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });
    const onDismiss = vi.fn();

    render(<BondRenewalBanner agentName="Elena" onDismiss={onDismiss} />);

    fireEvent.click(screen.getByText('Renovar'));

    await waitFor(() => {
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  it('hides the banner after successful renewal', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    render(<BondRenewalBanner agentName="Elena" />);

    fireEvent.click(screen.getByText('Renovar'));

    await waitFor(() => {
      expect(screen.queryByText(/Elena/)).toBeNull();
    });
  });

  it('has correct accessibility attributes', () => {
    render(<BondRenewalBanner agentName="Elena" />);

    const banner = document.getElementById('bond-renewal-banner');
    expect(banner?.getAttribute('role')).toBe('status');
    expect(banner?.getAttribute('aria-live')).toBe('polite');
  });
});
