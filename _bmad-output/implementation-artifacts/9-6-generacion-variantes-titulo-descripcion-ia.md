# Story 9.6: Generación de Variantes de Título y Descripción con IA (Human-in-the-loop)

Status: ready-for-dev

## Story

Como administrador de agencia inmobiliaria en Reinder,
quiero que la plataforma genere automáticamente variantes alternativas de título y descripción para mis listings usando IA,
para poder crear experimentos A/B de contenido textual con opciones profesionalmente optimizadas sin necesidad de copywriting manual, manteniendo siempre control total sobre lo que se publica.

## Contexto del Epic

**Epic 9 — Content Optimization & A/B Testing:** Las agencias experimentan con contenido (portada, título, descripción) y Reinder optimiza automáticamente el rendimiento de los listings. El motor asigna variantes aleatoriamente, mide el impacto en métricas de engagement, y auto-promueve la variante ganadora al alcanzar significancia estadística.

**FR cubierto por esta story:** FR-E9-6 — Reinder genera variantes alternativas de título y descripción con IA — la agencia aprueba antes de publicar.
**NFRs aplicados:** NFR8 (no exponer datos de compradores), NFR11 (la generación IA es async — no bloquea el swipe feed).

**Posición en el epic:** Story 9.6 es la **última story** del Epic 9. Depende de Story 9.1 (schema + API) y Story 9.2 (UI de creación de experimentos + tipos compartidos). Es una extensión de la UI de creación que añade generación con IA antes de crear el experimento.

**Dependencias directas:**
- Story 9.1: tablas `listing_experiments`, `experiment_results` + API `POST /api/v1/experiments`
- Story 9.2: UI de creación de experimento en `/agency/experiments/new`, componentes `CreateExperimentForm`, `ExperimentStatusBadge`, Zod schemas, tipos `Experiment`, `VariantContent`

## Acceptance Criteria (BDD)

### AC1 — Servicio de generación de variantes con IA (server-side)
**Given** un listing con `title`, `description`, `bedrooms`, `sizeSqm`, `city`, y `price` en la base de datos
**When** el servidor invoca el servicio `generateListingVariants(listingData)` internamente
**Then** llama a la API de OpenAI GPT-4o con un prompt optimizado para real estate copywriting
**And** devuelve exactamente 3 variantes, cada una con `title` (≤120 caracteres) y `description` (≤500 caracteres)
**And** las variantes están en el mismo idioma que el título y descripción originales
**And** las variantes no contienen términos prohibidos (insultos, discriminación, claims legales falsos)
**And** cada variante tiene un `label` descriptivo corto (ej: "Emocional", "Factual", "Premium")
**And** la ejecución total es ≤10 segundos (timeout de la llamada a OpenAI)

### AC2 — API endpoint de generación de variantes
**Given** un `agency_admin` autenticado
**When** hace `POST /api/v1/experiments/generate-variants` con body `{ listingId: "uuid" }`
**Then** responde 200 con `{ data: { variants: [{ label, title, description }] }, error: null }`
**And** el response time es ≤10 segundos
**And** el `listingId` pertenece a la agencia del usuario (ownership check)

**Given** el listing no tiene `description` (campo nullable)
**When** se solicita generación de variantes
**Then** genera variantes solo de título (description queda vacío en las variantes)
**And** el prompt se adapta para generar solo títulos

**Given** un usuario con rol `buyer` o `agent`
**When** intenta acceder al endpoint
**Then** responde 403

**Given** un `listingId` que no existe o no pertenece a la agencia
**When** se envía al endpoint
**Then** responde 404 con `{ data: null, error: { code: "LISTING_NOT_FOUND", message: "..." } }`

### AC3 — Rate limiting por agencia
**Given** una agencia que ya ha realizado 10 generaciones en las últimas 24 horas
**When** intenta generar variantes de nuevo
**Then** responde 429 con `{ data: null, error: { code: "RATE_LIMIT_EXCEEDED", message: "Límite diario de generaciones alcanzado. Intenta mañana." } }`
**And** incluye header `Retry-After` con los segundos restantes hasta el reset

**Given** una agencia que ha realizado menos de 10 generaciones en 24 horas
**When** genera variantes exitosamente
**Then** el contador de uso se incrementa en 1

### AC4 — Tabla de tracking de uso de IA
**Given** la migración de Story 9.6 ejecutada en Supabase
**When** consulto el schema de la base de datos
**Then** existe la tabla `ai_generation_usage` con los campos:
  - `id` (UUID PK, defaultRandom)
  - `agency_id` (UUID FK → agencies.id, NOT NULL)
  - `listing_id` (UUID FK → listings.id, NOT NULL)
  - `user_id` (UUID NOT NULL) — quién disparó la generación
  - `model` (TEXT NOT NULL) — ej: "gpt-4o"
  - `prompt_tokens` (INTEGER NOT NULL DEFAULT 0)
  - `completion_tokens` (INTEGER NOT NULL DEFAULT 0)
  - `created_at` (TIMESTAMPTZ NOT NULL, defaultNow)
**And** existe un índice `idx_ai_generation_usage_agency_created` sobre `(agency_id, created_at)` para consultas de rate limiting

### AC5 — Graceful fallback si la API de IA no está disponible
**Given** la API de OpenAI devuelve un error (500, timeout, network error)
**When** el endpoint de generación recibe el error
**Then** responde 503 con `{ data: null, error: { code: "AI_SERVICE_UNAVAILABLE", message: "El servicio de generación no está disponible temporalmente. Intenta en unos minutos." } }`
**And** loguea el error en consola con `[ai-variants]` prefix para debugging
**And** NO incrementa el contador de rate limiting (no penalizar fallos)

**Given** la variable de entorno `OPENAI_API_KEY` no está configurada
**When** se intenta generar variantes
**Then** responde 503 con `{ data: null, error: { code: "AI_NOT_CONFIGURED", message: "Generación de variantes no disponible." } }`

### AC6 — Botón "Generar con IA" en la UI de creación de experimento
**Given** un `agency_admin` en la página de creación de experimento (`/agency/experiments/new`)
**When** selecciona tipo de experimento `title`, `description`, o `title_and_description`
**Then** aparece un botón "✨ Generar variantes con IA" debajo del selector de tipo
**And** el botón solo aparece cuando hay un listing seleccionado

**Given** el tipo de experimento seleccionado es `cover_image`
**When** el usuario ve el formulario
**Then** el botón de generar con IA NO aparece (portada usa selector visual de imagen, no IA)

### AC7 — Flujo de generación y preview en UI
**Given** un listing seleccionado y tipo `title` o `description` o `title_and_description`
**When** el usuario hace click en "✨ Generar variantes con IA"
**Then** el botón muestra estado de carga: spinner + "Generando variantes..." (2-10 segundos)
**And** al recibir las 3 variantes, se muestran en un panel de selección debajo del botón
**And** cada variante muestra su `label` como badge, el `title` y `description` propuestos
**And** la variante original (contenido actual del listing) se muestra como referencia a la izquierda
**And** el usuario puede seleccionar UNA variante como Variante B con un click/radio

**Given** la generación falla (503)
**When** el usuario ve el error
**Then** se muestra toast de error con el mensaje del API
**And** el formulario permanece funcional — el usuario puede escribir la variante manualmente

### AC8 — Edición de variante generada antes de aprobar
**Given** las variantes generadas mostradas en el panel de selección
**When** el usuario selecciona una variante
**Then** los campos de título y descripción de "Variante B" se pre-rellenan con el contenido de la variante seleccionada
**And** los campos son editables — el usuario puede modificar el texto antes de crear el experimento
**And** hay un indicador visual "✏️ Editado" si el usuario modifica el texto generado

### AC9 — Preview lado a lado (original vs variante seleccionada)
**Given** el usuario ha seleccionado (y opcionalmente editado) una variante como Variante B
**When** ve la sección de preview del formulario
**Then** se muestra una comparación lado a lado:
  - Izquierda: "Variante A (Original)" con el título y descripción actuales del listing
  - Derecha: "Variante B (IA / Editado)" con el título y descripción seleccionados
**And** las diferencias textuales están sutilmente destacadas (font-weight o background)

### AC10 — Creación de experimento con variante IA
**Given** el usuario ha seleccionado/editado una variante y completa el formulario
**When** hace click en "Crear Experimento"
**Then** se ejecuta `POST /api/v1/experiments` con:
```json
{
  "listingId": "uuid",
  "name": "Nombre del experimento",
  "experimentType": "title_and_description",
  "variantB": {
    "title": "Título seleccionado/editado",
    "description": "Descripción seleccionada/editada"
  }
}
```
**And** el flujo de creación es el mismo que en Story 9.2 (redirect a detalle, toast de éxito)

### AC11 — Validación de seguridad de contenido
**Given** el servicio de generación ha recibido las variantes de OpenAI
**When** valida el contenido de cada variante
**Then** filtra cualquier variante que contenga:
  - Términos discriminatorios (lista configurable)
  - Claims legales específicos ("garantizado", "sin vicios", "mejor precio del mercado")
  - Contenido sexual o violento
  - Texto en idioma diferente al original
**And** si TODAS las variantes son filtradas, genera un nuevo set (1 retry)
**And** si tras el retry siguen filtradas, devuelve error con código `CONTENT_SAFETY_FAILED`

### AC12 — Soporte de generación manual (sin IA)
**Given** un `agency_admin` creando un experimento de tipo `title` o `description`
**When** prefiere NO usar la IA y escribe el contenido manualmente
**Then** puede completar los campos de Variante B directamente sin usar el botón de generación
**And** el botón de IA es una ayuda opcional, no un requisito obligatorio

## Tasks / Subtasks

- [ ] **Task 1 — Instalar dependencia OpenAI** (AC: 1, 2)
  - [ ] Ejecutar `pnpm add openai --filter @reinder/web`
  - [ ] Verificar que `openai` ≥ 4.0 está en `apps/web/package.json`
  - [ ] Añadir `OPENAI_API_KEY` a `.env.local.example` con comentario descriptivo
  - [ ] NUNCA instalar en `packages/shared` ni en el root — solo en `apps/web` (server-side only)

- [ ] **Task 2 — Servicio de generación IA** (AC: 1, 5, 11)
  - [ ] Crear `apps/web/src/lib/ai/generate-listing-variants.ts`
  - [ ] Implementar función `generateListingVariants(listingData)` que llama a OpenAI
  - [ ] Usar `zodResponseFormat` de `openai/helpers/zod` para Structured Outputs (garantiza schema JSON)
  - [ ] Definir Zod schema de respuesta: `{ variants: [{ label, title, description }] }`
  - [ ] System prompt: copywriting inmobiliario, triggers emocionales, USPs
  - [ ] Configurar timeout de 10 segundos
  - [ ] Crear `apps/web/src/lib/ai/content-safety.ts` con validación de términos prohibidos
  - [ ] Implementar detección de idioma (comparar con original)
  - [ ] Retry 1 vez si todas las variantes son filtradas por seguridad

- [ ] **Task 3 — Tabla `ai_generation_usage` + migración** (AC: 4)
  - [ ] Añadir tabla en `packages/shared/src/db/schema.ts` con patrón Drizzle existente
  - [ ] Crear migración SQL en `supabase/migrations/20260622000002_ai_generation_usage.sql`
  - [ ] Índice `idx_ai_generation_usage_agency_created` para rate limiting queries
  - [ ] RLS: `agency_admin` puede leer sus propios registros, `platform_admin` acceso total
  - [ ] Incluir `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`

- [ ] **Task 4 — Rate limiting por agencia** (AC: 3)
  - [ ] Crear `apps/web/src/lib/ai/rate-limiter.ts`
  - [ ] Query: `SELECT COUNT(*) FROM ai_generation_usage WHERE agency_id = $1 AND created_at > NOW() - INTERVAL '24 hours'`
  - [ ] Constante `MAX_AI_GENERATIONS_PER_DAY = 10` en `packages/shared/src/constants/index.ts`
  - [ ] Si se excede → responder 429 con `Retry-After` header
  - [ ] Registrar uso DESPUÉS de generación exitosa (no penalizar fallos)

- [ ] **Task 5 — API: `POST /api/v1/experiments/generate-variants`** (AC: 2, 3, 5)
  - [ ] Crear `apps/web/src/app/api/v1/experiments/generate-variants/route.ts`
  - [ ] Validar auth (401) y role `agency_admin` (403) — patrón de `agency/listings/[id]/status/route.ts`
  - [ ] Validar body con Zod: `{ listingId: z.string().uuid() }`
  - [ ] Verificar ownership: listing.agency_id === profile.agency_id → 404 si no coincide
  - [ ] Verificar rate limit → 429 si excedido
  - [ ] Verificar `OPENAI_API_KEY` configurada → 503 si no
  - [ ] Llamar a `generateListingVariants()` con datos del listing
  - [ ] Registrar uso en `ai_generation_usage` (post-success)
  - [ ] Catch OpenAI errors → 503 con mensaje amigable
  - [ ] Response: `ApiResponse<{ variants: AiVariant[] }>`

- [ ] **Task 6 — Tipos compartidos para IA** (AC: todos)
  - [ ] Crear `packages/shared/src/types/ai-variant.ts`
  - [ ] Tipos: `AiVariant { label: string; title: string; description: string }`, `AiGenerationUsage`
  - [ ] Exportar desde barrel `packages/shared/src/types/index.ts`

- [ ] **Task 7 — Componente `AiVariantGenerator`** (AC: 6, 7, 8)
  - [ ] Crear `apps/web/src/features/agency/experiments/components/ai-variant-generator.tsx`
  - [ ] Client Component (`"use client"`)
  - [ ] Props: `listingId: string`, `experimentType: ExperimentType`, `onVariantSelect: (variant: VariantContent) => void`
  - [ ] Botón "✨ Generar variantes con IA" — solo visible si tipo ≠ `cover_image`
  - [ ] Estado de carga con spinner (2-10s)
  - [ ] Renderizar 3 variantes como cards seleccionables
  - [ ] Al seleccionar → emitir `onVariantSelect` con el contenido
  - [ ] Manejo de errores: toast para 429, 503 y errores genéricos

- [ ] **Task 8 — Componente `VariantPreview`** (AC: 9)
  - [ ] Crear `apps/web/src/features/agency/experiments/components/variant-preview.tsx`
  - [ ] Preview lado a lado: Original (izquierda) vs Variante B (derecha)
  - [ ] Responsive: stack vertical en mobile
  - [ ] Design tokens del proyecto

- [ ] **Task 9 — Integrar IA en formulario de creación de experimento** (AC: 6, 8, 10, 12)
  - [ ] Modificar `apps/web/src/features/agency/experiments/components/create-experiment-form.tsx` (de Story 9.2)
  - [ ] Añadir soporte para tipos `title`, `description`, `title_and_description` en el selector de tipo
  - [ ] Integrar `AiVariantGenerator` cuando tipo ≠ `cover_image`
  - [ ] Campos editables de título y descripción para Variante B (pre-rellenados por IA o escritos manualmente)
  - [ ] Integrar `VariantPreview` para comparación lado a lado
  - [ ] Actualizar Zod schema de creación para soportar los nuevos tipos

- [ ] **Task 10 — Actualizar Zod schemas** (AC: 10)
  - [ ] Modificar `apps/web/src/features/agency/experiments/lib/experiment-schemas.ts` (de Story 9.2)
  - [ ] Extender `createExperimentSchema` para soportar tipos `title`, `description`, `title_and_description`
  - [ ] Validación condicional: si tipo contiene `title` → `variantB.title` requerido; si contiene `description` → `variantB.description` requerido
  - [ ] Crear `generateVariantsSchema`: `{ listingId: z.string().uuid() }`

- [ ] **Task 11 — Tests** (AC: todos)
  - [ ] T9.6-01: `generate-listing-variants.test.ts` — Mock de OpenAI SDK; verifica que devuelve 3 variantes con schema correcto
  - [ ] T9.6-02: `content-safety.test.ts` — Filtra variantes con términos prohibidos; pasa variantes limpias
  - [ ] T9.6-03: `rate-limiter.test.ts` — Permite hasta 10 generaciones; rechaza la 11ª con 429
  - [ ] T9.6-04: API integration test (mock): `POST /api/v1/experiments/generate-variants` — auth, ownership, rate limit, happy path
  - [ ] T9.6-05: `ai-variant-generator.test.tsx` — Renderiza botón solo para tipos text; muestra spinner durante carga; muestra variantes al recibir respuesta

## Dev Notes

### Dependencia OpenAI — Versión y Setup

```bash
# Instalar SOLO en apps/web (server-side only)
pnpm add openai --filter @reinder/web
```

**SDK `openai` v4+** (actualmente v6.44 en npm). Usa el patrón de Structured Outputs con `zodResponseFormat` para garantizar respuesta JSON válida.

**Variables de entorno necesarias en `apps/web/.env.local`:**
```env
# OpenAI API Key — NUNCA exponer al cliente
OPENAI_API_KEY=sk-...
```

### Implementación de Referencia — Servicio de Generación

```typescript
// apps/web/src/lib/ai/generate-listing-variants.ts
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';

const AiVariantSchema = z.object({
  variants: z.array(z.object({
    label: z.string(),
    title: z.string(),
    description: z.string(),
  })).length(3),
});

export type ListingInput = {
  title: string;
  description: string | null;
  bedrooms: number | null;
  sizeSqm: string | null; // numeric from DB comes as string
  city: string | null;
  price: string | null;   // numeric from DB comes as string
};

export async function generateListingVariants(listing: ListingInput) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new AiServiceError('AI_NOT_CONFIGURED', 'Generación de variantes no disponible.');
  }

  const openai = new OpenAI({ apiKey, timeout: 10_000 });

  const hasDescription = !!listing.description;

  const systemPrompt = `Eres un copywriter inmobiliario experto en el mercado español.
Tu tarea es generar 3 variantes alternativas de ${hasDescription ? 'título y descripción' : 'título'} para un listing inmobiliario.

REGLAS:
- Título: máximo 120 caracteres. Atractivo, específico, diferenciador.
- Descripción: máximo 500 caracteres. Enfocada en beneficios, no solo features.
- Mismo idioma que el original (detectar automáticamente).
- NO usar claims legales ("garantizado", "mejor precio", "sin vicios ocultos").
- NO inventar datos que no estén en el listing original.
- Cada variante debe tener un estilo diferente:
  1. "Emocional" — apela a sentimientos, lifestyle, aspiraciones
  2. "Factual" — datos concretos, metrajes, ubicación, eficiencia
  3. "Premium" — tono exclusivo, luxury copywriting, escasez

Responde SOLO con el JSON estructurado.`;

  const userPrompt = `Listing original:
- Título: ${listing.title}
${hasDescription ? `- Descripción: ${listing.description}` : ''}
- Dormitorios: ${listing.bedrooms ?? 'No especificado'}
- Superficie: ${listing.sizeSqm ? `${listing.sizeSqm} m²` : 'No especificada'}
- Ciudad: ${listing.city ?? 'No especificada'}
- Precio: ${listing.price ? `€${Number(listing.price).toLocaleString('es-ES')}` : 'No especificado'}

Genera 3 variantes alternativas.`;

  const completion = await openai.beta.chat.completions.parse({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: zodResponseFormat(AiVariantSchema, 'listing_variants'),
    temperature: 0.8,
    max_tokens: 2000,
  });

  const parsed = completion.choices[0].message.parsed;
  if (!parsed) {
    throw new AiServiceError('AI_PARSE_ERROR', 'No se pudo parsear la respuesta de la IA.');
  }

  return {
    variants: parsed.variants,
    usage: {
      promptTokens: completion.usage?.prompt_tokens ?? 0,
      completionTokens: completion.usage?.completion_tokens ?? 0,
      model: 'gpt-4o',
    },
  };
}

export class AiServiceError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'AiServiceError';
  }
}
```

### Content Safety — Implementación de Referencia

```typescript
// apps/web/src/lib/ai/content-safety.ts

const PROHIBITED_TERMS_ES = [
  // Claims legales
  'garantizado', 'sin vicios', 'mejor precio del mercado',
  'rentabilidad asegurada', 'inversión segura',
  // Discriminación
  'solo para', 'no se admiten', 'preferentemente',
];

const PROHIBITED_TERMS_EN = [
  'guaranteed', 'no defects', 'best price',
  'assured return', 'safe investment',
];

const ALL_PROHIBITED = [...PROHIBITED_TERMS_ES, ...PROHIBITED_TERMS_EN];

export interface AiVariant {
  label: string;
  title: string;
  description: string;
}

export function filterUnsafeVariants(
  variants: AiVariant[],
  originalLang: 'es' | 'en' = 'es'
): AiVariant[] {
  return variants.filter((v) => {
    const text = `${v.title} ${v.description}`.toLowerCase();
    return !ALL_PROHIBITED.some((term) => text.includes(term.toLowerCase()));
  });
}

/**
 * Detecta idioma dominante del texto (heurístico simple basado en stop words).
 * Para MVP — no instalar librería de NLP, solo check básico.
 */
export function detectLanguage(text: string): 'es' | 'en' | 'unknown' {
  const lower = text.toLowerCase();
  const esWords = ['de', 'en', 'con', 'los', 'las', 'del', 'una', 'para', 'por', 'que'];
  const enWords = ['the', 'and', 'with', 'for', 'this', 'from', 'has', 'are', 'you'];
  const esCount = esWords.filter((w) => lower.includes(` ${w} `)).length;
  const enCount = enWords.filter((w) => lower.includes(` ${w} `)).length;
  if (esCount > enCount) return 'es';
  if (enCount > esCount) return 'en';
  return 'unknown';
}
```

### Rate Limiter — Implementación de Referencia

```typescript
// apps/web/src/lib/ai/rate-limiter.ts
import { db } from '@/lib/supabase/db';
import { aiGenerationUsage } from '@reinder/shared/db/schema';
import { eq, and, gte, count } from 'drizzle-orm';

const MAX_AI_GENERATIONS_PER_DAY = 10;

export async function checkRateLimit(agencyId: string): Promise<{
  allowed: boolean;
  remaining: number;
  retryAfterSeconds?: number;
}> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [result] = await db
    .select({ total: count() })
    .from(aiGenerationUsage)
    .where(
      and(
        eq(aiGenerationUsage.agencyId, agencyId),
        gte(aiGenerationUsage.createdAt, twentyFourHoursAgo)
      )
    );

  const used = result?.total ?? 0;
  const remaining = Math.max(0, MAX_AI_GENERATIONS_PER_DAY - used);

  if (remaining === 0) {
    // Calcular tiempo hasta el primer registro que expira
    // Simplificado: retry en 1 hora
    return { allowed: false, remaining: 0, retryAfterSeconds: 3600 };
  }

  return { allowed: true, remaining };
}

export async function recordUsage(params: {
  agencyId: string;
  listingId: string;
  userId: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
}) {
  await db.insert(aiGenerationUsage).values({
    agencyId: params.agencyId,
    listingId: params.listingId,
    userId: params.userId,
    model: params.model,
    promptTokens: params.promptTokens,
    completionTokens: params.completionTokens,
  });
}
```

### Patrón de Auth en Route Handler (copiar de Story 5.4)

```typescript
// apps/web/src/app/api/v1/experiments/generate-variants/route.ts
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    );
  }

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

  // ... resto de la lógica
}
```

### Drizzle Schema — Tabla `ai_generation_usage`

```typescript
// Añadir en packages/shared/src/db/schema.ts
export const aiGenerationUsage = pgTable(
  'ai_generation_usage',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agencyId: uuid('agency_id')
      .notNull()
      .references(() => agencies.id),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => listings.id),
    userId: uuid('user_id').notNull(),
    model: text('model').notNull(),
    promptTokens: integer('prompt_tokens').notNull().default(0),
    completionTokens: integer('completion_tokens').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxAiGenerationUsageAgencyCreated: index('idx_ai_generation_usage_agency_created')
      .on(table.agencyId, table.createdAt),
  })
);
```

### Migración SQL

```sql
-- supabase/migrations/20260622000002_ai_generation_usage.sql

CREATE TABLE IF NOT EXISTS ai_generation_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id),
  listing_id UUID NOT NULL REFERENCES listings(id),
  user_id UUID NOT NULL,
  model TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_generation_usage_agency_created
  ON ai_generation_usage (agency_id, created_at);

ALTER TABLE ai_generation_usage ENABLE ROW LEVEL SECURITY;

-- agency_admin puede leer sus propios registros de uso
CREATE POLICY "agency_admin_can_read_own_ai_usage"
  ON ai_generation_usage
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

-- INSERT via service_role (desde el API endpoint server-side)
-- Las inserciones usan el Drizzle admin client (service_role), no el user client.
CREATE POLICY "service_role_can_insert_ai_usage"
  ON ai_generation_usage
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- platform_admin acceso total
CREATE POLICY "platform_admin_full_access_ai_usage"
  ON ai_generation_usage
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'platform_admin'
    )
  );
```

### Listing Schema — Campos Usados como Input para la IA

```typescript
// Desde packages/shared/src/db/schema.ts
// Campos del listing que alimentan el prompt:
{
  title: text("title").notNull(),             // ← siempre presente
  description: text("description"),            // ← nullable, adaptar prompt
  bedrooms: integer("bedrooms"),               // ← nullable
  sizeSqm: numeric("size_sqm", { precision: 10, scale: 2 }), // ← nullable, viene como string
  city: text("city"),                          // ← nullable
  price: numeric("price", { precision: 15, scale: 2 }),       // ← nullable, viene como string
}
```

### Variant Content JSONB Schema (de Story 9.1)

```typescript
// variant_a y variant_b en listing_experiments
type VariantContent = {
  coverImageUrl?: string;
  coverImageIndex?: number;
  title?: string;       // ← usado en esta story
  description?: string; // ← usado en esta story
};
```

Para experimentos de tipo `title`, `description`, o `title_and_description`:
- `variant_a`: auto-poblado por `POST /api/v1/experiments` con `{ title: listing.title, description: listing.description }`
- `variant_b`: contenido seleccionado/editado por la agencia (generado por IA o escrito manualmente)

### Design Tokens — Componentes de esta Story

| Token | Valor | Uso |
|-------|-------|-----|
| bgPrimary | #0D0D0D | Fondo de páginas |
| accentPrimary | #FF6B00 | Botón "Generar con IA", bordes de variante seleccionada |
| textPrimary | #F5F0E8 | Texto principal |
| surface | #1E1A15 | Cards de variantes, paneles de preview |
| border | #2E2820 | Bordes de cards |
| textMuted | #9E9080 | Labels, texto secundario |
| accentSecondary | #4A90D9 | Badge "IA" en variantes, highlight de selección |
| radii.card | 24px | Cards de variantes |
| radii.button | 12px | Botón generar |

### Componente `AiVariantGenerator` — Referencia de Estructura

```tsx
// apps/web/src/features/agency/experiments/components/ai-variant-generator.tsx
'use client';
import { useState } from 'react';
import type { AiVariant } from '@reinder/shared/types';

interface AiVariantGeneratorProps {
  listingId: string;
  experimentType: 'title' | 'description' | 'title_and_description';
  onVariantSelect: (variant: { title?: string; description?: string }) => void;
}

export function AiVariantGenerator({ listingId, experimentType, onVariantSelect }: AiVariantGeneratorProps) {
  const [variants, setVariants] = useState<AiVariant[] | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/experiments/generate-variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message || 'Error al generar variantes');
        return;
      }
      setVariants(json.data.variants);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (index: number) => {
    setSelectedIndex(index);
    if (variants) {
      const v = variants[index];
      onVariantSelect({
        title: experimentType !== 'description' ? v.title : undefined,
        description: experimentType !== 'title' ? v.description : undefined,
      });
    }
  };

  // Render: botón → loading → cards de variantes
}
```

### Toast Notifications

El proyecto usa `ToastHandler` basado en query params (ver `apps/web/src/components/layout/ToastHandler.tsx`). Para toasts in-page (sin redirect), usar un estado local con el mismo estilo visual:

```typescript
// Inline toast estilo Reinder (reusar estilos de ToastHandler)
const toastStyle = {
  background: 'rgba(30, 25, 20, 0.95)',
  border: '1px solid rgba(255,107,0,0.3)',
  borderRadius: '12px',
  padding: '12px 20px',
  color: '#F5F0E8',
  fontSize: '14px',
  fontWeight: 500,
  backdropFilter: 'blur(12px)',
};
```

### Project Structure Notes

```
apps/web/
├── src/
│   ├── app/api/v1/experiments/
│   │   ├── route.ts                          ← EXISTING (POST + GET de Story 9.1/9.2)
│   │   ├── [id]/route.ts                     ← EXISTING (GET detalle + PATCH de Story 9.2)
│   │   ├── assignment/route.ts               ← EXISTING (GET de Story 9.1)
│   │   └── generate-variants/
│   │       └── route.ts                      ← NEW (POST — generación IA)
│   ├── lib/ai/
│   │   ├── generate-listing-variants.ts      ← NEW (servicio OpenAI)
│   │   ├── generate-listing-variants.test.ts ← NEW
│   │   ├── content-safety.ts                 ← NEW (filtro de contenido)
│   │   ├── content-safety.test.ts            ← NEW
│   │   ├── rate-limiter.ts                   ← NEW (rate limiting)
│   │   └── rate-limiter.test.ts              ← NEW
│   └── features/agency/experiments/
│       ├── components/
│       │   ├── create-experiment-form.tsx     ← MODIFY (añadir soporte IA)
│       │   ├── ai-variant-generator.tsx       ← NEW
│       │   ├── ai-variant-generator.test.tsx  ← NEW
│       │   ├── variant-preview.tsx            ← NEW
│       │   ├── experiment-list.tsx            ← EXISTING
│       │   ├── experiment-status-badge.tsx    ← EXISTING
│       │   ├── image-variant-picker.tsx       ← EXISTING (solo para cover_image)
│       │   └── experiment-controls.tsx        ← EXISTING
│       └── lib/
│           └── experiment-schemas.ts          ← MODIFY (extender para tipos text)

packages/shared/src/
├── db/schema.ts                              ← MODIFY (añadir tabla ai_generation_usage)
├── types/
│   ├── ai-variant.ts                         ← NEW
│   └── index.ts                              ← MODIFY (re-export)
└── constants/index.ts                        ← MODIFY (añadir MAX_AI_GENERATIONS_PER_DAY)

supabase/migrations/
└── 20260622000002_ai_generation_usage.sql    ← NEW
```

### Guardrails para el Dev Agent

1. **NUNCA exponer `OPENAI_API_KEY` al cliente.** La generación SOLO ocurre en el Route Handler (servidor). El componente React hace `fetch` al endpoint. No importar `openai` en Client Components.

2. **USAR `zodResponseFormat` de `openai/helpers/zod`** para Structured Outputs. NO usar "JSON mode" básico (`response_format: { type: 'json_object' }`). Structured Outputs garantiza que la respuesta cumple el schema exacto. Si el modelo es `gpt-4o-mini`, también soporta Structured Outputs.

3. **INSTALAR `openai` SOLO en `apps/web`** (`--filter @reinder/web`). No en `packages/shared` ni en root. El SDK tiene dependencias de Node.js y no debe llegar al bundle del cliente ni al mobile.

4. **NO usar streaming** para este caso. La generación devuelve un JSON estructurado completo. Streaming es para texto largo token-by-token. Aquí solo son 3 variantes cortas — respuesta completa en ≤10s.

5. **NO crear un modelo de OpenAI como singleton global.** Instanciar `new OpenAI({ apiKey, timeout })` en cada invocación del servicio. Next.js Route Handlers son serverless — no hay estado global persistente.

6. **REUSAR el patrón de auth de Story 5.4** (`agency/listings/[id]/status/route.ts`): `createClient()` → `getUser()` → verificar `user_profiles.role` y `agency_id`. No inventar un nuevo mecanismo de auth.

7. **El campo `price` y `sizeSqm` del listing vienen como `string` desde Drizzle** (son `numeric` en PostgreSQL). Convertir a `Number()` antes de formatear para el prompt.

8. **NO usar `LangChain` ni `Vercel AI SDK`** para esta story. Son overkill para una llamada directa a OpenAI con Structured Outputs. Usar el SDK `openai` directamente.

9. **Rate limiting: registrar uso SOLO tras éxito.** Si la generación falla (OpenAI error, timeout, content safety), NO incrementar el contador. La agencia no debe ser penalizada por fallos del servicio.

10. **La UI de generación IA es OPCIONAL.** El formulario de creación de experimento debe seguir funcionando sin IA — el usuario puede escribir la Variante B manualmente para tipos `title`/`description`. El botón "Generar con IA" es una ayuda, no un gateway obligatorio.

11. **SEGUIR `ApiResponse<T>` en el endpoint.** Devolver siempre `{ data, error }`. Nunca respuesta directa sin wrapper.

12. **La tabla `ai_generation_usage` NO necesita ON DELETE CASCADE.** Si un listing o agencia se elimina, el historial de uso debe permanecer para auditoría de billing.

13. **El sistema de toast del proyecto es basado en query params** (redirect-based). Para errores in-page del generador IA, usar un estado local con el mismo estilo visual. No intentar extender el `ToastHandler` global para errores síncronos.

14. **Tests del servicio IA: mockear el SDK de OpenAI.** No hacer llamadas reales a la API en tests. Usar `vi.mock('openai')` para mockear el constructor y devolver respuestas predefinidas.

### Aprendizajes de Stories Anteriores

- **Story 9.1** definió el schema, enums (`experimentTypeEnum`: `cover_image`, `title`, `description`, `title_and_description`), tipos `VariantContent`, y la API base. El tipo `title_and_description` ya está contemplado en el enum pero Story 9.2 solo implementó `cover_image` en la UI. Esta story extiende la UI para soportar los tipos de texto.
- **Story 9.2** creó la UI de creación con `CreateExperimentForm`, `ImageVariantPicker` (solo para `cover_image`), y los Zod schemas de creación. El formulario actual fija `experimentType: 'cover_image'` — hay que hacer el selector de tipo dinámico y añadir el flujo de IA para tipos text.
- **Story 5.4** estableció el patrón canónico de auth en Route Handlers con Supabase + user_profiles lookup. Es el patrón a copiar exactamente.
- **Story 8.1** usó fire-and-forget para escrituras no críticas. El registro de `ai_generation_usage` puede seguir este patrón si se quiere optimizar el response time, pero es más seguro hacer `await` para garantizar el registro de billing.
- Las migraciones SQL usan `IF NOT EXISTS` para idempotencia — seguir este patrón.
- El proyecto usa `vitest` como test runner (v4.1, config en `apps/web/vitest.config.ts`).

### API Endpoints Resumen

| Método | Ruta | Descripción | Story |
|--------|------|-------------|-------|
| POST | `/api/v1/experiments` | Crear experimento | 9.1 |
| GET | `/api/v1/experiments` | Listar experimentos | 9.2 |
| GET | `/api/v1/experiments/[id]` | Detalle experimento | 9.2 |
| PATCH | `/api/v1/experiments/[id]` | Cambiar estado | 9.2 |
| GET | `/api/v1/experiments/assignment` | Obtener variante (buyer) | 9.1 |
| **POST** | **`/api/v1/experiments/generate-variants`** | **Generar variantes IA** | **9.6 (nuevo)** |

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 9 — FR-E9-6]
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication & Security]
- [Source: _bmad-output/implementation-artifacts/9-1-schema-experimentos-motor-asignacion-variantes.md]
- [Source: _bmad-output/implementation-artifacts/9-2-ui-creacion-experimento-agencias-portada-ab.md]
- [Source: packages/shared/src/db/schema.ts — tabla listings con campos title, description, bedrooms, sizeSqm, city, price]
- [Source: packages/shared/src/types/api.ts — ApiResponse<T>]
- [Source: apps/web/src/app/api/v1/agency/listings/[id]/status/route.ts — patrón auth PATCH]
- [Source: apps/web/src/components/layout/ToastHandler.tsx — sistema de toast]
- [Source: OpenAI Structured Outputs — https://platform.openai.com/docs/guides/structured-outputs]
- [Source: openai npm v6.44 — zodResponseFormat helper]

## Dev Agent Record

### Agent Model Used

(to be filled by dev agent)

### Debug Log References

### Completion Notes List

### File List
