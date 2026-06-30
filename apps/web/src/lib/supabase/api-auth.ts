/**
 * apps/web/src/lib/supabase/api-auth.ts
 *
 * Helper de autenticación para API routes que soporta AMBOS métodos:
 * 1. Cookies — para requests desde la web (Next.js SSR/browser)
 * 2. Bearer token — para requests desde la app mobile (Expo)
 *
 * Flujo:
 * - Si la request tiene header `Authorization: Bearer <token>`, usa el token
 *   para autenticar directamente con supabase.auth.getUser(token).
 * - Si no, cae al método estándar basado en cookies (createClient de server.ts).
 *
 * Source: architecture.md — API & Communication Patterns
 */
import { createServerClient } from '@supabase/ssr';
import { createClient as createCookieClient } from './server';
import type { User } from '@supabase/supabase-js';

type AuthResult =
  | { user: User; error: null }
  | { user: null; error: string };

/**
 * Authenticate an API request from either web (cookies) or mobile (Bearer token).
 */
export async function authenticateApiRequest(
  request: Request,
): Promise<AuthResult> {
  const authHeader = request.headers.get('authorization') ?? '';
  const bearerToken = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : null;

  if (bearerToken) {
    // Mobile path: verify the JWT directly
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => [],
          setAll: () => {},
        },
      },
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(bearerToken);

    if (error || !user) {
      return { user: null, error: error?.message ?? 'Invalid token' };
    }

    return { user, error: null };
  }

  // Web path: use cookie-based auth
  const supabase = await createCookieClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, error: error?.message ?? 'Not authenticated' };
  }

  return { user, error: null };
}
