/**
 * apps/mobile/src/features/swipe/components/swipable-card.test.tsx
 *
 * Tests básicos para SwipableCard — verifica render sin crash, estructura,
 * y comportamiento del prop onInfo (Story 2.5).
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SwipableCard } from './swipable-card';
import type { Listing } from '@reinder/shared';

const mockListing: Listing = {
  id: 'listing-1',
  title: 'Piso en Chamberí',
  price: 350000,
  location: 'Chamberí, Madrid',
  rooms: 2,
  squareMeters: 75,
  imageUrl: 'https://example.com/photo.jpg',
  imageAlt: 'Piso luminoso en Chamberí',
  status: 'active',
  badge: 'NUEVA',
  agencyId: 'agency-1',
  createdAt: '2026-03-20T10:00:00Z',
};

describe('SwipableCard', () => {
  const mockOnMatch = jest.fn();
  const mockOnReject = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders sin crash con listing válido', () => {
    const { getByTestId } = render(
      <SwipableCard
        listing={mockListing}
        onMatch={mockOnMatch}
        onReject={mockOnReject}
        testID="swipable-card"
      />,
    );
    expect(getByTestId('swipable-card')).toBeTruthy();
  });

  it('renderiza el precio del listing', () => {
    const { getByText } = render(
      <SwipableCard
        listing={mockListing}
        onMatch={mockOnMatch}
        onReject={mockOnReject}
      />,
    );
    // El precio 350000 debe formatearse como moneda española
    expect(getByText(/350/)).toBeTruthy();
  });

  it('renderiza la ubicación del listing', () => {
    const { getAllByText } = render(
      <SwipableCard
        listing={mockListing}
        onMatch={mockOnMatch}
        onReject={mockOnReject}
      />,
    );
    // Puede haber múltiples instancias del texto (PropertyCard renderiza varios elementos con la ubicación)
    expect(getAllByText(/Chamberí/).length).toBeGreaterThan(0);
  });

  it('renderiza sin onInfo prop (compatibilidad hacia atrás)', () => {
    // No debe crashear si onInfo no se proporciona
    expect(() =>
      render(
        <SwipableCard
          listing={mockListing}
          onMatch={mockOnMatch}
          onReject={mockOnReject}
          testID="swipable-card"
        />,
      ),
    ).not.toThrow();
  });

  it('acepta onInfo prop sin crashear', () => {
    const mockOnInfo = jest.fn();
    expect(() =>
      render(
        <SwipableCard
          listing={mockListing}
          onMatch={mockOnMatch}
          onReject={mockOnReject}
          onInfo={mockOnInfo}
          testID="swipable-card"
        />,
      ),
    ).not.toThrow();
  });

  it('el tap gesture no llama a onMatch ni onReject', () => {
    const mockOnInfo = jest.fn();
    const { getByTestId } = render(
      <SwipableCard
        listing={mockListing}
        onMatch={mockOnMatch}
        onReject={mockOnReject}
        onInfo={mockOnInfo}
        testID="swipable-card"
      />,
    );
    // Presionar sobre la tarjeta no debe activar match ni reject
    fireEvent.press(getByTestId('swipable-card'));
    expect(mockOnMatch).not.toHaveBeenCalled();
    expect(mockOnReject).not.toHaveBeenCalled();
  });
});
