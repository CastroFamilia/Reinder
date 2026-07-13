/**
 * Cliente Drizzle compartido — @reinder/shared/db
 *
 * Exporta `getDb(connectionString)` para instanciar un cliente Drizzle.
 * No instancia el cliente aquí directamente — inyectar la connection string
 * desde el entorno de cada app (web, mobile) para evitar acoplamiento.
 *
 * Uso en apps/web: ver apps/web/src/lib/supabase/db.ts
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Database = ReturnType<typeof getDb>;

/**
 * Crea y retorna una instancia del cliente Drizzle.
 * @param connectionString - URL de conexión PostgreSQL (DATABASE_URL)
 * @returns Instancia Drizzle con el schema completo de Reinder.
 */
export function getDb(connectionString: string) {
  const client = postgres(connectionString);
  return drizzle(client, { schema });
}

// Re-exportar el schema para conveniencia
export * as schema from "./schema";
