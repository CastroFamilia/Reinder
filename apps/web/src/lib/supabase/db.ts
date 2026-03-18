/**
 * apps/web/src/lib/supabase/db.ts
 *
 * Cliente Drizzle para uso SERVER-ONLY en Next.js.
 * NUNCA importar este archivo en componentes de cliente React.
 *
 * Usado en Route Handlers, Server Actions y Server Components.
 */
import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@reinder/shared/db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const client = postgres(process.env.DATABASE_URL, {
  prepare: false, // Requerido para pgBouncer (Supabase pooler no preserva prepared statements entre conexiones)
});

/**
 * Instancia del cliente Drizzle con el schema completo de Reinder.
 * Usar sólo en contextos server-side (Route Handlers, Server Actions).
 */
export const db = drizzle(client, { schema });
