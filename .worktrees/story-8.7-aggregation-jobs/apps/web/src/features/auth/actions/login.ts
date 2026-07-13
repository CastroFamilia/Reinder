"use server";

/**
 * apps/web/src/features/auth/actions/login.ts
 *
 * Server Action para autenticar usuarios existentes con email + contraseña.
 * Tras el login exitoso, lee el rol del usuario desde user_profiles
 * y devuelve la ruta de redirección correspondiente al rol (Story 1.5).
 *
 * Roles y redirecciones:
 * - buyer        → /swipe
 * - agent        → /agent
 * - agency_admin → /agency/listings
 * - platform_admin → /admin
 */
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/supabase/db";
import { userProfiles } from "@reinder/shared/db/schema";
import { eq } from "drizzle-orm";
import { getRedirectPathForRole } from "@/features/auth/lib/login.lib";

export interface LoginResult {
  success?: true;
  redirectTo?: string;
  error?: string;
}

export async function loginUser(formData: FormData): Promise<LoginResult> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email y contraseña son obligatorios." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Mensaje genérico de seguridad — no revelar si el email existe
    return { error: "Email o contraseña incorrectos." };
  }

  // Leer rol desde user_profiles para determinar el destino correcto
  let redirectTo = "/swipe"; // fallback seguro
  try {
    const [profile] = await db
      .select({ role: userProfiles.role })
      .from(userProfiles)
      .where(eq(userProfiles.id, data.user.id))
      .limit(1);

    redirectTo = getRedirectPathForRole(profile?.role);
  } catch {
    // Si falla la lectura del perfil, usamos el fallback /swipe
    // El usuario sigue autenticado — no bloqueamos el acceso
  }

  return { success: true, redirectTo };
}
