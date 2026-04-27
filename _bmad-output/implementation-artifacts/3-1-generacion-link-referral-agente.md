# Story 3.1: Generación de Link de Referral por el Agente

Status: ready-for-dev

## Story

Como agente representante,
quiero generar un link de referral único para cada uno de mis clientes compradores,
para que puedan vincularse conmigo como su representante con un solo clic.

## Acceptance Criteria

1. **Given** un agente autenticado con rol `agent` en su panel **When** pulsa "Generar link para cliente" **Then** se genera un token único en `referral_tokens` con expiración `REFERRAL_TOKEN_TTL_DAYS` (30 días) y `used: false`

2. **And** el agente ve el link completo `https://reinder.app/referral/{token}` y puede copiarlo al portapapeles con un tap

3. **And** el link es de un solo uso — una vez aceptado, `used: true` y no puede reutilizarse (NFR9)

4. **And** los tokens expirados muestran estado "Expirado" con opción de generar uno nuevo

5. **And** el agente puede ver la lista de todos sus links activos y su estado (pendiente / aceptado / expirado)

## Tasks / Subtasks

- [ ] **Task 1 — API Route: POST /api/v1/referral-tokens** (AC: 1)
  - [ ] Crear `apps/web/src/app/api/v1/referral-tokens/route.ts`
  - [ ] Guard: `supabase.auth.getUser()` + verificar rol `agent` en `user_profiles`
  - [ ] Generar token: `crypto.randomUUID()` (Node.js built-in, no deps extra)
  - [ ] Insertar en `referral_tokens`: `{ agentId: user.id, token, expiresAt: now + 30 días, used: false }`
  - [ ] Retorna: `{ token, referralUrl, expiresAt }`
  - [ ] Tests: `referral-tokens.route.test.ts` — 201 éxito, 401 sin auth, 403 rol incorrecto

- [ ] **Task 2 — API Route: GET /api/v1/referral-tokens** (AC: 5)
  - [ ] En el mismo `route.ts`, añadir handler GET
  - [ ] Retorna todos los `referral_tokens` del agente autenticado, ordenados por `created_at DESC`
  - [ ] Cada token incluye campo `status` calculado: `'accepted'` si `used=true`, `'expired'` si `expiresAt < now`, `'pending'` si no
  - [ ] Tests: lista vacía, lista con tokens en distintos estados

- [ ] **Task 3 — Página del Panel del Agente con generación y lista** (AC: 2, 4, 5)
  - [ ] Modificar `apps/web/src/app/(protected)/agent/page.tsx` para mostrar:
    - Botón "Generar link para cliente" (Primary naranja)
    - Lista de referral links propios con estado visual (pendiente/aceptado/expirado)
    - Botón "Copiar" junto a cada link pendiente
    - CTA "Generar nuevo" para tokens expirados
  - [ ] Usar Server Component para carga inicial de tokens (fetch directo via Drizzle)
  - [ ] Client Component `ReferralLinkGenerator` para la acción de generación y copia
  - [ ] Archivar en `apps/web/src/features/agent-link/` — crear directorio
  - [ ] Tests: `referral-link-generator.test.tsx` — render, interacciones de botón

- [ ] **Task 4 — Hook `useReferralTokens`** (AC: 2, 4, 5)
  - [ ] Crear `apps/web/src/features/agent-link/hooks/use-referral-tokens.ts`
  - [ ] Llama a `POST /api/v1/referral-tokens` para generar, `GET` para listar
  - [ ] Maneja estado: `{ tokens, isGenerating, error, generateToken, copyLink }`
  - [ ] `copyLink(url)` usa `navigator.clipboard.writeText` con fallback
  - [ ] Tests: `use-referral-tokens.test.ts`

- [ ] **Task 5 — RLS para referral_tokens** (AC: 3)
  - [ ] Crear `packages/shared/src/db/rls-referral-tokens-policies.sql`
  - [ ] Política INSERT: solo `agent` autenticado puede insertar sus propios tokens (`agentId = auth.uid()`)
  - [ ] Política SELECT: `agent` solo ve sus propios tokens; `buyer` no ve tokens
  - [ ] Política UPDATE (used): solo la Edge Function service-role puede marcar `used=true`
  - [ ] Añadir comentario en `schema.ts` indicando que RLS está en `rls-referral-tokens-policies.sql`

- [ ] **Task 6 — Typecheck + tests completos**
  - [ ] `pnpm --filter @reinder/web typecheck` → 0 errores
  - [ ] `pnpm --filter @reinder/web test` → todos PASS

## Dev Notes

### 🏗️ Arquitectura — dónde vive el código

```
NUEVO:
  apps/web/src/app/api/v1/referral-tokens/route.ts      ← API handler (POST + GET)
  apps/web/src/features/agent-link/                     ← nuevo feature folder
    components/referral-link-generator.tsx               ← Client Component
    components/referral-link-list.tsx                    ← lista con estado
    hooks/use-referral-tokens.ts                         ← fetch hook
  packages/shared/src/db/rls-referral-tokens-policies.sql

MODIFICADO:
  apps/web/src/app/(protected)/agent/page.tsx            ← integrar componentes
```

### 🗄️ Schema existente — `referral_tokens`

La tabla ya existe en `packages/shared/src/db/schema.ts`:

```typescript
export const referralTokens = pgTable("referral_tokens", {
  id:        uuid("id").primaryKey().defaultRandom(),
  agentId:   uuid("agent_id").notNull(),        // auth.users.id del agente
  buyerId:   uuid("buyer_id"),                  // null hasta aceptación
  token:     text("token").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  used:      boolean("used").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  tokenUnique: unique("referral_tokens_token_unique").on(t.token),
  idxToken: index("idx_referral_tokens_token").on(t.token),
}));
```

### 📌 Constante existente

```typescript
// packages/shared/src/constants/index.ts
export const REFERRAL_TOKEN_TTL_DAYS = 30 as const; // ya existe
```

### 🔗 URL del referral link

```
Base URL prod: https://reinder.app/referral/{token}
Dev local: http://localhost:3001/referral/{token}
```

Usar `process.env.NEXT_PUBLIC_APP_URL ?? 'https://reinder.app'` para construir la URL.
Añadir `NEXT_PUBLIC_APP_URL` a `.env.local.example` si no existe.

### 🎨 UI: lista de tokens con estado

```typescript
type TokenStatus = 'pending' | 'accepted' | 'expired';

// Calculado en el API / hook — no en el render
function getStatus(token: ReferralToken): TokenStatus {
  if (token.used) return 'accepted';
  if (new Date(token.expiresAt) < new Date()) return 'expired';
  return 'pending';
}

// Colores por estado
const STATUS_COLORS = {
  pending:  '#FF6B00',  // naranja — accentPrimary
  accepted: '#22c55e',  // verde
  expired:  '#9E9080',  // muted
};
```

### 🔐 Guard de autenticación en API routes

Patrón ya establecido en el proyecto (ver `apps/web/src/app/api/v1/listings/route.ts`):

```typescript
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

// Verificar rol
const [profile] = await db
  .select({ role: userProfiles.role })
  .from(userProfiles)
  .where(eq(userProfiles.id, user.id))
  .limit(1);
if (!profile || profile.role !== 'agent') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

### 📦 Imports habituales

```typescript
import { db } from '@/lib/supabase/db';
import { referralTokens, userProfiles } from '@reinder/shared/db/schema';
import { REFERRAL_TOKEN_TTL_DAYS } from '@reinder/shared/constants';
import { eq, desc, and } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
```

### ⚠️ Puntos de atención

1. **Token uniqueness**: `crypto.randomUUID()` produce UUIDs — ya hay `unique` constraint en DB. Si hay colisión (extremadamente raro), el INSERT falla con unique_violation; retornar 409 o reintentar una vez.
2. **Copiar al portapapeles**: `navigator.clipboard` requiere contexto seguro (HTTPS o localhost). En dev sin HTTPS, usar el fallback `document.execCommand('copy')` (deprecated pero funcional).
3. **Server Component + Client Component split**: La página `/agent` carga la lista inicial como Server Component (Drizzle directo). El botón "Generar" es un Client Component que hace fetch al API route. Evitar hacer todo client-side para mantener el RSC pattern del proyecto.
4. **Fecha de expiración**: Calcular en el servidor, no en el cliente. `new Date(Date.now() + REFERRAL_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000)`.

### 🏷️ Convenciones del proyecto

| Elemento | Convención | Ejemplo |
|---|---|---|
| API Route | kebab-case | `referral-tokens/route.ts` |
| Component | PascalCase | `ReferralLinkGenerator` |
| File | kebab-case | `referral-link-generator.tsx` |
| Hook | camelCase `use` prefix | `useReferralTokens` |
| Test | co-located `.test.ts(x)` | `referral-link-generator.test.tsx` |

### Referencias

- [schema.ts] `packages/shared/src/db/schema.ts` — `referralTokens` table (líneas 199–218)
- [constants] `packages/shared/src/constants/index.ts` — `REFERRAL_TOKEN_TTL_DAYS`
- [agent page] `apps/web/src/app/(protected)/agent/page.tsx` — MODIFICAR
- [listings API] `apps/web/src/app/api/v1/listings/route.ts` — patrón auth guard
- [epics.md Story 3.1] `_bmad-output/planning-artifacts/epics.md` (líneas 745–760)
- [epic-3 test plan] `_bmad-output/implementation-artifacts/epic-3-test-plan.md`
- [NFR9] Token single-use + TTL configurable

## Dev Agent Record

### Agent Model Used

_To be filled by dev agent_

### Completion Notes List

_To be filled by dev agent_

### File List

_To be filled by dev agent_

## Change Log

- **2026-04-27 (BAD Step 1 — story creation):** Story 3.1 creada por el pipeline BAD. Status: ready-for-dev.
