/**
 * apps/mobile/src/features/swipe/screens/match-recap-screen.test.tsx
 *
 * Tests for MatchRecapScreen.
 * Story 2.6 — Task 3.
 */
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { MatchRecapScreen } from './match-recap-screen';
import { useSwipeStore } from '../../../stores/use-swipe-store';
import type { Listing } from '@reinder/shared';

// Mock persist middleware
jest.mock('zustand/middleware', () => ({
  persist: (fn: unknown) => fn,
  createJSONStorage: () => ({}),
}));

jest.mock('../../../hooks/useAuthSession', () => ({
  useAuthSession: () => ({ session: { access_token: 'mock-token' }, user: null }),
}));

jest.mock('../../../lib/api/matches', () => ({
  confirmMatch: jest.fn().mockResolvedValue({ data: { confirmed: true }, error: null }),
  discardMatch: jest.fn().mockResolvedValue({ data: { deleted: true }, error: null }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

const mockListings: Listing[] = [
  {
    id: 'listing-1',
    title: 'Piso en Chueca',
    price: 320000,
    location: 'Madrid',
    rooms: 2,
    squareMeters: 65,
    imageUrl: 'https://example.com/1.jpg',
    status: 'active',
    agencyId: 'agency-1',
    createdAt: '2026-03-26T10:00:00Z',
  },
  {
    id: 'listing-2',
    title: 'Dúplex en Gràcia',
    price: 485000,
    location: 'Barcelona',
    rooms: 3,
    squareMeters: 90,
    imageUrl: 'https://example.com/2.jpg',
    status: 'active',
    agencyId: 'agency-1',
    createdAt: '2026-03-26T09:00:00Z',
  },
];

describe('MatchRecapScreen', () => {
  beforeEach(() => {
    useSwipeStore.setState({
      recapMatchIds: ['listing-1', 'listing-2'],
      pendingRecapIds: ['listing-1', 'listing-2'],
      isRecapVisible: true,
      consecutiveMatchCount: 0,
    });
  });

  it('muestra las cards de los matches en recapMatchIds', () => {
    const { getByTestId } = render(
      <MatchRecapScreen listings={mockListings} testID="recap-screen" />,
    );
    expect(getByTestId('recap-card-listing-1')).toBeTruthy();
    expect(getByTestId('recap-card-listing-2')).toBeTruthy();
  });

  it('muestra el estado empty cuando no quedan matches por gestionar', () => {
    useSwipeStore.setState({ recapMatchIds: [] });

    const { getByTestId } = render(
      <MatchRecapScreen listings={[]} testID="recap-screen" />,
    );
    expect(getByTestId('recap-empty')).toBeTruthy();
  });

  it('llama a dismissRecap al pulsar "Volver al feed" en estado empty', () => {
    useSwipeStore.setState({ recapMatchIds: [] });
    const dismissSpy = jest.spyOn(useSwipeStore.getState(), 'dismissRecap');

    const { getByTestId } = render(
      <MatchRecapScreen listings={[]} />,
    );
    fireEvent.press(getByTestId('recap-done-button'));
    expect(dismissSpy).toHaveBeenCalled();
  });

  it('llama a dismissRecap al pulsar "Gestionar después"', () => {
    const dismissSpy = jest.spyOn(useSwipeStore.getState(), 'dismissRecap');

    const { getByTestId } = render(
      <MatchRecapScreen listings={mockListings} />,
    );
    fireEvent.press(getByTestId('recap-skip-button'));
    expect(dismissSpy).toHaveBeenCalled();
  });

  it('muestra el header con el título correcto', () => {
    const { getByText } = render(
      <MatchRecapScreen listings={mockListings} />,
    );
    expect(getByText('Tus últimos matches')).toBeTruthy();
    expect(getByText('Reconfirma los que más te interesan')).toBeTruthy();
  });
});
