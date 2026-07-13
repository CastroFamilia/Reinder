/**
 * Story 5.1 — UI Tests: CrmConnectionForm
 *
 * TDD RED PHASE: These tests are intentionally failing (test.skip).
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CrmConnectionForm } from './CrmConnectionForm';

describe('CrmConnectionForm', () => {
  it('renders the form inputs for Inmovilla', () => {
    render(<CrmConnectionForm onSubmit={vi.fn()} />);
    expect(screen.getByLabelText(/API Key/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Webhook URL/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Conectar/i })).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const handleSubmit = vi.fn();
    render(<CrmConnectionForm onSubmit={handleSubmit} />);
    
    fireEvent.click(screen.getByRole('button', { name: /Conectar/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/La API Key es obligatoria/i)).toBeInTheDocument();
      expect(handleSubmit).not.toHaveBeenCalled();
    });
  });

  it('submits the form with valid data', async () => {
    const handleSubmit = vi.fn();
    render(<CrmConnectionForm onSubmit={handleSubmit} />);
    
    fireEvent.change(screen.getByLabelText(/API Key/i), { target: { value: 'test-key' } });
    fireEvent.change(screen.getByLabelText(/Webhook URL/i), { target: { value: 'https://webhook.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Conectar/i }));
    
    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        crmType: 'inmovilla',
        apiKey: 'test-key',
        webhookUrl: 'https://webhook.com',
      });
    });
  });
});
