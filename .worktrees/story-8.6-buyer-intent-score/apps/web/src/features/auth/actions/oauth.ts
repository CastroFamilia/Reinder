"use server";

/**
 * apps/web/src/features/auth/actions/oauth.ts
 *
 * Server Action para iniciar el flujo OAuth con Google.
 * Usa el flujo PKCE gestionado internamente por @supabase/ssr.
 * El code_verifier se guarda en una cookie automáticamente.
 *
 * Story 1.6 fix M1: propaga el parámetro `next` (redirect-back) codificándolo
 * en el parámetro `state` del flujo OAuth de Supabase. El callback lo leerá
 * de `requestUrl.searchParams.get("next")` tras el intercambio del code.
 */
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSafeNextPath } from "@/features/auth/lib/route-guard.lib";

export async function signInWithGoogle(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.includes("localhost") 
    ? `${protocol}://${host}` 
    : process.env.NEXT_PUBLIC_APP_URL ?? `${protocol}://${host}`;

  // Leer y sanitizar el parámetro next — viene del input hidden de GoogleAuthButton
  const rawNext = formData.get("next");
  const safeNext = getSafeNextPath(
    typeof rawNext === "string" ? rawNext : undefined
  );

  // Construir la redirectTo URL con next= si procede.
  // Supabase OAuth añade ?code= al callback; nosotros añadimos ?next= antes.
  const callbackUrl = safeNext
    ? `${appUrl}/api/auth/callback?next=${encodeURIComponent(safeNext)}`
    : `${appUrl}/api/auth/callback`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl,
    },
  });

  if (error) {
    // En Server Actions no podemos devolver errores de forma limpia si usamos redirect,
    // por lo que redirigimos a login con un query param de error.
    redirect("/login?error=oauth_init_failed");
  }

  if (!data.url) {
    redirect("/login?error=oauth_no_url");
  }

  // Redirige el browser al URL de autorización de Google
  redirect(data.url);
}
