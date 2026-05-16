# Story 5.4: Ciclo de Vida del Listing — Retirada y Vendida

Status: ready-for-dev

**GH Issue:** #7

## Story

Como administrador de agencia,
quiero poder marcar manualmente una propiedad como retirada del mercado o como vendida,
para que los compradores vean siempre información actualizada del estado del inventario.

## Acceptance Criteria

1. **Given** un administrador de agencia en el panel de gestión de listings
   **When** selecciona un listing activo y elige "Retirar del mercado"
   **Then** el listing cambia a estado `withdrawn`, se emite `listing.removed`, y desaparece inmediatamente del swipe feed de todos los compradores (FR26)

2. **Given** un administrador de agencia que elige "Marcar como vendida" en un listing activo
   **When** confirma la acción
   **Then** el listing cambia a `sold`, permanece visible en el feed con badge VENDIDA durante 72h y luego se elimina automáticamente (FR27)

3. **And** los compradores que habían hecho match la ven en su historial con badge VENDIDA

4. **And** el evento `listing.updated` se emite y todos los feeds reflejan el cambio en tiempo real

## Tasks / Subtasks

- [ ] **Task 1 — API Route para Cambio de Estado del Listing** (AC: #1, #2, #4)
  - [ ] Crear `PATCH /api/v1/agency/listings/[id]/status` — ruta protegida para `agency_admin`
  - [ ] Acepta body `{ action: 'withdraw' | 'sold' }`
  - [ ] Guard: solo puede el admin de la misma agencia que posee el listing
  - [ ] `withdraw`: UPDATE `listings` SET `status = 'withdrawn'`, `updated_at = NOW()`
  - [ ] `sold`: UPDATE `listings` SET `status = 'sold'`, `sold_at = NOW()`, `updated_at = NOW()`
  - [ ] Realtime event se emite automáticamente por Supabase al cambiar la fila
  - [ ] Archivo: `apps/web/src/app/api/v1/agency/listings/[id]/status/route.ts`

- [ ] **Task 2 — Auto-Eliminación de Listings `sold` a las 72h** (AC: #2)
  - [ ] Crear función SQL `auto_remove_sold_listings()` que cambia a `withdrawn` listings con `status = 'sold'` y `sold_at < NOW() - INTERVAL '72 hours'`
  - [ ] Registrar job `pg_cron`: `0 * * * *` (cada hora, verifica)
  - [ ] Alternativa: usar `pg_cron` diario con query exacta
  - [ ] Archivo: `supabase/migrations/20260516000005_listing_lifecycle.sql`

- [ ] **Task 3 — Añadir Columna `sold_at` al Schema** (AC: #2)
  - [ ] Añadir `sold_at TIMESTAMPTZ` nullable a la tabla `listings` si no existe
  - [ ] Archivo: incluido en la migración de Task 2

- [ ] **Task 4 — Verificar Filtro del Swipe Feed** (AC: #1)
  - [ ] Verificar que `GET /api/v1/listings` NO retorna `withdrawn` listings
  - [ ] El feed debe mostrar `sold` listings durante 72h (con badge) → NO filtrar `sold` del feed base
  - [ ] La lógica de badge `VENDIDA` la maneja el frontend basándose en `status = 'sold'`
  - [ ] Archivo: `apps/web/src/app/api/v1/listings/route.ts` (VERIFY/MODIFY)

- [ ] **Task 5 — Historial de Matches con Badge VENDIDA** (AC: #3)
  - [ ] Verificar que el historial de matches `GET /api/v1/agent/clients/[buyerId]/history` incluye el `listing.status` en la respuesta
  - [ ] Si `listing.status = 'sold'` → el frontend puede mostrar badge VENDIDA
  - [ ] Archivo: `apps/web/src/app/api/v1/agent/clients/[buyerId]/history/route.ts` (VERIFY)

- [ ] **Task 6 — Tests** (AC: todos)
  - [ ] Test: `PATCH /status` con `withdraw` → listing a `withdrawn`, retorna 200
  - [ ] Test: `PATCH /status` con `sold` → listing a `sold` + `sold_at` establecido, retorna 200
  - [ ] Test: admin de otra agencia → 403
  - [ ] Test: buyer o agent role → 403
  - [ ] Test: listing `withdrawn` → NO aparece en `/api/v1/listings` feed
  - [ ] Test: listing `sold` dentro de 72h → SÍ aparece en feed (con status `sold`)
  - [ ] Test: auto_remove_sold_listings → listings sold >72h pasan a `withdrawn`
  - [ ] Archivo: `apps/web/src/app/api/v1/agency/listings/[id]/status/route.test.ts`

## Dev Notes

### Schema Existente (NO reinventar)

```typescript
// listings table ya tiene:
status: text("status").notNull().default("active"), // active | sold | withdrawn | pending_review
// sold_at NO existe aún — se añade en la migración de Task 3
```

### Patrón de API Route a Seguir

Ver `apps/web/src/app/api/v1/agency/crm/connect/route.ts` para:
- Autenticación: `supabase.auth.getUser()`
- Role check: `from('user_profiles').select('role').eq('user_id', user.id)`
- Agency ownership: verificar que el listing pertenece a la agencia del admin
- Drizzle pattern: `db.update(listings).set({...}).where(and(eq(listings.id, id), eq(listings.agencyId, agencyId)))`

### Pattern de Pruebas

Ver `apps/web/src/app/api/v1/agency/crm/connect/route.test.ts` para el patrón de vi.mock y vi.hoisted.

### Realtime Events

Los eventos `listing.updated` / `listing.removed` se emiten automáticamente por Supabase Realtime cuando se actualiza la fila en `listings`. El frontend subscribe a estos eventos para actualizar el swipe feed en tiempo real sin necesidad de polling.

### Lógica del Feed para `sold` Listings

La Story dice que listings `sold` permanecen 72h en el feed con badge VENDIDA. Esto implica:
- El `GET /api/v1/listings` DEBE incluir listings `sold` (para que aparezcan en el feed con badge)
- El feed NO debe incluir `withdrawn` listings
- El frontend muestra badge VENDIDA si `status === 'sold'`
- La auto-eliminación (pg_cron a 72h) NO borra el listing — lo pasa a `withdrawn` (que el feed ya filtra)

### Archivos a Crear/Modificar

```
apps/web/src/
  app/api/v1/agency/listings/[id]/status/
    route.ts                   ← CREATE
    route.test.ts              ← CREATE
  app/api/v1/listings/
    route.ts                   ← VERIFY (add withdrawn filter if missing)
supabase/migrations/
  20260516000005_listing_lifecycle.sql  ← CREATE (sold_at column + auto_remove job)
```

### Previous Story Context (5.2)

Story 5.2 estableció el patrón de migraciones SQL con pg_cron. Seguir ese mismo patrón para `auto_remove_sold_listings()`.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (BAD — Story Step 1: Create)

### Completion Notes List

### File List
