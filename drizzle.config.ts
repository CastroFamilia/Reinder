// drizzle.config.ts (raíz del monorepo)
// Configuración de Drizzle Kit para generar y ejecutar migraciones.
// El schema es la única fuente de verdad en packages/shared/src/db/schema.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./packages/shared/src/db/schema.ts",
  out: "./packages/shared/src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL!,
  },
});
