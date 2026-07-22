# Story 10.2: Listing Fit Score — Cálculo de Afinidad Listing × Comprador

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

Como plataforma Reinder,
quiero calcular un `listing_fit_score` entre el `buyer_preference_vector` de cada comprador y las características de cada listing activo,
para que las stories posteriores (10.3–10.4) puedan ordenar fotos y destacar información relevante según la afinidad real entre comprador y propiedad.

## Contexto del Epic

**Epic 10 — Personalized Content Layer:** Cada comprador ve la versión del listing más relevante para su perfil implícito. Story 10.1 ya creó el `buyer_preference_vector`. Esta story (10.2) calcula el `listing_fit_score` — la puntuación de afinidad entre vector y listing — y la persiste como read model pre-calculado. Stories 10.3 y 10.4 consumirán este score para seleccionar la foto de portada y ordenar highlights de descripción.

**FR cubierto:** FR-E10-2 — El sistema calcula un `listing_fit_score` entre el preference_vector del comprador y las características del listing.
**NFRs aplicados:** NFR2 (la selección de variante personalizada debe resolverse en <5ms — el score DEBE estar pre-calculado, NUNCA computarse en tiempo real durante el swipe), NFR8 (personalización basada exclusivamente en datos internos de la plataforma).
**Pre-requisitos:** Story 10.1 completa (tabla `buyer_preference_vectors` y función `computePreferenceVector()`).

**Posición en el epic:** Story 10.2 es la **segunda story** del Epic 10. Transforma el preference vector en scores accionables por listing. Stories 10.3 (foto de portada) y 10.4 (highlights de descripción) dependen de ella.

**Dependencias directas:**
- Story 10.1 (completa, PR #42 merged): tabla `buyer_preference_vectors`, tipos `BuyerPreferenceVector`, lógica en `packages/shared/src/personalization/`
- Story 8.7: patrón de aggregation job con pg_cron (reusar patrón de batch processing)
- Tabla `listings` en `packages/shared/src/db/schema.ts` L120-155: campos `price`, `sizeSqm`, `bedrooms`, `city`, `latitude`, `longitude`, `images`, `status`

## Acceptance Criteria (BDD)

### AC1 — Tabla `listing_fit_scores` en Drizzle schema
**Given** la migración de Story 10.2 ejecutada en Supabase
**When** consulto el schema de la base de datos
**Then** existe la tabla `listing_fit_scores` con los campos:
  - `id` (UUID PK, defaultRandom)
  - `buyer_id` (UUID NOT NULL) — referencia a auth.users.id
  - `listing_id` (UUID NOT NULL, FK → listings.id)
  - `overall_score` (NUMERIC(5,4) NOT NULL) — score normalizado 0.0000–1.0000
  - `dimension_scores` (JSONB NOT NULL) — desglose por dimensión del vector
  - `recommended_photo_index` (INTEGER) — índice de foto óptima para este buyer (nullable, calculado en 10.3)
  - `vector_version` (INTEGER NOT NULL DEFAULT 1) — versión del vector usado para el cálculo (para invalidación)
  - `last_computed_at` (TIMESTAMPTZ NOT NULL)
  - `created_at` (TIMESTAMPTZ NOT NULL, defaultNow)
  - `updated_at` (TIMESTAMPTZ NOT NULL, defaultNow)
**And** existe un índice compuesto UNIQUE sobre `(buyer_id, listing_id)` — un score por par buyer-listing
**And** existe un índice `idx_lfs_buyer_overall` sobre `(buyer_id, overall_score DESC)` — para queries de feed personalizado ordenado por afinidad
**And** existe un índice `idx_lfs_listing` sobre `(listing_id)` — para invalidación masiva cuando un listing cambia
**And** la tabla está definida en `packages/shared/src/db/schema.ts` e importable desde `@reinder/shared`

### AC2 — Estructura del dimension_scores
**Given** un buyer con preference_vector y un listing activo
**When** el aggregation job computa su `listing_fit_score`
**Then** el campo `dimension_scores` contiene un objeto JSON con las siguientes dimensiones:
  - `priceScore`: number (0–1) — cuán cerca está el precio del listing del rango preferido del buyer
  - `sizeScore`: number (0–1) — afinidad de tamaño (sqm) con el preference_vector
  - `bedroomScore`: number (0–1) — match entre habitaciones del listing y la distribución preferida
  - `locationScore`: number (0–1) — proximidad geográfica a las ciudades/centroid preferido
  - `photoAffinityScore`: number (0–1) — afinidad basada en patrones de engagement fotográfico
  - `engagementDepthScore`: number (0–1) — afinidad basada en profundidad de engagement histórico
**And** todos los scores son finite (no NaN ni Infinity)
**And** el `overall_score` es la media ponderada de las dimensiones:
  - `priceScore` × 0.30 (precio es el factor dominante en decisiones inmobiliarias)
  - `locationScore` × 0.25 (ubicación es el segundo factor más importante)
  - `sizeScore` × 0.15
  - `bedroomScore` × 0.15
  - `photoAffinityScore` × 0.10
  - `engagementDepthScore` × 0.05

### AC3 — Lógica de cálculo del fit score (TypeScript)
**Given** un buyer con preference_vector y un listing activo con datos completos
**When** se ejecuta `computeListingFitScore(vector, listing)`
**Then** la función:
  1. **priceScore:** Si el precio del listing está dentro del rango `[rangeMin, rangeMax]` del vector → 1.0. Si está fuera, decae exponencialmente con la distancia al rango, normalizado por stddev. Score mínimo: 0.0.
  2. **sizeScore:** Distancia gaussiana entre `sizeSqm` del listing y `mean` del vector, normalizada por `stddev`. `score = exp(-0.5 * ((sizeSqm - mean) / stddev)^2)`. Si stddev es 0 → match exacto = 1.0, else 0.5.
  3. **bedroomScore:** Lookup directo en `distribution` del vector: `distribution[bedrooms]`. Si el valor no existe → 0.1 (penalización suave).
  4. **locationScore:** Si `city` del listing está en `preferredCities` → score basado en posición (primera = 1.0, segunda = 0.8, tercera = 0.6, etc., mínimo 0.3). Si no está en preferredCities pero hay geoCentroid → decaimiento por distancia haversine (100km = 0.5, 200km = 0.25). Sin coincidencia → 0.1.
  5. **photoAffinityScore:** Basado en la correlación entre las fotos del listing y `preferredPhotoIndices` del vector. Si el listing tiene ≥1 foto en un índice preferido → score proporcional al engagement histórico. Sin datos → 0.5 (neutral).
  6. **engagementDepthScore:** Si `avgScrollDepthPct` > 70% y `avgDetailViewMs` > 5000ms → 1.0 (high engagement buyer, cualquier listing se beneficia). Escala linealmente entre 0.3 y 1.0 basado en depth.
**And** retorna un objeto `{ overallScore, dimensionScores, recommendedPhotoIndex: null }` (recommendedPhotoIndex se calcula en Story 10.3)

**Given** un listing con datos incompletos (precio null, coordenadas null, etc.)
**When** se ejecuta `computeListingFitScore(vector, listing)`
**Then** las dimensiones con datos faltantes reciben score 0.5 (neutral — no penaliza ni favorece)
**And** el `overall_score` se recalcula solo con las dimensiones disponibles (reponderando pesos)

### AC4 — Aggregation job batch (pg_cron)
**Given** el aggregation job configurado en pg_cron
**When** se ejecuta el job `compute_listing_fit_scores()`
**Then** procesa SOLO el producto cartesiano de:
  - Buyers con preference_vector actualizado en los últimos 7 días
  - Listings con status = 'active'
**And** para cada par (buyer, listing): ejecuta `computeListingFitScore()` y hace UPSERT en `listing_fit_scores`
**And** actualiza `last_computed_at` con el timestamp de la ejecución
**And** si el `vector_version` del buyer cambió desde el último cálculo, recalcula todos los scores de ese buyer
**And** el job se programa cada 6 horas vía pg_cron (cron: `45 */6 * * *` — minuto 45 para evitar colisión con preference_vectors en minuto 15)
**And** el schedule no colisiona con los cron jobs existentes

**Given** el aggregation job falla a mitad de ejecución
**When** pg_cron ejecuta el retry automático
**Then** los scores ya procesados persisten (UPSERT idempotente por par buyer-listing)
**And** los scores no procesados retienen su valor anterior (stale pero no corrupto)

### AC5 — Invalidación de scores al cambiar un listing
**Given** un listing cuyo `price`, `sizeSqm`, `bedrooms`, `city`, `latitude` o `longitude` cambia (por CRM sync o edición manual)
**When** el listing se actualiza en la tabla `listings`
**Then** todos los `listing_fit_scores` con ese `listing_id` se marcan como stale eliminando las filas (DELETE) para que el próximo batch las recalcule
**And** la invalidación se implementa como trigger SQL `AFTER UPDATE` en `listings` que detecta cambios en los campos relevantes

### AC6 — API endpoint de trigger manual
**Given** un `platform_admin` autenticado
**When** hace `POST /api/v1/admin/fit-scores/compute` con body opcional `{ buyerId?: "uuid", listingId?: "uuid" }`
**Then** si `buyerId` proporcionado: computa scores para ese buyer × todos los listings activos
**And** si `listingId` proporcionado: computa scores para ese listing × todos los buyers con vector
**And** si ambos proporcionados: computa score para ese par específico
**And** si ninguno: ejecuta el batch completo
**And** responde `{ data: { processedCount, skippedCount, durationMs }, error: null }`

**Given** un usuario con rol `buyer`, `agent` o `agency_admin`
**When** intenta acceder al endpoint
**Then** responde 403

### AC7 — RLS Policies
**Given** RLS habilitado en la tabla `listing_fit_scores`
**When** un `buyer` autenticado consulta la tabla
**Then** solo puede SELECT sus propios scores (`buyer_id = auth.uid()`)
**And** NO puede INSERT, UPDATE ni DELETE

**When** un `agent` o `agency_admin` intenta SELECT en la tabla
**Then** retorna 0 filas (denegado por RLS)

**When** un `platform_admin` consulta la tabla
**Then** puede SELECT todos los registros

### AC8 — Migración SQL con RLS, trigger y pg_cron
**Given** el archivo de migración `supabase/migrations/YYYYMMDD000002_listing_fit_scores.sql`
**When** se ejecuta la migración
**Then** crea la tabla `listing_fit_scores` con todos los campos de AC1
**And** habilita RLS con las policies de AC7
**And** crea el trigger `AFTER UPDATE` en `listings` para invalidación (AC5)
**And** crea la función SQL `compute_listing_fit_scores()` como wrapper del job
**And** registra el pg_cron schedule (con guard de existencia de extensión)
**And** es idempotente (ejecutar 2 veces no genera error)

### AC9 — Tipos TypeScript exportados desde @reinder/shared
**Given** el módulo `packages/shared/src/personalization/`
**When** importo los tipos desde `@reinder/shared`
**Then** exporta:
  - `ListingFitScore` — interface del resultado de `computeListingFitScore()`
  - `DimensionScores` — interface del contenido de `dimension_scores`
  - `ListingFitScoreRow` — shape completa de la fila de la tabla
  - `computeListingFitScore(vector: BuyerPreferenceVector, listing: ListingDataForScore): ListingFitScore` — función pura de cálculo (síncrona, sin I/O)
  - `FIT_SCORE_WEIGHTS` — constante con los pesos de cada dimensión
  - `FIT_SCORE_VERSION: number` — constante de versión del algoritmo

### AC10 — Consulta de feed personalizado
**Given** un buyer con fit scores pre-calculados
**When** el sistema construye el feed de propiedades para ese buyer
**Then** puede consultar `listing_fit_scores` ordenado por `overall_score DESC` para obtener los listings más afines primero
**And** la consulta con LIMIT 50 se resuelve en <5ms usando el índice `idx_lfs_buyer_overall` (NFR2)

## Tasks / Subtasks

- [ ] Task 1: Schema Drizzle + migración SQL (AC: #1, #8)
  - [ ] 1.1 Añadir tabla `listing_fit_scores` a `packages/shared/src/db/schema.ts`
  - [ ] 1.2 Crear migración SQL `supabase/migrations/YYYYMMDD000002_listing_fit_scores.sql`
  - [ ] 1.3 RLS policies en la migración (copiar patrón de Story 10.1 migration)
  - [ ] 1.4 Trigger `AFTER UPDATE` en `listings` para invalidación de scores (AC5)
  - [ ] 1.5 pg_cron schedule en la migración (minuto 45, patrón idéntico a Story 10.1)
- [ ] Task 2: Tipos y lógica de cálculo (AC: #2, #3, #9)
  - [ ] 2.1 Crear `packages/shared/src/personalization/fit-score-types.ts` con DimensionScores, ListingFitScore, ListingFitScoreRow, FIT_SCORE_WEIGHTS
  - [ ] 2.2 Crear `packages/shared/src/personalization/compute-listing-fit-score.ts` con lógica de cálculo pura
  - [ ] 2.3 Actualizar `packages/shared/src/personalization/index.ts` para re-exportar tipos y función
  - [ ] 2.4 Tests unitarios: `compute-listing-fit-score.test.ts` — cubrir todos los escenarios de AC3
- [ ] Task 3: Aggregation job batch (AC: #4)
  - [ ] 3.1 Crear función SQL wrapper `compute_listing_fit_scores()`
  - [ ] 3.2 Crear endpoint de trigger API (AC6)
  - [ ] 3.3 Test de idempotencia del UPSERT
  - [ ] 3.4 Test de performance con mock de 100 buyers × 500 listings
- [ ] Task 4: API endpoint admin (AC: #6)
  - [ ] 4.1 Crear `apps/web/src/app/api/v1/admin/fit-scores/compute/route.ts`
  - [ ] 4.2 Auth guard: solo `platform_admin` (copiar patrón de Story 10.1 endpoint)
  - [ ] 4.3 Tests de auth y response shape
- [ ] Task 5: Tests de RLS + invalidación (AC: #5, #7)
  - [ ] 5.1 Test: buyer lee solo sus propios scores
  - [ ] 5.2 Test: agent/agency_admin no leen scores
  - [ ] 5.3 Test: platform_admin lee todos los scores
  - [ ] 5.4 Test: update de listing invalida (elimina) scores afectados

## Dev Notes

### Patrón de aggregation job — REUSAR de Story 10.1

**CRÍTICO — NO reinventar.** Story 10.1 ya estableció el patrón completo de aggregation job:

1. **TypeScript puro para lógica de cálculo** → `packages/shared/src/personalization/compute-listing-fit-score.ts`
   - Referencia directa: `packages/shared/src/personalization/compute-preference-vector.ts` (Story 10.1)
   - La función `computeListingFitScore()` es **pura y síncrona**: recibe (vector, listing) → retorna score. Sin I/O, sin side effects, sin DB.
   - Las funciones estadísticas helper (`mean`, `stddev`) ya están en `compute-preference-vector.ts` — **NO duplicarlas**. Extraer a `packages/shared/src/personalization/math-utils.ts` si se reusan, o importar directamente.

2. **SQL wrapper para pg_cron** → Función SQL `compute_listing_fit_scores()` que llama a la API
   - Referencia directa: `supabase/migrations/20260721000001_buyer_preference_vectors.sql` líneas 87-104
   - **Copiar exactamente el mismo patrón** DO block con guard de extensión

3. **API trigger para ejecución manual** → `POST /api/v1/admin/fit-scores/compute`
   - Referencia directa: `apps/web/src/app/api/v1/admin/preference-vectors/compute/route.ts` (Story 10.1)
   - **Copiar estructura idéntica**: auth guard, Zod validation, ApiResponse shape

### Diferencia clave vs. Story 10.1: cardinalidad del cálculo

| Aspecto | Story 10.1 | Story 10.2 |
|---------|-----------|-----------|
| Cardinalidad | 1 vector per buyer | 1 score per (buyer × listing) pair |
| Input | swipe_events + engagement_events | buyer_preference_vectors + listings |
| Processing | N buyers (lineal) | N buyers × M listings (cuadrático) |
| Mitigation | Filtrar buyers activos | Filtrar buyers con vector reciente + listings activos SOLAMENTE |

**Performance crítica:** Con 1000 buyers × 2000 listings = 2M scores. El job DEBE:
- Procesar en batches de 100 buyers a la vez (no cargar todo en memoria)
- Usar UPSERT con `ON CONFLICT (buyer_id, listing_id)` para idempotencia
- El cálculo por par es O(1) — la función `computeListingFitScore()` no tiene I/O
- La lectura de preference_vectors y listings se hace UNA VEZ antes del loop

### Tablas fuente (INPUT — no modificar)

| Tabla | Campos relevantes | Nota |
|-------|-------------------|------|
| `buyer_preference_vectors` | `buyer_id`, `vector`, `version`, `last_computed_at` | Creada en Story 10.1 — `schema.ts` L620-641 |
| `listings` | `id`, `price`, `sizeSqm`, `bedrooms`, `city`, `latitude`, `longitude`, `images`, `status` | Schema en `packages/shared/src/db/schema.ts` L120-155 |

### Tabla destino (OUTPUT — crear)

| Tabla | Ubicación en schema |
|-------|-------------------|
| `listing_fit_scores` | Añadir DESPUÉS de `buyer_preference_vectors` en `packages/shared/src/db/schema.ts` |

### Archivos que esta story CREA (no existen aún)

```
packages/shared/src/personalization/
├── fit-score-types.ts                    # DimensionScores, ListingFitScore, FIT_SCORE_WEIGHTS
├── compute-listing-fit-score.ts          # Función pura de cálculo (síncrona)
├── compute-listing-fit-score.test.ts     # Tests unitarios exhaustivos
└── math-utils.ts                         # Helpers estadísticos (haversine, gaussian) — SI es necesario

apps/web/src/app/api/v1/admin/fit-scores/
└── compute/route.ts                      # API trigger manual

supabase/migrations/
└── YYYYMMDD000002_listing_fit_scores.sql # Migración: tabla + RLS + trigger + cron
```

### Archivos que esta story MODIFICA

```
packages/shared/src/db/schema.ts                    # Añadir tabla listing_fit_scores
packages/shared/src/personalization/index.ts         # Re-export fit score types + function
```

### Cron schedule — evitar colisiones

| Job existente | Schedule | Fuente |
|--------------|----------|--------|
| CRM sync worker | `*/5 * * * *` (cada 5 min) | `20260619000001_crm_sync_queue_and_worker.sql` |
| Listing lifecycle (sold auto-remove) | `0 * * * *` (cada hora, minuto 0) | `20260619000003_listing_lifecycle.sql` |
| Engagement aggregation (8.7) | `0 * * * *` (cada hora, minuto 0) | Story 8.7 migration |
| Experiment results aggregation (9.3) | `30 * * * *` (cada hora, minuto 30) | `20260622000003_experiment_results_timeseries.sql` |
| Experiment recommendations (9.5) | `0 6 * * 1` (lunes 06:00 UTC) | `20260622000005_experiment_recommendations.sql` |
| buyer_preference_vectors (10.1) | `15 */6 * * *` (cada 6h, minuto 15) | `20260721000001_buyer_preference_vectors.sql` |
| **listing_fit_scores (10.2)** | `45 */6 * * *` (cada 6h, minuto 45) | **ESTA STORY** |

**Nota:** El schedule `45 */6 * * *` ejecuta a las 00:45, 06:45, 12:45, 18:45 UTC. 30 minutos después de preference_vectors (minuto 15) para asegurar que los vectores estén actualizados antes de calcular fit scores.

### Algoritmo de scoring — decisiones de diseño

**Pesos de dimensiones (FIT_SCORE_WEIGHTS):**
```typescript
export const FIT_SCORE_WEIGHTS = {
  priceScore: 0.30,      // Precio domina decisiones inmobiliarias
  locationScore: 0.25,    // Ubicación es segundo factor
  sizeScore: 0.15,        // Tamaño relevante
  bedroomScore: 0.15,     // Habitaciones relevante
  photoAffinityScore: 0.10, // Engagement fotográfico como señal secundaria
  engagementDepthScore: 0.05, // Profundidad de engagement como señal menor
} as const;
```

**Función de distancia geográfica:** Usar fórmula de Haversine simplificada (no necesita precisión de geodesia — 100m de error es aceptable). Implementar en `math-utils.ts` como función pura:
```typescript
function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number
```

**Normalización:** Todos los scores se normalizan a [0, 1] antes de ponderar. El `overall_score` resultante también está en [0, 1].

**Datos incompletos:** Cuando un listing tiene campos null (precio, coordenadas, etc.), la dimensión correspondiente recibe 0.5 (neutral) y su peso se redistribuye proporcionalmente entre las dimensiones con datos.

### Convenciones de código del proyecto

- **ORM:** Drizzle ORM 0.45.x — camelCase en TypeScript, snake_case en DB
- **API response shape:** `{ data: T | null, error: { code: string, message: string } | null }` (patrón `ApiResponse<T>` de `packages/shared/src/types/api.ts`)
- **Auth guard pattern:** Verificar role en route handler con `createServerClient()` de `@supabase/ssr`
- **Test framework:** Vitest para unit tests en `packages/shared`
- **Import alias:** `@reinder/shared` para imports desde packages/shared
- **Numeric fields:** `price`, `sizeSqm`, `latitude`, `longitude` son `numeric()` en Drizzle (strings en TS). Convertir a `Number()` antes de calcular. NUNCA comparar como strings.

### GDPR / Privacidad

- `listing_fit_scores` contiene datos derivados de comportamiento — cubierto por consentimiento GDPR del onboarding
- RLS DEBE denegar acceso a `agent` y `agency_admin` — los agentes NUNCA ven scores individuales de compradores
- El score debe eliminarse en account deletion (GDPR Art. 17) — cleanup en application layer (no FK a auth.users)
- Los scores son internos de la plataforma y NUNCA se exponen en la UI directamente — solo se usan para ordenar/personalizar contenido

### Consideraciones de performance

- El cálculo `computeListingFitScore()` es **puro y síncrono** — O(1) por par. No tiene I/O ni queries a DB.
- El batch job carga todos los vectores y listings UNA VEZ, luego itera el producto cartesiano en memoria
- UPSERT con `ON CONFLICT (buyer_id, listing_id)` permite retry seguro si el job falla
- El índice `(buyer_id, overall_score DESC)` permite query de feed personalizado en <5ms
- Invalidación por trigger en `listings` evita servir scores obsoletos para listings modificados

### Project Structure Notes

- Alineado con `packages/shared/src/personalization/` (módulo creado en Story 10.1)
- API endpoint en `apps/web/src/app/api/v1/admin/fit-scores/` — patrón idéntico a `preference-vectors/`
- Sin conflictos con la estructura existente — extensión natural del módulo de personalización

### References

- [Source: epics.md#Epic 10, líneas 386-424](file:///Users/santiagocastro/Desktop/Projects%20Antigravity/Reinder/_bmad-output/planning-artifacts/epics.md#L386)
- [Source: architecture.md#Data Architecture](file:///Users/santiagocastro/Desktop/Projects%20Antigravity/Reinder/_bmad-output/planning-artifacts/architecture.md#L136)
- [Story 10.1 completa — patrón a reusar](file:///Users/santiagocastro/Desktop/Projects%20Antigravity/Reinder/_bmad-output/implementation-artifacts/10-1-buyer-preference-vector-generacion-persistencia.md)
- [BuyerPreferenceVector types (10.1)](file:///Users/santiagocastro/Desktop/Projects%20Antigravity/Reinder/packages/shared/src/personalization/types.ts)
- [computePreferenceVector (10.1)](file:///Users/santiagocastro/Desktop/Projects%20Antigravity/Reinder/packages/shared/src/personalization/compute-preference-vector.ts)
- [Personalization barrel export (10.1)](file:///Users/santiagocastro/Desktop/Projects%20Antigravity/Reinder/packages/shared/src/personalization/index.ts)
- [BPV migration SQL (10.1)](file:///Users/santiagocastro/Desktop/Projects%20Antigravity/Reinder/supabase/migrations/20260721000001_buyer_preference_vectors.sql)
- [Schema: listings table](file:///Users/santiagocastro/Desktop/Projects%20Antigravity/Reinder/packages/shared/src/db/schema.ts#L120-L155)
- [Schema: buyer_preference_vectors table](file:///Users/santiagocastro/Desktop/Projects%20Antigravity/Reinder/packages/shared/src/db/schema.ts#L614-L642)

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
