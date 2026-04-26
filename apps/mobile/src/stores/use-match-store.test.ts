/**
 * apps/mobile/src/stores/use-match-store.test.ts
 *
 * Story 2.8 — Task 6: Tests para useMatchStore
 */
import { useMatchHistoryStore } from './use-match-history-store';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('useMatchStore', () => {
  beforeEach(() => {
    useMatchHistoryStore.setState({
      matches: [],
      isLoading: false,
      lastVisitAt: null,
      newMatchesSinceLastVisit: 0,
      isBadgeDismissed: false,
    });
  });

  it('unreadMatchCount es 0 por defecto', () => {
    const { useMatchStore } = require('./use-match-store');
    const { unreadMatchCount } = useMatchStore.getState();
    expect(unreadMatchCount).toBe(0);
  });

  it('unreadMatchCount refleja newMatchesSinceLastVisit del store subyacente', () => {
    useMatchHistoryStore.setState({ newMatchesSinceLastVisit: 3 });
    const { useMatchStore } = require('./use-match-store');
    const { unreadMatchCount } = useMatchStore.getState();
    expect(unreadMatchCount).toBe(3);
  });

  it('markAllAsRead resetea el contador a 0', () => {
    useMatchHistoryStore.setState({ newMatchesSinceLastVisit: 5 });
    const { useMatchStore } = require('./use-match-store');
    const { markAllAsRead } = useMatchStore.getState();
    markAllAsRead();
    expect(useMatchHistoryStore.getState().newMatchesSinceLastVisit).toBe(0);
  });
});
