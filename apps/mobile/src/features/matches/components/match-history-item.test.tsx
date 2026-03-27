/**
 * apps/mobile/src/features/matches/components/match-history-item.test.tsx
 * Story 2.7 — Task 4
 */
import { render, fireEvent } from '@testing-library/react-native';
import { MatchHistoryItemCard } from './match-history-item';
import type { MatchHistoryItem } from '@reinder/shared';

jest.mock('../../../components/ui/glass-panel', () => ({
  GlassPanel: ({ children, style }: any) => {
    const { View } = require('react-native');
    return <View style={style}>{children}</View>;
  },
}));

jest.mock('../../../components/ui/property-badge', () => ({
  PropertyBadge: ({ type, testID }: any) => {
    const { Text } = require('react-native');
    return <Text testID={testID}>{type}</Text>;
  },
}));

const MOCK_ACTIVE: MatchHistoryItem = {
  matchId: 'match-1',
  listingId: 'listing-1',
  imageUrl: 'https://example.com/photo.jpg',
  price: 285000,
  address: 'Calle Gran Vía 45, Madrid',
  listingStatus: 'active',
  matchedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  confirmed: true,
};

const MOCK_SOLD: MatchHistoryItem = {
  ...MOCK_ACTIVE,
  matchId: 'match-2',
  listingStatus: 'sold',
};

describe('MatchHistoryItemCard', () => {
  it('renderiza precio y dirección', () => {
    const { getByText } = render(
      <MatchHistoryItemCard item={MOCK_ACTIVE} onPress={jest.fn()} />,
    );
    expect(getByText(/285/)).toBeTruthy();
    expect(getByText('Calle Gran Vía 45, Madrid')).toBeTruthy();
  });

  it('llama a onPress con el ítem al pulsar', () => {
    const mockOnPress = jest.fn();
    const { getByRole } = render(
      <MatchHistoryItemCard item={MOCK_ACTIVE} onPress={mockOnPress} />,
    );
    fireEvent.press(getByRole('button'));
    expect(mockOnPress).toHaveBeenCalledWith(MOCK_ACTIVE);
  });

  it('muestra badge VENDIDA cuando listingStatus es sold', () => {
    const { getByText } = render(
      <MatchHistoryItemCard item={MOCK_SOLD} onPress={jest.fn()} />,
    );
    expect(getByText('VENDIDA')).toBeTruthy();
  });

  it('NO muestra badge VENDIDA cuando listingStatus es active', () => {
    const { queryByText } = render(
      <MatchHistoryItemCard item={MOCK_ACTIVE} onPress={jest.fn()} />,
    );
    expect(queryByText('VENDIDA')).toBeNull();
  });

  it('tiene accessibilityLabel descriptivo', () => {
    const { getByLabelText } = render(
      <MatchHistoryItemCard item={MOCK_ACTIVE} onPress={jest.fn()} />,
    );
    expect(getByLabelText(/Propiedad en Calle Gran Vía 45, Madrid/)).toBeTruthy();
  });
});
