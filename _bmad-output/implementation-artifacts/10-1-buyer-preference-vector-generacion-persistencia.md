# Story 10.1: Buyer Preference Vector — Generación y Persistencia

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

Como plataforma Reinder,
quiero generar un `buyer_preference_vector` por comprador basado en su historial de `swipe_events` y `engagement_events`,
para que las stories posteriores (10.2–10.5) puedan personalizar la presentación de listings según las preferencias implícitas de cada comprador.

## Contexto del Epic

**Epic 10 — Personalized Content Layer:** Cada comprador ve la versión del listing más relevante para su perfil implícito. El `buyer_preference_vector` se infiere del historial de swipes/engagement, se calcula un `listing_fit_score` (Story 10.2), y el swipe feed adapta foto de portada (Story 10.3) y highlights de descripción (Story 10.4) — todo con consentimiento GDPR y sin cookies cross-site.

**FR cubierto:** FR-E10-1 — El sistema genera un `buyer_preference_vector` por comprador basado en su historial de swipe_events y engagement_events.
**NFRs aplicados:** NFR8 (personalización basada exclusivamente en datos internos — sin cookies cross-site ni datos de terceros), NFR7 (datos de swipe encriptados en reposo).
**Pre-requisitos:** Epic 8 completa (masa crítica de engagement_events), revisión legal GDPR del modelo de personalización.

**Posición en el epic:** Story 10.1 es la **primera story** del Epic 10. Es la fundación: crea la tabla, el aggregation job y la lógica de generación del vector. Stories 10.2–10.5 dependen de ella.

**Dependencias directas:**
- Epic 8 (completa): tablas `listing_engagement_events`, `swipe_events` como fuentes de datos
- Story 8.7: patrón de aggregation job con pg_cron ya establecido (reusar patrón)
- Story 8.6: `buyer_intent_scores` table + aggregation pattern (reusar patrón de tabla read model)

## Acceptance Criteria (BDD)

### AC1 — Tabla `buyer_preference_vectors` en Drizzle schema
**Given** la migración de Story 10.1 ejecutada en Supabase
**When** consulto el schema de la base de datos
**Then** existe la tabla `buyer_preference_vectors` con los campos:
  - `id` (UUID PK, defaultRandom)
  - `buyer_id` (UUID NOT NULL, UNIQUE) — referencia a auth.users.id
  - `vector` (JSONB NOT NULL) — el preference vector completo
  - `swipe_count` (INTEGER NOT NULL DEFAULT 0) — total de swipes procesados
  - `engagement_event_count` (INTEGER NOT NULL DEFAULT 0) — total de engagement events procesados
  - `version` (INTEGER NOT NULL DEFAULT 1) — versión del algoritmo de generación
  - `last_computed_at` (TIMESTAMPTZ NOT NULL) — timestamp de la última computación exitosa
  - `created_at` (TIMESTAMPTZ NOT NULL, defaultNow)
  - `updated_at` (TIMESTAMPTZ NOT NULL, defaultNow)
**And** existe un índice único sobre `buyer_id`
**And** existe un índice `idx_bpv_last_computed` sobre `last_computed_at` (para queries de freshness monitoring)
**And** la tabla está definida en `packages/shared/src/db/schema.ts` e importable desde `@reinder/shared`

### AC2 — Estructura del preference vector
**Given** un comprador con historial de swipes y engagement events
**When** el aggregation job computa su `buyer_preference_vector`
**Then** el campo `vector` contiene un objeto JSON con las siguientes dimensiones:
  - `price_affinity`: `{ mean: number, stddev: number, range_min: number, range_max: number }` — afinidad de precio basada en listings con match vs reject
  - `size_affinity`: `{ mean: number, stddev: number }` — preferencia de tamaño (sqm) basada en matches
  - `bedroom_affinity`: `{ mode: number, distribution: Record<string, number> }` — distribución de preferencia de habitaciones
  - `location_affinity`: `{ preferred_cities: string[], geo_centroid: { lat: number, lng: number } | null }` — ciudades con más matches
  - `photo_engagement`: `{ avg_view_time_ms: number, preferred_photo_indices: number[] }` — patrones de engagement con fotos
  - `engagement_depth`: `{ avg_scroll_depth_pct: number, avg_detail_view_ms: number }` — profundidad de engagement
  - `match_rate`: number — ratio match/total_swipes (0-1)
  - `reaffirm_rate`: number — ratio reaffirms/matches (0-1)
**And** todos los valores numéricos son finite (no NaN ni Infinity)
**And** el vector se serializa correctamente como JSONB en PostgreSQL

### AC3 — Lógica de generación del preference vector (TypeScript)
**Given** un comprador con ≥10 swipe_events (threshold mínimo)
**When** se ejecuta `computePreferenceVector(buyerId)`
**Then** la función:
  1. Lee todos los `swipe_events` del buyer (match + reject) de los últimos 90 días
  2. Lee todos los `listing_engagement_events` del buyer de los últimos 90 días
  3. Para cada listing con match: obtiene `price`, `sizeSqm`, `bedrooms`, `city`, `latitude`, `longitude` del listing
  4. Calcula las dimensiones del vector según AC2
  5. Retorna el vector completo con los conteos de datos procesados

**Given** un comprador con <10 swipe_events
**When** se ejecuta `computePreferenceVector(buyerId)`
**Then** retorna `null` (threshold mínimo no alcanzado — no se genera vector)

**Given** un comprador con >10 swipes pero todos son reject (0 matches)
**When** se ejecuta `computePreferenceVector(buyerId)`
**Then** genera un vector con `match_rate: 0`, `reaffirm_rate: 0`, y las dimensiones de precio/tamaño/ubicación basadas en los listings vistos (no solo matches)

### AC4 — Aggregation job batch (pg_cron)
**Given** el aggregation job configurado en pg_cron
**When** se ejecuta el job `compute_buyer_preference_vectors()`
**Then** procesa SOLO compradores activos del último mes (al menos 1 swipe en últimos 30 días)
**And** para cada buyer elegible: ejecuta `computePreferenceVector()` y hace UPSERT en `buyer_preference_vectors`
**And** actualiza `last_computed_at` con el timestamp de la ejecución
**And** la ejecución no excede 5 minutos para ≤5000 compradores activos
**And** el job se programa cada 6 horas vía pg_cron (cron: `15 */6 * * *` — minuto 15 para evitar colisión con engagement aggregation en minuto 0 y experiment results en minuto 30)
**And** el schedule no colisiona con los cron jobs existentes (CRM sync: cada 5min, engagement aggregation: minuto 0, experiment results: minuto 30)

**Given** el aggregation job falla a mitad de ejecución (ej: timeout de DB)
**When** pg_cron ejecuta el retry automático
**Then** los vectores ya procesados en la ejecución parcial persisten (idempotente por buyer)
**And** los vectores no procesados retienen su valor anterior (stale pero no corrupto)

### AC5 — API endpoint de trigger manual
**Given** un `platform_admin` autenticado
**When** hace `POST /api/v1/admin/preference-vectors/compute` con body opcional `{ buyerId?: "uuid" }`
**Then** si `buyerId` proporcionado: computa vector solo para ese buyer y responde `{ data: { buyerId, vectorComputed: true, swipeCount, engagementEventCount }, error: null }`
**And** si `buyerId` no proporcionado: ejecuta el batch completo y responde `{ data: { processedCount, skippedCount, durationMs }, error: null }`

**Given** un usuario con rol `buyer`, `agent` o `agency_admin`
**When** intenta acceder al endpoint
**Then** responde 403

### AC6 — RLS Policies
**Given** RLS habilitado en la tabla `buyer_preference_vectors`
**When** un `buyer` autenticado consulta la tabla
**Then** solo puede SELECT su propio vector (`buyer_id = auth.uid()`)
**And** NO puede INSERT, UPDATE ni DELETE

**When** un `agent` o `agency_admin` intenta SELECT en la tabla
**Then** retorna 0 filas (denegado por RLS)

**When** un `platform_admin` consulta la tabla
**Then** puede SELECT todos los registros (para debugging y monitoreo)

### AC7 — Migración SQL con RLS y pg_cron
**Given** el archivo de migración `supabase/migrations/YYYYMMDD000001_buyer_preference_vectors.sql`
**When** se ejecuta la migración
**Then** crea la tabla `buyer_preference_vectors` con todos los campos de AC1
**And** habilita RLS con las policies de AC6
**And** crea la función SQL `compute_buyer_preference_vectors()` que es wrapper del job
**And** registra el pg_cron schedule (con guard de existencia de extensión, patrón de Story 9.3)
**And** es idempotente (ejecutar 2 veces no genera error)

### AC8 — Tipos TypeScript exportados desde @reinder/shared
**Given** el módulo `packages/shared/src/personalization/`
**When** importo los tipos desde `@reinder/shared`
**Then** exporta:
  - `BuyerPreferenceVector` — interface del contenido del campo `vector`
  - `BuyerPreferenceVectorRow` — shape completa de la fila de la tabla
  - `computePreferenceVector(buyerId: string, deps: ComputeDeps): Promise<BuyerPreferenceVector | null>` — función pura de cálculo
  - `PREFERENCE_VECTOR_VERSION: number` — constante de versión del algoritmo
  - `MIN_SWIPES_THRESHOLD: number` — constante del mínimo de swipes (10)

## Tasks / Subtasks

- [ ] Task 1: Schema Drizzle + migración SQL (AC: #1, #7)
  - [ ] 1.1 Añadir tabla `buyer_preference_vectors` a `packages/shared/src/db/schema.ts`
  - [ ] 1.2 Crear migración SQL `supabase/migrations/YYYYMMDD000001_buyer_preference_vectors.sql`
  - [ ] 1.3 RLS policies en la migración
  - [ ] 1.4 pg_cron schedule en la migración (con guard de extensión)
- [ ] Task 2: Tipos y lógica de cálculo (AC: #2, #3, #8)
  - [ ] 2.1 Crear `packages/shared/src/personalization/types.ts` con BuyerPreferenceVector interface
  - [ ] 2.2 Crear `packages/shared/src/personalization/compute-preference-vector.ts` con lógica de cálculo
  - [ ] 2.3 Crear `packages/shared/src/personalization/index.ts` barrel export
  - [ ] 2.4 Tests unitarios: `compute-preference-vector.test.ts`
- [ ] Task 3: Aggregation job batch (AC: #4)
  - [ ] 3.1 Crear función SQL wrapper `compute_buyer_preference_vectors()` o API trigger endpoint
  - [ ] 3.2 Test de idempotencia del UPSERT
  - [ ] 3.3 Test de performance con mock de 1000 buyers
- [ ] Task 4: API endpoint admin (AC: #5)
  - [ ] 4.1 Crear `apps/web/src/app/api/v1/admin/preference-vectors/compute/route.ts`
  - [ ] 4.2 Auth guard: solo `platform_admin`
  - [ ] 4.3 Tests de auth y response shape
- [ ] Task 5: Tests de RLS (AC: #6)
  - [ ] 5.1 Test: buyer lee solo su propio vector
  - [ ] 5.2 Test: agent/agency_admin no leen vectores
  - [ ] 5.3 Test: platform_admin lee todos los vectores

## Dev Notes

### Patrón de aggregation job a reusar

**CRÍTICO — NO reinventar:** El patrón de aggregation job ya está establecido en Story 8.7. Reusar exactamente el mismo approach:

1. **TypeScript puro para lógica de cálculo** → `packages/shared/src/personalization/compute-preference-vector.ts`
   - Referencia: `packages/shared/src/engagement/aggregation.ts` (Story 8.7)
   - La función es pura: recibe datos, retorna resultado. Sin side effects de DB.

2. **SQL wrapper para pg_cron** → Función SQL que llama a la API de trigger o ejecuta el cálculo inline
   - Referencia: `.worktrees/story-8.7-aggregation-jobs/packages/shared/src/db/migrations/008-engagement-aggregation-cron.sql`
   - El pg_cron schedule usa el patrón DO block con guard de extensión (como Story 9.3)

3. **API trigger para ejecución manual** → `POST /api/v1/admin/preference-vectors/compute`
   - Referencia: `.worktrees/story-8.7-aggregation-jobs/apps/web/src/app/api/v1/admin/analytics/job-status/route.ts`

### Tablas fuente (INPUT — no modificar)

| Tabla | Campos relevantes | Nota |
|-------|-------------------|------|
| `swipe_events` | `buyer_id`, `listing_id`, `action` (match/reject), `created_at` | Schema en `packages/shared/src/db/schema.ts` L158-179 |
| `listing_engagement_events` | `buyer_id`, `listing_id`, `session_id`, `event_type`, `payload`, `created_at` | ⚠️ La tabla existe en DB (usada por migrations de Epic 9) pero su definición Drizzle está en worktree 8.7, NO en main `schema.ts`. Si no está en main al empezar, copiar la definición desde `.worktrees/story-8.7-aggregation-jobs/packages/shared/src/db/schema.ts` L323-369 |
| `listings` | `price`, `size_sqm`, `bedrooms`, `city`, `latitude`, `longitude`, `images` | Schema en `packages/shared/src/db/schema.ts` L120-155 |

### Tabla destino (OUTPUT — crear)

| Tabla | Ubicación en schema |
|-------|-------------------|
| `buyer_preference_vectors` | Añadir al final de `packages/shared/src/db/schema.ts` antes de duplicados accidentales |

### Archivos que esta story CREA (no existen aún)

```
packages/shared/src/personalization/
├── types.ts                           # BuyerPreferenceVector interface
├── compute-preference-vector.ts       # Lógica pura de cálculo
├── compute-preference-vector.test.ts  # Tests unitarios
└── index.ts                           # Barrel export

apps/web/src/app/api/v1/admin/preference-vectors/
└── compute/route.ts                   # API trigger manual

supabase/migrations/
└── YYYYMMDD000001_buyer_preference_vectors.sql  # Migración
```

### Archivos que esta story MODIFICA

```
packages/shared/src/db/schema.ts          # Añadir tabla buyer_preference_vectors
packages/shared/src/index.ts              # Re-export personalization module (si existe barrel)
```

### Cron schedule — evitar colisiones

| Job existente | Schedule | Fuente |
|--------------|----------|--------|
| CRM sync worker | `*/5 * * * *` (cada 5 min) | `20260619000001_crm_sync_queue_and_worker.sql` |
| Listing lifecycle (sold auto-remove) | `0 * * * *` (cada hora, minuto 0) | `20260619000003_listing_lifecycle.sql` |
| Engagement aggregation (8.7) | `0 * * * *` (cada hora, minuto 0) | Story 8.7 migration |
| Experiment results aggregation (9.3) | `30 * * * *` (cada hora, minuto 30) | `20260622000003_experiment_results_timeseries.sql` |
| Experiment recommendations (9.5) | `0 6 * * 1` (lunes 06:00 UTC) | `20260622000005_experiment_recommendations.sql` |
| **buyer_preference_vectors (10.1)** | `15 */6 * * *` (cada 6 horas, minuto 15) | **ESTA STORY** |

**Nota:** El schedule `15 */6 * * *` ejecuta a las 00:15, 06:15, 12:15, 18:15 UTC. Offset a minuto 15 para evitar contención con engagement aggregation (minuto 0) y experiment results (minuto 30).

### Convenciones de código del proyecto

- **ORM:** Drizzle ORM 0.45.x — camelCase en TypeScript, snake_case en DB
- **API response shape:** `{ data: T | null, error: { code: string, message: string } | null }` (patrón `ApiResponse<T>` de `packages/shared/src/types/api.ts`)
- **Auth guard pattern:** Verificar role en route handler con `createServerClient()` de `@supabase/ssr`
- **Test framework:** Vitest para unit tests en `packages/shared`
- **Import alias:** `@reinder/shared` para imports desde packages/shared

### GDPR / Privacidad

- `buyer_preference_vectors` contiene datos de comportamiento derivados — cubierto por consentimiento GDPR del onboarding
- RLS DEBE denegar acceso a `agent` y `agency_admin` — los agentes NUNCA ven preferencias individuales de compradores
- El vector debe incluirse en data export (GDPR Art. 20) y eliminarse en account deletion (GDPR Art. 17) — esto se implementa en Story 10.5 pero la tabla debe diseñarse con `ON DELETE CASCADE` para `buyer_id` si referencia directa a auth.users
- **NOTA:** Como `buyer_id` referencia `auth.users.id` (gestionado por Supabase Auth), NO se puede crear FK directa. Usar la convención del proyecto: referencia lógica sin FK constraint, cleanup en application layer

### Consideraciones de performance

- Ventana de 90 días para swipe_events y engagement_events evita escanear historial completo
- Procesar solo buyers activos del último mes (≥1 swipe en 30 días) limita cardinalidad
- UPSERT idempotente permite retry seguro si el job falla a mitad
- El vector es JSONB (no array de floats) — eficiente para PostgreSQL, no requiere extensión `pgvector`

### Project Structure Notes

- Alineado con la estructura de monorepo: lógica en `packages/shared`, API en `apps/web`, migraciones en `supabase/migrations`
- Nuevo módulo `personalization/` en packages/shared — patrón similar a `engagement/` (Epic 8)
- Sin conflictos con la estructura existente

### References

- [Source: epics.md#Epic 10, líneas 386-424](file:///Users/santiagocastro/Desktop/Projects%20Antigravity/Reinder/_bmad-output/planning-artifacts/epics.md#L386)
- [Source: architecture.md#Data Architecture](file:///Users/santiagocastro/Desktop/Projects%20Antigravity/Reinder/_bmad-output/planning-artifacts/architecture.md#L136)
- [Source: test-design-epic-10.md](file:///Users/santiagocastro/Desktop/Projects%20Antigravity/Reinder/_bmad-output/test-artifacts/test-design-epic-10.md)
- [Patrón: aggregation.ts (Story 8.7)](file:///Users/santiagocastro/Desktop/Projects%20Antigravity/Reinder/.worktrees/story-8.7-aggregation-jobs/packages/shared/src/engagement/aggregation.ts)
- [Patrón: engagement types.ts (Story 8.1)](file:///Users/santiagocastro/Desktop/Projects%20Antigravity/Reinder/.worktrees/story-8.7-aggregation-jobs/packages/shared/src/engagement/types.ts)
- [Patrón: migration 008 (Story 8.7)](file:///Users/santiagocastro/Desktop/Projects%20Antigravity/Reinder/.worktrees/story-8.7-aggregation-jobs/packages/shared/src/db/migrations/008-engagement-aggregation-cron.sql)
- [Schema: schema.ts (main)](file:///Users/santiagocastro/Desktop/Projects%20Antigravity/Reinder/packages/shared/src/db/schema.ts)
- [Schema: listings table](file:///Users/santiagocastro/Desktop/Projects%20Antigravity/Reinder/packages/shared/src/db/schema.ts#L120-L155)
- [Schema: swipe_events table](file:///Users/santiagocastro/Desktop/Projects%20Antigravity/Reinder/packages/shared/src/db/schema.ts#L158-L179)

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
