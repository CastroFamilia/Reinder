"use server";

/**
 * apps/web/src/features/auth/actions/terms.ts
 *
 * Server Action para aceptar los Términos y Condiciones.
 * Usa UPSERT en lugar de UPDATE para garantizar que el perfil existe
 * incluso ante el edge case donde el INSERT del callback falló (M1→M2 fix).
 */
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function acceptTerms(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let upsertError: unknown = null;
  try {
    // UPSERT: crea el perfil si no existe, o actualiza terms_accepted_at si existe.
    // Se usa .select("id") para detectar si alguna fila fue realmente afectada.
    const { data, error } = await supabase
      .from("user_profiles")
      .upsert(
        { id: user.id, role: "buyer", terms_accepted_at: new Date().toISOString() },
        { onConflict: "id" }
      )
      .select("id");

    if (error) {
      upsertError = error;
    } else if (!data || data.length === 0) {
      // Upsert no devolvió filas → algo inesperado ocurrió
      upsertError = new Error("upsert returned no rows");
    }
  } catch (error) {
    console.error("[acceptTerms] Error upserting user_profile:", error);
    upsertError = error;
  }

  if (upsertError) {
    console.error("[acceptTerms] upsert failed:", upsertError);
    redirect("/terms?error=update_failed");
  }

  redirect("/swipe");
}
