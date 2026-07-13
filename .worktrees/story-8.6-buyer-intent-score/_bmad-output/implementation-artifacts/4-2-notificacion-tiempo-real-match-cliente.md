# Story 4.2: Notificación en Tiempo Real de Match de Cliente

Status: ready-for-dev

**GH Issue:** #2

## Story

Como agente representante,
quiero recibir una notificación inmediata cuando uno de mis clientes hace match,
para que pueda actuar antes que cualquier otro agente.

## Acceptance Criteria

1. **Given** un comprador con vínculo activo hace match con una propiedad **When** el swipe-events API recibe `action=match` **Then** se persiste el evento en `match_events` y se dispara la notificación al agente vinculado en ≤5s

2. **And** en web (panel abierto): `useRealtimeMatches` hook escucha el canal `match_events:agentId={agentId}` via Supabase Realtime WebSocket — cuando llega evento `INSERT`, el dashboard actualiza el badge del cliente sin reload

3. **And** en mobile/push: se envía push notification al agente via Expo Push (`notifyAgent`) con mensaje: "Tu cliente {buyerName} ha hecho match con una propiedad"

4. **And** si el agente no tiene push token registrado, el match se persiste igualmente y el badge se actualiza al abrir la app (fallback visual via `hasNewMatches`)

5. **And** el `swipe-events` POST requiere auth JWT — solo el propio comprador puede registrar sus swipes (validar `buyerId = auth.uid()`)

6. **And** la persistencia en `match_events` sólo ocurre cuando `action = 'match'` (los rechazos solo van a `swipe_events`)

## Tasks / Subtasks

- [ ] **Task 1 — Persistencia real en swipe-events API** (AC: 1, 5, 6)
  - [ ] Actualizar `apps/web/src/app/api/v1/swipe-events/route.ts` — reemplazar stub por implementación real
  - [ ] Guard: requerir auth JWT (`createClient` → `auth.getUser()`) — `buyerId = user.id`
  - [ ] INSERT en `swipe_events` (siempre: match + reject)
  - [ ] Si `action = 'match'`: INSERT en `match_events` con `buyerId`, `listingId`, `agentId` (lookup bond)
  - [ ] Crear test `swipe-events/route.test.ts`:
    - Test 200: match persiste en `swipe_events` + `match_events`
    - Test 200: reject persiste solo en `swipe_events`
    - Test 401: sin auth → error
    - Test 400: action inválida → error

- [ ] **Task 2 — Notificación push al agente tras match** (AC: 3, 4)
  - [ ] Tras INSERT en `match_events`: llamar `notifyAgent(agentId, message)` con mensaje formateado
  - [ ] Obtener `buyerName` de `user_profiles` para personalizar el mensaje
  - [ ] Formato del mensaje: `"Tu cliente {buyerName} ha hecho match con una propiedad"`
  - [ ] `notifyAgent` ya gestiona el caso sin push token (silent no-op)
  - [ ] Actualizar `notifyAgent` para aceptar `data: { type: 'match.created', matchId, listingId, buyerId }` en el payload
  - [ ] Crear/actualizar test `notify-agent.test.ts`:
    - Test: mensaje enviado con formato correcto cuando hay push token
    - Test: silent no-op cuando no hay push token

- [ ] **Task 3 — Hook `useRealtimeMatches`** (AC: 2)
  - [ ] Crear `apps/web/src/features/agent-panel/hooks/use-realtime-matches.ts`
  - [ ] Usa `supabase.channel('match_events:agent:{agentId}')` para suscribirse a inserts en `match_events`
  - [ ] Filter: `agentId=eq.{agentId}` (solo matches de los clientes del agente)
  - [ ] Al recibir evento `INSERT`: callback `onNewMatch(payload)` para actualizar el estado local
  - [ ] `useEffect` cleanup: `supabase.removeChannel(channel)` en unmount (memory leak prevention — NFR identificado en test-design-epic-4.md)
  - [ ] Crear test `use-realtime-matches.test.ts`:
    - Test: channel suscrito al montar con filtro correcto
    - Test: `onNewMatch` llamado al recibir INSERT
    - Test: channel removido en unmount (cleanup)

- [ ] **Task 4 — Integrar `useRealtimeMatches` en el Agent Dashboard** (AC: 2)
  - [ ] Crear `apps/web/src/features/agent-panel/components/AgentDashboard.tsx` (Client Component)
  - [ ] Usa `useRealtimeMatches` para escuchar nuevos matches
  - [ ] Al recibir nuevo match: incrementa el badge del cliente correspondiente en el estado local (`hasNewMatches: true`)
  - [ ] Pasar estado inicial de clientes como prop (Server Component → Client Component boundary)

- [ ] **Task 5 — Actualizar agent/page.tsx** (AC: 2)
  - [ ] Pasar `clients` (ya cargados en Server Component) al `AgentDashboard` Client Component
  - [ ] `AgentDashboard` renderiza la lista y escucha Realtime
  - [ ] El Server Component ya no necesita renderizar `ClientsSection` directamente

- [ ] **Task 6 — Typecheck + tests**
  - [ ] `pnpm --filter @reinder/shared typecheck` → 0 errores
  - [ ] `pnpm --filter @reinder/web test --run` → todos PASS
  - [ ] `pnpm --filter @reinder/web typecheck` (nuevos archivos) → 0 errores

## Dev Notes

### 🏗️ Arquitectura: Dónde se dispara la notificación

El flujo es:
```
Mobile swipe → POST /api/v1/swipe-events (auth JWT)
  → INSERT swipe_events
  → if match: INSERT match_events (agentId from bond lookup)
  → if match: notifyAgent(agentId, message) [push]
  → Supabase Realtime emite INSERT en match_events channel [web]
```

### 📦 Supabase Realtime — Client hook pattern

```typescript
// apps/web/src/features/agent-panel/hooks/use-realtime-matches.ts
'use client';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client'; // Browser client
import type { RealtimePostgresInsertPayload } from '@supabase/supabase-js';

export interface MatchPayload {
  id: string;
  buyer_id: string;
  listing_id: string;
  agent_id: string | null;
  created_at: string;
}

export function useRealtimeMatches(
  agentId: string | null,
  onNewMatch: (payload: MatchPayload) => void
): void {
  useEffect(() => {
    if (!agentId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`match_events:agent:${agentId}`)
      .on<MatchPayload>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'match_events',
          filter: `agent_id=eq.${agentId}`,
        },
        (payload: RealtimePostgresInsertPayload<MatchPayload>) => {
          onNewMatch(payload.new);
        }
      )
      .subscribe();

    // CRITICAL: cleanup to prevent memory leaks (identified in test-design-epic-4.md)
    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId, onNewMatch]);
}
```

### 🔔 Swipe events — Persistencia real

```typescript
// POST /api/v1/swipe-events — implementación real
// 1. Auth: user = await supabase.auth.getUser()
// 2. INSERT swipe_events: { buyerId: user.id, listingId, action }
// 3. if (action === 'match'):
//    a. lookup: agentBuyerBonds WHERE buyerId = user.id AND status = 'active'
//    b. INSERT match_events: { buyerId: user.id, listingId, agentId: bond?.agentId }
//    c. notifyAgent(agentId, `Tu cliente ${buyerName} ha hecho match`)
```

### 📁 Archivos a crear/modificar

```
CREAR:
  apps/web/src/features/agent-panel/hooks/use-realtime-matches.ts
  apps/web/src/features/agent-panel/hooks/use-realtime-matches.test.ts
  apps/web/src/features/agent-panel/components/AgentDashboard.tsx
  apps/web/src/features/agent-panel/components/AgentDashboard.test.tsx

MODIFICAR:
  apps/web/src/app/api/v1/swipe-events/route.ts  ← stub → implementación real
  apps/web/src/app/api/v1/swipe-events/route.test.ts  ← actualizar tests
  apps/web/src/features/agent-link/lib/notify-agent.ts  ← actualizar data payload
  apps/web/src/app/(protected)/agent/page.tsx  ← usar AgentDashboard
```

### 🔑 Supabase client vs server

- **`createClient()`** de `@/lib/supabase/client` → browser client (uso en Client Components / hooks)
- **`createClient()`** de `@/lib/supabase/server` → server client (Route Handlers, Server Components)
- El hook `useRealtimeMatches` usa el **browser client** para WebSocket

### 🏷️ Convenciones del proyecto

- Realtime channels: `match_events:agent:{agentId}` (formato `table:role:id`)
- Cleanup en `useEffect` return: SIEMPRE `supabase.removeChannel(channel)` (NFR — memory leak)
- `notifyAgent` sigue patrón silent no-op si no hay token — nunca falla la request principal
- Tests de hooks: usar `vi.mock('@/lib/supabase/client')` para mockear el canal

### Referencias

- [notify-agent.ts] `apps/web/src/features/agent-link/lib/notify-agent.ts` — patrón push existente
- [schema.ts] agentBuyerBonds, matchEvents, swipeEvents, pushTokens
- [test-design-epic-4.md] `_bmad-output/implementation-artifacts/test-design-epic-4.md` — riesgo R2 Realtime leaks
- [architecture.md#Realtime] Supabase Realtime WebSocket pattern
- [Story 4.1] `_bmad-output/implementation-artifacts/4-1-lista-clientes-vinculados-panel-agente.md`

## Dev Agent Record

### Agent Model Used

BAD Pipeline — Gemini 2.5 Pro (Antigravity sequential mode, 2026-04-28)

### Debug Log References

_To be filled by dev agent_

### Completion Notes List

_To be filled by dev agent_

### File List

_To be filled by dev agent_

## Change Log

- **2026-04-28 (BAD Step 1 — story creation):** Story 4.2 creada por el pipeline BAD. Status: ready-for-dev. GH Issue #2.
