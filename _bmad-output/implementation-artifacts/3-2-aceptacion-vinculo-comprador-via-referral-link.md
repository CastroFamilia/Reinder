# Story 3.2: Aceptación del Vínculo por el Comprador vía Referral Link

Status: ready-for-dev

## Story

Como comprador,
quiero abrir el link de referral que me envió mi agente y aceptar o rechazar el vínculo,
para que ese agente pase a ser mi representante en Reinder.

## Acceptance Criteria

1. **Given** un comprador autenticado que abre `/referral/{token}` **When** el token es válido (no expirado, `used: false`) **Then** ve la pantalla de aceptación con nombre y foto del agente y una explicación del vínculo

2. **And** el comprador puede hacer tap en "Aceptar" para crear el vínculo — el token se marca `used: true`, se crea el bond en `agent_buyer_bonds`, y se emite el evento `referral.accepted`

3. **And** tras aceptar, el comprador es redirigido al feed `/swipe` con un toast "Elena es ahora tu agente representante"

4. **And** el agente recibe una push notification "Tu cliente {nombre} ha aceptado el vínculo" en ≤ 5 segundos

5. **And** el comprador puede hacer tap en "No gracias" para rechazar — no se crea ningún vínculo, el token permanece `used: false`

6. **And** si el token ya está expirado o `used: true`, el comprador ve un mensaje de error: "Este link ya no es válido. Pídele a tu agente que genere uno nuevo."

7. **And** si el comprador NO está autenticado al abrir el link, es redirigido al registro/login y el link funciona correctamente después de autenticarse

## Tasks / Subtasks

- [ ] **Task 1 — DB schema: tabla `agent_buyer_bonds`** (AC: 2)
  - [ ] Añadir tabla `agentBuyerBonds` a `packages/shared/src/db/schema.ts`:
    - `id` uuid PK
    - `agentId` uuid (ref auth.users.id)
    - `buyerId` uuid (ref auth.users.id)
    - `referralTokenId` uuid → `referral_tokens.id`
    - `status` text: `'active'` | `'expired'` | `'revoked'`
    - `createdAt` timestamp
    - `expiresAt` timestamp (bond TTL — mismo valor que el token original, puede renovarse en 3.3)
    - UNIQUE(`agentId`, `buyerId`) — un comprador solo puede tener un vínculo activo por agente
  - [ ] Crear `packages/shared/src/db/rls-agent-buyer-bonds-policies.sql`
    - Agent: SELECT sus propios bonds, no puede INSERT/DELETE directamente
    - Buyer: SELECT su propio bond, no puede INSERT/DELETE directamente
    - Service role: pleno acceso (INSERT vía Edge Function o Route Handler server-side)

- [ ] **Task 2 — Página web `/referral/[token]`** (AC: 1, 6, 7)
  - [ ] Crear `apps/web/src/app/referral/[token]/page.tsx` — ruta pública (NO dentro de `(protected)`)
  - [ ] Server Component: valida el token via Drizzle — si inválido, muestra error estático
  - [ ] Si válido: muestra nombre/foto del agente (de `user_profiles`) + "¿Aceptar?" / "No gracias"
  - [ ] Si el usuario no está autenticado: redirige a `/login?redirect=/referral/{token}`
  - [ ] Tests: `referral-acceptance-page.test.tsx` — render con token válido, token expirado, token usado

- [ ] **Task 3 — API Route: POST /api/v1/referral-tokens/[token]/accept** (AC: 2, 3, 4)
  - [ ] Crear `apps/web/src/app/api/v1/referral-tokens/[token]/accept/route.ts`
  - [ ] Guard: buyer autenticado (no agent)
  - [ ] Lógica: verificar token válido (not used, not expired), crear bond en `agent_buyer_bonds`, marcar token `used: true` — todo en una DB transaction atómica
  - [ ] Emitir evento `referral.accepted` (por ahora: log + preparar para Supabase Realtime en futuro)
  - [ ] Llamar a Edge Function / API de notificaciones push para el agente (stub ok si no hay Edge Function aún)
  - [ ] Tests: `accept.route.test.ts` — 200 éxito, 400 token inválido, 400 token expirado, 401 sin auth, 403 si agent llama

- [ ] **Task 4 — Middleware: preservar redirect post-auth para referral link** (AC: 7)
  - [ ] Verificar que `apps/web/src/middleware.ts` ya maneja `?redirect=` param al hacer login
  - [ ] Si no: añadir lógica en `(auth)/login/page.tsx` para leer `redirect` param y navegar tras login

- [ ] **Task 5 — Typecheck + tests**
  - [ ] `pnpm --filter @reinder/web typecheck` → 0 errores en archivos nuevos
  - [ ] `pnpm --filter @reinder/web test` → todos PASS

## Dev Notes

### 🗄️ Nueva tabla: `agent_buyer_bonds`

```typescript
export const agentBuyerBonds = pgTable('agent_buyer_bonds', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id').notNull(),              // auth.users.id del agente
  buyerId: uuid('buyer_id').notNull(),              // auth.users.id del comprador
  referralTokenId: uuid('referral_token_id')
    .notNull()
    .references(() => referralTokens.id),
  status: text('status').notNull().default('active'), // 'active' | 'expired' | 'revoked'
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(), // copia TTL del token
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  uniqueAgentBuyer: unique('agent_buyer_bonds_unique').on(t.agentId, t.buyerId),
  idxBuyerId: index('idx_agent_buyer_bonds_buyer_id').on(t.buyerId),
  idxAgentId: index('idx_agent_buyer_bonds_agent_id').on(t.agentId),
}));
```

### 🛣️ Ruta `/referral/[token]` — pública

La ruta es **pública** (no dentro de `(protected)`) para que un comprador no autenticado la pueda abrir sin ser redirigido. El manejo de autenticación se hace dentro de la página:

```
apps/web/src/app/
  (auth)/              ← login, register
  (protected)/         ← rutas privadas
  referral/            ← NUEVA — ruta pública
    [token]/
      page.tsx         ← página de aceptación
```

### 🔗 Accept API — atomicidad

El paso de marcar token como `used: true` + crear el bond debe ser atómico. Usar una DB transaction Drizzle:

```typescript
await db.transaction(async (tx) => {
  // 1. Verify token again inside transaction (SELECT FOR UPDATE if supported)
  const [token] = await tx.select().from(referralTokens).where(...).limit(1);
  if (!token || token.used || token.expiresAt < new Date()) {
    throw new Error('TOKEN_INVALID');
  }
  // 2. Mark token as used
  await tx.update(referralTokens).set({ used: true, buyerId: buyerUser.id }).where(eq(referralTokens.id, token.id));
  // 3. Create bond
  await tx.insert(agentBuyerBonds).values({ agentId: token.agentId, buyerId: buyerUser.id, ... });
});
```

Note: Drizzle with postgres.js — `db.transaction()` is available.

### 📣 Push notification stub

Story 3.2 implementa el envío de push notification al agente. Por ahora, crear una función `notifyAgent(agentId, message)` en `apps/web/src/features/agent-link/lib/notify-agent.ts` que:
1. Busca el push token del agente en la tabla `push_tokens`
2. Llama a Expo Push API con el mensaje
3. Si no hay push token registrado, simplemente loguea (no falla la request)

```typescript
// Expo Push API endpoint
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
```

### 🎨 UI de aceptación

La página `/referral/[token]` debe mostrar:
- Avatar del agente (si tiene `avatarUrl`) o iniciales
- Nombre completo del agente
- Texto de explicación: "Elena García quiere ser tu Agente Representante en Reinder. Esto significa que podrá ver tus matches y actuar como tu representante."
- Botón primary: "Aceptar vínculo"
- Botón secondary (ghost): "No gracias"
- Tras aceptar: redirige a `/swipe` con un `?toast=bond_accepted&agent={nombre}`

### 📦 Archivos a crear/modificar

```
CREAR:
  packages/shared/src/db/schema.ts              ← añadir agentBuyerBonds tabla
  packages/shared/src/db/rls-agent-buyer-bonds-policies.sql
  apps/web/src/app/referral/[token]/page.tsx
  apps/web/src/app/api/v1/referral-tokens/[token]/accept/route.ts
  apps/web/src/app/api/v1/referral-tokens/[token]/accept/route.test.ts
  apps/web/src/features/agent-link/lib/notify-agent.ts

MODIFICAR (posiblemente):
  apps/web/src/middleware.ts                    ← verificar manejo de ?redirect=
  apps/web/src/app/(auth)/login/page.tsx        ← manejar redirect param post-login
```

### 🏷️ Convenciones del proyecto

Mismas que Story 3.1. Ver `_bmad-output/implementation-artifacts/3-1-generacion-link-referral-agente.md`.

### Referencias

- [schema.ts] `packages/shared/src/db/schema.ts` — referralTokens existente
- [referral-url.ts] `apps/web/src/features/agent-link/lib/referral-url.ts` — usar para URL construction
- [rls-referral-tokens-policies.sql] — patrón RLS para agent_buyer_bonds
- [middleware.ts] `apps/web/src/middleware.ts`
- [epics.md Story 3.2] `_bmad-output/planning-artifacts/epics.md`
- [epic-3 test plan] `_bmad-output/implementation-artifacts/epic-3-test-plan.md`

## Dev Agent Record

### Agent Model Used

_To be filled by dev agent_

### Completion Notes List

_To be filled by dev agent_

### File List

_To be filled by dev agent_

## Change Log

- **2026-04-27 (BAD Step 1 — story creation):** Story 3.2 creada por el pipeline BAD. Status: ready-for-dev.
