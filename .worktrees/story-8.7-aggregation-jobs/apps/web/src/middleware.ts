/**
 * apps/web/src/middleware.ts
 *
 * Middleware de autenticación de Next.js.
 * Protege todas las rutas del área de usuario (dashboard + feed).
 *
 * Estrategia de seguridad (doble capa):
 * 1. Middleware (aquí): verifica que el usuario ESTÁ autenticado.
 *    Si no lo está → redirect /login.
 * 2. Server Component (cada página): verifica que el rol es correcto.
 *    Si el rol no coincide → redirect /swipe.
 *
 * Source: architecture.md#Frontend Architecture, Story 1.5 Dev Notes
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANTE: No llamar a supabase.auth.getUser() dentro de un bloque
  // try/catch ya que interrumpe el refresco del token de sesión.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Usuario no autenticado → redirect al login preservando la URL original
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

/**
 * Rutas protegidas — requieren autenticación.
 *
 * NOTA: La verificación de ROL específico (agent, agency_admin, etc.)
 * NO se hace aquí sino en cada Server Component. El middleware solo
 * garantiza que el usuario está autenticado.
 *
 * Rutas cubiertas:
 * - /swipe/*    → comprador autenticado
 * - /matches/*  → comprador autenticado
 * - /agent/*    → agente (verificación de rol en la página)
 * - /agency/*   → administrador de agencia (verificación de rol en la página)
 * - /admin/*    → administrador de plataforma (verificación de rol en la página)
 */
export const config = {
  matcher: [
    "/swipe/:path*",
    "/matches/:path*",
    "/agent/:path*",
    "/agency/:path*",
    "/admin/:path*",
  ],
};
