/**
 * apps/mobile/src/features/swipe/components/property-card.test.tsx
 *
 * Tests de render para PropertyCard.
 * Verifica: precio formateado, título, metadatos, badges, estados (default/nueva/vendida).
 *
 * Source: epics.md#Story-2.2 AC1-AC3, UX-DR2
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { PropertyCard } from './property-card';
import type { Listing } from '@reinder/shared';

// Mock de expo-blur (BlurView → view nativa)
jest.mock('expo-blur', () => ({
  BlurView: ({ children, testID }: { children?: React.ReactNode; testID?: string }) => {
    const { View } = require('react-native');
    return <View testID={testID}>{children}</View>;
  },
}));

const baseListing: Listing = {
  id: 'listing-test-1',
  title: 'Ático en Malasaña',
  price: 485000,
  location: 'Malasaña, Madrid',
  rooms: 3,
  squareMeters: 95,
  floor: 'Ático',
  imageUrl: 'https://example.com/photo.jpg',
  imageAlt: 'Ático luminoso en Malasaña',
  status: 'active',
  badge: 'EXCLUSIVA',
  agencyId: 'agency-1',
  createdAt: '2026-03-20T10:00:00Z',
};

describe('PropertyCard', () => {
  describe('renderiza elementos básicos', () => {
    it('muestra el precio formateado en EUR español', () => {
      const { getByText } = render(
        <PropertyCard listing={baseListing} testID="card" />,
      );
      // Formato: €485.000 (es-ES con currency EUR)
      expect(getByText(/485/)).toBeTruthy();
    });

    it('muestra el título de la propiedad', () => {
      const { getByTestId } = render(
        <PropertyCard listing={baseListing} testID="card" />,
      );
      const title = getByTestId('card-title');
      expect(title.props.children).toBe('Ático en Malasaña');
    });

    it('muestra los metadatos con habitaciones y m²', () => {
      const { getByTestId } = render(
        <PropertyCard listing={baseListing} testID="card" />,
      );
      const meta = getByTestId('card-meta');
      expect(meta.props.children).toContain('3 hab');
      expect(meta.props.children).toContain('95 m²');
      expect(meta.props.children).toContain('Malasaña, Madrid');
    });

    it('incluye la planta en metadatos cuando está disponible', () => {
      const { getByTestId } = render(
        <PropertyCard listing={baseListing} testID="card" />,
      );
      const meta = getByTestId('card-meta');
      expect(meta.props.children).toContain('Ático');
    });

    it('omite la planta en metadatos cuando no está disponible', () => {
      const listingNoFloor = { ...baseListing, floor: undefined };
      const { getByTestId } = render(
        <PropertyCard listing={listingNoFloor} testID="card" />,
      );
      const meta = getByTestId('card-meta');
      expect(meta.props.children).not.toContain('undefined');
    });
  });

  describe('renderiza badge EXCLUSIVA', () => {
    it('muestra el badge cuando listing tiene badge', () => {
      const { getByTestId } = render(
        <PropertyCard listing={baseListing} testID="card" />,
      );
      expect(getByTestId('card-badge')).toBeTruthy();
    });

    it('no muestra badge cuando no hay badge en el listing', () => {
      const listingNoBadge = { ...baseListing, badge: undefined };
      const { queryByTestId } = render(
        <PropertyCard listing={listingNoBadge} testID="card" />,
      );
      expect(queryByTestId('card-badge')).toBeNull();
    });
  });

  describe('estado NUEVA', () => {
    it('renderiza correctamente un listing con badge NUEVA', () => {
      const listingNueva: Listing = {
        ...baseListing,
        id: 'listing-nueva',
        badge: 'NUEVA',
        status: 'active',
      };
      const { getByTestId } = render(
        <PropertyCard listing={listingNueva} testID="card" />,
      );
      expect(getByTestId('card-badge')).toBeTruthy();
      expect(getByTestId('card-title').props.children).toBe('Ático en Malasaña');
    });
  });

  describe('estado VENDIDA', () => {
    it('muestra badge VENDIDA cuando el listing está vendido', () => {
      const listingVendida: Listing = {
        ...baseListing,
        id: 'listing-vendida',
        status: 'sold',
        badge: 'VENDIDA',
      };
      const { getByTestId } = render(
        <PropertyCard listing={listingVendida} testID="card" />,
      );
      expect(getByTestId('card-badge')).toBeTruthy();
    });

    it('fuerza badge VENDIDA aunque el listing no lo tenga en el campo badge', () => {
      const listingVendidaSinBadge: Listing = {
        ...baseListing,
        id: 'listing-vendida-2',
        status: 'sold',
        badge: undefined,
      };
      const { getByTestId } = render(
        <PropertyCard listing={listingVendidaSinBadge} testID="card" />,
      );
      // El badge siempre se muestra para sold
      expect(getByTestId('card-badge')).toBeTruthy();
    });
  });

  describe('accesibilidad', () => {
    it('imagen tiene accessibilityLabel descriptivo', () => {
      const { getByTestId } = render(
        <PropertyCard listing={baseListing} testID="card" />,
      );
      const img = getByTestId('card-image');
      expect(img.props.accessibilityLabel).toBeTruthy();
      expect(img.props.accessibilityLabel).toContain('Malasaña');
    });

    it('usa imageAlt cuando está disponible', () => {
      const { getByTestId } = render(
        <PropertyCard listing={baseListing} testID="card" />,
      );
      const img = getByTestId('card-image');
      expect(img.props.accessibilityLabel).toBe('Ático luminoso en Malasaña');
    });

    it('genera alt text desde título+ubicación cuando imageAlt no está disponible', () => {
      const listingNoAlt = { ...baseListing, imageAlt: undefined };
      const { getByTestId } = render(
        <PropertyCard listing={listingNoAlt} testID="card" />,
      );
      const img = getByTestId('card-image');
      expect(img.props.accessibilityLabel).toContain('Malasaña, Madrid');
    });
  });
});
