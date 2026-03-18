/**
 * apps/web/src/features/auth/lib/login.lib.ts
 *
 * Funciones puras para la lógica de login — separadas para poder testarlas
 * sin dependencias de Supabase/Drizzle (ambas son server-only).
 */

export type AppRole = "buyer" | "agent" | "agency_admin" | "platform_admin";

/**
 * Mapea el rol RBAC a la ruta de destino del panel correspondiente.
 *
 * @param role - Rol del usuario o `undefined` si no hay perfil en DB
 * @returns Ruta de redirección absoluta (siempre comienza con "/")
 */
export function getRedirectPathForRole(role: AppRole | undefined): string {
  switch (role) {
    case "agent":
      return "/agent";
    case "agency_admin":
      return "/agency/listings";
    case "platform_admin":
      return "/admin";
    default:
      return "/swipe"; // buyer y fallback
  }
}
