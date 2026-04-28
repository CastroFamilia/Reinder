# Story 4.1: Lista de Clientes Vinculados en el Panel del Agente

Status: ready-for-dev

**GH Issue:** #1

## Story

Como agente representante,
quiero ver la lista de todos mis clientes compradores vinculados en mi panel,
para que tenga visión clara de quién me representa y acceso rápido a la actividad de cada uno.

## Acceptance Criteria

1. **Given** un agente autenticado con rol `agent` en la tab "Clientes" **When** carga el panel **Then** ve la lista de todos sus compradores usando el componente `AgentClientCard` (UX-DR9)

2. **And** cada card muestra: nombre del cliente, fecha de vínculo, número de matches totales, e indicador visual (badge naranja) si hay nuevos matches no vistos (`has-new-matches`)

3. **And** la lista está ordenada por actividad reciente (último match primero — `last_match_at` DESC)

4. **And** si no tiene clientes vinculados: "Aún no tienes clientes vinculados — envía tu link de referral para empezar"

5. **And** puede pulsar en cualquier client card para ver el historial detallado de ese cliente (navigate to `/agent/clients/[buyerId]`)

6. **And** la página `/agent` está protegida por RLS — solo el agente ve sus propios bonds (no los de otros agentes)

## Tasks / Subtasks

- [ ] **Task 1 — API Route: GET /api/v1/agent/clients** (AC: 1, 2, 3, 6)
  - [ ] Crear `apps/web/src/app/api/v1/agent/clients/route.ts`
  - [ ] Guard: solo rol `agent` puede acceder (verificar con Supabase server client)
  - [ ] Query: `agentBuyerBonds` WHERE `agentId = currentUser.id` AND `status = 'active'`
  - [ ] JOIN con `user_profiles` (comprador) para obtener `fullName`, `avatarUrl`
  - [ ] JOIN con `match_events` COUNT por `buyerId` para obtener `totalMatches`
  - [ ] Calcular `lastMatchAt` (MAX `match_events.createdAt` por buyerId)
  - [ ] Calcular `hasNewMatches`: si `lastMatchAt` > `agentLastSeenAt` del bond (ver nota en Dev Notes sobre `agent_last_seen_at`)
  - [ ] Ordenar por `lastMatchAt DESC NULLS LAST`, luego `createdAt DESC`
  - [ ] Devolver `ApiResponse<AgentClient[]>` con wrapper estándar
  - [ ] Crear test `apps/web/src/app/api/v1/agent/clients/route.test.ts`:
    - Test 200: agente ve sus propios clientes correctamente
    - Test 200: RLS aislamiento — agente A no ve clientes del agente B (mockar two-agent fixture)
    - Test 401: sin auth → error
    - Test 403: comprador llama → error
    - Test 200: empty array cuando sin clientes

- [ ] **Task 2 — Schema: añadir `agentLastSeenAt` al bond** (AC: 2 — `has-new-matches`)
  - [ ] En `packages/shared/src/db/schema.ts`, añadir campo `agentLastSeenAt` al `agentBuyerBonds`:
    ```typescript
    agentLastSeenAt: timestamp('agent_last_seen_at', { withTimezone: true }),
    ```
  - [ ] Crear migration con `drizzle-kit generate`
  - [ ] PATCH endpoint para actualizar `agentLastSeenAt` cuando el agente abre el detalle de un cliente (Story 4.3 lo usará — aquí crear el stub)

- [ ] **Task 3 — Componente `AgentClientCard`** (AC: 1, 2, 5)
  - [ ] Crear `apps/web/src/features/agent-panel/components/AgentClientCard.tsx`
  - [ ] Props: `{ client: AgentClient; onPress: () => void }`
  - [ ] Mostrar: avatar/iniciales del cliente, nombre completo, fecha de vínculo formateada, total matches, badge naranja si `hasNewMatches`
  - [ ] Usar tokens de diseño glassmorphism (`GlassPanel` level light)
  - [ ] On press: navegar a `/agent/clients/{buyerId}`
  - [ ] Crear test `AgentClientCard.test.tsx`:
    - Render con `hasNewMatches = true` → badge naranja visible
    - Render con `hasNewMatches = false` → no badge
    - Render sin avatar → mostrar iniciales
    - On press handler llamado

- [ ] **Task 4 — Página `/agent/clients` (Agent Dashboard)** (AC: 1, 3, 4, 5)
  - [ ] Crear (o actualizar si ya existe) `apps/web/src/app/(dashboard)/agent/page.tsx`
  - [ ] Server Component que llama a `GET /api/v1/agent/clients` con el server Supabase client
  - [ ] Renderizar lista de `AgentClientCard` components
  - [ ] Estado vacío: mensaje "Aún no tienes clientes vinculados — envía tu link de referral para empezar"
  - [ ] Link/CTA al generador de referral links (Story 3.1 — ya existe)
  - [ ] Añadir tab "Clientes" al layout del agente si no existe aún

- [ ] **Task 5 — Tipos compartidos** (AC: todos)
  - [ ] En `packages/shared/src/types/agent.ts` (crear si no existe):
    ```typescript
    export interface AgentClient {
      bondId: string;
      buyerId: string;
      buyerName: string | null;
      buyerAvatarUrl: string | null;
      bondCreatedAt: string; // ISO 8601
      totalMatches: number;
      lastMatchAt: string | null;
      hasNewMatches: boolean;
    }
    ```
  - [ ] Exportar desde `packages/shared/src/index.ts`

- [ ] **Task 6 — Typecheck + tests**
  - [ ] `pnpm --filter @reinder/web typecheck` → 0 errores
  - [ ] `pnpm --filter @reinder/web test` → todos PASS
  - [ ] `pnpm --filter @reinder/shared typecheck` → 0 errores (schema actualizado)

## Dev Notes

### 🗄️ Schema existente relevante

Tabla `agentBuyerBonds` en `packages/shared/src/db/schema.ts` (creada en Story 3.2):

```typescript
export const agentBuyerBonds = pgTable(
  "agent_buyer_bonds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id").notNull(),   // auth.users.id del agente
    buyerId: uuid("buyer_id").notNull(),   // auth.users.id del comprador
    referralTokenId: uuid("referral_token_id").notNull().references(() => referralTokens.id),
    status: text("status").notNull().default("active"), // active | expired | revoked
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    // NUEVO (Task 2 de esta story):
    // agentLastSeenAt: timestamp("agent_last_seen_at", { withTimezone: true }),
  },
  ...
)
```

Tabla `matchEvents` en schema.ts:
```typescript
export const matchEvents = pgTable("match_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  buyerId: uuid("buyer_id").notNull(),
  listingId: uuid("listing_id").notNull().references(() => listings.id),
  agentId: uuid("agent_id"),    // nullable
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

### 🛣️ API Route Pattern (Next.js 15 App Router)

```typescript
// apps/web/src/app/api/v1/agent/clients/route.ts
import { createServerClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { agentBuyerBonds, userProfiles, matchEvents } from '@reinder/shared/db/schema';
import { eq, and, count, max, desc, sql } from 'drizzle-orm';
import type { NextRequest } from 'next/server';
import type { ApiResponse, AgentClient } from '@reinder/shared/types';

export async function GET(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return Response.json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 });
  }
  
  // Verificar rol agent
  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'agent') {
    return Response.json({ data: null, error: { code: 'FORBIDDEN', message: 'Agent role required' } }, { status: 403 });
  }

  // Query con JOINs
  const clients = await db
    .select({
      bondId: agentBuyerBonds.id,
      buyerId: agentBuyerBonds.buyerId,
      buyerName: userProfiles.fullName,
      buyerAvatarUrl: userProfiles.avatarUrl,
      bondCreatedAt: agentBuyerBonds.createdAt,
      agentLastSeenAt: agentBuyerBonds.agentLastSeenAt,
      totalMatches: count(matchEvents.id),
      lastMatchAt: max(matchEvents.createdAt),
    })
    .from(agentBuyerBonds)
    .leftJoin(userProfiles, eq(userProfiles.id, agentBuyerBonds.buyerId))
    .leftJoin(matchEvents, eq(matchEvents.buyerId, agentBuyerBonds.buyerId))
    .where(and(
      eq(agentBuyerBonds.agentId, user.id),
      eq(agentBuyerBonds.status, 'active')
    ))
    .groupBy(agentBuyerBonds.id, userProfiles.fullName, userProfiles.avatarUrl)
    .orderBy(desc(max(matchEvents.createdAt)));

  const result: AgentClient[] = clients.map(c => ({
    ...c,
    bondCreatedAt: c.bondCreatedAt.toISOString(),
    lastMatchAt: c.lastMatchAt?.toISOString() ?? null,
    hasNewMatches: c.agentLastSeenAt && c.lastMatchAt
      ? c.lastMatchAt > c.agentLastSeenAt
      : c.totalMatches > 0,
  }));

  return Response.json({ data: result, error: null } satisfies ApiResponse<AgentClient[]>);
}
```

### 🎨 `AgentClientCard` — Estilo glassmorphism

```typescript
// apps/web/src/features/agent-panel/components/AgentClientCard.tsx
'use client';

interface AgentClientCardProps {
  client: AgentClient;
  onPress: () => void;
}

export function AgentClientCard({ client, onPress }: AgentClientCardProps) {
  // Usar GlassPanel (ya implementado en Epic 2)
  // Badge naranja si hasNewMatches
  // Avatar con iniciales fallback
  // Fecha formateada con Intl.DateTimeFormat
}
```

### 📁 Archivos a crear/modificar

```
CREAR:
  packages/shared/src/types/agent.ts               ← AgentClient interface
  apps/web/src/app/api/v1/agent/clients/route.ts   ← GET /api/v1/agent/clients
  apps/web/src/app/api/v1/agent/clients/route.test.ts
  apps/web/src/features/agent-panel/components/AgentClientCard.tsx
  apps/web/src/features/agent-panel/components/AgentClientCard.test.tsx

MODIFICAR:
  packages/shared/src/db/schema.ts                 ← añadir agentLastSeenAt a agentBuyerBonds
  packages/shared/src/index.ts                     ← exportar AgentClient type
  apps/web/src/app/(dashboard)/agent/page.tsx      ← agente dashboard principal
```

### 🏷️ Convenciones del proyecto

- `snake_case` en DB, `camelCase` en TypeScript (Drizzle mapea automáticamente)
- API responde siempre `ApiResponse<T>` — NUNCA raw data
- Organización por feature: `features/agent-panel/`
- Tests co-located con el archivo (`.test.tsx` junto al componente)
- Todos los booleans de estado con prefijo `is` (excepción: `hasNewMatches` — nombre de dominio de negocio)
- Supabase server client en Route Handlers: `import { createServerClient } from '@/lib/supabase/server'`

### ⚙️ Test config en apps/web

```typescript
// vitest.config.ts — globals: true, aliases array-style
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    globals: true,
    alias: [
      { find: '@', replacement: '/path/to/apps/web/src' },
      { find: '@reinder/shared', replacement: '/path/to/packages/shared/src' },
    ]
  }
});
```

### 🔒 RLS — Consideración importante

La tabla `agent_buyer_bonds` tiene RLS habilitada (Story 3.2). El Route Handler usa el **service role** de Supabase (via `drizzle` con `postgres.js` usando DATABASE_URL con service role key) para hacer las queries — el RLS se aplica a nivel de Supabase client, NO de drizzle directamente. Si se usa Supabase client en lugar de Drizzle puro para queries, hay que asegurarse de usar el server client con la sesión correcta.

**Opción recomendada:** Usar Drizzle con la conexión DB directa (no Supabase RLS) y verificar manualmente que `agentId = user.id` en la query — más control y menos magia de RLS.

### Referencias

- [schema.ts] `packages/shared/src/db/schema.ts` — agentBuyerBonds, matchEvents, userProfiles
- [rls-policies] `packages/shared/src/db/rls-agent-buyer-bonds-policies.sql` (Story 3.2)
- [architecture.md#agent-panel] `_bmad-output/planning-artifacts/architecture.md` — features/agent-panel/
- [epics.md Story 4.1] `_bmad-output/planning-artifacts/epics.md#story-41`
- [test-design-epic-4.md] `_bmad-output/implementation-artifacts/test-design-epic-4.md`
- [Story 3.2] `_bmad-output/implementation-artifacts/3-2-aceptacion-vinculo-comprador-via-referral-link.md`
- [notify-agent.ts] `apps/web/src/features/agent-link/lib/notify-agent.ts` (Expo push pattern)

## Dev Agent Record

### Agent Model Used

BAD Pipeline — Story Creator (Epic-Start Phase 1, Story 4.1)

### Debug Log References

_To be filled by dev agent_

### Completion Notes List

_To be filled by dev agent_

### File List

_To be filled by dev agent_

## Change Log

- **2026-04-28 (BAD Step 1 — story creation):** Story 4.1 creada por el pipeline BAD. Status: ready-for-dev. GH Issue #1.
