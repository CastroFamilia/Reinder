/**
 * apps/mobile/src/stores/use-match-store.ts
 *
 * Store de matches para el TabBar badge (Story 2.8).
 * Wrapper sobre useMatchHistoryStore con la interfaz esperada por el TabBar.
 *
 * `unreadMatchCount` = `newMatchesSinceLastVisit` del store existente (Story 2.7)
 * `markAllAsRead` = `markVisited` del store existente
 *
 * Story 2.8 — Task 6 (AC: 4)
 */
import { useMatchHistoryStore } from './use-match-history-store';

/**
 * Hook para obtener el contador de matches no leídos y marcarlo como leído.
 * Usado por BuyerTabNavigator para mostrar badge en la tab Matches.
 */
export function useMatchStore() {
  const unreadMatchCount = useMatchHistoryStore((state) => state.newMatchesSinceLastVisit);
  const markAllAsRead = useMatchHistoryStore((state) => state.markVisited);

  return {
    unreadMatchCount,
    markAllAsRead,
  };
}

/**
 * Acceso directo al estado del match store (para tests y utils fuera de componentes).
 * Usa getState() del store subyacente para evitar asignar propiedades a la función.
 */
export function getMatchStoreState() {
  return {
    unreadMatchCount: useMatchHistoryStore.getState().newMatchesSinceLastVisit,
    markAllAsRead: useMatchHistoryStore.getState().markVisited,
  };
}
