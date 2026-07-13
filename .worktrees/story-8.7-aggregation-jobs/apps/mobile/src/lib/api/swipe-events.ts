/**
 * apps/mobile/src/lib/api/swipe-events.ts
 *
 * Cliente API para registrar eventos de swipe (match/reject).
 * Llama a POST /api/v1/swipe-events en apps/web.
 *
 * Source: architecture.md#API & Communication Patterns
 * Source: epics.md#Story-2.3 (AC4)
 */
import type { ApiResponse, SwipeEvent, CreateSwipeEventPayload } from '@reinder/shared';

const API_BASE_URL =
  (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000') + '/api/v1';

/**
 * Registra un evento de swipe (match o reject) en el servidor.
 * Si la red no está disponible, retorna un error para que el store gestione el encolado offline.
 */
export async function postSwipeEvent(
  payload: CreateSwipeEventPayload,
  token: string,
): Promise<ApiResponse<SwipeEvent>> {
  try {
    const response = await fetch(`${API_BASE_URL}/swipe-events`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return {
        data: null,
        error: {
          code: `HTTP_${response.status}`,
          message: `Error al registrar swipe: ${response.statusText}`,
        },
      };
    }

    return (await response.json()) as ApiResponse<SwipeEvent>;
  } catch {
    return {
      data: null,
      error: {
        code: 'NETWORK_ERROR',
        message: 'Sin conexión — el evento se sincronizará cuando vuelva la conexión',
      },
    };
  }
}
