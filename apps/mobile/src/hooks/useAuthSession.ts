/**
 * apps/mobile/src/hooks/useAuthSession.ts
 *
 * Hook de React que suscribe al estado de sesión de Supabase.
 * Devuelve `{ session, loading }` para que los componentes puedan
 * renderizar condicionalmente según si el usuario está autenticado.
 *
 * Patrón: suscripción a `onAuthStateChange` — el SDK de Supabase dispara
 * automáticamente un evento `INITIAL_SESSION` al mountar con la sesión
 * existente, por lo que `getSession()` redundante fue eliminado (fix L1).
 *
 * Story 1.6 — AC: 4 | fix L1: sin doble render al montar
 */
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

interface AuthSessionState {
  /** La sesión activa, o null si el usuario no está autenticado */
  session: Session | null;
  /** true mientras se comprueba el estado inicial de sesión */
  loading: boolean;
}

export function useAuthSession(): AuthSessionState {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // `onAuthStateChange` dispara INITIAL_SESSION inmediatamente al suscribirse,
    // con la sesión actual (activa o null). No es necesario llamar a getSession()
    // por separado — eliminar ese extra evita un render doble innecesario (fix L1).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { session, loading };
}

