"use server";

/**
 * apps/web/src/features/auth/actions/oauth.ts
 *
 * Server Action para iniciar el flujo OAuth con Google.
 * Usa el flujo PKCE gestionado internamente por @supabase/ssr.
 * El code_verifier se guarda en una cookie automáticamente.
 */
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function signInWithGoogle(): Promise<void> {
  const supabase = await createClient();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${appUrl}/api/auth/callback`,
      queryParams: {
        access_type: "offline",
        prompt: "consent", // Fuerza pantalla de consentimiento Google → garantiza refresh_token
      },
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
