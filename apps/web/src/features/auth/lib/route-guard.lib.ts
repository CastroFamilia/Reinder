/**
 * apps/web/src/features/auth/lib/route-guard.lib.ts
 *
 * Lib pura para sanitización del parámetro `next` en el flujo de
 * redirect-back tras login. Story 1.6.
 *
 * Reglas de seguridad:
 * - Debe empezar con "/" — previene open redirect a dominios externos
 * - No puede ser una ruta de auth — previene bucles de redirect
 * - No puede estar vacío o ser undefined
 */

const AUTH_PATHS = ["/login", "/register", "/auth"];

/**
 * Devuelve el path de redirección post-login si es seguro, o `null`.
 *
 * @param next - Valor del searchParam `?next=` (puede ser undefined)
 * @returns El path sanitizado o `null` si no es seguro/válido
 *
 * @example
 * getSafeNextPath("/swipe")        // → "/swipe"
 * getSafeNextPath("/agent/clientes")// → "/agent/clientes"
 * getSafeNextPath(undefined)        // → null
 * getSafeNextPath("")               // → null
 * getSafeNextPath("http://evil.com")// → null (open redirect)
 * getSafeNextPath("/login")         // → null (auth loop)
 */
export function getSafeNextPath(next: string | undefined | null): string | null {
  if (!next || !next.startsWith("/")) return null;
  if (AUTH_PATHS.some((p) => next.startsWith(p))) return null;
  return next;
}
