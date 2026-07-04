# Story 9.2: UI de Creación de Experimento para Agencias (Portada A/B)

Status: ready-for-dev

## Story

Como administrador de agencia inmobiliaria en Reinder,
quiero poder crear y gestionar experimentos A/B de portada para mis listings desde una interfaz web,
para que pueda probar distintas fotos de portada y descubrir cuál genera más engagement entre compradores.

## Contexto del Epic

**Epic 9 — Content Optimization & A/B Testing:** Las agencias experimentan con contenido (portada, título, descripción) y Reinder optimiza automáticamente el rendimiento de los listings.

**FRs cubiertos por esta story:** FR-E9-1 (parcial — UI de creación), FR-E9-2 (parcial — disparar asignación)
**NFRs aplicados:** NFR8 (agencias nunca ven asignaciones individuales de compradores en la UI)

**Posición en el epic:** Story 9.2 es la **primera UI** del sistema de experimentos. Depende de Story 9.1 (schema + motor de asignación + API endpoints). Stories 9.3–9.6 dependen de esta UI para operar.

**Dependencia directa:** Story 9.1 debe estar implementada — provee:
- Tablas: `listing_experiments`, `experiment_assignments`, `experiment_results`
- Enums: `experimentStatusEnum` (`draft`, `running`, `paused`, `completed`, `cancelled`), `experimentTypeEnum` (`cover_image`, `title`, `description`, `title_and_description`)
- API: `POST /api/v1/experiments` (crear experimento), `GET /api/v1/experiments/assignment` (obtener variante)
- Motor de asignación: `assignVariant()` en `packages/shared/src/experiments/assign-variant.ts`
- Tipos: `Experiment`, `ExperimentStatus`, `ExperimentType`, `VariantContent` en `packages/shared/src/types/experiment.ts`

## Acceptance Criteria (BDD)

### AC1 — Página de lista de experimentos de agencia
**Given** un usuario autenticado con rol `agency_admin`
**When** navega a `/agency/experiments`
**Then** ve una página con título "Experimentos A/B" y la lista de experimentos de su agencia
**And** cada experimento muestra: nombre, listing asociado (título + imagen miniatura), tipo de experimento, status (badge con color), fecha de creación
**And** los experimentos se ordenan por fecha de creación descendente (más recientes primero)
**And** si no hay experimentos, se muestra un empty state con CTA "Crear primer experimento"

**Given** un usuario con rol diferente a `agency_admin` (buyer, agent, platform_admin)
**When** intenta acceder a `/agency/experiments`
**Then** es redirigido a su ruta por defecto (`/swipe` para buyer, `/agent` para agent, `/admin` para platform_admin)

### AC2 — Filtro por status en lista de experimentos
**Given** la página de lista de experimentos cargada
**When** el usuario selecciona un filtro de status (todos | draft | running | paused | completed | cancelled)
**Then** la lista se filtra mostrando solo los experimentos con ese status
**And** el filtro "todos" está seleccionado por defecto
**And** cada badge de status usa colores semánticos:
  - `draft`: gris (#9E9080)
  - `running`: verde (#4CAF50)
  - `paused`: amarillo (#FF8C00)
  - `completed`: azul (#4A90D9)
  - `cancelled`: rojo (#8B3A3A)

### AC3 — Formulario de creación de experimento
**Given** un `agency_admin` en la página de lista de experimentos
**When** hace click en "Crear Experimento"
**Then** se abre un formulario (nueva página o modal) con los campos:
  - **Listing:** selector dropdown que muestra solo listings `active` de su agencia (título + dirección)
  - **Nombre del experimento:** input de texto (obligatorio, 3–100 caracteres)
  - **Tipo de experimento:** selector con valor fijo `cover_image` (Portada A/B) — en MVP solo se permite este tipo
  - **Variante B — Foto de portada:** selector visual de imágenes del listing seleccionado

**Given** el formulario abierto sin listing seleccionado
**When** el usuario no ha elegido un listing
**Then** el selector de imágenes para Variante B está deshabilitado con texto "Selecciona un listing primero"

### AC4 — Selector visual de imagen de portada (Variante B)
**Given** un listing seleccionado en el formulario de creación
**When** el sistema carga las imágenes del listing
**Then** muestra una grilla de thumbnails con todas las imágenes del listing (`listing.images` array)
**And** la imagen actual de portada (índice 0) está marcada como "Portada actual (Variante A)" con borde naranja y no es seleccionable como Variante B
**And** las demás imágenes son seleccionables como Variante B con click
**And** la imagen seleccionada como Variante B muestra borde azul (#4A90D9) y label "Variante B"

**Given** un listing que solo tiene 1 imagen
**When** se selecciona ese listing
**Then** se muestra un mensaje de advertencia: "Este listing solo tiene una imagen. Necesitas al menos 2 imágenes para crear un experimento de portada."
**And** el botón de crear queda deshabilitado

### AC5 — Envío del formulario de creación
**Given** el formulario completo con listing, nombre y Variante B seleccionados
**When** el usuario hace click en "Crear Experimento"
**Then** se hace `POST /api/v1/experiments` con body:
```json
{
  "listingId": "uuid-del-listing",
  "name": "Nombre del experimento",
  "experimentType": "cover_image",
  "variantB": {
    "coverImageUrl": "url-de-imagen-seleccionada",
    "coverImageIndex": 3
  }
}
```
**And** mientras se envía, el botón muestra spinner y texto "Creando..." (estado `isSubmitting`)
**And** al recibir 201, se redirige a la página de detalle del experimento recién creado
**And** se muestra toast de éxito: "Experimento creado en borrador"

**Given** el POST devuelve error 409 (EXPERIMENT_ALREADY_EXISTS)
**When** ya existe un experimento activo para ese listing
**Then** se muestra toast de error: "Este listing ya tiene un experimento activo"
**And** el formulario permanece abierto para que el usuario corrija

**Given** el POST devuelve error 403
**When** el usuario no tiene permisos
**Then** se muestra toast de error: "No tienes permisos para crear experimentos"

### AC6 — Página de detalle del experimento
**Given** un `agency_admin` que navega a `/agency/experiments/[id]`
**When** el experimento existe y pertenece a su agencia
**Then** ve una página con:
  - Header: nombre del experimento + badge de status
  - Sección "Configuración": listing asociado (con link al listing), tipo de experimento
  - Sección "Variantes": lado a lado, Variante A (portada actual) y Variante B (portada alternativa) con las imágenes en tamaño mediano
  - Sección "Métricas" (placeholder): texto "Las métricas estarán disponibles cuando el experimento esté en ejecución" si status es `draft`
  - Sección "Controles": botones de acción según el status actual

**Given** un experimento que no existe o no pertenece a la agencia del usuario
**When** se intenta acceder a `/agency/experiments/[non-existent-id]`
**Then** se muestra página 404 o se redirige a `/agency/experiments`

### AC7 — Controles de estado del experimento
**Given** un experimento en estado `draft`
**When** el usuario ve los controles
**Then** se muestran los botones: "▶ Iniciar Experimento" (primario, naranja) y "🗑 Eliminar Borrador" (secundario, rojo)

**Given** un experimento en estado `draft`
**When** el usuario hace click en "Iniciar Experimento"
**Then** se ejecuta `PATCH /api/v1/experiments/[id]` con `{ status: "running" }`
**And** el badge cambia a `running` (verde)
**And** se muestra toast: "Experimento iniciado — los compradores ahora verán las variantes"

**Given** un experimento en estado `running`
**When** el usuario ve los controles
**Then** se muestran los botones: "⏸ Pausar" (secundario) y "⏹ Detener" (secundario, rojo)

**Given** un experimento en estado `running`
**When** el usuario hace click en "Pausar"
**Then** se ejecuta `PATCH /api/v1/experiments/[id]` con `{ status: "paused" }`
**And** el badge cambia a `paused` (amarillo)

**Given** un experimento en estado `paused`
**When** el usuario ve los controles
**Then** se muestran los botones: "▶ Reanudar" (primario) y "⏹ Detener" (secundario, rojo)

**Given** un experimento en estado `completed` o `cancelled`
**When** el usuario ve los controles
**Then** no se muestran botones de acción (solo lectura)

### AC8 — API: `PATCH /api/v1/experiments/[id]` (transiciones de estado)
**Given** un `agency_admin` autenticado que es dueño del experimento
**When** envía `PATCH /api/v1/experiments/[id]` con `{ status: "running" }` y el estado actual es `draft` o `paused`
**Then** responde 200 con `{ data: { experiment }, error: null }`
**And** si es la primera vez que pasa a `running`, se establece `started_at` = now()

**Given** una transición de estado inválida (ej: `completed` → `running`)
**When** se intenta cambiar el estado
**Then** responde 400 con `{ data: null, error: { code: "INVALID_TRANSITION", message: "..." } }`

**Given** las transiciones de estado permitidas:
  - `draft` → `running` (iniciar)
  - `draft` → `cancelled` (eliminar borrador)
  - `running` → `paused` (pausar)
  - `running` → `cancelled` (detener)
  - `paused` → `running` (reanudar)
  - `paused` → `cancelled` (detener)

**Given** un usuario que no es el `agency_admin` dueño del experimento
**When** intenta hacer PATCH
**Then** responde 403

### AC9 — API: `GET /api/v1/experiments` (lista de experimentos)
**Given** un `agency_admin` autenticado
**When** hace `GET /api/v1/experiments?status=running` (o sin filtro para todos)
**Then** responde 200 con `{ data: { experiments: [...] }, error: null }`
**And** solo devuelve experimentos de la agencia del usuario (filtrado por `agency_id`)
**And** cada experimento incluye los datos del listing asociado (título, primera imagen como thumbnail)
**And** ordena por `created_at DESC`

**Given** un usuario con rol `buyer` o `agent`
**When** intenta hacer GET a `/api/v1/experiments`
**Then** responde 403

### AC10 — API: `GET /api/v1/experiments/[id]` (detalle de experimento)
**Given** un `agency_admin` autenticado
**When** hace `GET /api/v1/experiments/[id]` para un experimento de su agencia
**Then** responde 200 con `{ data: { experiment, listing }, error: null }`
**And** incluye el experimento completo + datos del listing (título, imágenes, dirección)
**And** incluye `experiment_results` (métricas agregadas de variante a y b) — si existen

**Given** un experimento que no pertenece a la agencia del usuario
**When** intenta consultar el detalle
**Then** responde 404

### AC11 — Navegación y layout
**Given** un `agency_admin` autenticado
**When** está en cualquier página del área de agencia
**Then** el menú/sidebar de agencia incluye el item "Experimentos A/B" con link a `/agency/experiments`
**And** el item muestra un badge numérico si hay experimentos `running` (count de running experiments)

### AC12 — Responsive y design tokens
**Given** la UI de experimentos renderizada
**When** se visualiza en cualquier viewport (desktop, tablet, móvil)
**Then** todos los componentes usan los design tokens del proyecto:
  - Background: `#0D0D0D` (bgPrimary)
  - Accent: `#FF6B00` (accentPrimary) para CTAs principales
  - Text: `#F5F0E8` (textPrimary)
  - Surface: `#1E1A15` para cards y paneles
  - Border: `#2E2820`
  - Muted text: `#9E9080`
  - Font display: Clash Display para headings
  - Font body: Inter para texto
  - Border radius card: 24px
  - Border radius button: 12px

## Tasks / Subtasks

- [ ] **Task 1 — API: GET /api/v1/experiments (lista)** (AC: 9)
  - [ ] Crear `apps/web/src/app/api/v1/experiments/route.ts` — handler GET
  - [ ] Validar auth (401) y role agency_admin (403) — misma lógica que `PATCH /api/v1/agency/listings/[id]/status/route.ts`
  - [ ] Query Drizzle: SELECT de `listing_experiments` WHERE `agency_id` = agencia del usuario, con JOIN a `listings` para título e imagen
  - [ ] Soporte filtro opcional por status via query param `?status=running`
  - [ ] Orden: `created_at DESC`
  - [ ] Response: `ApiResponse<{ experiments: ExperimentListItem[] }>`
  - [ ] NOTA: El handler POST ya existe en Story 9.1 en este mismo `route.ts` — verificar si coexisten o si Story 9.1 creó un archivo separado. Si existe el POST, agregar el GET en el mismo archivo.

- [ ] **Task 2 — API: GET /api/v1/experiments/[id] (detalle)** (AC: 10)
  - [ ] Crear `apps/web/src/app/api/v1/experiments/[id]/route.ts`
  - [ ] Validar auth (401) y role agency_admin (403)
  - [ ] Query: JOIN `listing_experiments` + `listings` + `experiment_results`
  - [ ] Verificar ownership via `agency_id`
  - [ ] Response: `ApiResponse<{ experiment: Experiment; listing: ListingSummary; results: ExperimentResult[] }>`

- [ ] **Task 3 — API: PATCH /api/v1/experiments/[id] (transiciones de estado)** (AC: 8)
  - [ ] Añadir handler PATCH en `apps/web/src/app/api/v1/experiments/[id]/route.ts`
  - [ ] Validar auth + ownership
  - [ ] Validar body con Zod: `{ status: z.enum(['running', 'paused', 'cancelled']) }`
  - [ ] Implementar máquina de estados de transiciones permitidas (ver AC8)
  - [ ] Si transición a `running` por primera vez → set `started_at = new Date()`
  - [ ] Si transición a `cancelled` → set `completed_at = new Date()`
  - [ ] Response: `ApiResponse<{ experiment: Experiment }>`

- [ ] **Task 4 — Tipos compartidos para UI** (AC: todos)
  - [ ] Crear `packages/shared/src/types/experiment-ui.ts` (o extender `experiment.ts` de Story 9.1)
  - [ ] Tipos: `ExperimentListItem` (para lista), `ExperimentDetail` (para página detalle), `ExperimentStatusTransition`
  - [ ] Exportar desde barrel `packages/shared/src/types/index.ts`
  - [ ] IMPORTANTE: Reusar los tipos de Story 9.1 (`Experiment`, `ExperimentStatus`, etc.) — no duplicar

- [ ] **Task 5 — Página de lista de experimentos** (AC: 1, 2, 11)
  - [ ] Crear `apps/web/src/app/(protected)/agency/experiments/page.tsx`
  - [ ] Server Component con guard de rol `agency_admin` (patrón de `agency/listings/page.tsx`)
  - [ ] Fetch de `GET /api/v1/experiments` con server-side supabase client
  - [ ] Componente `ExperimentList` en `apps/web/src/features/agency/experiments/components/experiment-list.tsx`
  - [ ] Componente `ExperimentStatusBadge` en `apps/web/src/features/agency/experiments/components/experiment-status-badge.tsx`
  - [ ] Filtro por status: client component con tabs o pills
  - [ ] Empty state con ilustración y CTA

- [ ] **Task 6 — Formulario de creación de experimento** (AC: 3, 4, 5)
  - [ ] Crear `apps/web/src/app/(protected)/agency/experiments/new/page.tsx` — página nueva (no modal)
  - [ ] Componente `CreateExperimentForm` en `apps/web/src/features/agency/experiments/components/create-experiment-form.tsx`
  - [ ] Client component ("use client") para interactividad del formulario
  - [ ] Selector de listing: dropdown con `GET /api/v1/agency/listings?status=active` (o query directo a DB si server component)
  - [ ] Selector visual de imagen: componente `ImageVariantPicker` en `apps/web/src/features/agency/experiments/components/image-variant-picker.tsx`
  - [ ] Validación Zod client-side antes de submit
  - [ ] Handler de submit con fetch a `POST /api/v1/experiments`
  - [ ] Manejo de estados: isSubmitting, error toast, success redirect

- [ ] **Task 7 — Página de detalle del experimento** (AC: 6, 7)
  - [ ] Crear `apps/web/src/app/(protected)/agency/experiments/[id]/page.tsx`
  - [ ] Server Component con guard de rol
  - [ ] Componente `ExperimentDetail` en `apps/web/src/features/agency/experiments/components/experiment-detail.tsx`
  - [ ] Componente `VariantComparison` en `apps/web/src/features/agency/experiments/components/variant-comparison.tsx`
  - [ ] Componente `ExperimentControls` en `apps/web/src/features/agency/experiments/components/experiment-controls.tsx` — client component
  - [ ] Sección de métricas placeholder (se implementa en Story 9.3)

- [ ] **Task 8 — API auxiliar: GET listings activos de la agencia** (AC: 3)
  - [ ] Verificar si `GET /api/v1/agency/listings` ya existe con filtro de status active
  - [ ] Si no existe, crear endpoint o query server-side para obtener listings activos de la agencia (para el dropdown del formulario de creación)
  - [ ] Solo necesita: `id`, `title`, `address`, `images` (para thumbnails), `status`

- [ ] **Task 9 — Navegación de agencia (sidebar/header)** (AC: 11)
  - [ ] Actualizar el layout de agencia para incluir link a "Experimentos A/B" en la navegación
  - [ ] Buscar el layout existente en `apps/web/src/app/(protected)/agency/layout.tsx` o equivalente
  - [ ] Si no existe layout compartido de agencia, crear uno básico
  - [ ] Badge numérico con count de experimentos running (query ligero)

- [ ] **Task 10 — Tests** (AC: todos)
  - [ ] Test de API GET /api/v1/experiments: T9.2-01 — responde 403 para buyer, T9.2-02 — responde lista filtrada por agency_id
  - [ ] Test de API PATCH /api/v1/experiments/[id]: T9.2-03 — transición válida draft→running, T9.2-04 — transición inválida completed→running retorna 400
  - [ ] Test de componente `ExperimentStatusBadge`: T9.2-05 — renderiza badge correcto por status
  - [ ] Test de componente `ImageVariantPicker`: T9.2-06 — marca imagen actual como no seleccionable, T9.2-07 — emite evento onSelect al click

## Dev Notes

### Máquina de Estados de Experimento

```
draft ──→ running ──→ paused ──→ running (ciclo)
  │          │           │
  │          │           └──→ cancelled
  │          └──→ cancelled
  └──→ cancelled

completed ← (set externamente por Story 9.4 — auto-promoción)
```

Implementar como mapa de transiciones:

```typescript
const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['running', 'cancelled'],
  running: ['paused', 'cancelled'],
  paused: ['running', 'cancelled'],
  // completed y cancelled son estados terminales — sin transiciones
};
```

### Patrón de Auth en Route Handlers (copiar de Story 5.4)

```typescript
// apps/web/src/app/api/v1/experiments/[id]/route.ts
import { createClient } from '@/lib/supabase/server';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
  // ... resto de la lógica
}
```

### Patrón de Server Component con Guard de Rol (copiar de agency/listings/page.tsx)

```typescript
// apps/web/src/app/(protected)/agency/experiments/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/supabase/db";
import { userProfiles } from "@reinder/shared/db/schema";
import { eq } from "drizzle-orm";

export default async function ExperimentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profile] = await db
    .select({ role: userProfiles.role })
    .from(userProfiles)
    .where(eq(userProfiles.id, user.id))
    .limit(1);

  if (!profile || profile.role !== "agency_admin") redirect("/swipe");

  // Fetch experiments...
}
```

### Design Tokens — Referencia Rápida

```typescript
// Importar desde @reinder/shared/design-tokens
import { colors, typography, radii } from '@reinder/shared/design-tokens';

// O usar las CSS vars ya inyectadas en globals.css:
// var(--bg-primary), var(--accent-primary), var(--text-primary), etc.
```

| Token | Valor | Uso en esta story |
|-------|-------|-------------------|
| bgPrimary | #0D0D0D | Fondo de páginas |
| accentPrimary | #FF6B00 | Botones primarios, bordes de selección Variante A |
| textPrimary | #F5F0E8 | Texto principal |
| surface | #1E1A15 | Cards de experimento, paneles de detalle |
| border | #2E2820 | Bordes de cards |
| textMuted | #9E9080 | Texto secundario, empty states |
| radii.card | 24px | Border radius de cards |
| radii.button | 12px | Border radius de botones |
| typography.fontDisplay | Clash Display | Headings ("Experimentos A/B") |
| typography.fontBody | Inter | Texto body, labels |

### Colores Semánticos de Status Badge

Estos colores NO están en design-tokens y deben definirse en el componente:

```typescript
const STATUS_COLORS: Record<ExperimentStatus, { bg: string; text: string }> = {
  draft: { bg: 'rgba(158,144,128,0.15)', text: '#9E9080' },
  running: { bg: 'rgba(76,175,80,0.15)', text: '#4CAF50' },
  paused: { bg: 'rgba(255,140,0,0.15)', text: '#FF8C00' },
  completed: { bg: 'rgba(74,144,217,0.15)', text: '#4A90D9' },
  cancelled: { bg: 'rgba(139,58,58,0.15)', text: '#8B3A3A' },
};
```

### Listing Schema — Campos Relevantes

```typescript
// packages/shared/src/db/schema.ts — tabla listings
{
  id: uuid("id").primaryKey().defaultRandom(),
  agencyId: uuid("agency_id").notNull().references(() => agencies.id),
  title: text("title").notNull(),
  images: jsonb("images").$type<string[]>().default([]), // ← Array de URLs, índice 0 = portada
  address: text("address"),
  city: text("city"),
  status: text("status").notNull().default("active"),
}
```

El array `images` es la fuente para el selector visual de Variante B. Índice 0 siempre es la portada actual (Variante A).

### Variant Content JSONB Schema (de Story 9.1)

```typescript
// variant_a y variant_b en listing_experiments
type VariantContent = {
  coverImageUrl?: string;
  coverImageIndex?: number;  // índice en el array images del listing
  title?: string;
  description?: string;
};
```

Para `cover_image` experiments:
- `variant_a`: auto-poblado por el POST con `{ coverImageUrl: images[0], coverImageIndex: 0 }`
- `variant_b`: enviado por el usuario con `{ coverImageUrl: images[N], coverImageIndex: N }`

### Validación Zod — Schemas Requeridos

```typescript
// Crear en apps/web/src/features/agency/experiments/lib/experiment-schemas.ts

import { z } from 'zod';

// Client-side: formulario de creación
export const createExperimentSchema = z.object({
  listingId: z.string().uuid('Selecciona un listing'),
  name: z.string().min(3, 'Mínimo 3 caracteres').max(100, 'Máximo 100 caracteres'),
  experimentType: z.literal('cover_image'),
  variantB: z.object({
    coverImageUrl: z.string().url(),
    coverImageIndex: z.number().int().min(1), // min 1 porque 0 es portada
  }),
});

// Server-side: transición de estado
export const updateExperimentStatusSchema = z.object({
  status: z.enum(['running', 'paused', 'cancelled']),
});
```

### Fetch Pattern en Client Components

```typescript
// Usar fetch nativo (no TanStack Query para MVP — sin cache complejo)
const handleSubmit = async (data: CreateExperimentInput) => {
  setIsSubmitting(true);
  try {
    const res = await fetch('/api/v1/experiments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();

    if (!res.ok) {
      // Mostrar toast con json.error.message
      toast.error(json.error?.message || 'Error al crear experimento');
      return;
    }
    // Redirect a detalle
    router.push(`/agency/experiments/${json.data.experiment.id}`);
    toast.success('Experimento creado en borrador');
  } finally {
    setIsSubmitting(false);
  }
};
```

### Project Structure Notes

```
apps/web/src/
├── app/
│   ├── (protected)/agency/
│   │   ├── experiments/
│   │   │   ├── page.tsx                  ← NEW (lista de experimentos)
│   │   │   ├── new/
│   │   │   │   └── page.tsx              ← NEW (formulario de creación)
│   │   │   └── [id]/
│   │   │       └── page.tsx              ← NEW (detalle de experimento)
│   │   ├── layout.tsx                    ← NEW o MODIFY (navegación de agencia)
│   │   ├── listings/page.tsx             ← EXISTING
│   │   └── settings/crm/page.tsx         ← EXISTING
│   └── api/v1/experiments/
│       ├── route.ts                      ← MODIFY (añadir GET — POST ya existe de Story 9.1)
│       ├── [id]/
│       │   └── route.ts                  ← NEW (GET detalle + PATCH status)
│       └── assignment/
│           └── route.ts                  ← EXISTING (de Story 9.1)
├── features/agency/
│   ├── experiments/                      ← NEW (todo el directorio)
│   │   ├── components/
│   │   │   ├── experiment-list.tsx        ← NEW
│   │   │   ├── experiment-status-badge.tsx ← NEW
│   │   │   ├── create-experiment-form.tsx ← NEW
│   │   │   ├── image-variant-picker.tsx   ← NEW
│   │   │   ├── experiment-detail.tsx      ← NEW
│   │   │   ├── variant-comparison.tsx     ← NEW
│   │   │   └── experiment-controls.tsx    ← NEW
│   │   └── lib/
│   │       └── experiment-schemas.ts      ← NEW (Zod schemas)
│   └── crm/                              ← EXISTING
│       └── components/CrmConnectionForm.tsx ← EXISTING

packages/shared/src/types/
├── experiment.ts                          ← MODIFY (añadir tipos UI si faltan)
└── index.ts                               ← MODIFY (re-export)
```

### Guardrails para el Dev Agent

1. **NO crear un store Zustand para experimentos** — Para MVP, usar fetch directo + revalidatePath de Next.js. Los datos se cargan en Server Components. Solo los controles interactivos (botones, formulario) son Client Components.

2. **NO usar `useEffect` para data fetching** — Las páginas de lista y detalle son Server Components que hacen el fetch en el servidor. Solo el formulario de creación es Client Component.

3. **REUSAR tipos de Story 9.1** — Los tipos `Experiment`, `ExperimentStatus`, `ExperimentType`, `VariantContent` ya deben existir en `packages/shared/src/types/experiment.ts`. No duplicar — extender si es necesario.

4. **NO mostrar `experiment_assignments` en la UI** — NFR8 prohíbe que agencias vean asignaciones individuales. La UI solo muestra métricas agregadas de `experiment_results`. Las RLS ya lo bloquean, pero la UI tampoco debe intentar consultarlo.

5. **SEGUIR el patrón de auth de `agency/listings/page.tsx`** — El guard de rol en Server Components usa el patrón de redirect que ya existe. No inventar un nuevo mecanismo.

6. **SEGUIR `ApiResponse<T>` en TODOS los endpoints** — Nunca devolver datos directos sin el wrapper `{ data, error }`. Esto está en `packages/shared/src/types/api.ts`.

7. **NO usar modales para el formulario de creación** — Usar una página dedicada (`/agency/experiments/new`). El formulario tiene suficiente contenido (selector de imágenes, selector de listing) para justificar una página completa.

8. **Verificar el archivo `route.ts` de experiments antes de crearlo** — Story 9.1 ya creó `apps/web/src/app/api/v1/experiments/route.ts` con el handler POST. El GET de lista debe coexistir en el mismo archivo. No crear un archivo duplicado.

9. **El campo `images` de listing es `string[]` (JSONB)** — No es una tabla separada de imágenes. Es un array JSON de URLs directamente en la tabla `listings`. Al hacer JOIN, parsear el JSONB correctamente.

10. **Para el selector de listing, usar query server-side** — Si la página del formulario puede ser un Server Component que pasa props al Client Component del formulario, es preferible a hacer un fetch adicional desde el cliente.

11. **Toast notifications** — El proyecto ya usa un toast handler (ver `apps/web/src/components/layout/ToastHandler.tsx`). Reusar ese sistema, no crear uno nuevo.

12. **El nombre del enum en la DB es diferente al de la spec** — Story 9.1 puede haber usado `experimentStatusEnum` con valores `draft`, `running`, `paused`, `completed`, `cancelled`. Verificar el schema real antes de hacer queries con strings hardcoded.

### Aprendizajes de Stories Anteriores

- **Story 9.1** estableció las tablas, API, y tipos base. Todo lo de esta story depende de que 9.1 esté implementada. Verificar que las tablas existan antes de empezar.
- **Story 5.4** (`PATCH /api/v1/agency/listings/[id]/status/route.ts`) es el patrón exacto de cómo se hace un PATCH con auth + ownership en el proyecto. Copiar ese patrón para el PATCH de experimentos.
- **Story 8.5** creó el dashboard de analytics de listings para agencias — si ese código existe, puede servir como referencia para el layout y estilo de la página de experimentos.
- Las páginas de agencia existentes (`agency/listings/page.tsx`, `agency/settings/crm/page.tsx`) usan inline styles con los colores del design system. Usar Tailwind CSS classes cuando sea posible (el proyecto está configurado con Tailwind v4), pero los inline styles son aceptables si siguen los tokens.
- **Story 2.1** estableció los componentes base de design (GlassPanel, PropertyBadge). Verificar si alguno es reutilizable para esta UI.

### API Endpoints Resumen

| Método | Ruta | Descripción | Story |
|--------|------|-------------|-------|
| POST | `/api/v1/experiments` | Crear experimento | 9.1 (existente) |
| GET | `/api/v1/experiments` | Listar experimentos de agencia | 9.2 (nuevo) |
| GET | `/api/v1/experiments/[id]` | Detalle de experimento | 9.2 (nuevo) |
| PATCH | `/api/v1/experiments/[id]` | Cambiar estado | 9.2 (nuevo) |
| GET | `/api/v1/experiments/assignment` | Obtener variante (buyer) | 9.1 (existente) |

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 9 — Story 9.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules]
- [Source: _bmad-output/implementation-artifacts/9-1-schema-experimentos-motor-asignacion-variantes.md]
- [Source: apps/web/src/app/(protected)/agency/listings/page.tsx — patrón guard rol agency_admin]
- [Source: apps/web/src/app/api/v1/agency/listings/[id]/status/route.ts — patrón PATCH con auth+ownership]
- [Source: packages/shared/src/db/schema.ts — tabla listings con campo images]
- [Source: packages/shared/src/types/api.ts — ApiResponse<T>]
- [Source: packages/shared/src/design-tokens.json — design tokens completos]
- [Source: apps/web/src/components/layout/ToastHandler.tsx — sistema de toast existente]

## Dev Agent Record

### Agent Model Used

(to be filled by dev agent)

### Debug Log References

### Completion Notes List

### File List
