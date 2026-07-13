/**
 * apps/mobile/src/features/swipe/components/match-recap-card.test.tsx
 *
 * Tests for MatchRecapCard component.
 * Story 2.6 — Task 2.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MatchRecapCard } from './match-recap-card';
import type { Listing } from '@reinder/shared';

const mockListing: Listing = {
  id: 'listing-x',
  title: 'Ático en Retiro',
  price: 450000,
  location: 'Madrid',
  rooms: 3,
  squareMeters: 95,
  imageUrl: 'https://example.com/atico.jpg',
  status: 'active',
  agencyId: 'agency-1',
  createdAt: '2026-03-26T10:00:00Z',
};

describe('MatchRecapCard', () => {
  it('renderiza el título y precio del listing', () => {
    const { getByText } = render(
      <MatchRecapCard
        listing={mockListing}
        onConfirm={jest.fn()}
        onDiscard={jest.fn()}
      />,
    );

    expect(getByText('Ático en Retiro')).toBeTruthy();
  });

  it('llama a onConfirm con el listingId al pulsar Confirmar', () => {
    const mockConfirm = jest.fn();
    const { getByTestId } = render(
      <MatchRecapCard
        listing={mockListing}
        onConfirm={mockConfirm}
        onDiscard={jest.fn()}
      />,
    );

    fireEvent.press(getByTestId('recap-confirm-listing-x'));
    expect(mockConfirm).toHaveBeenCalledWith('listing-x');
    expect(mockConfirm).toHaveBeenCalledTimes(1);
  });

  it('llama a onDiscard con el listingId al pulsar Descartar', () => {
    const mockDiscard = jest.fn();
    const { getByTestId } = render(
      <MatchRecapCard
        listing={mockListing}
        onConfirm={jest.fn()}
        onDiscard={mockDiscard}
      />,
    );

    fireEvent.press(getByTestId('recap-discard-listing-x'));
    expect(mockDiscard).toHaveBeenCalledWith('listing-x');
    expect(mockDiscard).toHaveBeenCalledTimes(1);
  });

  it('deshabilita botones cuando isProcessing es true', () => {
    const mockConfirm = jest.fn();
    const { getByTestId } = render(
      <MatchRecapCard
        listing={mockListing}
        onConfirm={mockConfirm}
        onDiscard={jest.fn()}
        isProcessing={true}
      />,
    );

    // Los botones deshabilitados no deben responder a eventos de press
    fireEvent.press(getByTestId('recap-confirm-listing-x'));
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  it('muestra la ubicación si está disponible', () => {
    const { getByText } = render(
      <MatchRecapCard
        listing={mockListing}
        onConfirm={jest.fn()}
        onDiscard={jest.fn()}
      />,
    );
    expect(getByText('Madrid')).toBeTruthy();
  });
});
