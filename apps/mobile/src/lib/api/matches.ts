/**
 * apps/mobile/src/lib/api/matches.ts
 *
 * Cliente API para operaciones sobre matches.
 * - PATCH /api/v1/matches/{id}/confirm — confirmar match desde recap
 * - DELETE /api/v1/matches/{id} — descartar match desde recap
 * - GET /api/v1/matches — historial completo de matches del comprador
 *
 * Source: architecture.md#API & Communication Patterns
 * Source: story 2-6-match-recap-screen.md (Tasks 5, 6)
 * Source: story 2-7-historial-matches-badge-nuevas-propiedades.md (Task 2)
 */
import type { ApiResponse, MatchHistoryItem } from '@reinder/shared';

const API_BASE_URL =
  (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000') + '/api/v1';

/**
 * Confirma un match desde el recap.
 */
export async function confirmMatch(
  matchId: string,
  token: string,
): Promise<ApiResponse<{ confirmed: boolean }>> {
  try {
    const response = await fetch(`${API_BASE_URL}/matches/${matchId}/confirm`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return {
        data: null,
        error: {
          code: `HTTP_${response.status}`,
          message: `Error al confirmar match: ${response.statusText}`,
        },
      };
    }

    return (await response.json()) as ApiResponse<{ confirmed: boolean }>;
  } catch {
    return {
      data: null,
      error: {
        code: 'NETWORK_ERROR',
        message: 'Sin conexión — no se pudo confirmar el match',
      },
    };
  }
}

/**
 * Descarta un match desde el recap.
 */
export async function discardMatch(
  matchId: string,
  token: string,
): Promise<ApiResponse<{ deleted: boolean }>> {
  try {
    const response = await fetch(`${API_BASE_URL}/matches/${matchId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return {
        data: null,
        error: {
          code: `HTTP_${response.status}`,
          message: `Error al descartar match: ${response.statusText}`,
        },
      };
    }

    return (await response.json()) as ApiResponse<{ deleted: boolean }>;
  } catch {
    return {
      data: null,
      error: {
        code: 'NETWORK_ERROR',
        message: 'Sin conexión — no se pudo descartar el match',
      },
    };
  }
}

/**
 * Obtiene el historial completo de matches del comprador autenticado.
 * Los matches vienen ordenados por fecha descendente (más recientes primero).
 */
export async function getMatches(
  token: string,
): Promise<ApiResponse<MatchHistoryItem[]>> {
  try {
    const response = await fetch(`${API_BASE_URL}/matches`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return {
        data: null,
        error: {
          code: `HTTP_${response.status}`,
          message: `Error al cargar historial de matches: ${response.statusText}`,
        },
      };
    }

    return (await response.json()) as ApiResponse<MatchHistoryItem[]>;
  } catch {
    return {
      data: null,
      error: {
        code: 'NETWORK_ERROR',
        message: 'Sin conexión — no se pudo cargar el historial',
      },
    };
  }
}
