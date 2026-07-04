# Story 9.3: Medición de Impacto y Dashboard de Resultados del Experimento

Status: ready-for-dev

## Story

Como administrador de agencia inmobiliaria en Reinder,
quiero ver las métricas de impacto de cada variante de mi experimento A/B en un dashboard con comparación lado a lado,
para que pueda entender qué contenido funciona mejor y tomar decisiones informadas mientras el sistema evalúa la significancia estadística.

## Contexto del Epic

**Epic 9 — Content Optimization & A/B Testing:** Las agencias pueden experimentar con contenido (portada, título, descripción) y Reinder optimiza automáticamente el rendimiento de los listings. El motor asigna variantes, mide el impacto en métricas de engagement, y auto-promueve la variante ganadora al alcanzar significancia estadística.

**FRs cubiertos por esta story:** FR-E9-3 (medir impacto de cada variante en view time, match rate y reaffirm rate)
**NFRs aplicados:** NFR8 (datos agregados only — NUNCA datos individuales de compradores expuestos a agencias), NFR11 (aggregation job en background, no en request path)

**Posición en el epic:** Story 9.3 es la **capa de medición y visualización**. Depende de:
- **Story 9.1** — schema (`listing_experiments`, `experiment_assignments`, `experiment_results`), motor de asignación, API de creación
- **Story 9.2** — UI de creación y detalle del experimento (la sección de métricas placeholder de Story 9.2 se reemplaza aquí)

**Story 9.4 depende de esta story:** El aggregation job que alimenta `experiment_results` es el input para el motor de significancia estadística de Story 9.4. Además, Story 9.4 necesita la columna `sum_view_time_sq_ms` que se añade en esta story para calcular varianza online.

## Acceptance Criteria (BDD)

### AC1 — Aggregation job: cálculo de métricas por variante

**Given** un experimento en status `running` con asignaciones en `experiment_assignments` (buyer_id → variant 'a' | 'b')
**And** eventos en `listing_engagement_events` para el `listing_id` del experimento: `photo_view` (con `view_time_ms`), `detail_open`, `match_reaffirm`
**And** swipe events en `swipe_events` con `action = 'match'` para el mismo `listing_id`
**When** el aggregation job `aggregateExperimentResults()` se ejecuta
**Then** actualiza `experiment_results` para cada variante ('a' y 'b') con:
  - `impressions`: COUNT DISTINCT de `buyer_id` en `experiment_assignments` para esa variante que tienen al menos 1 `photo_view` event en el período
  - `total_view_time_ms`: SUM de `view_time_ms` de todos los `photo_view` events de buyers asignados a esa variante
  - `sum_view_time_sq_ms`: SUM de `(view_time_ms)^2` — necesario para cálculo de varianza online en Story 9.4
  - `match_count`: COUNT de `swipe_events` con `action = 'match'` de buyers asignados a esa variante
  - `reaffirm_count`: COUNT de `listing_engagement_events` con `event_type = 'match_reaffirm'` de buyers asignados a esa variante
**And** las métricas se calculan acumulativamente desde `listing_experiments.started_at` hasta el momento actual (no solo delta incremental)
**And** el job NO procesa experimentos con status `draft`, `paused`, `completed`, o `cancelled`

### AC2 — Migración: columna `sum_view_time_sq_ms` en `experiment_results`

**Given** la migración de Story 9.3 ejecutada en Supabase
**When** consulto el schema de `experiment_results`
**Then** existe la columna `sum_view_time_sq_ms` (BIGINT NOT NULL DEFAULT 0)
**And** el Drizzle schema en `packages/shared/src/db/schema.ts` incluye este campo con tipo `bigint`
**And** `pnpm typecheck` compila sin errores

### AC3 — Tabla `experiment_results_timeseries` para evolución temporal

**Given** la migración de Story 9.3 ejecutada
**When** consulto el schema de la base de datos
**Then** existe la tabla `experiment_results_timeseries` con:
  - `id` (UUID PK, defaultRandom)
  - `experiment_id` (UUID FK → listing_experiments.id, NOT NULL)
  - `variant` (TEXT NOT NULL) — 'a' | 'b'
  - `bucket_hour` (TIMESTAMPTZ NOT NULL) — hora truncada del bucket
  - `impressions` (INTEGER NOT NULL DEFAULT 0) — acumulado hasta este bucket
  - `total_view_time_ms` (BIGINT NOT NULL DEFAULT 0) — acumulado
  - `match_count` (INTEGER NOT NULL DEFAULT 0) — acumulado
  - `reaffirm_count` (INTEGER NOT NULL DEFAULT 0) — acumulado
  - `created_at` (TIMESTAMPTZ NOT NULL, defaultNow)
**And** existe un índice UNIQUE `experiment_results_timeseries_unique` sobre `(experiment_id, variant, bucket_hour)` — un snapshot por variante por hora
**And** existe un índice `idx_experiment_results_timeseries_experiment` sobre `(experiment_id)` para queries de time-series
**And** RLS está habilitado: `agency_admin` puede SELECT donde el `experiment_id` pertenece a su agencia (via subquery a `listing_experiments.agency_id`)

### AC4 — Aggregation job: snapshot de time-series

**Given** el aggregation job ejecutándose para un experimento `running`
**When** calcula las métricas acumuladas actuales por variante
**Then** hace UPSERT en `experiment_results_timeseries` con `bucket_hour = date_trunc('hour', now())`
**And** el snapshot contiene los valores acumulados (no deltas) para facilitar gráficos de evolución
**And** si ya existe un snapshot para la hora actual, lo actualiza (idempotente)

### AC5 — Integración con `listing_analytics_hourly` para comparación baseline

**Given** un experimento `running` para un `listing_id`
**And** `listing_analytics_hourly` tiene métricas pre-experimento para el mismo listing (de Epic 8 aggregation)
**When** el API de resultados sirve datos al dashboard
**Then** incluye `baseline_metrics` con las métricas promedio del listing en los 7 días previos al `started_at` del experimento:
  - `baseline_avg_view_time_ms`: promedio de view time pre-experimento
  - `baseline_match_rate`: tasa de match pre-experimento (si disponible)
**And** si no hay datos baseline (listing nuevo sin histórico), devuelve `baseline_metrics: null`

### AC6 — API: `GET /api/v1/experiments/[id]/results`

**Given** un `agency_admin` autenticado que es dueño del experimento
**When** hace `GET /api/v1/experiments/[id]/results`
**Then** responde 200 con:
```json
{
  "data": {
    "experiment": { "id": "...", "name": "...", "status": "running", "startedAt": "..." },
    "results": {
      "a": {
        "impressions": 450,
        "avgViewTimeMs": 5200,
        "matchRate": 0.089,
        "reaffirmRate": 0.045,
        "totalViewTimeMs": 2340000,
        "matchCount": 40,
        "reaffirmCount": 20
      },
      "b": {
        "impressions": 460,
        "avgViewTimeMs": 6100,
        "matchRate": 0.113,
        "reaffirmRate": 0.062,
        "totalViewTimeMs": 2806000,
        "matchCount": 52,
        "reaffirmCount": 28
      }
    },
    "deltas": {
      "avgViewTimeMs": { "diff": 900, "pctChange": 17.3, "better": "b" },
      "matchRate": { "diff": 0.024, "pctChange": 27.0, "better": "b" },
      "reaffirmRate": { "diff": 0.017, "pctChange": 37.8, "better": "b" }
    },
    "confidence": {
      "sampleSufficient": true,
      "minSampleSize": 100,
      "currentMinImpressions": 450,
      "preliminaryLeader": "b",
      "note": "Datos preliminares — la significancia estadística se evaluará en Story 9.4"
    },
    "baselineMetrics": {
      "baselineAvgViewTimeMs": 4800,
      "baselineMatchRate": 0.075
    },
    "timeseries": [
      { "bucketHour": "2026-06-22T10:00:00Z", "a": { "impressions": 50, "avgViewTimeMs": 5000 }, "b": { "impressions": 48, "avgViewTimeMs": 5800 } },
      { "bucketHour": "2026-06-22T11:00:00Z", "a": { "impressions": 120, "avgViewTimeMs": 5100 }, "b": { "impressions": 115, "avgViewTimeMs": 6000 } }
    ]
  },
  "error": null
}
```
**And** `avgViewTimeMs` se calcula como `total_view_time_ms / impressions`
**And** `matchRate` se calcula como `match_count / impressions`
**And** `reaffirmRate` se calcula como `reaffirm_count / match_count` (o 0 si match_count es 0)
**And** `deltas` se calcula en el servidor (no en el cliente) para evitar errores de cálculo
**And** `confidence.sampleSufficient` es true cuando ambas variantes tienen `impressions >= min_sample_size`

**Given** un experimento con status `draft`
**When** se consulta results
**Then** responde 200 con `results.a` y `results.b` con todos los counters en 0 y `deltas` con todos los diffs en 0

**Given** un usuario que no es `agency_admin` dueño del experimento
**When** intenta consultar results
**Then** responde 403

**Given** un experiment_id que no existe o no pertenece a la agencia
**When** se consulta results
**Then** responde 404

### AC7 — Dashboard de resultados: comparación lado a lado

**Given** un `agency_admin` en la página de detalle del experimento `/agency/experiments/[id]`
**When** el experimento tiene status `running`, `paused`, o `completed`
**Then** la sección de métricas (placeholder de Story 9.2) se reemplaza con un dashboard de resultados que muestra:
  - **Comparison Cards**: 3 cards lado a lado (Variante A vs Variante B) para cada métrica:
    - Card "Tiempo de Visualización": `avgViewTimeMs` formateado en segundos (ej: "5.2s" vs "6.1s") con delta "+17.3%"
    - Card "Tasa de Match": `matchRate` formateado como porcentaje (ej: "8.9%" vs "11.3%") con delta "+2.4pp"
    - Card "Tasa de Reafirmación": `reaffirmRate` formateado como porcentaje (ej: "4.5%" vs "6.2%") con delta "+1.7pp"
  - Cada card muestra un indicador de dirección: ▲ (mejor) en verde (#4CAF50) o ▼ (peor) en rojo (#8B3A3A)
  - El delta muestra la diferencia porcentual entre variantes

### AC8 — Dashboard de resultados: indicador de confianza preliminar

**Given** el dashboard de resultados renderizado
**When** `confidence.sampleSufficient` es `true`
**Then** muestra un badge "Datos suficientes" en verde con tooltip "Ambas variantes superan el n mínimo de {minSampleSize}"
**And** si hay un `preliminaryLeader`, muestra el nombre de la variante líder en texto sutil

**Given** `confidence.sampleSufficient` es `false`
**When** el dashboard renderiza el indicador de confianza
**Then** muestra un badge "Recopilando datos" en amarillo (#FF8C00) con barra de progreso mostrando `currentMinImpressions / minSampleSize`
**And** texto explicativo: "Se necesitan al menos {minSampleSize} impresiones por variante"

### AC9 — Dashboard de resultados: gráfico de evolución temporal (time-series)

**Given** el dashboard de resultados con `timeseries` data disponible (≥2 buckets)
**When** se renderiza la sección de evolución
**Then** muestra un gráfico de líneas con:
  - Eje X: horas (formato "DD/MM HH:00")
  - Eje Y: métrica seleccionada (toggle entre avg_view_time, match_rate, reaffirm_rate)
  - Línea naranja (#FF6B00) para Variante A
  - Línea azul (#4A90D9) para Variante B
  - Tooltip al hover mostrando valores exactos
**And** si hay `baselineMetrics`, muestra una línea horizontal punteada gris (#9E9080) con label "Baseline pre-experimento"

**Given** `timeseries` con menos de 2 buckets
**When** se renderiza la sección de evolución
**Then** muestra mensaje: "El gráfico de evolución estará disponible cuando haya datos de al menos 2 horas"

### AC10 — Dashboard: comparación con baseline

**Given** `baselineMetrics` disponible (no null)
**When** el dashboard muestra las métricas
**Then** cada comparison card incluye una tercera referencia visual: "Baseline: {valor}" en texto muted (#9E9080)
**And** el delta respecto al baseline se muestra para cada variante: "vs baseline: +12%" o "vs baseline: -3%"

**Given** `baselineMetrics` es null (listing sin histórico)
**When** el dashboard renderiza
**Then** no muestra la referencia de baseline (solo comparación A vs B)

### AC11 — Scheduling: pg_cron job para aggregation

**Given** el job de aggregation configurado
**When** se activa el pg_cron schedule
**Then** el job se ejecuta cada hora (minuto 30 para evitar colisión con el aggregation de Epic 8 que corre en minuto 0)
**And** procesa TODOS los experimentos con status `running`
**And** para cada experimento: calcula métricas → actualiza `experiment_results` → upsert `experiment_results_timeseries`
**And** si hay un error en un experimento individual, lo logea y continúa con los demás (no falla todo el batch)
**And** el job ejecuta la función SQL `aggregate_experiment_results()` que internamente llama a la función TypeScript via Supabase Edge Function o directamente en SQL puro

### AC12 — RLS: solo datos agregados para agencias (NFR8)

**Given** un `agency_admin` autenticado
**When** intenta hacer SELECT en `experiment_results_timeseries`
**Then** solo puede ver los registros de experimentos cuyo `agency_id` coincide con el suyo
**And** NUNCA puede ver datos de `experiment_assignments` (deny-by-default de Story 9.1)
**And** NUNCA puede ver datos individuales de `listing_engagement_events` — solo los agregados en `experiment_results`

## Tasks / Subtasks

- [ ] **Task 1 — Migración SQL: columna `sum_view_time_sq_ms` + tabla `experiment_results_timeseries`** (AC: 2, 3)
  - [ ] Crear `supabase/migrations/20260622000003_experiment_results_timeseries.sql`
  - [ ] `ALTER TABLE experiment_results ADD COLUMN sum_view_time_sq_ms BIGINT NOT NULL DEFAULT 0`
  - [ ] `CREATE TABLE experiment_results_timeseries` con campos del AC3
  - [ ] UNIQUE constraint `(experiment_id, variant, bucket_hour)`
  - [ ] Índice `idx_experiment_results_timeseries_experiment` sobre `(experiment_id)`
  - [ ] `ALTER TABLE experiment_results_timeseries ENABLE ROW LEVEL SECURITY`
  - [ ] RLS policy: `agency_admin` SELECT vía subquery a `listing_experiments.agency_id`
  - [ ] Usar `IF NOT EXISTS` para idempotencia

- [ ] **Task 2 — Drizzle schema: actualización en `packages/shared/src/db/schema.ts`** (AC: 2, 3)
  - [ ] Añadir `sumViewTimeSqMs` (bigint) a la definición de `experimentResults` (tabla de Story 9.1)
  - [ ] Crear tabla `experimentResultsTimeseries` con pgTable siguiendo el patrón existente
  - [ ] Índices: unique `(experiment_id, variant, bucket_hour)`, índice `(experiment_id)`
  - [ ] Verificar que `pnpm typecheck` compila sin errores

- [ ] **Task 3 — Aggregation job: `aggregateExperimentResults()`** (AC: 1, 4, 11)
  - [ ] Crear `packages/shared/src/experiments/aggregate-experiment-results.ts`
  - [ ] Query: JOIN `experiment_assignments` + `listing_engagement_events` + `swipe_events` filtrado por `listing_id` del experimento y `started_at`
  - [ ] Agrupar por `variant` desde `experiment_assignments`
  - [ ] Calcular: impressions (COUNT DISTINCT buyer_id con events), total_view_time_ms (SUM), sum_view_time_sq_ms (SUM de cuadrados), match_count, reaffirm_count
  - [ ] UPSERT en `experiment_results` (ON CONFLICT `(experiment_id, variant)` DO UPDATE)
  - [ ] UPSERT en `experiment_results_timeseries` con `bucket_hour = date_trunc('hour', now())`
  - [ ] Iterar sobre todos los experimentos `running` con error isolation per-experiment
  - [ ] Log de ejecución: count de experimentos procesados, duración total

- [ ] **Task 4 — pg_cron SQL para scheduling del aggregation job** (AC: 11)
  - [ ] Crear función SQL `aggregate_experiment_results()` que ejecuta la lógica de aggregation en SQL puro (más eficiente que Edge Function para operaciones batch en DB)
  - [ ] `SELECT cron.schedule('aggregate-experiment-results', '30 * * * *', 'SELECT aggregate_experiment_results()')` — cada hora en minuto 30
  - [ ] Incluir en la migración SQL de Task 1
  - [ ] NOTA: pg_cron debe estar habilitado en Supabase dashboard

- [ ] **Task 5 — Función de cálculo de baseline** (AC: 5)
  - [ ] Crear `packages/shared/src/experiments/calculate-baseline.ts`
  - [ ] Query: obtener métricas de `listing_analytics_hourly` para el `listing_id` en los 7 días previos a `started_at`
  - [ ] Calcular promedios: `baseline_avg_view_time_ms`, `baseline_match_rate`
  - [ ] Si no hay datos en ese rango, devolver `null`
  - [ ] Exportar desde `@reinder/shared`

- [ ] **Task 6 — API: `GET /api/v1/experiments/[id]/results`** (AC: 6)
  - [ ] Crear `apps/web/src/app/api/v1/experiments/[id]/results/route.ts`
  - [ ] Auth: verificar `agency_admin` + ownership vía `agency_id` (misma lógica que `PATCH /api/v1/agency/listings/[id]/status`)
  - [ ] Query `experiment_results` para obtener métricas actuales de variantes a y b
  - [ ] Query `experiment_results_timeseries` para obtener time-series (ORDER BY `bucket_hour ASC`)
  - [ ] Query `listing_analytics_hourly` para baseline (via función de Task 5)
  - [ ] Calcular `deltas` en el servidor: diff, pctChange, better
  - [ ] Calcular `confidence`: sampleSufficient, preliminaryLeader
  - [ ] Response formato `ApiResponse<ExperimentResultsResponse>`
  - [ ] Manejar caso experiment not found → 404

- [ ] **Task 7 — Tipos compartidos: `ExperimentResultsResponse`** (AC: 6, 7)
  - [ ] Crear o extender `packages/shared/src/types/experiment.ts`
  - [ ] Tipos: `ExperimentVariantMetrics`, `ExperimentDeltas`, `ExperimentConfidence`, `ExperimentBaselineMetrics`, `ExperimentTimeseriesEntry`, `ExperimentResultsResponse`
  - [ ] Exportar desde barrel `packages/shared/src/types/index.ts`

- [ ] **Task 8 — Componente `ExperimentResultsDashboard`** (AC: 7, 8, 10)
  - [ ] Crear `apps/web/src/features/agency/experiments/components/experiment-results-dashboard.tsx`
  - [ ] Client component ("use client") — fetches data con `GET /api/v1/experiments/[id]/results`
  - [ ] Auto-refresh cada 60 segundos (setInterval) mientras el experimento está `running`
  - [ ] Props: `experimentId: string`, `experimentStatus: ExperimentStatus`
  - [ ] Renderiza: MetricComparisonCards + ConfidenceIndicator + TimeseriesChart + BaselineComparison

- [ ] **Task 9 — Componente `MetricComparisonCard`** (AC: 7, 10)
  - [ ] Crear `apps/web/src/features/agency/experiments/components/metric-comparison-card.tsx`
  - [ ] Props: `label`, `valueA`, `valueB`, `delta`, `format` ('seconds' | 'percentage' | 'rate'), `baseline?`
  - [ ] Layout: card con dos columnas (A | B), delta en el centro, baseline reference abajo
  - [ ] Color coding: verde si delta positivo para la métrica (más es mejor), rojo si negativo
  - [ ] Usar design tokens: surface #1E1A15, border #2E2820, radii 24px

- [ ] **Task 10 — Componente `ConfidenceIndicator`** (AC: 8)
  - [ ] Crear `apps/web/src/features/agency/experiments/components/confidence-indicator.tsx`
  - [ ] Props: `confidence: ExperimentConfidence`
  - [ ] Badge "Datos suficientes" (verde) o "Recopilando datos" (amarillo) con barra de progreso
  - [ ] Tooltip informativo

- [ ] **Task 11 — Componente `TimeseriesChart`** (AC: 9)
  - [ ] Crear `apps/web/src/features/agency/experiments/components/timeseries-chart.tsx`
  - [ ] Implementar con SVG nativo o librería ligera (recharts si ya está en dependencies, sino SVG puro)
  - [ ] Verificar si recharts ya está en `package.json` — si no, usar canvas/SVG (NO instalar librerías nuevas sin verificar)
  - [ ] Toggle de métricas: avg_view_time, match_rate, reaffirm_rate
  - [ ] Línea naranja (A), azul (B), punteada gris (baseline)
  - [ ] Empty state si < 2 data points

- [ ] **Task 12 — Integrar dashboard en página de detalle del experimento** (AC: 7)
  - [ ] Modificar `apps/web/src/app/(protected)/agency/experiments/[id]/page.tsx` (de Story 9.2)
  - [ ] Reemplazar la sección placeholder de métricas con `<ExperimentResultsDashboard />`
  - [ ] Mostrar dashboard cuando status es `running`, `paused`, o `completed`
  - [ ] Mantener el placeholder cuando status es `draft`

- [ ] **Task 13 — Tests** (AC: 1, 2, 6)
  - [ ] T9.3-01: `aggregateExperimentResults` — calcula correctamente impressions, view_time, match_count por variante
  - [ ] T9.3-02: `aggregateExperimentResults` — calcula `sum_view_time_sq_ms` correctamente (sum of squares)
  - [ ] T9.3-03: `aggregateExperimentResults` — solo procesa experimentos con status `running` (ignora draft, paused, completed)
  - [ ] T9.3-04: `aggregateExperimentResults` — error en un experimento no detiene el procesamiento de los demás
  - [ ] T9.3-05: `calculateBaseline` — devuelve null si no hay datos pre-experimento
  - [ ] T9.3-06: API GET results — responde 403 para buyer
  - [ ] T9.3-07: API GET results — responde 404 para experimento de otra agencia
  - [ ] T9.3-08: API GET results — calcula deltas correctamente
  - [ ] T9.3-09: Componente `MetricComparisonCard` — renderiza valores formateados y delta correcto
  - [ ] T9.3-10: Componente `ConfidenceIndicator` — muestra badge correcto según sampleSufficient

## Dev Notes

### Aggregation Query — Implementación de Referencia

```sql
-- Para cada experimento running, calcular métricas por variante
WITH experiment_buyers AS (
  SELECT
    ea.experiment_id,
    ea.buyer_id,
    ea.variant,
    le.listing_id
  FROM experiment_assignments ea
  JOIN listing_experiments le ON le.id = ea.experiment_id
  WHERE le.status = 'running'
),
variant_metrics AS (
  SELECT
    eb.experiment_id,
    eb.variant,
    COUNT(DISTINCT eb.buyer_id) FILTER (
      WHERE EXISTS (
        SELECT 1 FROM listing_engagement_events lee
        WHERE lee.buyer_id = eb.buyer_id
          AND lee.listing_id = eb.listing_id
          AND lee.event_type = 'photo_view'
          AND lee.created_at >= (
            SELECT started_at FROM listing_experiments WHERE id = eb.experiment_id
          )
      )
    ) AS impressions,
    COALESCE(SUM(lee.view_time_ms), 0) AS total_view_time_ms,
    COALESCE(SUM(lee.view_time_ms::bigint * lee.view_time_ms::bigint), 0) AS sum_view_time_sq_ms,
    COUNT(DISTINCT se.id) FILTER (WHERE se.action = 'match') AS match_count,
    COUNT(DISTINCT lee_r.id) AS reaffirm_count
  FROM experiment_buyers eb
  LEFT JOIN listing_engagement_events lee
    ON lee.buyer_id = eb.buyer_id
    AND lee.listing_id = eb.listing_id
    AND lee.event_type = 'photo_view'
  LEFT JOIN swipe_events se
    ON se.buyer_id = eb.buyer_id
    AND se.listing_id = eb.listing_id
    AND se.action = 'match'
  LEFT JOIN listing_engagement_events lee_r
    ON lee_r.buyer_id = eb.buyer_id
    AND lee_r.listing_id = eb.listing_id
    AND lee_r.event_type = 'match_reaffirm'
  GROUP BY eb.experiment_id, eb.variant
)
-- UPSERT into experiment_results
INSERT INTO experiment_results (experiment_id, variant, impressions, total_view_time_ms, sum_view_time_sq_ms, match_count, reaffirm_count, updated_at)
SELECT experiment_id, variant, impressions, total_view_time_ms, sum_view_time_sq_ms, match_count, reaffirm_count, NOW()
FROM variant_metrics
ON CONFLICT (experiment_id, variant)
DO UPDATE SET
  impressions = EXCLUDED.impressions,
  total_view_time_ms = EXCLUDED.total_view_time_ms,
  sum_view_time_sq_ms = EXCLUDED.sum_view_time_sq_ms,
  match_count = EXCLUDED.match_count,
  reaffirm_count = EXCLUDED.reaffirm_count,
  updated_at = NOW();
```

**⚠️ NOTA:** La query anterior es una guía conceptual. La implementación real puede ser en SQL puro (pg_cron function) o Drizzle ORM + TypeScript (Edge Function). Elegir SQL puro para el pg_cron job es más eficiente para operaciones batch. La función TypeScript `aggregateExperimentResults()` es para testing y uso programático.

### Columna `sum_view_time_sq_ms` — Propósito

Story 9.4 necesita calcular la varianza de view time para el Welch's t-test. La fórmula de varianza online es:

```
variance = (sum_view_time_sq_ms / impressions) - (total_view_time_ms / impressions)^2
         = E[X²] - (E[X])²
```

Esto permite calcular varianza sin almacenar cada valor individual. La columna se alimenta en esta story y se consume en 9.4.

### Patrón de Auth en Route Handlers (copiar de Story 5.4)

```typescript
// apps/web/src/app/api/v1/experiments/[id]/results/route.ts
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/supabase/db';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    );
  }

  // Verificar rol agency_admin + obtener agency_id
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, agency_id')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'agency_admin' || !profile.agency_id) {
    return NextResponse.json(
      { data: null, error: { code: 'FORBIDDEN', message: 'Agency Admin role required' } },
      { status: 403 }
    );
  }

  const { id } = await params;
  // ... fetch experiment, verify ownership, compute results
}
```

### Cálculo de Deltas — Lógica del Servidor

```typescript
function calculateDeltas(a: VariantMetrics, b: VariantMetrics) {
  const avgViewA = a.impressions > 0 ? a.totalViewTimeMs / a.impressions : 0;
  const avgViewB = b.impressions > 0 ? b.totalViewTimeMs / b.impressions : 0;
  const matchRateA = a.impressions > 0 ? a.matchCount / a.impressions : 0;
  const matchRateB = b.impressions > 0 ? b.matchCount / b.impressions : 0;
  const reaffirmRateA = a.matchCount > 0 ? a.reaffirmCount / a.matchCount : 0;
  const reaffirmRateB = b.matchCount > 0 ? b.reaffirmCount / b.matchCount : 0;

  return {
    avgViewTimeMs: {
      diff: avgViewB - avgViewA,
      pctChange: avgViewA > 0 ? ((avgViewB - avgViewA) / avgViewA) * 100 : 0,
      better: avgViewB > avgViewA ? 'b' : avgViewA > avgViewB ? 'a' : null,
    },
    matchRate: {
      diff: matchRateB - matchRateA,
      pctChange: matchRateA > 0 ? ((matchRateB - matchRateA) / matchRateA) * 100 : 0,
      better: matchRateB > matchRateA ? 'b' : matchRateA > matchRateB ? 'a' : null,
    },
    reaffirmRate: {
      diff: reaffirmRateB - reaffirmRateA,
      pctChange: reaffirmRateA > 0 ? ((reaffirmRateB - reaffirmRateA) / reaffirmRateA) * 100 : 0,
      better: reaffirmRateB > reaffirmRateA ? 'b' : reaffirmRateA > reaffirmRateB ? 'a' : null,
    },
  };
}
```

### Design Tokens — Referencia para Dashboard

```typescript
// Importar desde @reinder/shared/design-tokens o CSS vars
const DASHBOARD_STYLES = {
  // Cards
  surface: '#1E1A15',
  border: '#2E2820',
  radiusCard: '24px',

  // Líneas del gráfico
  variantAColor: '#FF6B00', // accentPrimary — naranja
  variantBColor: '#4A90D9', // azul
  baselineColor: '#9E9080', // muted — gris

  // Indicadores de delta
  positiveColor: '#4CAF50',  // verde
  negativeColor: '#8B3A3A',  // rojo

  // Confianza
  sufficientBadgeBg: 'rgba(76,175,80,0.15)',
  sufficientBadgeText: '#4CAF50',
  collectingBadgeBg: 'rgba(255,140,0,0.15)',
  collectingBadgeText: '#FF8C00',

  // Tipografía
  fontDisplay: 'Clash Display',
  fontBody: 'Inter',

  // Colores base
  bgPrimary: '#0D0D0D',
  textPrimary: '#F5F0E8',
  textMuted: '#9E9080',
};
```

### Formato de Métricas en UI

```typescript
function formatMetric(value: number, format: 'seconds' | 'percentage' | 'rate'): string {
  switch (format) {
    case 'seconds':
      return `${(value / 1000).toFixed(1)}s`; // 5200ms → "5.2s"
    case 'percentage':
      return `${(value * 100).toFixed(1)}%`;   // 0.089 → "8.9%"
    case 'rate':
      return `${(value * 100).toFixed(1)}%`;   // 0.045 → "4.5%"
  }
}

function formatDelta(pctChange: number): string {
  const sign = pctChange >= 0 ? '+' : '';
  return `${sign}${pctChange.toFixed(1)}%`;
}

// Para match_rate y reaffirm_rate, mostrar diferencia en puntos porcentuales (pp)
function formatDeltaPP(diff: number): string {
  const sign = diff >= 0 ? '+' : '';
  return `${sign}${(diff * 100).toFixed(1)}pp`;
}
```

### Tablas Existentes Referenciadas

| Tabla | Uso en esta story |
|-------|-------------------|
| `listing_experiments` | Consultar status, `started_at`, `listing_id`, `agency_id`, `min_sample_size` |
| `experiment_assignments` | JOIN para mapear `buyer_id` → `variant` en aggregation |
| `experiment_results` | UPSERT de métricas agregadas por variante (Story 9.1 — 2 rows por experimento) |
| `listing_engagement_events` | Fuente de `photo_view` (view_time_ms), `match_reaffirm` events (Story 8.1) |
| `swipe_events` | Fuente de matches (`action = 'match'`) por listing_id |
| `listing_analytics_hourly` | Fuente para baseline pre-experimento (Story 8.7) |

### Tablas Engagement — Schema de Referencia (de Story 8.1)

```typescript
// listing_engagement_events (definición de Story 8.1)
{
  id: uuid,
  buyerId: uuid,            // buyer que generó el evento
  listingId: uuid,          // listing asociado
  eventType: text,          // 'photo_view' | 'scroll_depth' | 'detail_open' | 'detail_close' | 'match_reaffirm'
  viewTimeMs: integer,      // duración en ms (relevante para photo_view)
  metadata: jsonb,          // datos adicionales según event type
  createdAt: timestamptz,
}

// listing_analytics_hourly (definición de Story 8.7)
{
  id: uuid,
  listingId: uuid,
  bucketHour: timestamptz,  // hora truncada
  totalViews: integer,
  totalViewTimeMs: bigint,
  uniqueViewers: integer,
  matchCount: integer,
  reaffirmCount: integer,
  createdAt: timestamptz,
}
```

**⚠️ NOTA CRÍTICA:** Estas tablas fueron creadas en worktrees de Epic 8 y pueden aún no estar mergeadas en main. El dev agent DEBE verificar si existen en `packages/shared/src/db/schema.ts` al momento de implementar. Si no existen, se deben añadir a la migración de esta story o esperar a que las PRs de Epic 8 se mergeen.

### Auto-refresh del Dashboard

```typescript
// En ExperimentResultsDashboard.tsx
const [results, setResults] = useState<ExperimentResultsResponse | null>(null);

useEffect(() => {
  const fetchResults = async () => {
    const res = await fetch(`/api/v1/experiments/${experimentId}/results`);
    const json = await res.json();
    if (res.ok) setResults(json.data);
  };

  fetchResults(); // Fetch inicial

  // Auto-refresh solo si el experimento está running
  if (experimentStatus === 'running') {
    const interval = setInterval(fetchResults, 60_000); // cada 60s
    return () => clearInterval(interval);
  }
}, [experimentId, experimentStatus]);
```

### Librería de Gráficos — Decisión

Verificar antes de implementar:
1. ¿Existe `recharts` en `apps/web/package.json`? → Usarlo
2. Si no → implementar con SVG nativo (simple line chart, no justifica nueva dependencia para MVP)
3. **NO instalar chart.js, d3, victory u otra librería** — mantener bundle size bajo

### Project Structure Notes

```
packages/shared/src/
├── db/
│   └── schema.ts                                    ← MODIFY (añadir sumViewTimeSqMs + experimentResultsTimeseries)
├── experiments/
│   ├── assign-variant.ts                            ← EXISTING (Story 9.1)
│   ├── aggregate-experiment-results.ts              ← NEW (aggregation logic)
│   ├── aggregate-experiment-results.test.ts         ← NEW
│   ├── calculate-baseline.ts                        ← NEW (baseline from listing_analytics_hourly)
│   └── calculate-baseline.test.ts                   ← NEW
├── types/
│   ├── experiment.ts                                ← MODIFY (añadir tipos de results/dashboard)
│   └── index.ts                                     ← MODIFY (re-export nuevos tipos)

apps/web/src/
├── app/
│   ├── (protected)/agency/experiments/
│   │   └── [id]/
│   │       └── page.tsx                             ← MODIFY (integrar dashboard, reemplazar placeholder)
│   └── api/v1/experiments/
│       └── [id]/
│           ├── route.ts                             ← EXISTING (GET detalle + PATCH status de Story 9.2)
│           └── results/
│               └── route.ts                         ← NEW (GET results con métricas + timeseries)
├── features/agency/experiments/
│   └── components/
│       ├── experiment-results-dashboard.tsx          ← NEW (orchestrator component)
│       ├── metric-comparison-card.tsx                ← NEW (A vs B card)
│       ├── confidence-indicator.tsx                  ← NEW (sample size badge)
│       └── timeseries-chart.tsx                      ← NEW (line chart)

supabase/migrations/
└── 20260622000003_experiment_results_timeseries.sql  ← NEW (ALTER TABLE + CREATE TABLE + pg_cron)
```

### Guardrails para el Dev Agent

1. **NO hacer aggregation en el request path del usuario** — El aggregation job se ejecuta via pg_cron cada hora. El API endpoint `GET /results` solo LEE de las tablas pre-calculadas. NUNCA ejecutar la query de aggregation en respuesta a un GET del usuario.

2. **NO exponer datos individuales de compradores** — NFR8 es estricto. El dashboard muestra SOLO datos agregados (totales, promedios, tasas). NUNCA mostrar qué buyer individual está en qué variante.

3. **NO olvidar `sum_view_time_sq_ms`** — Story 9.4 FALLA sin esta columna. Es la pieza más importante de esta story para la continuidad del pipeline. Calcular `SUM(view_time_ms^2)` en el aggregation, no `SUM(view_time_ms)^2` (la suma de cuadrados, no el cuadrado de la suma).

4. **NO instalar librerías de gráficos nuevas sin verificar** — Verificar `package.json` de `apps/web` primero. Si no hay recharts, usar SVG nativo para el line chart. Un chart simple de 2 líneas no justifica una nueva dependencia.

5. **CALCULAR deltas en el servidor, no en el cliente** — El endpoint `GET /results` devuelve `deltas` pre-calculados. Esto evita errores de aritmética floating-point en el frontend y mantiene la lógica de negocio en un solo lugar.

6. **USAR `bigint` para `sum_view_time_sq_ms`** — Los cuadrados de milisegundos pueden ser enormes (5000ms² = 25,000,000). Con millones de eventos, un INTEGER overflow es seguro. Usar BIGINT.

7. **NO hacer JOIN a `listing_analytics_hourly` en el aggregation job** — El baseline se calcula SOLO cuando se sirve el API response, no en cada ejecución del job. El job solo actualiza `experiment_results` y `experiment_results_timeseries`.

8. **SEGUIR el patrón de migración idempotente** — `IF NOT EXISTS` en todos los CREATE. `ALTER TABLE` con idempotencia usando `DO $$ BEGIN IF NOT EXISTS ... END $$`.

9. **El pg_cron schedule es minuto 30** — Esto evita colisión con el aggregation job de Epic 8 que corre en minuto 0. Documentar esto en el SQL.

10. **Auto-refresh SOLO cuando status es `running`** — No hacer polling cuando el experimento está en draft, paused, o completed. Usar `setInterval` con cleanup en `useEffect`.

11. **VERIFICAR existencia de tablas de Epic 8 antes de usarlas** — `listing_engagement_events` y `listing_analytics_hourly` pueden aún no estar en main si las PRs de Epic 8 no se mergearon. Verificar el schema y manejar el caso gracefully.

12. **Seguir `ApiResponse<T>` en TODOS los endpoints** — Nunca devolver datos directos. Wrapper `{ data, error }` obligatorio.

### Aprendizajes de Stories Anteriores

- **Story 9.1** definió `experiment_results` con `total_view_time_ms` (BIGINT) e `impressions` (INTEGER), pero sin `sum_view_time_sq_ms`. Esta story extiende esa tabla.
- **Story 9.2** creó la página de detalle con un placeholder de métricas. Esta story reemplaza ese placeholder con el dashboard real.
- **Story 9.4** (ya escrita como ready-for-dev) especifica que necesita `sum_view_time_sq_ms` para el Welch's t-test. Si esta columna no se crea aquí, 9.4 fallará.
- **Story 8.7** estableció el patrón de pg_cron + aggregation SQL para `listing_analytics_hourly`. Seguir exactamente ese mismo patrón para el aggregation de experimentos.
- **Story 8.1** definió `listing_engagement_events` con `event_type` enum que incluye `photo_view` y `match_reaffirm`.
- Las RLS de Epic 8 siguen el patrón deny-by-default + subquery para agency_id. Aplicar el mismo patrón aquí.
- **Story 5.4** estableció el patrón de auth + ownership verificación en Route Handlers que se reutiliza en esta story.

### API Endpoints Resumen

| Método | Ruta | Descripción | Story |
|--------|------|-------------|-------|
| POST | `/api/v1/experiments` | Crear experimento | 9.1 (existente) |
| GET | `/api/v1/experiments` | Listar experimentos | 9.2 (existente) |
| GET | `/api/v1/experiments/[id]` | Detalle de experimento | 9.2 (existente) |
| PATCH | `/api/v1/experiments/[id]` | Cambiar estado | 9.2 (existente) |
| GET | `/api/v1/experiments/assignment` | Obtener variante (buyer) | 9.1 (existente) |
| **GET** | **`/api/v1/experiments/[id]/results`** | **Métricas + timeseries + baseline** | **9.3 (nuevo)** |

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 9 — FR-E9-3]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules]
- [Source: _bmad-output/implementation-artifacts/9-1-schema-experimentos-motor-asignacion-variantes.md — schema experiment_results]
- [Source: _bmad-output/implementation-artifacts/9-2-ui-creacion-experimento-agencias-portada-ab.md — experiment detail page placeholder]
- [Source: _bmad-output/implementation-artifacts/9-4-auto-promocion-variante-ganadora-significancia.md — AC2, AC50 sum_view_time_sq_ms dependency]
- [Source: _bmad-output/implementation-artifacts/8-7-aggregation-jobs-read-models-analytics.md — pg_cron aggregation pattern]
- [Source: packages/shared/src/db/schema.ts — current Drizzle schema patterns]
- [Source: apps/web/src/app/api/v1/agency/listings/[id]/status/route.ts — auth + ownership pattern]
- [Source: packages/shared/src/design-tokens.ts — design tokens reference]

## Dev Agent Record

### Agent Model Used

(to be filled by dev agent)

### Debug Log References

### Completion Notes List

### File List
