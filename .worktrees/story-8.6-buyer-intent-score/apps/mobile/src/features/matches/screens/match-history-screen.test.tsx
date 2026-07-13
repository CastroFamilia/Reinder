/**
 * apps/mobile/src/features/matches/screens/match-history-screen.test.tsx
 * Story 2.7 — Task 5
 */
import { render, waitFor } from '@testing-library/react-native';
import { MatchHistoryScreen } from './match-history-screen';
import { useMatchHistoryStore } from '../../../stores/use-match-history-store';

jest.mock('../../../stores/use-match-history-store', () => ({
  useMatchHistoryStore: jest.fn(),
}));

jest.mock('../../../components/ui/glass-panel', () => ({
  GlassPanel: ({ children, style, testID }: any) => {
    const { View } = require('react-native');
    return <View style={style} testID={testID}>{children}</View>;
  },
}));

jest.mock('../../../components/layout/screen-background', () => ({
  ScreenBackground: ({ children }: any) => {
    const { View } = require('react-native');
    return <View>{children}</View>;
  },
}));

const mockFetchMatches = jest.fn().mockResolvedValue(undefined);
const mockMarkVisited = jest.fn();
const mockStore = useMatchHistoryStore as unknown as jest.Mock;

const MOCK_MATCHES = [
  {
    matchId: 'match-1',
    listingId: 'listing-1',
    imageUrl: 'https://example.com/photo.jpg',
    price: 285000,
    address: 'Calle Gran Vía 45, Madrid',
    listingStatus: 'active',
    matchedAt: new Date(Date.now() - 7200000).toISOString(),
    confirmed: true,
  },
];

describe('MatchHistoryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('muestra skeleton durante la carga', () => {
    mockStore.mockReturnValue({
      matches: [],
      isLoading: true,
      fetchMatches: mockFetchMatches,
      markVisited: mockMarkVisited,
    });

    const { getByTestId } = render(<MatchHistoryScreen token="mock-token" />);
    expect(getByTestId('match-history-loading')).toBeTruthy();
  });

  it('muestra la lista cuando hay matches cargados', async () => {
    mockStore.mockReturnValue({
      matches: MOCK_MATCHES,
      isLoading: false,
      fetchMatches: mockFetchMatches,
      markVisited: mockMarkVisited,
    });

    const { getByTestId } = render(<MatchHistoryScreen token="mock-token" />);
    await waitFor(() => {
      expect(getByTestId('match-history-list')).toBeTruthy();
    });
  });

  it('muestra empty state cuando no hay matches', () => {
    mockStore.mockReturnValue({
      matches: [],
      isLoading: false,
      fetchMatches: mockFetchMatches,
      markVisited: mockMarkVisited,
    });

    const { getByTestId, getByText } = render(<MatchHistoryScreen token="mock-token" />);
    expect(getByTestId('match-history-empty')).toBeTruthy();
    expect(getByText('Swipea para empezar a matchear')).toBeTruthy();
  });

  it('llama a fetchMatches al montar', async () => {
    mockStore.mockReturnValue({
      matches: [],
      isLoading: false,
      fetchMatches: mockFetchMatches,
      markVisited: mockMarkVisited,
    });

    render(<MatchHistoryScreen token="mock-token" />);
    await waitFor(() => {
      expect(mockFetchMatches).toHaveBeenCalledWith('mock-token');
    });
  });
});
