"use server";

/**
 * apps/web/src/features/auth/actions/register.ts
 *
 * Server Action para registrar un nuevo comprador.
 * Crea la cuenta en Supabase Auth y el perfil en user_profiles vía Drizzle.
 *
 * Validaciones server-side:
 *  - termsAccepted debe ser "true" (no se puede bypassear desde el cliente)
 *  - Si falla la inserción en user_profiles se devuelve error (evita usuarios huérfanos)
 */
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/supabase/db";
import { userProfiles } from "@reinder/shared/db/schema";

export interface RegisterResult {
  success?: true;
  error?: string;
}

export async function registerUser(formData: FormData): Promise<RegisterResult> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const termsAccepted = formData.get("termsAccepted") === "true";

  // Validación server-side: T&C son obligatorios (GDPR)
  if (!termsAccepted) {
    return { error: "Debes aceptar los Términos y Condiciones para continuar." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    // Supabase devuelve este mensaje cuando el email ya está registrado
    if (
      error.message.toLowerCase().includes("already registered") ||
      error.message.toLowerCase().includes("user already registered")
    ) {
      return {
        error:
          "Ya existe una cuenta con este email. ¿Quieres iniciar sesión?",
      };
    }
    return { error: error.message };
  }

  if (data.user) {
    try {
      await db.insert(userProfiles).values({
        id: data.user.id,
        role: "buyer",
        termsAcceptedAt: new Date(),
      });
    } catch (dbError) {
      console.error("[register] Error inserting user_profile:", dbError);
      // Propagar el error: el usuario no debe acceder sin perfil en user_profiles
      return {
        error:
          "No se pudo completar el registro. Por favor, inténtalo de nuevo.",
      };
    }
  }

  return { success: true };
}
