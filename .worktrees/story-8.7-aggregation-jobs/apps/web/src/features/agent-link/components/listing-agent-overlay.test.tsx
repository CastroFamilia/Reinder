/**
 * apps/web/src/features/agent-link/components/listing-agent-overlay.test.tsx
 *
 * Unit tests for AgentContactCard and NoAgentBanner.
 * Tests: render with/without avatar, compact mode, representative badge, no-agent banner.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgentContactCard, NoAgentBanner } from './listing-agent-overlay';

describe('AgentContactCard', () => {
  it('renders agent name', () => {
    render(<AgentContactCard name="Elena García" />);
    expect(screen.getByText('Elena García')).toBeTruthy();
  });

  it('renders initials when no avatar URL', () => {
    render(<AgentContactCard name="Elena García" />);
    expect(screen.getByText('EG')).toBeTruthy();
  });

  it('renders avatar image when URL is provided', () => {
    render(<AgentContactCard name="Elena García" avatarUrl="https://example.com/avatar.jpg" />);
    const img = screen.getByAltText('Elena García');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('https://example.com/avatar.jpg');
  });

  it('renders phone number when provided', () => {
    render(<AgentContactCard name="Elena" phone="+34 612 345 678" />);
    expect(screen.getByText('+34 612 345 678')).toBeTruthy();
  });

  it('does not render phone when not provided', () => {
    render(<AgentContactCard name="Elena" />);
    expect(screen.queryByText(/\+34/)).toBeNull();
  });

  it('shows representative label when isRepresentative=true', () => {
    render(<AgentContactCard name="Elena" isRepresentative />);
    expect(screen.getByText('Tu Agente Representante')).toBeTruthy();
  });

  it('does not show representative label when isRepresentative=false', () => {
    render(<AgentContactCard name="Elena" />);
    expect(screen.queryByText(/representante/i)).toBeNull();
  });

  it('renders compact mode with correct ID', () => {
    render(<AgentContactCard name="Elena" compact />);
    expect(document.getElementById('agent-contact-compact')).toBeTruthy();
    expect(document.getElementById('agent-contact-full')).toBeNull();
  });

  it('renders full mode by default with correct ID', () => {
    render(<AgentContactCard name="Elena" />);
    expect(document.getElementById('agent-contact-full')).toBeTruthy();
    expect(document.getElementById('agent-contact-compact')).toBeNull();
  });

  it('compact mode shows representative badge text', () => {
    render(<AgentContactCard name="Elena" isRepresentative compact />);
    expect(screen.getByText('Tu agente representante')).toBeTruthy();
  });

  it('generates correct initials from multi-word names', () => {
    render(<AgentContactCard name="María José Fernández" />);
    // Takes first 2 initials
    expect(screen.getByText('MJ')).toBeTruthy();
  });
});

describe('NoAgentBanner', () => {
  it('renders the no-agent CTA', () => {
    render(<NoAgentBanner />);
    expect(screen.getByText('¿Tienes un agente?')).toBeTruthy();
    expect(screen.getByText('Pídele tu link de Reinder')).toBeTruthy();
  });

  it('renders with correct ID', () => {
    render(<NoAgentBanner />);
    expect(document.getElementById('no-agent-banner')).toBeTruthy();
  });
});
