/**
 * apps/web/src/lib/supabase/server.ts
 *
 * Cliente Supabase Auth para uso en el SERVER (Server Components, Route Handlers, Server Actions).
 * Gestiona cookies de sesión automáticamente con el App Router de Next.js 15.
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Components no pueden escribir cookies — ignorar.
            // Las cookies se actualizan en middleware o Route Handlers.
          }
        },
      },
    }
  );
}
