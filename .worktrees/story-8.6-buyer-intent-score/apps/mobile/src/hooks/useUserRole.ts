/**
 * apps/mobile/src/hooks/useUserRole.ts
 *
 * Hook para obtener el rol del usuario desde la sesión de Supabase.
 * Se usa en App.tsx para decidir qué TabNavigator renderizar.
 *
 * - Devuelve 'buyer' por defecto (sin sesión o sin metadata de rol)
 * - Devuelve el rol exacto si está en user_metadata.role
 *
 * Story 2.8 — Task 5 (AC: 5)
 * Epic 4: AgentTabNavigator usará este hook para el routing de agente
 */
import { useAuthSession } from './useAuthSession';

/** Roles definidos en la arquitectura (RBAC Supabase) */
export type UserRole = 'buyer' | 'agent' | 'agency_admin' | 'platform_admin';

const VALID_ROLES: UserRole[] = ['buyer', 'agent', 'agency_admin', 'platform_admin'];

/**
 * Devuelve el rol del usuario autenticado.
 * Fallback: 'buyer' cuando no hay sesión o el rol no está en los valores válidos.
 */
export function useUserRole(): UserRole {
  const { session } = useAuthSession();

  const rawRole = session?.user?.user_metadata?.role;

  if (rawRole && VALID_ROLES.includes(rawRole as UserRole)) {
    return rawRole as UserRole;
  }

  return 'buyer';
}
