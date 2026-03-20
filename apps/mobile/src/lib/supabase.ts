/**
 * apps/mobile/src/lib/supabase.ts
 *
 * Cliente Supabase para el app mobile.
 * Usa el SDK estándar @supabase/supabase-js (sin @supabase/ssr, que es
 * exclusivo de Next.js).
 *
 * Variables de entorno Expo: EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY
 * (el prefijo EXPO_PUBLIC_ hace que estén disponibles en el bundle del cliente)
 *
 * Story 1.6 — Guard de autenticación mobile
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[Reinder Mobile] EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY no definidas. " +
      "Configúralas en apps/mobile/.env.local antes de ejecutar la app."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
