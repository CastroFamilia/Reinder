/**
 * apps/web/src/app/api/auth/callback/route.ts
 *
 * Route Handler para el callback de Google OAuth (PKCE flow).
 *
 * Flujo:
 * 1. Google redirige aquí tras la autorización del usuario con ?code=...
 * 2. Intercambiamos el code por una sesión con exchangeCodeForSession()
 * 3. Usamos el cliente Supabase autenticado para leer/escribir user_profiles
 *    (evita la instabilidad del cliente postgres.js en Route Handlers)
 * 4. Si es usuario nuevo → crear user_profile sin terms_accepted_at → /terms
 * 5. Si tiene terms_accepted_at → redirigir a `next` (si existe y es seguro) o /swipe
 *
 * Story 1.6 fix M1: Lee el param `?next=` que signInWithGoogle codificó
 * en la redirectTo URL. Usa getSafeNextPath() para sanitizarlo antes de usarlo.
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getSafeNextPath } from "@/features/auth/lib/route-guard.lib";
import { getRedirectPathForRole } from "@/features/auth/lib/login.lib";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;

  // Leer y sanitizar el next= que vino en la redirectTo URL (fix M1)
  const rawNext = requestUrl.searchParams.get("next");
  const safeNext = getSafeNextPath(rawNext ?? undefined);

  if (!code) {
    console.error("[auth/callback] No code received from Google OAuth");
    return NextResponse.redirect(`${origin}/login?error=oauth_no_code`);
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    console.error("[auth/callback] exchangeCodeForSession error:", error);
    return NextResponse.redirect(`${origin}/login?error=oauth_exchange_failed`);
  }

  // Verificar si ya existe perfil en user_profiles usando el cliente Supabase
  // (el cliente ya tiene la sesión del usuario tras exchangeCodeForSession)
  const { data: existingProfile, error: profileError } = await supabase
    .from("user_profiles")
    .select("id, terms_accepted_at, role")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError) {
    console.error("[auth/callback] Error querying user_profiles:", profileError);
    return NextResponse.redirect(`${origin}/login?error=db_error`);
  }

  if (!existingProfile) {
    // Usuario nuevo vía Google OAuth → crear perfil sin terms_accepted_at
    const { error: insertError } = await supabase
      .from("user_profiles")
      .insert({ id: data.user.id, role: "buyer" });

    if (insertError) {
      console.error("[auth/callback] Error inserting user_profile:", insertError);
      // No continuar — si el perfil no existe, acceptTerms() haría un UPDATE
      // sobre 0 filas y el usuario quedaría en estado corrupto (sin terms_accepted_at).
      return NextResponse.redirect(`${origin}/login?error=profile_creation_failed`);
    }
    // Para nuevos usuarios → siempre T&C primero (next= se ignora hasta completar T&C)
    return NextResponse.redirect(`${origin}/terms`);
  }

  // Perfil existente sin T&C aceptados (edge case)
  if (!existingProfile.terms_accepted_at) {
    return NextResponse.redirect(`${origin}/terms`);
  }

  // Usuario existente con T&C aceptados → redirigir a next (si seguro) o su panel por defecto
  const defaultPath = getRedirectPathForRole(existingProfile.role);
  const destination = safeNext ? `${origin}${safeNext}` : `${origin}${defaultPath}`;
  return NextResponse.redirect(destination);
}
