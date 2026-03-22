/**
 * apps/mobile/src/lib/supabase.ts
 *
 * Cliente Supabase para el app mobile.
 * Usa expo-secure-store (incluido en Expo Go) para persistir la sesión.
 * @react-native-async-storage v3 requiere dev build — no compatible con Expo Go.
 *
 * Story 1.6 — Guard de autenticación mobile
 */
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[Reinder Mobile] EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY no definidas."
  );
}

/** Adapter de SecureStore compatible con la interfaz de storage de Supabase */
const SecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
