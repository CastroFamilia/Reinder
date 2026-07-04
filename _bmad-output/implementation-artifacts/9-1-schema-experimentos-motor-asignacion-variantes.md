# Story 9.1: Schema de Experimentos y Motor de Asignación de Variantes

Status: done

## Story

Como agencia inmobiliaria en Reinder,
quiero que exista la infraestructura de datos y el motor de asignación de variantes A/B,
para poder crear experimentos de contenido sobre mis listings y que cada comprador vea consistentemente la misma variante sin impacto en la latencia del swipe feed.

## Contexto del Epic

**Epic 9 — Content Optimization & A/B Testing:** Las agencias pueden experimentar con contenido (portada, título, descripción) y Reinder optimiza automáticamente el rendimiento de los listings. El motor asigna variantes aleatoriamente, mide el impacto en métricas de engagement, y auto-promueve la variante ganadora al alcanzar significancia estadística.

**FRs cubiertos por esta story:** FR-E9-1 (parcial — schema), FR-E9-2 (motor de asignación)
**NFRs aplicados:** NFR11 (asignación <10ms, pre-computada), NFR8 (agencias nunca ven asignaciones individuales de compradores)

**Posición en el epic:** Story 9.1 es la **base fundacional**. Stories 9.2–9.6 dependen de este schema y motor.

## Acceptance Criteria (BDD)

### AC1 — Tabla `listing_experiments`
**Given** la migración de Story 9.1 ejecutada en Supabase
**When** consulto el schema de la base de datos
**Then** existe la tabla `listing_experiments` con los campos:
  - `id` (UUID PK, defaultRandom)
  - `listing_id` (UUID FK → listings.id, NOT NULL)
  - `agency_id` (UUID FK → agencies.id, NOT NULL) — desnormalizado para RLS sin JOIN
  - `name` (TEXT NOT NULL) — nombre descriptivo del experimento
  - `status` (pgEnum: `draft`, `running`, `paused`, `completed`, `cancelled`)
  - `experiment_type` (pgEnum: `cover_image`, `title`, `description`, `title_and_description`)
  - `variant_a` (JSONB NOT NULL) — contenido original del listing
  - `variant_b` (JSONB NOT NULL) — contenido alternativo
  - `min_sample_size` (INTEGER NOT NULL DEFAULT 100) — n mínimo por variante antes de evaluar significancia
  - `target_p_value` (NUMERIC(4,3) NOT NULL DEFAULT 0.050) — umbral de significancia
  - `winner_variant` (TEXT nullable) — 'a' | 'b' | null
  - `started_at` (TIMESTAMPTZ nullable)
  - `completed_at` (TIMESTAMPTZ nullable)
  - `created_at`, `updated_at` (TIMESTAMPTZ NOT NULL, defaultNow)
**And** existe un índice `idx_listing_experiments_listing_id` sobre `listing_id`
**And** existe un índice `idx_listing_experiments_agency_id` sobre `agency_id`
**And** existe una restricción UNIQUE `listing_experiments_active_unique` parcial: `(listing_id) WHERE status IN ('draft', 'running', 'paused')` — máximo 1 experimento activo por listing

### AC2 — Tabla `experiment_assignments`
**Given** la migración ejecutada
**When** consulto el schema
**Then** existe la tabla `experiment_assignments` con:
  - `id` (UUID PK, defaultRandom)
  - `experiment_id` (UUID FK → listing_experiments.id, NOT NULL)
  - `buyer_id` (UUID NOT NULL) — ref auth.users
  - `variant` (TEXT NOT NULL) — 'a' | 'b'
  - `assigned_at` (TIMESTAMPTZ NOT NULL, defaultNow)
**And** existe un índice UNIQUE `experiment_assignments_unique` sobre `(experiment_id, buyer_id)` — un comprador solo tiene una asignación por experimento
**And** existe un índice `idx_experiment_assignments_buyer_variant` sobre `(buyer_id, experiment_id)` — lookup rápido desde el feed

### AC3 — Tabla `experiment_results`
**Given** la migración ejecutada
**When** consulto el schema
**Then** existe la tabla `experiment_results` con:
  - `id` (UUID PK, defaultRandom)
  - `experiment_id` (UUID FK → listing_experiments.id, NOT NULL)
  - `variant` (TEXT NOT NULL) — 'a' | 'b'
  - `impressions` (INTEGER NOT NULL DEFAULT 0)
  - `total_view_time_ms` (BIGINT NOT NULL DEFAULT 0) — suma total para calcular promedio
  - `match_count` (INTEGER NOT NULL DEFAULT 0)
  - `reaffirm_count` (INTEGER NOT NULL DEFAULT 0)
  - `updated_at` (TIMESTAMPTZ NOT NULL, defaultNow)
**And** existe un índice UNIQUE `experiment_results_unique` sobre `(experiment_id, variant)` — exactamente 2 rows por experimento (a + b)

### AC4 — Motor de asignación determinístico (función pura)
**Given** un `buyer_id` y un `experiment_id` (ambos UUID)
**When** se invoca `assignVariant(buyerId, experimentId)`
**Then** devuelve consistentemente 'a' o 'b' para la misma combinación de inputs
**And** la distribución es aproximadamente 50/50 (±5% con n=1000)
**And** la función es pura (sin side effects, sin DB lookup, sin estado externo)
**And** la ejecución es <1ms (hash computation)
**And** usa un hash determinístico: `SHA-256(buyer_id + experiment_id)` → primer byte → par='a', impar='b'

### AC5 — API: `GET /api/v1/experiments/assignment`
**Given** un comprador autenticado con role `buyer`
**When** hace `GET /api/v1/experiments/assignment?listing_id={uuid}`
**Then** responde 200 con `{ data: { experimentId, variant, variantContent }, error: null }` si hay un experimento `running` para ese listing
**And** si no hay experimento activo, responde 200 con `{ data: null, error: null }` (el listing se muestra con su contenido original)
**And** la asignación se persiste en `experiment_assignments` (upsert — idempotente)
**And** el response time es <50ms (la asignación se calcula con hash, la persistencia es fire-and-forget)

### AC6 — API: `POST /api/v1/experiments`
**Given** un usuario autenticado con role `agency_admin`
**When** hace POST con body válido `{ listingId, name, experimentType, variantB }`
**Then** crea el experimento en status `draft` con `variant_a` auto-poblado desde el contenido actual del listing
**And** crea las 2 filas de `experiment_results` (variante a y b, counters en 0)
**And** responde 201 con `{ data: { experiment }, error: null }`

**Given** un listing que ya tiene un experimento activo (draft/running/paused)
**When** se intenta crear otro experimento para el mismo listing
**Then** responde 409 con `{ data: null, error: { code: "EXPERIMENT_ALREADY_EXISTS", message: "..." } }`

**Given** un usuario con role `buyer` o `agent`
**When** intenta crear un experimento
**Then** responde 403

### AC7 — RLS: Agencias no ven asignaciones individuales (NFR8)
**Given** un usuario `agency_admin` autenticado
**When** intenta hacer SELECT en `experiment_assignments`
**Then** RLS retorna 0 filas — las agencias NUNCA ven qué variante ve cada comprador individual

**Given** un usuario `agency_admin` autenticado
**When** hace SELECT en `listing_experiments` WHERE `agency_id` = su agencia
**Then** puede ver la configuración de sus experimentos

**Given** un usuario `agency_admin` autenticado
**When** hace SELECT en `experiment_results` para experimentos de su agencia
**Then** puede ver las métricas agregadas por variante (impressions, view_time, match_count, reaffirm_count)

### AC8 — Drizzle schema en `packages/shared/src/db/schema.ts`
**Given** el archivo schema.ts actualizado
**When** se ejecuta `pnpm typecheck` desde la raíz del monorepo
**Then** compila sin errores de TypeScript
**And** las 3 nuevas tablas están definidas con el patrón Drizzle existente (pgTable, pgEnum, uuid, etc.)
**And** los enums `experimentStatusEnum` y `experimentTypeEnum` están exportados

### AC9 — Migración SQL
**Given** el archivo de migración en `supabase/migrations/`
**When** se aplica sobre la base de datos actual
**Then** crea las 3 tablas, índices, restricciones y políticas RLS sin errores
**And** es idempotente (puede re-ejecutarse sin fallar — usa `IF NOT EXISTS`)
**And** incluye `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` para las 3 tablas
**And** incluye las políticas RLS del AC7

## Tasks / Subtasks

- [ ] **Task 1 — Enums de PostgreSQL** (AC: 1, 8)
  - [ ] Añadir `experimentStatusEnum` en `schema.ts`: `draft`, `running`, `paused`, `completed`, `cancelled`
  - [ ] Añadir `experimentTypeEnum` en `schema.ts`: `cover_image`, `title`, `description`, `title_and_description`

- [ ] **Task 2 — Tabla `listing_experiments`** (AC: 1, 8)
  - [ ] Definir en `packages/shared/src/db/schema.ts` con pgTable
  - [ ] Campos exactos según AC1
  - [ ] FK a `listings.id` y `agencies.id`
  - [ ] Índices: `idx_listing_experiments_listing_id`, `idx_listing_experiments_agency_id`
  - [ ] NOTA: La restricción UNIQUE parcial se crea en SQL (Drizzle no soporta partial unique nativamente)

- [ ] **Task 3 — Tabla `experiment_assignments`** (AC: 2, 8)
  - [ ] Definir en schema.ts
  - [ ] UNIQUE constraint `(experiment_id, buyer_id)`
  - [ ] Índice compuesto `(buyer_id, experiment_id)` para lookup del feed

- [ ] **Task 4 — Tabla `experiment_results`** (AC: 3, 8)
  - [ ] Definir en schema.ts
  - [ ] UNIQUE constraint `(experiment_id, variant)`
  - [ ] Usar `bigint` para `total_view_time_ms` (puede acumular millones de ms)

- [ ] **Task 5 — Motor de asignación: `assignVariant()`** (AC: 4)
  - [ ] Crear `packages/shared/src/experiments/assign-variant.ts`
  - [ ] Implementar hash determinístico SHA-256
  - [ ] Función pura, zero dependencies externas (usar Web Crypto API: `crypto.subtle.digest` o fallback `node:crypto`)
  - [ ] Exportar desde `@reinder/shared`

- [ ] **Task 6 — Tests del motor de asignación** (AC: 4)
  - [ ] Crear `packages/shared/src/experiments/assign-variant.test.ts`
  - [ ] T9.1-01: Determinismo — misma entrada produce misma salida (100 invocaciones)
  - [ ] T9.1-02: Distribución 50/50 — generar 10,000 asignaciones con UUIDs aleatorios, verificar que la distribución está entre 45%–55%
  - [ ] T9.1-03: Función pura — no muta nada, no accede a estado externo
  - [ ] T9.1-04: Performance — 1000 invocaciones en <100ms total

- [ ] **Task 7 — API: `GET /api/v1/experiments/assignment`** (AC: 5)
  - [ ] Crear `apps/web/src/app/api/v1/experiments/assignment/route.ts`
  - [ ] Validar auth (401) y role buyer (403)
  - [ ] Query: buscar experimento `running` para el `listing_id`
  - [ ] Si existe → calcular variante con `assignVariant()` → upsert en `experiment_assignments` → devolver variant + content
  - [ ] Si no existe → devolver `{ data: null, error: null }`
  - [ ] El upsert es fire-and-forget (no bloquea el response)

- [ ] **Task 8 — API: `POST /api/v1/experiments`** (AC: 6)
  - [ ] Crear `apps/web/src/app/api/v1/experiments/route.ts`
  - [ ] Validar auth (401) y role agency_admin (403)
  - [ ] Validar body con Zod
  - [ ] Verificar que el listing pertenece a la agencia del usuario
  - [ ] Verificar que no existe otro experimento activo para el listing → 409
  - [ ] Auto-poblar `variant_a` desde el listing actual
  - [ ] Crear las 2 filas de `experiment_results` en transacción
  - [ ] Responder 201

- [ ] **Task 9 — Migración SQL** (AC: 9)
  - [ ] Crear `supabase/migrations/20260622000001_experiments_schema.sql`
  - [ ] CREATE TYPE para los 2 enums
  - [ ] CREATE TABLE para las 3 tablas con `IF NOT EXISTS`
  - [ ] CREATE INDEX para todos los índices
  - [ ] Partial UNIQUE constraint para 1 experimento activo por listing
  - [ ] ALTER TABLE ENABLE ROW LEVEL SECURITY × 3

- [ ] **Task 10 — Políticas RLS** (AC: 7, 9)
  - [ ] Crear `packages/shared/src/db/rls-experiments-policies.sql`
  - [ ] `listing_experiments`: SELECT/INSERT/UPDATE para `agency_admin` WHERE `agency_id` match
  - [ ] `experiment_assignments`: DENY ALL para `agency_admin` — solo `buyer` puede leer/escribir su propia asignación, `service_role` para bulk ops
  - [ ] `experiment_results`: SELECT para `agency_admin` WHERE experiment pertenece a su agencia (via subquery)
  - [ ] `platform_admin`: acceso total a las 3 tablas
  - [ ] Incluir las políticas en la migración SQL

- [ ] **Task 11 — Types compartidos** (AC: 8)
  - [ ] Crear `packages/shared/src/types/experiment.ts`
  - [ ] Exportar tipos: `Experiment`, `ExperimentAssignment`, `ExperimentResult`, `ExperimentStatus`, `ExperimentType`, `VariantContent`
  - [ ] Exportar desde el barrel `packages/shared/src/types/index.ts`

## Dev Notes

### Variant Content JSONB Schema

```typescript
// variant_a y variant_b en listing_experiments
type VariantContent = {
  // Para cover_image:
  coverImageUrl?: string;
  coverImageIndex?: number;  // índice en el array images del listing

  // Para title:
  title?: string;

  // Para description:
  description?: string;
};
```

### Motor de Asignación — Implementación de Referencia

```typescript
// packages/shared/src/experiments/assign-variant.ts
import { createHash } from 'node:crypto';

/**
 * Asigna una variante de forma determinística usando SHA-256.
 * NO hace DB lookup — función pura para uso en hot path del swipe feed.
 *
 * @returns 'a' | 'b'
 */
export function assignVariant(buyerId: string, experimentId: string): 'a' | 'b' {
  const hash = createHash('sha256')
    .update(`${buyerId}:${experimentId}`)
    .digest();

  // Primer byte: par → 'a', impar → 'b'
  return hash[0] % 2 === 0 ? 'a' : 'b';
}
```

**⚠️ IMPORTANTE sobre Web Crypto vs Node Crypto:**
- En Next.js Route Handlers (servidor), usar `node:crypto` (síncrono, más rápido)
- Si se necesita en cliente (React Native), usar `crypto.subtle.digest` (async)
- Para esta story, la función solo se usa en servidor → `node:crypto` es correcto
- NO instalar librerías de terceros para hashing

### Restricción UNIQUE Parcial (Drizzle Limitation)

Drizzle ORM no soporta partial unique constraints nativamente. La restricción se crea SOLO en la migración SQL:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS listing_experiments_active_unique
  ON listing_experiments (listing_id)
  WHERE status IN ('draft', 'running', 'paused');
```

Esto asegura que un listing solo puede tener un experimento no-terminado a la vez. Los experimentos `completed` y `cancelled` no cuentan.

### Patrón de Response API (obligatorio)

```typescript
// ✅ Siempre devolver ApiResponse<T>
return NextResponse.json(
  { data: { experiment }, error: null },
  { status: 201 }
);

// ✅ Error
return NextResponse.json(
  { data: null, error: { code: "EXPERIMENT_ALREADY_EXISTS", message: "..." } },
  { status: 409 }
);
```

### RLS Policy Patterns (seguir convención existente)

```sql
-- Patrón: agency_admin lee sus propios experimentos via agency_id
CREATE POLICY "agency_admin_can_read_own_experiments"
  ON listing_experiments
  FOR SELECT
  TO authenticated
  USING (
    agency_id = (
      SELECT agency_id
      FROM user_profiles
      WHERE id = auth.uid()
        AND role = 'agency_admin'
    )
  );

-- Patrón: buyer puede leer su propia asignación
CREATE POLICY "buyer_can_read_own_assignment"
  ON experiment_assignments
  FOR SELECT
  TO authenticated
  USING (
    buyer_id = auth.uid()
    AND (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'buyer'
  );

-- CRITICAL: NO POLICY para agency_admin en experiment_assignments
-- (deny-by-default de RLS = 0 rows para agencias → NFR8 enforced)
```

### Fire-and-Forget Pattern para Upsert de Asignación

```typescript
// En GET /api/v1/experiments/assignment
const variant = assignVariant(buyerId, experimentId);

// Upsert assignment — no bloquear el response
const upsertPromise = supabase
  .from('experiment_assignments')
  .upsert(
    { experiment_id: experimentId, buyer_id: buyerId, variant },
    { onConflict: 'experiment_id,buyer_id' }
  );

// Devolver response inmediatamente, sin await del upsert
// El upsert se ejecuta en background (fire-and-forget)
// Si falla, no es crítico — el hash es determinístico, la asignación
// se re-calculará idénticamente en la siguiente petición
void upsertPromise.then(({ error }) => {
  if (error) console.error('[experiments] assignment upsert failed:', error);
});

return NextResponse.json({ data: { experimentId, variant, variantContent }, error: null });
```

### Migración SQL — Convención de Nombres

Seguir el patrón existente: `supabase/migrations/20260622000001_experiments_schema.sql`
- Prefijo fecha: `20260622` (fecha actual)
- Sufijo secuencial: `000001`
- Separador: `_`
- Descripción: `experiments_schema`

### Tablas Existentes Referenciadas

| Tabla | Uso en esta story |
|-------|-------------------|
| `listings` | FK desde `listing_experiments.listing_id`, fuente de `variant_a` content |
| `agencies` | FK desde `listing_experiments.agency_id`, RLS guard |
| `user_profiles` | Subquery en RLS para verificar `role` y `agency_id` |

### Project Structure Notes

```
packages/shared/src/
├── db/
│   ├── schema.ts                              ← MODIFY (añadir 2 enums + 3 tablas)
│   └── rls-experiments-policies.sql           ← NEW
├── experiments/
│   ├── assign-variant.ts                      ← NEW
│   └── assign-variant.test.ts                 ← NEW
├── types/
│   ├── experiment.ts                          ← NEW
│   └── index.ts                               ← MODIFY (re-export)

apps/web/src/app/api/v1/experiments/
├── route.ts                                   ← NEW (POST — crear experimento)
└── assignment/
    └── route.ts                               ← NEW (GET — obtener variante)

supabase/migrations/
└── 20260622000001_experiments_schema.sql       ← NEW
```

### Guardrails para el Dev Agent

1. **NO crear columnas `variant` como pgEnum** — usar TEXT con check constraint. El enum `experimentStatusEnum` sí es pgEnum porque sus valores son fijos. Los valores 'a'/'b' de variant son demasiado simples para un enum dedicado.
2. **NO usar `Math.random()` para asignación** — DEBE ser hash determinístico SHA-256. `Math.random()` rompería la consistencia buyer→variante.
3. **NO hacer DB lookup en `assignVariant()`** — es una función pura. El lookup de si hay experimento activo se hace ANTES de llamar a `assignVariant()`.
4. **NO exponer `experiment_assignments` a agency_admin** — esto viola NFR8. Las RLS policies deben DENEGAR acceso a esta tabla para el rol agencia.
5. **NO olvidar crear `experiment_results` rows** al crear el experimento — Stories 9.3 y 9.4 dependen de que existan.
6. **Usar `bigint` (no `integer`) para `total_view_time_ms`** — un listing popular puede acumular millones de milisegundos fácilmente.
7. **NO usar `drizzle-kit generate`** para esta migración — escribir SQL manualmente para incluir la partial unique constraint y las políticas RLS que Drizzle no genera automáticamente.
8. **El campo `agency_id` en `listing_experiments` es desnormalizado** — sí, es redundante con `listings.agency_id`, pero es intencional para que las RLS policies no necesiten JOIN (rendimiento de RLS).
9. **Validar Zod en el POST** — el body del POST de creación de experimento debe validarse con Zod schema. No confiar solo en TypeScript types.

### Aprendizajes de Stories Anteriores (Epic 8)

- **Story 8.1** estableció el patrón de engagement events con batching y fire-and-forget — el pattern de upsert de asignación sigue este mismo enfoque.
- **Story 8.7** introdujo aggregation jobs sobre read models — los `experiment_results` son read models pre-agregados que se actualizarán en Story 9.3.
- Las RLS de Epic 8 restringen datos comportamentales a `platform_admin` (NFR8) — el mismo pattern aplica aquí para `experiment_assignments`.
- Las migraciones de Epic 5 usan `DO $$ BEGIN IF NOT EXISTS ... END $$` para idempotencia — seguir este patrón.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 9 — Story 9.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns]
- [Source: packages/shared/src/db/schema.ts — patrón pgTable/pgEnum existente]
- [Source: packages/shared/src/db/rls-agent-policies.sql — patrón RLS con subquery]
- [Source: supabase/migrations/20260619000003_listing_lifecycle.sql — patrón migración idempotente]
- [Source: _bmad-output/implementation-artifacts/8-1-schema-engagement-events-instrumentacion-base.md — patrón engagement events]

## Dev Agent Record

### Agent Model Used

(to be filled by dev agent)

### Debug Log References

### Completion Notes List

### File List
