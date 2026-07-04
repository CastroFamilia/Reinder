# Story 9.5: Recomendaciones Proactivas de Experimentos para Listings Underperforming

Status: ready-for-dev

## Story

Como administrador de agencia inmobiliaria en Reinder,
quiero que el sistema detecte automáticamente mis listings con bajo rendimiento y me recomiende crear experimentos A/B específicos,
para que pueda mejorar proactivamente el engagement de mis propiedades sin tener que analizar manualmente cada listing.

## Contexto del Epic

**Epic 9 — Content Optimization & A/B Testing:** Las agencias experimentan con contenido (portada, título, descripción) y Reinder optimiza automáticamente el rendimiento de los listings.

**FR cubierto por esta story:** FR-E9-7 (El sistema detecta proactivamente listings underperforming y recomienda crear un experimento)
**NFRs aplicados:** NFR8 (todo el análisis se basa en datos agregados de `listing_analytics_hourly` — nunca se exponen datos de compradores individuales), NFR11 (el análisis se ejecuta en background via pg_cron, no en request path)

**Posición en el epic:** Story 9.5 es la **capa proactiva** del sistema A/B. Depende de:
- **Story 9.1** — schema de `listing_experiments`, `experiment_results`, enums, API `POST /api/v1/experiments`
- **Story 8.7** — tabla `listing_analytics_hourly` (read model con métricas agregadas por listing)
- **Story 9.2** — flujo de creación de experimento (reutilizado via deeplink "Crear experimento")

## Acceptance Criteria (BDD)

### AC1 — Tabla `experiment_recommendations`

**Given** la migración de Story 9.5 ejecutada en Supabase
**When** consulto el schema de la base de datos
**Then** existe la tabla `experiment_recommendations` con los campos:
  - `id` (UUID PK, defaultRandom)
  - `agency_id` (UUID FK → agencies.id, NOT NULL)
  - `listing_id` (UUID FK → listings.id, NOT NULL)
  - `recommended_experiment_type` (experimentTypeEnum NOT NULL) — `cover_image`, `title`, `description`, `title_and_description`
  - `reason_code` (TEXT NOT NULL) — código máquina: `low_match_rate`, `low_avg_view_time`, `low_reaffirm_rate`, `multiple_metrics_low`
  - `reason_detail` (TEXT NOT NULL) — explicación legible: "Match rate 2.1% — 1.8σ por debajo del promedio de tu agencia (6.5%)"
  - `underperforming_metrics` (JSONB NOT NULL) — `{ match_rate?: { value, agency_avg, platform_avg, z_score }, avg_view_time_ms?: {...}, reaffirm_rate?: {...} }`
  - `priority_score` (NUMERIC(5,2) NOT NULL) — score 0–100 para ordenar por impacto potencial
  - `status` (TEXT NOT NULL DEFAULT 'pending') — `pending` | `accepted` | `dismissed` | `expired`
  - `accepted_experiment_id` (UUID nullable FK → listing_experiments.id) — se llena cuando el agency_admin crea el experimento
  - `week_generated` (TEXT NOT NULL) — ISO week: `2026-W25` (para limitar 3 por agencia por semana)
  - `created_at` (TIMESTAMPTZ NOT NULL, defaultNow)
  - `updated_at` (TIMESTAMPTZ NOT NULL, defaultNow)
**And** existe un índice `idx_recommendations_agency_id` sobre `agency_id`
**And** existe un índice `idx_recommendations_listing_status` sobre `(listing_id, status)`
**And** RLS habilitada: `agency_admin` solo puede ver/actualizar recomendaciones de su propia agencia

### AC2 — Algoritmo de detección de underperformance

**Given** un listing activo con ≥50 impressions en `listing_analytics_hourly` (umbral mínimo de datos)
**When** el job de detección analiza el listing
**Then** compara las métricas del listing contra el promedio de la agencia:
  - `match_rate` = match_count / impressions
  - `avg_view_time_ms` = total_view_time_ms / impressions
  - `reaffirm_rate` = reaffirm_count / match_count (si match_count > 0, sino se excluye)
**And** calcula el z-score del listing para cada métrica: `z = (listing_metric - agency_avg) / agency_stddev`
**And** marca el listing como underperforming si el z-score es < -1.0 en **2 o más** métricas
**And** excluye listings que ya tienen un experimento activo (status `draft`, `running` o `paused`)
**And** excluye listings que ya tienen una recomendación `pending` activa

**Given** una agencia con solo 1 listing activo
**When** el job intenta calcular el promedio de agencia
**Then** usa el promedio de plataforma como fallback (no se puede calcular std dev con n=1)
**And** el umbral se relaja a z-score < -0.5 comparado con plataforma

### AC3 — Motor de recomendación de tipo de experimento

**Given** un listing detectado como underperforming
**When** el motor genera la recomendación
**Then** sugiere el tipo de experimento según la métrica más débil:
  - Si `avg_view_time_ms` es la peor métrica → recomienda `cover_image` (la portada no capta atención)
  - Si `match_rate` es la peor métrica Y `avg_view_time_ms` está bien → recomienda `title` (ven el listing pero no hacen match — el título no convence)
  - Si `reaffirm_rate` es la peor métrica → recomienda `description` (hacen match pero no reafirman — la descripción no refuerza)
  - Si 2+ métricas están igualmente mal → recomienda `title_and_description` (problema generalizado de contenido)
**And** calcula `priority_score` basado en: `abs(z_score_peor_metrica) × impressions_normalizadas × (1 + metrics_underperforming_count / 3)`
**And** normaliza `priority_score` a rango 0–100

### AC4 — Límite de 3 recomendaciones por agencia por semana

**Given** el job de detección encontró 7 listings underperforming para la misma agencia
**When** genera las recomendaciones
**Then** solo crea las 3 con mayor `priority_score`
**And** las 3 recomendaciones se insertan con `week_generated` = ISO week actual (ej. `2026-W25`)
**And** si la agencia ya tiene recomendaciones `pending` de la misma semana, no genera nuevas

### AC5 — Expiración automática de recomendaciones antiguas

**Given** recomendaciones `pending` con `created_at` > 14 días
**When** el job semanal se ejecuta
**Then** actualiza esas recomendaciones a status `expired`
**And** esto libera espacio para nuevas recomendaciones en la siguiente ejecución

### AC6 — API: `GET /api/v1/agency/recommendations`

**Given** un usuario autenticado con rol `agency_admin`
**When** hace `GET /api/v1/agency/recommendations`
**Then** responde 200 con `{ data: { recommendations: Recommendation[] }, error: null }`
**And** cada recomendación incluye: id, listing (id, título, imagen portada), recommended_experiment_type, reason_detail, priority_score, status, created_at
**And** solo devuelve recomendaciones con status `pending` (ordenadas por priority_score DESC)
**And** el query usa JOIN con `listings` para devolver título e imagen sin query adicional

**Given** un usuario con rol diferente a `agency_admin`
**When** hace GET a este endpoint
**Then** responde 403

### AC7 — API: `PATCH /api/v1/agency/recommendations/:id`

**Given** un `agency_admin` con una recomendación `pending`
**When** hace `PATCH` con body `{ action: 'dismiss' }`
**Then** actualiza la recomendación a status `dismissed`
**And** responde 200 con `{ data: { recommendation }, error: null }`

**Given** un `agency_admin` con una recomendación `pending`
**When** hace `PATCH` con body `{ action: 'accept', experimentId: '<uuid>' }`
**Then** actualiza la recomendación a status `accepted` y establece `accepted_experiment_id`
**And** responde 200

**Given** una recomendación con status != `pending`
**When** se intenta hacer PATCH
**Then** responde 409 con `{ data: null, error: { code: "RECOMMENDATION_NOT_PENDING", message: "..." } }`

### AC8 — Sección de recomendaciones en dashboard de agencia

**Given** un `agency_admin` en la página `/agency/experiments` (lista de experimentos, Story 9.2)
**When** existen recomendaciones `pending` para su agencia
**Then** ve una sección "💡 Recomendaciones" encima de la lista de experimentos
**And** cada tarjeta de recomendación muestra:
  - Imagen miniatura del listing + título
  - Tipo de experimento sugerido (badge con icono: 📷 Portada, ✏️ Título, 📝 Descripción)
  - Reason detail en texto legible
  - Botón primario "Crear Experimento" → navega a formulario de creación pre-rellenado con listing_id y experiment_type
  - Botón secundario "Descartar" → PATCH dismiss
**And** muestra máximo 3 tarjetas (alineado con el límite semanal)
**And** si no hay recomendaciones pendientes, la sección no se muestra

**Given** un `agency_admin` que hace click en "Crear Experimento" desde una recomendación
**When** completa el formulario de creación (Story 9.2)
**Then** al crear exitosamente el experimento, la recomendación se actualiza a `accepted` con `accepted_experiment_id` automáticamente
**And** la tarjeta de recomendación desaparece de la sección

### AC9 — Job pg_cron semanal

**Given** pg_cron habilitado en Supabase
**When** se registra el job de recomendaciones
**Then** se ejecuta semanalmente los lunes a las 06:00 UTC (`0 6 * * 1`)
**And** el job ejecuta la función SQL `generate_experiment_recommendations()`
**And** el job es idempotente — ejecutarlo dos veces en la misma semana no genera duplicados (check `week_generated`)

### AC10 — Drizzle schema y migración SQL

**Given** el archivo `schema.ts` actualizado
**When** se ejecuta `pnpm typecheck` desde la raíz del monorepo
**Then** compila sin errores de TypeScript
**And** `experimentRecommendations` está definido con el patrón Drizzle existente
**And** la migración SQL crea la tabla, índices, RLS y job pg_cron sin errores
**And** es idempotente (usa `IF NOT EXISTS`, `DO $$ ... $$`)

## Tasks / Subtasks

- [ ] **Task 1 — Tabla `experiment_recommendations` en Drizzle** (AC: 1, 10)
  - [ ] Añadir `experimentRecommendations` en `packages/shared/src/db/schema.ts`
  - [ ] Campos exactos según AC1
  - [ ] FK a `agencies.id`, `listings.id`, `listing_experiments.id` (nullable)
  - [ ] Reusar `experimentTypeEnum` de Story 9.1
  - [ ] Índices: `idx_recommendations_agency_id`, `idx_recommendations_listing_status`

- [ ] **Task 2 — Migración SQL** (AC: 1, 9, 10)
  - [ ] Crear `supabase/migrations/20260622000005_experiment_recommendations.sql`
  - [ ] CREATE TABLE con `IF NOT EXISTS`
  - [ ] CREATE INDEX para los índices definidos
  - [ ] ALTER TABLE ENABLE ROW LEVEL SECURITY
  - [ ] RLS policies: agency_admin lee/actualiza solo sus recomendaciones, platform_admin acceso total
  - [ ] Función SQL `generate_experiment_recommendations()` — lógica de detección + generación
  - [ ] Registrar job pg_cron: `0 6 * * 1` (lunes 06:00 UTC)

- [ ] **Task 3 — Algoritmo de detección en SQL** (AC: 2, 3, 4, 5)
  - [ ] Función SQL `generate_experiment_recommendations()` implementa:
    1. Expirar recomendaciones `pending` con > 14 días → `expired`
    2. Calcular promedios y stddev por agencia desde `listing_analytics_hourly`
    3. Para cada listing activo con ≥50 impressions, calcular z-scores
    4. Filtrar listings con z < -1.0 en 2+ métricas
    5. Excluir listings con experimento activo o recomendación pending
    6. Determinar tipo de experimento recomendado según métrica más débil
    7. Calcular priority_score
    8. Insertar top 3 por agencia (si no hay ya de esta semana)
  - [ ] Usar CTEs para legibilidad y performance
  - [ ] Manejar caso de agencia con 1 listing (fallback a plataforma avg)

- [ ] **Task 4 — API: `GET /api/v1/agency/recommendations`** (AC: 6)
  - [ ] Crear `apps/web/src/app/api/v1/agency/recommendations/route.ts`
  - [ ] Auth check → 401, role check agency_admin → 403
  - [ ] Query: SELECT recomendaciones pending + JOIN listings para título/imagen
  - [ ] Ordenar por priority_score DESC
  - [ ] Devolver con formato `ApiResponse<T>`

- [ ] **Task 5 — API: `PATCH /api/v1/agency/recommendations/:id`** (AC: 7)
  - [ ] Crear `apps/web/src/app/api/v1/agency/recommendations/[id]/route.ts`
  - [ ] Validar body con Zod: `{ action: 'dismiss' } | { action: 'accept', experimentId: string }`
  - [ ] Verificar que la recomendación pertenece a la agencia del usuario
  - [ ] Verificar status = `pending` → 409 si no
  - [ ] Actualizar status + accepted_experiment_id si action = accept

- [ ] **Task 6 — Componente `RecommendationsSection`** (AC: 8)
  - [ ] Crear `apps/web/src/features/experiments/components/recommendations-section.tsx`
  - [ ] Fetch de `GET /api/v1/agency/recommendations` con TanStack Query
  - [ ] Tarjetas con listing thumbnail, experiment type badge, reason_detail
  - [ ] Botón "Crear Experimento" → navega a `/agency/experiments/new?listingId=X&type=Y`
  - [ ] Botón "Descartar" → PATCH dismiss + invalidar query
  - [ ] Integrar en la página `/agency/experiments` (Story 9.2) encima de la lista

- [ ] **Task 7 — Integración con formulario de creación** (AC: 8)
  - [ ] Modificar la página de creación de experimento (Story 9.2) para aceptar query params `listingId` y `type`
  - [ ] Pre-rellenar listing selector y tipo de experimento si vienen de una recomendación
  - [ ] Al crear exitosamente, buscar recomendación pending para ese listing y actualizarla a `accepted`

- [ ] **Task 8 — Types y exports** (AC: 10)
  - [ ] Añadir tipos en `packages/shared/src/types/experiment.ts`: `ExperimentRecommendation`, `RecommendationStatus`, `UnderperformingMetrics`
  - [ ] Re-exportar desde barrel `packages/shared/src/types/index.ts`

- [ ] **Task 9 — Tests** (AC: 2, 3, 4, 6, 7)
  - [ ] T9.5-01: Listing con 2+ métricas a z < -1.0 → genera recomendación
  - [ ] T9.5-02: Listing con solo 1 métrica baja → NO genera recomendación
  - [ ] T9.5-03: Listing con < 50 impressions → excluido
  - [ ] T9.5-04: Listing con experimento activo → excluido
  - [ ] T9.5-05: Máximo 3 recomendaciones por agencia por semana
  - [ ] T9.5-06: Recomendaciones > 14 días → expiradas
  - [ ] T9.5-07: GET recommendations devuelve solo pending, ordenadas por priority_score
  - [ ] T9.5-08: PATCH dismiss → status = dismissed
  - [ ] T9.5-09: PATCH accept con experimentId → status = accepted
  - [ ] T9.5-10: PATCH en recomendación no-pending → 409
  - [ ] T9.5-11: Tipo recomendado correcto según métrica más débil

## Dev Notes

### Estructura de `listing_analytics_hourly` (Epic 8)

Esta tabla fue definida en Story 8.7 como read model agregado por listing. Columnas relevantes para esta story:
- `listing_id` (UUID)
- `impressions` (INTEGER) — total de veces que el listing fue mostrado
- `total_view_time_ms` (BIGINT) — suma total de tiempo de visualización
- `match_count` (INTEGER) — matches generados
- `reaffirm_count` (INTEGER) — reafirmaciones post-match

**⚠️ IMPORTANTE:** Si `listing_analytics_hourly` no existe aún en el codebase (Stories 8.x pueden no estar implementadas en el worktree actual), la función SQL debe usar `CREATE TABLE IF NOT EXISTS` para la tabla temporal de agregación, o depender de que la tabla exista y fallar gracefully con un `RAISE NOTICE` si no existe.

### Función SQL de Detección — Implementación de Referencia

```sql
-- supabase/migrations/20260622000005_experiment_recommendations.sql

CREATE OR REPLACE FUNCTION generate_experiment_recommendations()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  current_week TEXT := to_char(NOW(), 'IYYY-"W"IW');
  expiry_threshold TIMESTAMPTZ := NOW() - INTERVAL '14 days';
BEGIN
  -- 1. Expirar recomendaciones antiguas
  UPDATE experiment_recommendations
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending' AND created_at < expiry_threshold;

  -- 2. Generar recomendaciones nuevas
  WITH
  -- Métricas por listing (solo activos con ≥50 impressions)
  listing_metrics AS (
    SELECT
      l.id AS listing_id,
      l.agency_id,
      COALESCE(lah.impressions, 0) AS impressions,
      CASE WHEN COALESCE(lah.impressions, 0) > 0
        THEN lah.match_count::NUMERIC / lah.impressions
        ELSE 0 END AS match_rate,
      CASE WHEN COALESCE(lah.impressions, 0) > 0
        THEN lah.total_view_time_ms::NUMERIC / lah.impressions
        ELSE 0 END AS avg_view_time_ms,
      CASE WHEN COALESCE(lah.match_count, 0) > 0
        THEN lah.reaffirm_count::NUMERIC / lah.match_count
        ELSE NULL END AS reaffirm_rate
    FROM listings l
    LEFT JOIN listing_analytics_hourly lah ON lah.listing_id = l.id
    WHERE l.status = 'active'
      AND COALESCE(lah.impressions, 0) >= 50
      -- Excluir listings con experimento activo
      AND NOT EXISTS (
        SELECT 1 FROM listing_experiments le
        WHERE le.listing_id = l.id
          AND le.status IN ('draft', 'running', 'paused')
      )
      -- Excluir listings con recomendación pending
      AND NOT EXISTS (
        SELECT 1 FROM experiment_recommendations er
        WHERE er.listing_id = l.id
          AND er.status = 'pending'
      )
  ),
  -- Promedios y stddev por agencia (mínimo 2 listings para stddev)
  agency_stats AS (
    SELECT
      agency_id,
      AVG(match_rate) AS avg_match_rate,
      STDDEV_SAMP(match_rate) AS std_match_rate,
      AVG(avg_view_time_ms) AS avg_view_time,
      STDDEV_SAMP(avg_view_time_ms) AS std_view_time,
      AVG(reaffirm_rate) FILTER (WHERE reaffirm_rate IS NOT NULL) AS avg_reaffirm,
      STDDEV_SAMP(reaffirm_rate) FILTER (WHERE reaffirm_rate IS NOT NULL) AS std_reaffirm,
      COUNT(*) AS listing_count
    FROM listing_metrics
    GROUP BY agency_id
  ),
  -- Platform-wide stats (fallback para agencias con 1 listing)
  platform_stats AS (
    SELECT
      AVG(match_rate) AS avg_match_rate,
      STDDEV_SAMP(match_rate) AS std_match_rate,
      AVG(avg_view_time_ms) AS avg_view_time,
      STDDEV_SAMP(avg_view_time_ms) AS std_view_time,
      AVG(reaffirm_rate) FILTER (WHERE reaffirm_rate IS NOT NULL) AS avg_reaffirm,
      STDDEV_SAMP(reaffirm_rate) FILTER (WHERE reaffirm_rate IS NOT NULL) AS std_reaffirm
    FROM listing_metrics
  ),
  -- Z-scores por listing
  scored AS (
    SELECT
      lm.listing_id,
      lm.agency_id,
      lm.impressions,
      lm.match_rate,
      lm.avg_view_time_ms,
      lm.reaffirm_rate,
      -- Usar agency stats si hay ≥2 listings, sino platform
      COALESCE(
        NULLIF(ast.avg_match_rate, NULL),
        ps.avg_match_rate
      ) AS ref_avg_match,
      -- Z-scores (proteger contra stddev=0)
      CASE
        WHEN COALESCE(ast.std_match_rate, ps.std_match_rate, 0) > 0
        THEN (lm.match_rate - COALESCE(ast.avg_match_rate, ps.avg_match_rate))
             / COALESCE(ast.std_match_rate, ps.std_match_rate)
        ELSE 0
      END AS z_match_rate,
      CASE
        WHEN COALESCE(ast.std_view_time, ps.std_view_time, 0) > 0
        THEN (lm.avg_view_time_ms - COALESCE(ast.avg_view_time, ps.avg_view_time))
             / COALESCE(ast.std_view_time, ps.std_view_time)
        ELSE 0
      END AS z_view_time,
      CASE
        WHEN lm.reaffirm_rate IS NOT NULL
          AND COALESCE(ast.std_reaffirm, ps.std_reaffirm, 0) > 0
        THEN (lm.reaffirm_rate - COALESCE(ast.avg_reaffirm, ps.avg_reaffirm))
             / COALESCE(ast.std_reaffirm, ps.std_reaffirm)
        ELSE NULL  -- excluir si no hay reaffirms
      END AS z_reaffirm,
      COALESCE(ast.avg_match_rate, ps.avg_match_rate) AS comp_avg_match,
      COALESCE(ast.avg_view_time, ps.avg_view_time) AS comp_avg_view,
      COALESCE(ast.avg_reaffirm, ps.avg_reaffirm) AS comp_avg_reaffirm,
      ps.avg_match_rate AS plat_avg_match,
      ps.avg_view_time AS plat_avg_view,
      ps.avg_reaffirm AS plat_avg_reaffirm,
      CASE WHEN COALESCE(ast.listing_count, 0) >= 2 THEN FALSE ELSE TRUE END AS uses_platform_fallback
    FROM listing_metrics lm
    LEFT JOIN agency_stats ast ON ast.agency_id = lm.agency_id
    CROSS JOIN platform_stats ps
  ),
  -- Filtrar underperforming: z < -1.0 en 2+ métricas (o z < -0.5 con fallback plataforma)
  underperforming AS (
    SELECT
      s.*,
      (CASE WHEN z_match_rate < CASE WHEN uses_platform_fallback THEN -0.5 ELSE -1.0 END THEN 1 ELSE 0 END
       + CASE WHEN z_view_time < CASE WHEN uses_platform_fallback THEN -0.5 ELSE -1.0 END THEN 1 ELSE 0 END
       + CASE WHEN z_reaffirm IS NOT NULL
              AND z_reaffirm < CASE WHEN uses_platform_fallback THEN -0.5 ELSE -1.0 END THEN 1 ELSE 0 END
      ) AS underperforming_count,
      -- Métrica más débil (menor z-score)
      LEAST(
        z_match_rate,
        z_view_time,
        COALESCE(z_reaffirm, 0)
      ) AS worst_z
    FROM scored s
  ),
  -- Solo los que cumplen el umbral
  candidates AS (
    SELECT *,
      -- Tipo de experimento recomendado
      CASE
        WHEN z_view_time <= z_match_rate AND z_view_time <= COALESCE(z_reaffirm, 0)
          THEN 'cover_image'
        WHEN z_match_rate <= z_view_time AND z_match_rate <= COALESCE(z_reaffirm, 0)
          AND z_view_time >= -0.5
          THEN 'title'
        WHEN z_reaffirm IS NOT NULL
          AND z_reaffirm <= z_match_rate AND z_reaffirm <= z_view_time
          THEN 'description'
        ELSE 'title_and_description'
      END AS rec_type,
      -- Reason code
      CASE
        WHEN underperforming_count >= 2 THEN 'multiple_metrics_low'
        WHEN z_view_time = worst_z THEN 'low_avg_view_time'
        WHEN z_match_rate = worst_z THEN 'low_match_rate'
        ELSE 'low_reaffirm_rate'
      END AS rec_reason_code,
      -- Priority score: abs(worst_z) × normalized_impressions × (1 + count/3)
      LEAST(100, GREATEST(0,
        ABS(worst_z) * (impressions::NUMERIC / 500) * (1 + underperforming_count::NUMERIC / 3) * 20
      )) AS calc_priority,
      ROW_NUMBER() OVER (
        PARTITION BY agency_id
        ORDER BY ABS(worst_z) * (impressions::NUMERIC / 500) * (1 + underperforming_count::NUMERIC / 3) DESC
      ) AS rn
    FROM underperforming
    WHERE underperforming_count >= 2
  )
  -- Insertar máximo 3 por agencia (si no hay ya de esta semana)
  INSERT INTO experiment_recommendations (
    agency_id, listing_id, recommended_experiment_type,
    reason_code, reason_detail, underperforming_metrics,
    priority_score, status, week_generated
  )
  SELECT
    c.agency_id,
    c.listing_id,
    c.rec_type::experiment_type,
    c.rec_reason_code,
    -- Reason detail legible
    CASE c.rec_reason_code
      WHEN 'low_match_rate' THEN
        format('Match rate %.1f%% — %.1fσ por debajo del promedio (%.1f%%)',
          c.match_rate * 100, ABS(c.z_match_rate), c.comp_avg_match * 100)
      WHEN 'low_avg_view_time' THEN
        format('Tiempo medio %.0fms — %.1fσ por debajo del promedio (%.0fms)',
          c.avg_view_time_ms, ABS(c.z_view_time), c.comp_avg_view)
      WHEN 'low_reaffirm_rate' THEN
        format('Reafirmación %.1f%% — %.1fσ por debajo del promedio (%.1f%%)',
          COALESCE(c.reaffirm_rate, 0) * 100, ABS(COALESCE(c.z_reaffirm, 0)),
          COALESCE(c.comp_avg_reaffirm, 0) * 100)
      ELSE
        format('%d métricas por debajo del promedio — el listing necesita optimización de contenido',
          c.underperforming_count)
    END,
    -- Underperforming metrics JSONB
    jsonb_build_object(
      'match_rate', jsonb_build_object(
        'value', round(c.match_rate::NUMERIC, 4),
        'agency_avg', round(c.comp_avg_match::NUMERIC, 4),
        'platform_avg', round(c.plat_avg_match::NUMERIC, 4),
        'z_score', round(c.z_match_rate::NUMERIC, 2)
      ),
      'avg_view_time_ms', jsonb_build_object(
        'value', round(c.avg_view_time_ms::NUMERIC, 0),
        'agency_avg', round(c.comp_avg_view::NUMERIC, 0),
        'platform_avg', round(c.plat_avg_view::NUMERIC, 0),
        'z_score', round(c.z_view_time::NUMERIC, 2)
      ),
      'reaffirm_rate', CASE
        WHEN c.reaffirm_rate IS NOT NULL THEN jsonb_build_object(
          'value', round(c.reaffirm_rate::NUMERIC, 4),
          'agency_avg', round(COALESCE(c.comp_avg_reaffirm, 0)::NUMERIC, 4),
          'platform_avg', round(COALESCE(c.plat_avg_reaffirm, 0)::NUMERIC, 4),
          'z_score', round(COALESCE(c.z_reaffirm, 0)::NUMERIC, 2)
        )
        ELSE NULL
      END
    ),
    round(c.calc_priority::NUMERIC, 2),
    'pending',
    current_week
  FROM candidates c
  WHERE c.rn <= 3
    -- Idempotencia: no insertar si ya hay recomendaciones de esta semana para esta agencia
    AND NOT EXISTS (
      SELECT 1 FROM experiment_recommendations er
      WHERE er.agency_id = c.agency_id
        AND er.week_generated = current_week
    );

  RAISE LOG '[experiment-recommendations] Generated recommendations for week %', current_week;
END;
$$;
```

### RLS Policies para `experiment_recommendations`

```sql
ALTER TABLE experiment_recommendations ENABLE ROW LEVEL SECURITY;

-- agency_admin lee sus propias recomendaciones
CREATE POLICY "agency_admin_can_read_own_recommendations"
  ON experiment_recommendations
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

-- agency_admin actualiza solo sus recomendaciones (dismiss/accept)
CREATE POLICY "agency_admin_can_update_own_recommendations"
  ON experiment_recommendations
  FOR UPDATE
  TO authenticated
  USING (
    agency_id = (
      SELECT agency_id
      FROM user_profiles
      WHERE id = auth.uid()
        AND role = 'agency_admin'
    )
  )
  WITH CHECK (
    agency_id = (
      SELECT agency_id
      FROM user_profiles
      WHERE id = auth.uid()
        AND role = 'agency_admin'
    )
  );

-- service_role para inserciones del job
CREATE POLICY "service_role_can_insert_recommendations"
  ON experiment_recommendations
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- service_role para update de expiración
CREATE POLICY "service_role_can_update_recommendations"
  ON experiment_recommendations
  FOR UPDATE
  TO service_role
  USING (true);

-- platform_admin acceso total
CREATE POLICY "platform_admin_full_access_recommendations"
  ON experiment_recommendations
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'platform_admin'
  );
```

### Job pg_cron — Registro

```sql
-- Registrar job semanal: lunes a las 06:00 UTC
SELECT cron.schedule(
  'generate-experiment-recommendations',
  '0 6 * * 1',
  'SELECT generate_experiment_recommendations()'
);
```

### Patrón API Route Handler — Referencia

```typescript
// apps/web/src/app/api/v1/agency/recommendations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/supabase/db';
import { experimentRecommendations, listings, userProfiles } from '@reinder/shared/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'No autenticado' } },
      { status: 401 }
    );
  }

  const [profile] = await db
    .select({ role: userProfiles.role, agencyId: userProfiles.agencyId })
    .from(userProfiles)
    .where(eq(userProfiles.id, user.id))
    .limit(1);

  if (!profile || profile.role !== 'agency_admin' || !profile.agencyId) {
    return NextResponse.json(
      { data: null, error: { code: 'FORBIDDEN', message: 'Solo agency_admin' } },
      { status: 403 }
    );
  }

  const recommendations = await db
    .select({
      id: experimentRecommendations.id,
      listingId: experimentRecommendations.listingId,
      listingTitle: listings.title,
      listingImage: listings.images,
      recommendedExperimentType: experimentRecommendations.recommendedExperimentType,
      reasonCode: experimentRecommendations.reasonCode,
      reasonDetail: experimentRecommendations.reasonDetail,
      underperformingMetrics: experimentRecommendations.underperformingMetrics,
      priorityScore: experimentRecommendations.priorityScore,
      status: experimentRecommendations.status,
      createdAt: experimentRecommendations.createdAt,
    })
    .from(experimentRecommendations)
    .innerJoin(listings, eq(listings.id, experimentRecommendations.listingId))
    .where(
      and(
        eq(experimentRecommendations.agencyId, profile.agencyId),
        eq(experimentRecommendations.status, 'pending')
      )
    )
    .orderBy(experimentRecommendations.priorityScore);

  // Extraer primera imagen como thumbnail
  const formatted = recommendations.map(r => ({
    ...r,
    listingImageUrl: Array.isArray(r.listingImage) && r.listingImage.length > 0
      ? r.listingImage[0] : null,
    listingImage: undefined,
  }));

  return NextResponse.json({ data: { recommendations: formatted }, error: null });
}
```

### Componente `RecommendationsSection` — Referencia

```tsx
// apps/web/src/features/experiments/components/recommendations-section.tsx
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';

const EXPERIMENT_TYPE_LABELS: Record<string, { icon: string; label: string }> = {
  cover_image: { icon: '📷', label: 'Portada A/B' },
  title: { icon: '✏️', label: 'Título' },
  description: { icon: '📝', label: 'Descripción' },
  title_and_description: { icon: '✏️📝', label: 'Título y Descripción' },
};

export function RecommendationsSection() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['agency', 'recommendations'],
    queryFn: async () => {
      const res = await fetch('/api/v1/agency/recommendations');
      const json = await res.json();
      return json.data?.recommendations ?? [];
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/v1/agency/recommendations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss' }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agency', 'recommendations'] }),
  });

  if (isLoading || !data || data.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold mb-4">💡 Recomendaciones</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.slice(0, 3).map((rec: any) => {
          const typeInfo = EXPERIMENT_TYPE_LABELS[rec.recommendedExperimentType] ?? { icon: '🔬', label: 'Experimento' };
          return (
            <div key={rec.id} className="rounded-xl border p-4 bg-white shadow-sm">
              {/* Listing thumbnail + title */}
              <div className="flex items-center gap-3 mb-3">
                {rec.listingImageUrl && (
                  <img src={rec.listingImageUrl} alt="" className="w-12 h-12 rounded-lg object-cover" />
                )}
                <p className="font-medium text-sm line-clamp-2">{rec.listingTitle}</p>
              </div>
              {/* Experiment type badge */}
              <span className="inline-block px-2 py-1 text-xs rounded-full bg-blue-50 text-blue-700 mb-2">
                {typeInfo.icon} {typeInfo.label}
              </span>
              {/* Reason detail */}
              <p className="text-sm text-gray-600 mb-4">{rec.reasonDetail}</p>
              {/* Actions */}
              <div className="flex gap-2">
                <Link
                  href={`/agency/experiments/new?listingId=${rec.listingId}&type=${rec.recommendedExperimentType}&recommendationId=${rec.id}`}
                  className="flex-1 text-center px-3 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600"
                >
                  Crear Experimento
                </Link>
                <button
                  onClick={() => dismissMutation.mutate(rec.id)}
                  disabled={dismissMutation.isPending}
                  className="px-3 py-2 text-gray-500 border rounded-lg text-sm hover:bg-gray-50"
                >
                  Descartar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
```

### Drizzle Schema — Tabla `experimentRecommendations`

```typescript
// Añadir en packages/shared/src/db/schema.ts

export const experimentRecommendations = pgTable(
  "experiment_recommendations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agencyId: uuid("agency_id")
      .notNull()
      .references(() => agencies.id),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id),
    recommendedExperimentType: experimentTypeEnum("recommended_experiment_type").notNull(),
    reasonCode: text("reason_code").notNull(),
    reasonDetail: text("reason_detail").notNull(),
    underperformingMetrics: jsonb("underperforming_metrics")
      .$type<{
        match_rate?: { value: number; agency_avg: number; platform_avg: number; z_score: number };
        avg_view_time_ms?: { value: number; agency_avg: number; platform_avg: number; z_score: number };
        reaffirm_rate?: { value: number; agency_avg: number; platform_avg: number; z_score: number } | null;
      }>()
      .notNull(),
    priorityScore: numeric("priority_score", { precision: 5, scale: 2 }).notNull(),
    status: text("status").notNull().default("pending"), // pending | accepted | dismissed | expired
    acceptedExperimentId: uuid("accepted_experiment_id")
      .references(() => listingExperiments.id),
    weekGenerated: text("week_generated").notNull(), // ISO week: 2026-W25
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxRecommendationsAgencyId: index("idx_recommendations_agency_id").on(table.agencyId),
    idxRecommendationsListingStatus: index("idx_recommendations_listing_status").on(
      table.listingId,
      table.status
    ),
  })
);
```

### Types — `ExperimentRecommendation`

```typescript
// packages/shared/src/types/experiment.ts — añadir:

export type RecommendationStatus = 'pending' | 'accepted' | 'dismissed' | 'expired';

export interface UnderperformingMetricDetail {
  value: number;
  agency_avg: number;
  platform_avg: number;
  z_score: number;
}

export interface UnderperformingMetrics {
  match_rate?: UnderperformingMetricDetail;
  avg_view_time_ms?: UnderperformingMetricDetail;
  reaffirm_rate?: UnderperformingMetricDetail | null;
}

export interface ExperimentRecommendation {
  id: string;
  agencyId: string;
  listingId: string;
  recommendedExperimentType: ExperimentType;
  reasonCode: string;
  reasonDetail: string;
  underperformingMetrics: UnderperformingMetrics;
  priorityScore: number;
  status: RecommendationStatus;
  acceptedExperimentId: string | null;
  weekGenerated: string;
  createdAt: string;
  updatedAt: string;
}
```

### Project Structure Notes

```
packages/shared/src/
├── db/
│   └── schema.ts                                    ← MODIFY (añadir experimentRecommendations)
├── types/
│   ├── experiment.ts                                ← MODIFY (add ExperimentRecommendation, UnderperformingMetrics, RecommendationStatus)
│   └── index.ts                                     ← MODIFY (re-export nuevos tipos)

apps/web/src/
├── features/experiments/
│   └── components/
│       └── recommendations-section.tsx              ← NEW
├── app/(protected)/agency/experiments/
│   └── page.tsx                                     ← MODIFY (integrar RecommendationsSection)
├── app/api/v1/agency/recommendations/
│   ├── route.ts                                     ← NEW (GET)
│   └── [id]/
│       └── route.ts                                 ← NEW (PATCH)

supabase/migrations/
└── 20260622000005_experiment_recommendations.sql    ← NEW
```

### Guardrails para el Dev Agent

1. **NO crear un servicio TypeScript para la detección de underperformance** — la lógica DEBE estar en la función SQL `generate_experiment_recommendations()`. Ejecutar en pg_cron directamente en la DB es más eficiente y evita el overhead de un API call. El patrón ya está establecido en `20260619000001_crm_sync_queue_and_worker.sql`.

2. **NO exponer datos individuales de compradores** — todo el análisis se basa en métricas AGREGADAS de `listing_analytics_hourly`. Verificar que ni la API ni el dashboard muestran buyer_id. NFR8 es absoluto.

3. **NO calcular z-scores en TypeScript** — SQL es el lugar correcto para cálculos estadísticos sobre datos agregados. `STDDEV_SAMP` y `AVG` son funciones nativas de PostgreSQL, más eficientes que cargar datos al servidor de aplicación.

4. **NO olvidar el check de idempotencia por `week_generated`** — sin este check, ejecutar el job manualmente o por retry duplicaría recomendaciones. La CTE final incluye `NOT EXISTS ... week_generated = current_week`.

5. **NO hacer la sección de recomendaciones un componente server** — debe ser client component con TanStack Query para poder hacer invalidation al dismiss. Seguir el patrón de otros componentes client en `/features/experiments/`.

6. **Usar `experimentTypeEnum` existente** de Story 9.1 para `recommended_experiment_type` — NO crear un enum nuevo. La tabla reutiliza el enum ya definido.

7. **Reusar el patrón de auth/role check** establecido en Story 9.2: `createClient()` → `getUser()` → profile lookup → role check. No inventar un middleware diferente.

8. **El botón "Crear Experimento" navega con query params** — NO abre un modal ni crea el experimento directamente. Navega a `/agency/experiments/new?listingId=X&type=Y&recommendationId=Z`. El formulario de Story 9.2 debe ser modificado para leer estos query params y pre-rellenar.

9. **La función SQL debe ser `CREATE OR REPLACE`** — para que sea redesplegable sin borrar datos.

10. **Manejar el caso de `listing_analytics_hourly` no existente** — si la tabla no existe (Epic 8 puede no estar implementada en el worktree actual), la migración debe incluir la creación condicional o la función debe hacer un check previo y retornar silenciosamente.

11. **Validar con Zod el body del PATCH** — no confiar en TypeScript types en runtime. Schema: `z.object({ action: z.enum(['dismiss', 'accept']), experimentId: z.string().uuid().optional() })`.

12. **El `priority_score` se normaliza a 0–100** — usar `LEAST(100, GREATEST(0, ...))` en SQL. Nunca devolver scores negativos o > 100.

### Aprendizajes de Stories Anteriores

- **Story 9.1** estableció `experimentTypeEnum` reutilizable y el patrón de FK a `listing_experiments.id` — esta story reutiliza ambos.
- **Story 9.2** creó la página `/agency/experiments` con lista y formulario de creación — esta story la extiende con la sección de recomendaciones encima de la lista.
- **Story 9.4** estableció el patrón de log de auditoría con `experiment_promotion_logs` — no aplica directamente pero confirma el patrón de trazabilidad.
- **Story 8.7** definió el patrón de aggregation jobs con pg_cron — esta story sigue el mismo patrón pero con frecuencia semanal en lugar de horaria.
- **Migración `20260619000001`** estableció el patrón de `CREATE EXTENSION IF NOT EXISTS pg_cron` + `cron.schedule()` — seguir exactamente este patrón. NO crear una extensión nueva.
- Las RLS de Story 9.1 usan subquery a `user_profiles` para verificar `agency_id` — mismo patrón aquí.
- **Patrón de Route Handler** con `ApiResponse<T>` es obligatorio — `{ data: T, error: null }` o `{ data: null, error: { code, message } }`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 9 — FR-E9-7]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 8 — Story 8.7 listing_analytics_hourly]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns]
- [Source: _bmad-output/implementation-artifacts/9-1-schema-experimentos-motor-asignacion-variantes.md — experimentTypeEnum, listing_experiments schema, RLS pattern]
- [Source: _bmad-output/implementation-artifacts/9-2-ui-creacion-experimento-agencias-portada-ab.md — /agency/experiments page, formulario de creación]
- [Source: _bmad-output/implementation-artifacts/9-4-auto-promocion-variante-ganadora-significancia.md — experiment_results.sum_view_time_sq_ms, significancia]
- [Source: _bmad-output/implementation-artifacts/8-7-aggregation-jobs-read-models-analytics.md — listing_analytics_hourly, pg_cron pattern]
- [Source: supabase/migrations/20260619000001_crm_sync_queue_and_worker.sql — pg_cron registration pattern]
- [Source: packages/shared/src/db/schema.ts — Drizzle pgTable/pgEnum patterns, listings table]
- [Source: apps/web/src/app/(protected)/agency/listings/page.tsx — agency_admin auth guard pattern]

## Dev Agent Record

### Agent Model Used

(to be filled by dev agent)

### Debug Log References

### Completion Notes List

### File List
