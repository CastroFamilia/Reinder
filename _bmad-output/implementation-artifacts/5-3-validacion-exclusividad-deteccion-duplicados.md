# Story 5.3: Validación de Exclusividad y Detección de Duplicados

Status: ready-for-dev

**GH Issue:** #6

## Story

Como sistema Reinder,
quiero validar exclusividad y detectar duplicados al importar listings,
para que el feed solo contenga propiedades de calidad verificada.

## Acceptance Criteria

1. **Given** un nuevo listing importado desde el CRM (procesado por el worker de Story 5.2)
   **When** el worker de queue lo procesa
   **Then** verifica la referencia catastral (`catastral_ref`) contra la base de datos de Reinder

2. **And** si la misma referencia catastral existe de otra agencia → el listing queda en `pending_review` y el admin recibe alerta (FR24)

3. **And** sin duplicado → el listing pasa a `active` y queda disponible en el feed (FR24)

4. **And** listings en `pending_review` NO aparecen en el swipe feed hasta resolución manual (FR25)

5. **And** si el servicio de catastro no responde → el listing pasa a `active` con flag `exclusivity_unverified: true` para revisión posterior (validación best-effort)

## Tasks / Subtasks

- [ ] **Task 1 — Lógica de Validación de Exclusividad en el Worker** (AC: #1, #2, #3, #5)
  - [ ] Modificar `process_crm_sync_queue()` en la migración para añadir el paso de validación de exclusividad DESPUÉS del upsert
  - [ ] Si `catastral_ref` del payload es NULL o vacío → pasar directamente a `active`, `exclusivity_verified: false`
  - [ ] Si `catastral_ref` presente → buscar en `listings` si existe otro listing de OTRA agencia con el mismo `catastral_ref` y `status = 'active'`
  - [ ] Si duplicado encontrado (otra agencia) → actualizar listing a `status = 'pending_review'`, `exclusivity_verified: false`, notificar admin
  - [ ] Si sin duplicado → actualizar listing a `status = 'active'`, `exclusivity_verified: true`
  - [ ] Si la consulta falla (catastro no disponible) → pasar a `active` con `exclusivity_verified: false` (best-effort)
  - [ ] Archivo: `supabase/migrations/20260516000004_exclusivity_validation.sql`

- [ ] **Task 2 — Exclusión de `pending_review` del Swipe Feed** (AC: #4)
  - [ ] Verificar que el endpoint `GET /api/v1/listings` ya filtra por `status = 'active'`
  - [ ] Si no, añadir la condición `where(eq(listings.status, 'active'))` al query del swipe feed
  - [ ] Archivo: `apps/web/src/app/api/v1/listings/route.ts`

- [ ] **Task 3 — Notificación Admin por Listing en `pending_review`** (AC: #2)
  - [ ] Crear función SQL `notify_admin_exclusivity_conflict(agency_id, listing_id, catastral_ref, conflicting_agency_id)`
  - [ ] Insertar registro en `crm_sync_queue` con `payload.type = 'admin_alert'` para el dashboard del admin
  - [ ] Archivo: incluido en la migración de Task 1

- [ ] **Task 4 — Tests** (AC: todos)
  - [ ] Test: nuevo listing sin catastral_ref → `active`, `exclusivity_verified: false`
  - [ ] Test: nuevo listing con catastral_ref único → `active`, `exclusivity_verified: true`
  - [ ] Test: nuevo listing con catastral_ref duplicado (otra agencia) → `pending_review`, notificación admin
  - [ ] Test: misma agencia mismo catastral_ref → upsert normal (no es duplicado inter-agencia)
  - [ ] Test: validación falla (DB error) → `active` con `exclusivity_verified: false` (best-effort)
  - [ ] Test: listings en `pending_review` no retornados por `/api/v1/listings`
  - [ ] Archivo: `apps/web/src/app/api/v1/listings/__tests__/exclusivity.test.ts`

## Dev Notes

### Contexto de la Arquitectura (Story 5.2)

La validación de exclusividad se integra en el worker `process_crm_sync_queue()` de Story 5.2. En Story 5.2, el upsert se hace con `status = 'active'` sin validación. En Story 5.3, se añade un paso POST-upsert:

```
Upsert listing (status: 'active') 
→ Si catastral_ref presente: verificar duplicados
  → Duplicado de otra agencia: UPDATE status = 'pending_review'
  → Sin duplicado: UPDATE exclusivity_verified = true
  → Error en consulta: UPDATE exclusivity_verified = false (mantener active)
```

### Schema Existente (NO reinventar)

```typescript
// listings table ya tiene:
status: text("status").notNull().default("active"), // active | sold | withdrawn | pending_review
exclusivityVerified: boolean("exclusivity_verified").notNull().default(false),
catastralRef: text("catastral_ref"),
```

### Patrones a Seguir

- **SQL Functions:** Ver `process_crm_sync_queue()` en `supabase/migrations/20260516000003_crm_sync_worker.sql` para el patrón de exception handling y notificación admin
- **Listings API:** Ver `apps/web/src/app/api/v1/listings/route.ts` para el query del feed — verificar si ya filtra por `status = 'active'`
- **Tests:** Ver `apps/web/src/app/api/v1/listings/route.test.ts` para el patrón de testing del endpoint

### Definición de "Duplicado"

Un duplicado es: mismo `catastral_ref` + `status = 'active'` + `agency_id != current_agency_id`.
- El mismo listing de la misma agencia (upsert) NO es duplicado
- Listings en `pending_review`, `sold`, `withdrawn` de otras agencias NO cuentan como duplicados activos

### NFR11 — No impactar el request path

Esta lógica corre en el worker (pg_cron), no en el webhook. El comprador NUNCA espera esta validación.

### Archivos a Crear/Modificar

```
supabase/migrations/
  20260516000004_exclusivity_validation.sql   ← CREATE
apps/web/src/
  app/api/v1/listings/route.ts                ← VERIFY/MODIFY (add pending_review filter)
  app/api/v1/listings/__tests__/
    exclusivity.test.ts                       ← CREATE
```

### Previous Story Context (5.2)

Story 5.2 estableció:
- `crm_sync_queue` table con la cola de procesamiento
- `process_crm_sync_queue()` — el worker donde se integrará la validación
- `notify_admin_crm_failure()` — patrón de notificación a seguir

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (BAD — Story Step 1: Create)

### Completion Notes List

### File List
