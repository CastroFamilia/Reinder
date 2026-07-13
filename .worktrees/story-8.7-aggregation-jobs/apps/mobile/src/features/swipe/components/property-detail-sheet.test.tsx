/**
 * apps/mobile/src/features/swipe/components/property-detail-sheet.test.tsx
 *
 * Tests para PropertyDetailSheet — Story 2.5
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PropertyDetailSheet } from './property-detail-sheet';
import type { Listing } from '@reinder/shared';

const mockListing: Listing = {
  id: 'listing-1',
  title: 'Piso en Malasaña',
  price: 485000,
  location: 'Malasaña, Madrid',
  rooms: 3,
  squareMeters: 95,
  floor: '5ª',
  imageUrl: 'https://example.com/image.jpg',
  imageAlt: 'Piso luminoso en Malasaña',
  status: 'active',
  badge: 'EXCLUSIVA',
  agencyId: 'agency-1',
  createdAt: '2026-03-15T10:00:00Z',
  description: 'Precioso piso reformado con vistas al parque, muy luminoso.',
  garage: true,
};

const listingWithoutOptionals: Listing = {
  id: 'listing-2',
  title: 'Apartamento en Lavapiés',
  price: 250000,
  location: 'Lavapiés, Madrid',
  rooms: 1,
  squareMeters: 45,
  imageUrl: 'https://example.com/image2.jpg',
  status: 'active',
  agencyId: 'agency-1',
  createdAt: '2026-03-15T10:00:00Z',
};

describe('PropertyDetailSheet', () => {
  const defaultProps = {
    visible: true,
    listing: mockListing,
    onClose: jest.fn(),
    onMatch: jest.fn(),
    onReject: jest.fn(),
    testID: 'detail-sheet',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renderiza el precio y título del listing', () => {
    const { getByTestId } = render(<PropertyDetailSheet {...defaultProps} />);
    // Intl.NumberFormat puede usar narrow no-break space (U+202F) antes del símbolo €
    // → usar regex para manejar variantes de whitespace entre entornos
    expect(getByTestId('detail-sheet-price').props.children).toMatch(/485\.000\s*€/);
    expect(getByTestId('detail-sheet-title').props.children).toBe('Piso en Malasaña');
  });

  it('renderiza la ubicación del listing', () => {
    const { getByTestId } = render(<PropertyDetailSheet {...defaultProps} />);
    const location = getByTestId('detail-sheet-location');
    expect(location.props.children).toContain('Malasaña, Madrid');
  });

  it('renderiza metadatos incluyendo habitaciones, m², planta y garaje', () => {
    const { getByTestId } = render(<PropertyDetailSheet {...defaultProps} />);
    const meta = getByTestId('detail-sheet-meta').props.children;
    expect(meta).toContain('3 hab');
    expect(meta).toContain('95 m²');
    expect(meta).toContain('Planta 5ª');
    expect(meta).toContain('Garaje incluido');
  });

  it('renderiza la descripción del listing', () => {
    const { getByTestId } = render(<PropertyDetailSheet {...defaultProps} />);
    expect(getByTestId('detail-sheet-description').props.children).toBe(
      'Precioso piso reformado con vistas al parque, muy luminoso.',
    );
  });

  it('muestra "Sin descripción disponible" cuando description es undefined', () => {
    const { getByTestId } = render(
      <PropertyDetailSheet {...defaultProps} listing={listingWithoutOptionals} />,
    );
    expect(getByTestId('detail-sheet-description').props.children).toBe(
      'Sin descripción disponible',
    );
  });

  it('no muestra garage en metadatos cuando garage es undefined', () => {
    const { getByTestId } = render(
      <PropertyDetailSheet {...defaultProps} listing={listingWithoutOptionals} />,
    );
    const meta = getByTestId('detail-sheet-meta').props.children;
    expect(meta).not.toContain('Garaje');
  });

  it('botón "Me interesa" llama onMatch pero NO llama onClose (el padre cierra el sheet)', () => {
    const onMatch = jest.fn();
    const onClose = jest.fn();
    const { getByTestId } = render(
      <PropertyDetailSheet {...defaultProps} onMatch={onMatch} onClose={onClose} />,
    );
    fireEvent.press(getByTestId('detail-sheet-match-btn'));
    expect(onMatch).toHaveBeenCalledTimes(1);
    // El padre (SwipeScreen.handleDetailMatch) es responsable de cerrar — CR Story 2.5 H1 fix
    expect(onClose).not.toHaveBeenCalled();
  });

  it('botón "No me interesa" llama onReject pero NO llama onClose (el padre cierra el sheet)', () => {
    const onReject = jest.fn();
    const onClose = jest.fn();
    const { getByTestId } = render(
      <PropertyDetailSheet {...defaultProps} onReject={onReject} onClose={onClose} />,
    );
    fireEvent.press(getByTestId('detail-sheet-reject-btn'));
    expect(onReject).toHaveBeenCalledTimes(1);
    // El padre (SwipeScreen.handleDetailReject) es responsable de cerrar — CR Story 2.5 H1 fix
    expect(onClose).not.toHaveBeenCalled();
  });

  it('botón "Volver" llama onClose pero NO llama onMatch ni onReject', () => {
    const onClose = jest.fn();
    const onMatch = jest.fn();
    const onReject = jest.fn();
    const { getByTestId } = render(
      <PropertyDetailSheet
        {...defaultProps}
        onClose={onClose}
        onMatch={onMatch}
        onReject={onReject}
      />,
    );
    fireEvent.press(getByTestId('detail-sheet-close-btn'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onMatch).not.toHaveBeenCalled();
    expect(onReject).not.toHaveBeenCalled();
  });

  it('no renderiza nada si listing es null', () => {
    const { toJSON } = render(
      <PropertyDetailSheet {...defaultProps} listing={null} />,
    );
    expect(toJSON()).toBeNull();
  });

  it('renderiza hero image con accesibilidad correcta', () => {
    const { getByTestId } = render(<PropertyDetailSheet {...defaultProps} />);
    const hero = getByTestId('detail-sheet-hero');
    expect(hero.props.accessible).toBe(true);
    expect(hero.props.accessibilityLabel).toBe('Piso luminoso en Malasaña');
  });

  it('usa imageAlt genérico si imageAlt no está definido', () => {
    const { getByTestId } = render(
      <PropertyDetailSheet {...defaultProps} listing={listingWithoutOptionals} />,
    );
    const hero = getByTestId('detail-sheet-hero');
    expect(hero.props.accessibilityLabel).toBe('Foto de Apartamento en Lavapiés');
  });

  it('renderiza badge VENDIDA cuando status es sold', () => {
    const soldListing = { ...mockListing, status: 'sold' as const, badge: undefined };
    const { getByTestId } = render(
      <PropertyDetailSheet {...defaultProps} listing={soldListing} />,
    );
    // Badge VENDIDA debe estar presente
    expect(getByTestId('detail-sheet-badge')).toBeTruthy();
  });
});
