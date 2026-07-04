# Story 9.4: Auto-promoción de Variante Ganadora al Alcanzar Significancia

Status: ready-for-dev

## Story

Como sistema Reinder,
quiero declarar automáticamente la variante ganadora de un experimento A/B al alcanzar significancia estadística y promoverla como contenido principal del listing,
para que las agencias obtengan la mejor versión posible de su contenido sin intervención manual, maximizando el engagement y las conversiones.

## Contexto del Epic

**Epic 9 — Content Optimization & A/B Testing:** Las agencias pueden experimentar con contenido (portada, título, descripción) y Reinder optimiza automáticamente el rendimiento de los listings. El motor asigna variantes aleatoriamente, mide el impacto en métricas de engagement, y auto-promueve la variante ganadora al alcanzar significancia estadística.

**FRs cubiertos por esta story:** FR-E9-4 (declaración automática de ganadora), FR-E9-5 (auto-promoción de variante ganadora)
**NFRs aplicados:** NFR8 (agencias no ven asignaciones individuales — solo métricas agregadas y resultado ganador), NFR11 (evaluación estadística ejecutada en background, no en request path)

**Posición en el epic:** Story 9.4 es la **culminación del pipeline A/B**. Depende de:
- **Story 9.1** — schema de experimentos (`listing_experiments`, `experiment_assignments`, `experiment_results`), motor de asignación, enums de status (`experimentStatusEnum`)
- **Story 9.3** — medición de impacto y dashboard de resultados (el aggregation job que actualiza `experiment_results` con impressions, view_time, match_count, reaffirm_count)

**Pipeline estadístico definido en Epic 9:** t-test de Welch para métricas continuas (view time), test de proporciones de z para tasas (match rate, reaffirm rate).

## Acceptance Criteria (BDD)

### AC1 — Motor de significancia estadística: z-test para proporciones

**Given** un experimento `running` con `experiment_results` para variante A (impressions=500, match_count=45) y variante B (impressions=500, match_count=65)
**When** el motor de significancia ejecuta el z-test de proporciones sobre match_rate
**Then** calcula correctamente:
  - `p_a = 45/500 = 0.09`, `p_b = 65/500 = 0.13`
  - `p_pooled = (45+65)/(500+500) = 0.11`
  - `SE = sqrt(p_pooled × (1 - p_pooled) × (1/n_a + 1/n_b))`
  - `z = (p_a - p_b) / SE`
  - `p_value` calculado via CDF normal estándar (two-tailed)
**And** devuelve `{ zScore, pValue, isSignificant: pValue <= target_p_value }`
**And** aplica el mismo test para `reaffirm_rate` (reaffirm_count / match_count)

### AC2 — Motor de significancia estadística: Welch's t-test para view time

**Given** un experimento `running` con `experiment_results` para variante A (impressions=500, total_view_time_ms=2_500_000) y variante B (impressions=500, total_view_time_ms=3_250_000)
**When** el motor de significancia ejecuta el t-test de Welch sobre avg_view_time_ms
**Then** calcula correctamente:
  - `mean_a = total_view_time_ms_a / impressions_a`, `mean_b = total_view_time_ms_b / impressions_b`
  - t-statistic via fórmula de Welch: `t = (mean_a - mean_b) / sqrt(var_a/n_a + var_b/n_b)`
  - Grados de libertad via Welch-Satterthwaite
  - `p_value` calculado via CDF de la distribución t (two-tailed)
**And** devuelve `{ tStatistic, degreesOfFreedom, pValue, isSignificant }`

**NOTA IMPORTANTE sobre varianza:** `experiment_results` almacena `total_view_time_ms` e `impressions`, pero NO almacena varianza individual. Para el Welch's t-test se necesita la varianza por variante. **Solución:** Añadir columna `sum_view_time_sq_ms` (BIGINT) a `experiment_results` para calcular varianza online: `variance = (sum_sq / n) - (mean)^2`. Story 9.3 debe haber alimentado este campo, o se añade la migración en esta story.

### AC3 — Guardrails de seguridad: duración mínima y n mínimo

**Given** un experimento `running` con `started_at` hace 24 horas (< 48h mínimo) y n=200 por variante (> n_min=100)
**When** el motor de significancia evalúa el experimento
**Then** NO evalúa significancia — devuelve `{ skipped: true, reason: 'MIN_DURATION_NOT_MET' }`
**And** el experimento sigue en status `running`

**Given** un experimento `running` con `started_at` hace 72 horas (> 48h mínimo) y n=80 por variante (< n_min=100)
**When** el motor de significancia evalúa el experimento
**Then** NO evalúa significancia — devuelve `{ skipped: true, reason: 'MIN_SAMPLE_SIZE_NOT_MET' }`

**Given** un experimento con `started_at` hace 72 horas y n=150 por variante (ambos guardrails cumplidos)
**When** el motor de significancia evalúa el experimento
**Then** ejecuta los tests estadísticos normalmente

### AC4 — Declaración de variante ganadora

**Given** un experimento `running` que cumple los guardrails de AC3
**When** TODOS los tests estadísticos (match_rate z-test, reaffirm_rate z-test, view_time t-test) alcanzan significancia (p_value ≤ target_p_value)
**And** TODOS favorecen consistentemente la misma variante (ej. variante B es mejor en todas las métricas)
**Then** actualiza `listing_experiments.status` a `completed`
**And** establece `listing_experiments.winner_variant` a la variante ganadora ('a' o 'b')
**And** establece `listing_experiments.completed_at` a la fecha actual

**Given** un experimento donde 2 de 3 métricas favorecen variante B pero 1 favorece variante A (resultados mixtos)
**When** el motor evalúa significancia
**Then** NO declara ganadora — el experimento sigue `running`
**And** log info: "Resultados mixtos — esperando convergencia"

**Given** un experimento donde todas las métricas son significativas pero no hay una variante claramente superior (empate estadístico en alguna métrica)
**When** el motor evalúa significancia
**Then** NO declara ganadora — sigue esperando

### AC5 — Auto-promoción de variante ganadora en el listing

**Given** un experimento tipo `cover_image` con `winner_variant = 'b'` y `variant_b = { coverImageUrl: "https://...", coverImageIndex: 2 }`
**When** el sistema ejecuta la auto-promoción
**Then** actualiza `listings.images` reordenando para que la imagen de la variante B esté en `images[0]`
**And** actualiza `listing_experiments.status` de `completed` a `winner_promoted`
**And** la promoción es idempotente — ejecutar dos veces no corrompe los datos

**Given** un experimento tipo `title` con `winner_variant = 'b'` y `variant_b = { title: "Ático de lujo con vistas al mar" }`
**When** el sistema ejecuta la auto-promoción
**Then** actualiza `listings.title` con el título de la variante ganadora
**And** actualiza el status a `winner_promoted`

**Given** un experimento tipo `description` con `winner_variant = 'b'`
**When** el sistema ejecuta la auto-promoción
**Then** actualiza `listings.description` con la descripción de la variante ganadora

**Given** un experimento tipo `title_and_description` con `winner_variant = 'b'`
**When** el sistema ejecuta la auto-promoción
**Then** actualiza TANTO `listings.title` COMO `listings.description`

### AC6 — Log de auditoría para promoción

**Given** una auto-promoción ejecutada exitosamente
**When** consulto la tabla `experiment_promotion_logs`
**Then** existe un registro con:
  - `experiment_id` (FK → listing_experiments.id)
  - `listing_id` (FK → listings.id)
  - `promoted_variant` ('a' | 'b')
  - `experiment_type` (cover_image | title | description | title_and_description)
  - `previous_content` (JSONB — contenido original antes de la promoción)
  - `promoted_content` (JSONB — contenido de la variante ganadora)
  - `promoted_at` (TIMESTAMPTZ)
  - `promoted_by` ('system' — siempre automático en esta story)

### AC7 — Notificación a agency_admin cuando el experimento alcanza significancia

**Given** un experimento que acaba de ser declarado ganador (status → `completed`)
**When** la notificación se dispara
**Then** se crea un registro en `experiment_notifications` (o se envía push via Expo Push si la agencia tiene push_tokens)
**And** el mensaje incluye: nombre del experimento, variante ganadora, métricas resumidas
**And** la notificación es fire-and-forget (no bloquea el proceso de declaración)

### AC8 — API: `POST /api/v1/experiments/:id/rollback`

**Given** un experimento con status `winner_promoted`
**When** un `agency_admin` de la agencia dueña del listing hace POST a `/api/v1/experiments/:id/rollback`
**Then** restaura el contenido del listing al valor original (`variant_a`)
**And** actualiza `listing_experiments.status` a `completed` (revierte la promoción pero mantiene el resultado del experimento)
**And** crea un log de auditoría con `promoted_by: 'rollback_agency_admin'`
**And** responde 200 con `{ data: { experiment, listing }, error: null }`

**Given** un experimento con status != `winner_promoted`
**When** se intenta hacer rollback
**Then** responde 409 con `{ data: null, error: { code: "INVALID_STATE_FOR_ROLLBACK", message: "..." } }`

**Given** un usuario que no es `agency_admin` de la agencia dueña
**When** intenta hacer rollback
**Then** responde 403

### AC9 — Integración con aggregation job (extensión de Story 9.3)

**Given** el aggregation job de Story 9.3 que actualiza `experiment_results`
**When** el job completa una iteración de actualización de resultados
**Then** ejecuta el motor de significancia para TODOS los experimentos `running` que cumplen los guardrails
**And** procesa las declaraciones y auto-promociones de forma secuencial (no paralela, para evitar race conditions)
**And** si el motor de significancia falla para un experimento, continúa con los demás (fault isolation)

### AC10 — Migración SQL y schema Drizzle

**Given** la migración de Story 9.4 aplicada
**When** consulto el schema
**Then** existe la tabla `experiment_promotion_logs` según AC6
**And** `experiment_results` tiene la columna `sum_view_time_sq_ms` (BIGINT DEFAULT 0) para cálculo de varianza
**And** RLS está habilitada en `experiment_promotion_logs`
**And** `agency_admin` puede leer logs de promoción de sus propios experimentos
**And** `platform_admin` tiene acceso total

## Tasks / Subtasks

- [ ] **Task 1 — Motor de significancia estadística** (AC: 1, 2)
  - [ ] Crear `packages/shared/src/experiments/significance-engine.ts`
  - [ ] Implementar `zTestForProportions(successA, nA, successB, nB)` — devuelve `{ zScore, pValue, isSignificant }`
  - [ ] Implementar `normalCDF(z)` — aproximación Abramowitz & Stegun para CDF normal estándar
  - [ ] Implementar `welchTTest(meanA, varA, nA, meanB, varB, nB)` — devuelve `{ tStatistic, df, pValue, isSignificant }`
  - [ ] Implementar `tDistributionCDF(t, df)` — aproximación numérica via regularized incomplete beta function
  - [ ] Implementar `evaluateExperiment(experimentResults, config)` — orquesta los 3 tests y determina ganadora
  - [ ] Todas las funciones son puras — zero side effects, zero DB access
  - [ ] Parámetros configurables: `targetPValue` (default 0.05), `minSampleSize`, `minDurationHours` (default 48)

- [ ] **Task 2 — Tests del motor de significancia** (AC: 1, 2, 3, 4)
  - [ ] Crear `packages/shared/src/experiments/significance-engine.test.ts`
  - [ ] T9.4-01: z-test con datos conocidos — verificar p-value contra tabla estadística
  - [ ] T9.4-02: z-test con proporciones iguales → p-value ≈ 1.0 (no significativo)
  - [ ] T9.4-03: Welch's t-test con medias significativamente diferentes → p-value < 0.05
  - [ ] T9.4-04: Welch's t-test con medias idénticas → no significativo
  - [ ] T9.4-05: normalCDF(0) ≈ 0.5, normalCDF(1.96) ≈ 0.975
  - [ ] T9.4-06: Guardrail duración mínima no cumplida → skipped
  - [ ] T9.4-07: Guardrail n mínimo no cumplido → skipped
  - [ ] T9.4-08: Resultados mixtos (métricas contradictorias) → no declara ganadora
  - [ ] T9.4-09: Todas las métricas significativas y consistentes → declara ganadora correcta
  - [ ] T9.4-10: Variante A gana → winner = 'a' (no sesgo hacia B)

- [ ] **Task 3 — Winner declaration + auto-promotion service** (AC: 4, 5, 6)
  - [ ] Crear `packages/shared/src/experiments/winner-promotion.ts`
  - [ ] `declareWinner(experimentId, winnerVariant)` — actualiza status a `completed`, establece winner_variant
  - [ ] `promoteWinner(experimentId)` — lee la variante ganadora, actualiza el listing, log de auditoría, status a `winner_promoted`
  - [ ] La promoción es transaccional — si falla el update del listing, no se marca como promoted
  - [ ] Manejar cada `experiment_type` correctamente (cover_image, title, description, title_and_description)
  - [ ] Para `cover_image`: reordenar `images[]` para poner la imagen ganadora en posición 0

- [ ] **Task 4 — Migración SQL** (AC: 6, 10)
  - [ ] Crear `supabase/migrations/20260622000004_experiment_significance.sql`
  - [ ] CREATE TABLE `experiment_promotion_logs` según AC6
  - [ ] ALTER TABLE `experiment_results` ADD COLUMN `sum_view_time_sq_ms` BIGINT NOT NULL DEFAULT 0
  - [ ] CREATE INDEX para lookups eficientes
  - [ ] RLS + políticas para `experiment_promotion_logs`
  - [ ] Usar `IF NOT EXISTS` para idempotencia

- [ ] **Task 5 — Schema Drizzle** (AC: 10)
  - [ ] Añadir `experimentPromotionLogs` en `packages/shared/src/db/schema.ts`
  - [ ] Añadir columna `sumViewTimeSqMs` a `experimentResults` (si existe del Story 9.1)
  - [ ] Exportar tipos correspondientes desde `packages/shared/src/types/experiment.ts`

- [ ] **Task 6 — Integración con aggregation job** (AC: 9)
  - [ ] Extender `packages/shared/src/engagement/aggregation.ts` (o crear `packages/shared/src/experiments/aggregation-hook.ts`)
  - [ ] Después de actualizar `experiment_results`, llamar a `evaluateAllRunningExperiments()`
  - [ ] Procesar secuencialmente con error isolation por experimento
  - [ ] Log cada evaluación: experimentId, resultado (skipped/no_winner/winner_declared)

- [ ] **Task 7 — Notificación a agency_admin** (AC: 7)
  - [ ] Crear `apps/web/src/features/experiments/lib/notify-experiment-winner.ts`
  - [ ] Seguir patrón de `apps/web/src/features/agent-link/lib/notify-agent.ts`
  - [ ] Lookup agency_admin users via `user_profiles.agency_id`
  - [ ] Enviar push via Expo Push Service (fire-and-forget)
  - [ ] Mensaje: "Experimento '{name}': Variante {B} es la ganadora 🏆"

- [ ] **Task 8 — API: POST /api/v1/experiments/:id/rollback** (AC: 8)
  - [ ] Crear `apps/web/src/app/api/v1/experiments/[id]/rollback/route.ts`
  - [ ] Auth: 401 si no autenticado, 403 si no es agency_admin de la agencia dueña
  - [ ] Validar status = `winner_promoted` → 409 si no
  - [ ] Restaurar contenido original (variant_a) al listing
  - [ ] Actualizar status a `completed`
  - [ ] Crear log de auditoría
  - [ ] Responder 200

- [ ] **Task 9 — Tests de integración** (AC: 5, 8)
  - [ ] T9.4-11: Promoción cover_image — listing.images[0] cambia a la imagen ganadora
  - [ ] T9.4-12: Promoción title — listing.title cambia al título ganador
  - [ ] T9.4-13: Promoción idempotente — ejecutar 2 veces no corrompe
  - [ ] T9.4-14: Rollback restaura contenido original
  - [ ] T9.4-15: Rollback en estado incorrecto → 409

## Dev Notes

### Motor de Significancia — Implementación de Referencia

```typescript
// packages/shared/src/experiments/significance-engine.ts

// ─── Tipos ──────────────────────────────────────────────────────────────────

export interface SignificanceConfig {
  targetPValue: number;   // default 0.05
  minSampleSize: number;  // experiment.min_sample_size
  minDurationHours: number; // default 48
}

export interface ZTestResult {
  zScore: number;
  pValue: number;
  isSignificant: boolean;
  favoredVariant: 'a' | 'b' | null; // null si no significativo
}

export interface TTestResult {
  tStatistic: number;
  degreesOfFreedom: number;
  pValue: number;
  isSignificant: boolean;
  favoredVariant: 'a' | 'b' | null;
}

export interface ExperimentEvaluation {
  matchRateTest: ZTestResult | null;
  reaffirmRateTest: ZTestResult | null;
  viewTimeTest: TTestResult | null;
  winner: 'a' | 'b' | null;
  reason: 'winner_declared' | 'not_significant' | 'mixed_results'
         | 'min_duration_not_met' | 'min_sample_size_not_met';
}

// ─── Normal CDF (Abramowitz & Stegun) ──────────────────────────────────────

/**
 * Aproximación CDF de distribución normal estándar.
 * Precisión: ±1.5e-7 (suficiente para p-value threshold de 0.05).
 * Ref: Abramowitz & Stegun, Handbook of Mathematical Functions, formula 7.1.26
 */
export function normalCDF(z: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

// ─── Z-test para proporciones ──────────────────────────────────────────────

/**
 * Two-sample z-test para proporciones.
 * H0: p_a = p_b (no hay diferencia entre variantes)
 * Two-tailed test.
 */
export function zTestForProportions(
  successA: number, nA: number,
  successB: number, nB: number,
  targetPValue: number
): ZTestResult {
  const pA = successA / nA;
  const pB = successB / nB;
  const pPooled = (successA + successB) / (nA + nB);

  const se = Math.sqrt(pPooled * (1 - pPooled) * (1 / nA + 1 / nB));

  // Si SE es 0 (ambas proporciones son 0 o 1), no es significativo
  if (se === 0) {
    return { zScore: 0, pValue: 1, isSignificant: false, favoredVariant: null };
  }

  const zScore = (pA - pB) / se;
  const pValue = 2 * (1 - normalCDF(Math.abs(zScore))); // two-tailed

  return {
    zScore,
    pValue,
    isSignificant: pValue <= targetPValue,
    favoredVariant: pValue <= targetPValue ? (pA > pB ? 'a' : 'b') : null,
  };
}
```

### Welch's t-test — Notas sobre Varianza

**Problema:** `experiment_results` solo tiene `total_view_time_ms` e `impressions`. Para calcular la varianza necesaria en el Welch's t-test, necesitamos `sum_of_squares`.

**Solución — Varianza online (Welford's algorithm):**
Añadir columna `sum_view_time_sq_ms` (BIGINT) a `experiment_results`. El aggregation job de Story 9.3 debe acumular `sum(view_time_ms^2)`. Con esto:

```typescript
// Calcular varianza sample desde counters agregados:
// mean = total / n
// variance = (sum_sq / n) - mean^2  ← varianza poblacional
// sample_variance = variance * n / (n - 1)  ← corrección de Bessel

function calculateVariance(total: number, sumSq: number, n: number): number {
  if (n <= 1) return 0;
  const mean = total / n;
  const popVariance = (sumSq / n) - (mean * mean);
  return popVariance * n / (n - 1); // Corrección de Bessel
}
```

### t-Distribution CDF — Opción de Implementación

Para el p-value del Welch's t-test, necesitamos la CDF de la distribución t. Dos opciones:

**Opción A — Librería `@stdlib/stats-base-dists-t-cdf` (RECOMENDADA):**
```bash
pnpm add @stdlib/stats-base-dists-t-cdf --filter @reinder/shared
```
```typescript
import tCDF from '@stdlib/stats-base-dists-t-cdf';
const pValue = 2 * (1 - tCDF(Math.abs(tStatistic), df)); // two-tailed
```
Ventaja: precisión numérica verificada, manejo de edge cases (df muy grandes, t extremos).

**Opción B — Aproximación propia (si se quiere zero dependencies):**
Usar la aproximación de la CDF de la distribución t basada en la regularized incomplete beta function. Más compleja pero factible. Incluir tests exhaustivos para validar precision.

**⚠️ DECISIÓN: Usar Opción A (`@stdlib`).** El cálculo de la regularized incomplete beta function es propenso a errores numéricos. Una librería matemática verificada es la decisión responsable para un motor estadístico que toma decisiones automáticas sobre contenido de producción.

### Auto-promoción — Implementación por experiment_type

```typescript
// packages/shared/src/experiments/winner-promotion.ts

interface PromotionResult {
  listingId: string;
  experimentId: string;
  promotedVariant: 'a' | 'b';
  previousContent: VariantContent;
  promotedContent: VariantContent;
}

async function promoteWinner(
  db: DrizzleClient,
  experiment: ListingExperiment
): Promise<PromotionResult> {
  const winnerContent = experiment.winnerVariant === 'a'
    ? experiment.variantA
    : experiment.variantB;
  const previousContent = experiment.variantA; // original siempre es A

  // Construir update del listing según experiment_type
  const listingUpdate: Partial<Listing> = { updatedAt: new Date() };

  switch (experiment.experimentType) {
    case 'cover_image': {
      // Reordenar images[] para poner la imagen ganadora en posición 0
      const listing = await getListing(db, experiment.listingId);
      const images = [...listing.images];
      const targetIndex = winnerContent.coverImageIndex ?? 0;
      if (targetIndex > 0 && targetIndex < images.length) {
        const [img] = images.splice(targetIndex, 1);
        images.unshift(img);
      }
      listingUpdate.images = images;
      break;
    }
    case 'title':
      listingUpdate.title = winnerContent.title!;
      break;
    case 'description':
      listingUpdate.description = winnerContent.description!;
      break;
    case 'title_and_description':
      listingUpdate.title = winnerContent.title!;
      listingUpdate.description = winnerContent.description!;
      break;
  }

  // Transacción: update listing + update experiment status + insert log
  await db.transaction(async (tx) => {
    await tx.update(listings).set(listingUpdate)
      .where(eq(listings.id, experiment.listingId));

    await tx.update(listingExperiments)
      .set({ status: 'winner_promoted', updatedAt: new Date() })
      .where(eq(listingExperiments.id, experiment.id));

    await tx.insert(experimentPromotionLogs).values({
      experimentId: experiment.id,
      listingId: experiment.listingId,
      promotedVariant: experiment.winnerVariant!,
      experimentType: experiment.experimentType,
      previousContent: previousContent,
      promotedContent: winnerContent,
      promotedBy: 'system',
    });
  });

  return {
    listingId: experiment.listingId,
    experimentId: experiment.id,
    promotedVariant: experiment.winnerVariant!,
    previousContent,
    promotedContent: winnerContent,
  };
}
```

### Tabla `experiment_promotion_logs` — Migración SQL

```sql
-- supabase/migrations/20260622000004_experiment_significance.sql

-- 1. Tabla de logs de promoción
CREATE TABLE IF NOT EXISTS experiment_promotion_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES listing_experiments(id),
  listing_id UUID NOT NULL REFERENCES listings(id),
  promoted_variant TEXT NOT NULL CHECK (promoted_variant IN ('a', 'b')),
  experiment_type TEXT NOT NULL,
  previous_content JSONB NOT NULL,
  promoted_content JSONB NOT NULL,
  promoted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  promoted_by TEXT NOT NULL DEFAULT 'system'
);

CREATE INDEX IF NOT EXISTS idx_promotion_logs_experiment_id
  ON experiment_promotion_logs(experiment_id);

CREATE INDEX IF NOT EXISTS idx_promotion_logs_listing_id
  ON experiment_promotion_logs(listing_id);

-- 2. Columna para cálculo de varianza (sum of squares)
ALTER TABLE experiment_results
  ADD COLUMN IF NOT EXISTS sum_view_time_sq_ms BIGINT NOT NULL DEFAULT 0;

-- 3. RLS
ALTER TABLE experiment_promotion_logs ENABLE ROW LEVEL SECURITY;

-- agency_admin puede leer logs de sus propios experimentos
CREATE POLICY "agency_admin_can_read_own_promotion_logs"
  ON experiment_promotion_logs
  FOR SELECT
  TO authenticated
  USING (
    experiment_id IN (
      SELECT id FROM listing_experiments
      WHERE agency_id = (
        SELECT agency_id FROM user_profiles
        WHERE id = auth.uid() AND role = 'agency_admin'
      )
    )
  );

-- platform_admin acceso total
CREATE POLICY "platform_admin_full_access_promotion_logs"
  ON experiment_promotion_logs
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'platform_admin'
  );

-- Solo service_role puede insertar (el sistema, no usuarios directamente)
CREATE POLICY "service_role_can_insert_promotion_logs"
  ON experiment_promotion_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);
```

### Patrón de Notificación — Seguir notify-agent.ts

```typescript
// apps/web/src/features/experiments/lib/notify-experiment-winner.ts
// Patrón idéntico a apps/web/src/features/agent-link/lib/notify-agent.ts

import { db } from '@/lib/supabase/db';
import { pushTokens, userProfiles } from '@reinder/shared/db/schema';
import { eq, and } from 'drizzle-orm';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export async function notifyExperimentWinner(
  agencyId: string,
  experimentName: string,
  winnerVariant: 'a' | 'b'
): Promise<void> {
  try {
    // Buscar agency_admins de esta agencia
    const admins = await db
      .select({ userId: userProfiles.id })
      .from(userProfiles)
      .where(
        and(
          eq(userProfiles.agencyId, agencyId),
          eq(userProfiles.role, 'agency_admin')
        )
      );

    for (const admin of admins) {
      const [token] = await db
        .select({ token: pushTokens.token })
        .from(pushTokens)
        .where(eq(pushTokens.userId, admin.userId))
        .limit(1);

      if (!token) continue;

      void fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: token.token,
          title: 'Experimento completado 🏆',
          body: `"${experimentName}": Variante ${winnerVariant.toUpperCase()} es la ganadora`,
          data: { type: 'experiment.completed', agencyId },
        }),
      }).catch(err => console.error('[notifyExperimentWinner] Push failed:', err));
    }
  } catch (err) {
    // Fire-and-forget — nunca bloquear el proceso principal
    console.error('[notifyExperimentWinner] Error:', err);
  }
}
```

### Rollback API — Patrón de Route Handler

```typescript
// apps/web/src/app/api/v1/experiments/[id]/rollback/route.ts
// Seguir patrón exacto de:
// apps/web/src/app/api/v1/agency/listings/[id]/status/route.ts

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Auth check → 401
  // 2. Role check agency_admin → 403
  // 3. Load experiment → verify ownership via agency_id → 404
  // 4. Verify status = 'winner_promoted' → 409
  // 5. Restaurar listing con variant_a content
  // 6. Update status a 'completed'
  // 7. Insert log con promoted_by = 'rollback_agency_admin'
  // 8. Return 200
}
```

### Constantes configurables

```typescript
// packages/shared/src/constants/index.ts — añadir:

/** Duración mínima de un experimento antes de evaluar significancia (horas) */
export const EXPERIMENT_MIN_DURATION_HOURS = 48;

/** P-value por defecto si no configurado en el experimento */
export const EXPERIMENT_DEFAULT_P_VALUE = 0.05;

/** N mínimo por defecto si no configurado en el experimento */
export const EXPERIMENT_DEFAULT_MIN_SAMPLE_SIZE = 100;
```

### Restricción UNIQUE Parcial — Extensión de Status Enum

Story 9.1 definió `experimentStatusEnum` con: `draft`, `running`, `paused`, `completed`, `cancelled`.

Esta story necesita añadir `winner_promoted` al enum:

```sql
-- Añadir valor al enum existente
ALTER TYPE experiment_status ADD VALUE IF NOT EXISTS 'winner_promoted';
```

**⚠️ IMPORTANTE:** `ALTER TYPE ... ADD VALUE` NO puede ejecutarse dentro de una transacción en PostgreSQL. La migración debe colocar este ALTER ANTES de cualquier bloque `BEGIN ... COMMIT`.

Actualizar `experimentStatusEnum` en Drizzle `schema.ts` correspondiente.

### Project Structure Notes

```
packages/shared/src/
├── experiments/
│   ├── assign-variant.ts                    ← EXISTS (Story 9.1)
│   ├── assign-variant.test.ts               ← EXISTS (Story 9.1)
│   ├── significance-engine.ts               ← NEW
│   ├── significance-engine.test.ts          ← NEW
│   ├── winner-promotion.ts                  ← NEW
│   └── winner-promotion.test.ts             ← NEW
├── db/
│   └── schema.ts                            ← MODIFY (add experimentPromotionLogs, add sumViewTimeSqMs to experimentResults, update experimentStatusEnum)
├── types/
│   └── experiment.ts                        ← MODIFY (add SignificanceConfig, EvaluationResult, PromotionLog types)
├── constants/
│   └── index.ts                             ← MODIFY (add EXPERIMENT_MIN_DURATION_HOURS, etc.)

apps/web/src/
├── features/experiments/
│   └── lib/
│       └── notify-experiment-winner.ts      ← NEW
├── app/api/v1/experiments/
│   ├── route.ts                             ← EXISTS (Story 9.1 — POST crear experimento)
│   ├── assignment/route.ts                  ← EXISTS (Story 9.1 — GET asignación)
│   └── [id]/
│       └── rollback/route.ts                ← NEW

supabase/migrations/
└── 20260622000004_experiment_significance.sql  ← NEW
```

### Dependencia de Librería

```bash
# Instalar en packages/shared (única dependencia nueva)
pnpm add @stdlib/stats-base-dists-t-cdf --filter @reinder/shared
```

Verificar compatibilidad con el monorepo Turborepo y que `@stdlib` es tree-shakeable. El paquete es ~15KB minified, solo el CDF de la distribución t.

### Tablas Existentes Referenciadas

| Tabla | Uso en esta story |
|-------|-------------------|
| `listing_experiments` | Leer config, actualizar status/winner_variant, verify ownership |
| `experiment_results` | Leer métricas agregadas, añadir columna sum_view_time_sq_ms |
| `listings` | Actualizar contenido al promover (images, title, description) |
| `user_profiles` | Lookup agency_admin por agency_id para notificaciones |
| `push_tokens` | Enviar push notification al agency_admin |
| `agencies` | FK check vía listing_experiments.agency_id |

### Guardrails para el Dev Agent

1. **NO implementar la regularized incomplete beta function manualmente** — usar `@stdlib/stats-base-dists-t-cdf`. Los errores numéricos en funciones estadísticas causan decisiones automáticas incorrectas sobre contenido de producción.
2. **NO hacer la evaluación de significancia en el request path** — SOLO en el aggregation job (background). NFR11 aplica aquí.
3. **NO usar one-tailed tests** — los tests estadísticos deben ser **two-tailed**. No asumimos a priori cuál variante es mejor.
4. **NO declarar ganadora si los resultados son mixtos** — TODAS las métricas deben favorecer la misma variante para declarar ganadora. Esto previene decisiones espurias.
5. **NO olvidar `ALTER TYPE experiment_status ADD VALUE 'winner_promoted'`** — esto se ejecuta FUERA de transacción en PostgreSQL. Colocarlo al inicio de la migración.
6. **NO hacer la auto-promoción fuera de una transacción** — el update del listing, el cambio de status, y el log de auditoría deben ser atómicos.
7. **La notificación es fire-and-forget** — NUNCA debe bloquear ni fallar el proceso de declaración/promoción. Seguir patrón de `notify-agent.ts`.
8. **El rollback restaura `variant_a`** — variant_a siempre contiene el contenido ORIGINAL del listing (establecido en Story 9.1 AC6).
9. **Procesar experimentos secuencialmente en el aggregation job** — NO en paralelo. Evitar race conditions si dos experimentos afectan al mismo listing (no debería pasar por la restricción UNIQUE parcial, pero belt-and-suspenders).
10. **Usar `bigint` para `sum_view_time_sq_ms`** — los cuadrados de milisegundos pueden ser enormes (1000000^2 = 10^12). `integer` overflow es garantizado.
11. **La normalCDF debe ser precisa hasta ±1.5e-7** — usar la aproximación Abramowitz & Stegun con los coeficientes correctos. Validar con tests contra valores conocidos (normalCDF(1.96) ≈ 0.975, normalCDF(2.576) ≈ 0.995).
12. **Validar que `n > 1` antes de calcular varianza** — con n=1, la varianza sample es indefinida (división por cero en corrección de Bessel).

### Aprendizajes de Stories Anteriores

- **Story 9.1** estableció el schema de `listing_experiments` con `variant_a` auto-poblado desde el listing actual y `experiment_results` con 2 rows por experimento (a+b). Esta story depende de que esas rows existan.
- **Story 8.7** introdujo el patrón de aggregation jobs con pg_cron — el motor de significancia se ejecuta como extensión de este job, no como endpoint separado.
- **Story 8.1** estableció fire-and-forget para persistencia no crítica — las notificaciones de esta story siguen el mismo patrón.
- **Patrón de Route Handler** establecido en Story 5.4 (`agency/listings/[id]/status/route.ts`) — auth check → role check → ownership verification → business logic → ApiResponse. El rollback API sigue este patrón exactamente.
- **RLS con subquery a user_profiles** es el patrón estándar — ver `rls-experiments-policies.sql` de Story 9.1.
- Las migraciones usan `IF NOT EXISTS` para idempotencia — patrón de Epic 5.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 9 — FR-E9-4, FR-E9-5]
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture]
- [Source: _bmad-output/implementation-artifacts/9-1-schema-experimentos-motor-asignacion-variantes.md — schema completo, VariantContent type, RLS patterns]
- [Source: _bmad-output/implementation-artifacts/8-7-aggregation-jobs-read-models-analytics.md — aggregation job pattern]
- [Source: apps/web/src/features/agent-link/lib/notify-agent.ts — notification pattern]
- [Source: apps/web/src/app/api/v1/agency/listings/[id]/status/route.ts — route handler auth pattern]
- [Source: packages/shared/src/types/api.ts — ApiResponse<T> wrapper]
- [Source: packages/shared/src/db/schema.ts — Drizzle patterns, listings table structure]

## Dev Agent Record

### Agent Model Used

(to be filled by dev agent)

### Debug Log References

### Completion Notes List

### File List
