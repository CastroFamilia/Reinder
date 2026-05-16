# Story 5.4: Ciclo de Vida del Listing — Retirada y Vendida

Status: done

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

- [x] **Task 1 — API Route para Cambio de Estado del Listing** (AC: #1, #2, #4)
  - [x] `PATCH /api/v1/agency/listings/[id]/status` creada con auth + agency ownership guard
  - [x] `withdraw` → `status = 'withdrawn'`
  - [x] `sold` → `status = 'sold'` + `sold_at = NOW()`
  - [x] Guard: solo agency_admin de la agencia dueña del listing
  - [x] Realtime se emite automáticamente por Supabase al cambiar la fila
  - [x] Archivo: `apps/web/src/app/api/v1/agency/listings/[id]/status/route.ts`

- [x] **Task 2 — Auto-Eliminación de Listings `sold` a las 72h** (AC: #2)
  - [x] `auto_remove_sold_listings()` marcas listings `sold` con `sold_at < NOW() - 72h` como `withdrawn`
  - [x] Job `pg_cron`: `0 * * * *` (cada hora)
  - [x] Archivo: `supabase/migrations/20260516000005_listing_lifecycle.sql`

- [x] **Task 3 — Columna `sold_at` en Schema** (AC: #2)
  - [x] `sold_at TIMESTAMPTZ` añadida con DO block idómpotente
  - [x] Incluido en la migración de Task 2

- [x] **Task 4 — Verificar Filtro del Swipe Feed** (AC: #1)
  - [x] Verificado: `withdrawn` NO retornado en el feed
  - [x] `sold` SÍ retornado en el feed (con badge VENDIDA) durante 72h
  - [x] Archivo: `apps/web/src/app/api/v1/listings/route.ts` (verificado)

- [x] **Task 5 — Historial de Matches con Badge VENDIDA** (AC: #3)
  - [x] Verificado: historial de matches incluye `listing.status` en la respuesta
  - [x] Frontend puede mostrar badge VENDIDA si `status === 'sold'`

- [x] **Task 6 — Tests** (AC: todos)
  - [x] 11 tests cubriendo ACs 1-4 + authorization guards
  - [x] 159 regression tests: 0 fallos
  - [x] Archivo: `apps/web/src/app/api/v1/agency/listings/[id]/status/route.test.ts`

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

Claude Sonnet 4.6 (BAD — Story Step 3-4: Develop + Code Review)

### Completion Notes List

- ✅ Task 1: `PATCH /api/v1/agency/listings/[id]/status` con auth + ownership guard + Drizzle update
- ✅ Task 2+3: Migración con `auto_remove_sold_listings()` + `sold_at` column + pg_cron hourly job
- ✅ Task 4+5: Verificados mediante tests que el feed filtra `withdrawn` y los matches incluyen `listing.status`
- ✅ Task 6: 11 tests de autorización y lifecycle. 159 regression tests: 0 fallos.
- Code review: sin HIGH o MEDIUM issues.

### File List

- `apps/web/src/app/api/v1/agency/listings/[id]/status/route.ts` (NEW)
- `apps/web/src/app/api/v1/agency/listings/[id]/status/route.test.ts` (NEW)
- `supabase/migrations/20260516000005_listing_lifecycle.sql` (NEW)
