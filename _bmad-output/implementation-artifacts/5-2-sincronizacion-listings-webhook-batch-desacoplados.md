# Story 5.2: Sincronización de Listings via Webhook y Batch Desacoplados

Status: ready-for-dev

**GH Issue:** #5

## Story

Como sistema Reinder,
quiero sincronizar listings desde el CRM de forma desacoplada del request path del comprador,
para que la ingesta de inventario no impacte en el rendimiento del swipe feed (NFR11).

## Acceptance Criteria

1. **Given** una agencia con CRM conectado que actualiza un listing en Inmovilla
   **When** el CRM envía un webhook a `supabase/functions/crm-webhook`
   **Then** la Edge Function valida la autenticidad del webhook y encola el evento en `crm_sync_queue`, retornando `200 OK` inmediatamente

2. **And** el worker `pg_cron` (cada 5 min) procesa la queue y hace upsert del listing en `listings`

3. **And** los eventos Realtime `listing.updated` / `listing.removed` se emiten y el feed se actualiza

4. **And** fallos del CRM se reintentan con backoff exponencial (3 intentos: 1s, 2s, 4s) y alertan al admin vía email si persisten después del tercer intento (NFR13)

5. **And** el batch nocturno `pg_cron` re-sincroniza listings no actualizados en las últimas 24h (usando `updatedAt` del listing comparado con el reloj del sistema)

6. **And** NUNCA se bloquea el request path del comprador por procesamiento del CRM — la Edge Function no hace DB queries de listings ni espera al worker

## Tasks / Subtasks

- [ ] **Task 1 — Edge Function `crm-webhook`: Validación y Encolado** (AC: #1, #6)
  - [ ] Implementar validación de autenticidad del webhook: verificar header `X-Inmovilla-Signature` usando HMAC-SHA256 contra el secreto almacenado en `agency_crm_connections.credentials_encrypted`
  - [ ] Buscar la agencia por el `agency_id` del payload (o inferirlo del API Key del header)
  - [ ] Insert en `crm_sync_queue` con `payload`, `agency_id`, `status: 'pending'`, `retry_count: 0`
  - [ ] Retornar `200 OK` inmediatamente tras el insert — NO procesar el listing en el request path
  - [ ] Retornar `401` si la firma es inválida o el API Key no corresponde a ninguna agencia activa
  - [ ] Retornar `400` si el payload no es JSON válido
  - [ ] Archivo: `supabase/functions/crm-webhook/index.ts` (ya existe — reemplazar el TODO stub)

- [ ] **Task 2 — Worker `pg_cron`: Procesador de la Queue** (AC: #2, #4)
  - [ ] Crear función SQL `process_crm_sync_queue()` que:
    - Selecciona hasta 50 items con `status = 'pending'` ordenados por `created_at` ASC
    - Para cada item: parsea el payload e intenta upsert en `listings` por `(agency_id, external_id)`
    - En éxito: marca el item como `completed`
    - En error y `retry_count < 3`: incrementa `retry_count`, actualiza `error_log`, marca como `pending` con backoff (usa `pg_sleep` o programa siguiente run)
    - En error y `retry_count >= 3`: marca como `failed`, llama función de alerta al admin
  - [ ] Registrar el job `pg_cron`: `SELECT cron.schedule('process-crm-queue', '*/5 * * * *', 'SELECT process_crm_sync_queue()')`
  - [ ] Crear función `notify_admin_crm_failure(agency_id, error_log)` que inserta en `admin_notifications` o envía email via Supabase Edge Function `email-notifications` (si existe)
  - [ ] Archivo: `supabase/migrations/YYYYMMDD_crm_sync_worker.sql`

- [ ] **Task 3 — Lógica de Upsert de Listings** (AC: #2, #3)
  - [ ] El upsert en `listings` usa `ON CONFLICT (agency_id, external_id) DO UPDATE` con todos los campos del payload mapeados a la tabla
  - [ ] Campos del payload Inmovilla → columnas de `listings`: mapear `title`, `description`, `price`, `bedrooms`, `size_sqm`, `address`, `city`, `images` (array de URLs), `catastral_ref`
  - [ ] Emit Supabase Realtime `listing.updated` automáticamente si la tabla tiene Realtime habilitado (ya lo tiene por `_bmad-output/planning-artifacts/epics.md` arquitectura)
  - [ ] El campo `status` se establece como `active` en el upsert (la validación de exclusividad se hace en Story 5.3)

- [ ] **Task 4 — Batch Nocturno de Re-sincronización** (AC: #5)
  - [ ] Crear función SQL `batch_resync_stale_listings()` que:
    - Selecciona listings con `updated_at < NOW() - INTERVAL '24 hours'` y `status = 'active'`
    - Para cada uno: encola un evento de re-fetch en `crm_sync_queue` con `payload: {action: 'resync', external_id: ..., agency_id: ...}`
  - [ ] Registrar job `pg_cron`: `SELECT cron.schedule('batch-resync-listings', '0 3 * * *', 'SELECT batch_resync_stale_listings()')`
  - [ ] Archivo: `supabase/migrations/YYYYMMDD_batch_resync_job.sql`

- [ ] **Task 5 — API Route para Disparar Webhook Manualmente (dev/testing)** (Opcional — solo entorno dev)
  - [ ] `POST /api/v1/agency/crm/test-webhook` — permite simular un webhook en entorno dev sin necesidad de Inmovilla real
  - [ ] Solo disponible si `NODE_ENV !== 'production'`
  - [ ] Archivo: `apps/web/src/app/api/v1/agency/crm/test-webhook/route.ts`

- [ ] **Task 6 — Tests** (AC: todos)
  - [ ] Tests unitarios para la Edge Function (Vitest + Deno mocks):
    - Test firma válida → 200 OK + insert en queue
    - Test firma inválida → 401
    - Test payload malformado → 400
    - Test que NO hace queries de listings en el request path
  - [ ] Tests unitarios para el worker SQL (usando pgTAP o test helpers):
    - Test upsert nuevo listing → `active`
    - Test upsert listing existente → actualiza campos
    - Test error en 1er y 2do intento → `retry_count` incrementa
    - Test error en 3er intento → `failed` + notificación admin
  - [ ] Archivos:
    - `supabase/functions/crm-webhook/index.test.ts`
    - `apps/web/src/app/api/v1/agency/crm/webhook/__tests__/processor.test.ts`

## Dev Notes

### Infraestructura Existente (NO reinventar)

- **`crm_sync_queue` table:** Ya definida en `packages/shared/src/db/schema.ts` con campos `id`, `agency_id`, `payload`, `status` (enum: `pending|processing|completed|failed`), `retry_count`, `error_log`, `created_at`, `updated_at`.
- **`agency_crm_connections` table:** Ya definida. Tiene `credentials_encrypted`, `crm_type`, `status` (`pending_sync|active|error`). Usada en Story 5.1.
- **`listings` table:** Ya definida con todos los campos necesarios incluyendo `external_id`, `catastral_ref`, `exclusivity_verified`, `status` (enum: `active|sold|withdrawn|pending_review`), `images` (jsonb array).
- **`supabase/functions/crm-webhook/index.ts`:** Existe como stub. Tiene TODO comments que indican exactamente dónde implementar la validación de firma y el insert en la queue.
- **`_bmad/bmm/config.yaml`:** `output_folder: '_bmad-output'`

### Patrones de Código a Seguir

- **Supabase client en Edge Functions:** Importar desde `https://esm.sh/@supabase/supabase-js@2` con `createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)`
- **API Routes (Next.js 15):** Usar App Router handlers: `export async function POST(req: NextRequest) {...}` — ver patrón en `apps/web/src/app/api/v1/agency/crm/connect/route.ts`
- **DB queries:** Usar Drizzle ORM con `db` from `@/lib/supabase/db` — ver patrón en `apps/web/src/app/api/v1/agency/crm/connect/route.ts`
- **Autenticación en API Routes:** Usar `createClient` from `@/lib/supabase/server` y verificar `supabase.auth.getUser()` — ver patrón en `apps/web/src/app/api/v1/agent/clients/route.ts`
- **Testing (Vitest):** Usar `vi.mock()` para mockear Supabase y Drizzle — ver patrón en `apps/web/src/app/api/v1/agency/crm/connect/route.test.ts`

### Validación de Firma Inmovilla (HMAC-SHA256)

```typescript
// En supabase/functions/crm-webhook/index.ts
const signature = req.headers.get('X-Inmovilla-Signature');
const body = await req.text();
const expectedSig = await computeHMAC(webhookSecret, body); // usar crypto.subtle
if (signature !== expectedSig) return new Response(null, { status: 401 });
const payload = JSON.parse(body);
```

Usar `crypto.subtle.importKey` + `crypto.subtle.sign` (disponible en Deno sin imports adicionales).

### Mapeo de Payload Inmovilla → `listings`

```typescript
// Mapeo de campos del webhook de Inmovilla a la tabla listings:
{
  external_id: payload.ref || payload.id,          // ID del listing en Inmovilla
  title: payload.titulo || payload.title,
  description: payload.descripcion || payload.description,
  price: parseFloat(payload.precio || payload.price || '0'),
  bedrooms: parseInt(payload.habitaciones || payload.bedrooms || '0'),
  size_sqm: parseFloat(payload.superficie || payload.size || '0'),
  address: payload.direccion || payload.address,
  city: payload.municipio || payload.city,
  images: payload.fotos || payload.images || [],
  catastral_ref: payload.referencia_catastral || null,
  status: 'active',  // Story 5.3 se encarga de la validación de exclusividad
}
```

### NFR11 Compliance — La edge function NO debe:

- Hacer queries a la tabla `listings` (el upsert lo hace el worker)
- Esperar al worker con `await`
- Tener lógica de negocio compleja (solo validar firma + enqueue)
- Fallar con 5xx si la queue falla (retornar 202 Accepted en ese caso extremo)

### Archivos a Crear/Modificar

```
supabase/
  functions/
    crm-webhook/
      index.ts                          ← MODIFY (implementar TODO stubs)
      index.test.ts                     ← CREATE
  migrations/
    20260516_crm_sync_worker.sql        ← CREATE (función + pg_cron job)
    20260516_batch_resync_job.sql       ← CREATE (batch function + pg_cron)
apps/web/src/
  app/api/v1/agency/crm/
    test-webhook/route.ts               ← CREATE (dev only)
    webhook/__tests__/processor.test.ts ← CREATE (unit tests del worker)
```

### Contexto del Story 5.1 (Dependencia)

Story 5.1 implementó:
- `POST /api/v1/agency/crm/connect` → crea `agency_crm_connections` con `status: pending_sync`
- `crm-webhook` Edge Function stub (listo para implementar)
- Mock de import inicial de 10 listings aleatorios

En Story 5.2:
- La Edge Function stub ya existe y solo necesita implementar los `TODO` comments
- La sincronización real reemplaza el mock de la import inicial (la primera sincronización pasa por la queue)
- No modificar la ruta `POST /api/v1/agency/crm/connect` — solo la Edge Function y añadir el worker

### Learnings del Story 5.1 (Previous Story Intelligence)

- La Edge Function usa Deno runtime — imports de `https://deno.land/std@0.177.0/http/server.ts`
- `agency_crm_connections` almacena el secreto de webhook en `credentials_encrypted` — deberás desencriptar para validar la firma
- El campo `status` de `agency_crm_connections` debe actualizarse a `active` solo cuando el primer webhook es procesado con éxito (hacerlo en el worker, no en la Edge Function)

### Testing Standards

- Framework: **Vitest** para todo lo que sea TypeScript/Next.js
- Edge Functions: Deno test runner (`deno test`) o Vitest con mocks de Deno
- Mocking pattern: `vi.hoisted()` para mocks de DB — ver `connect/route.test.ts` para el patrón exacto
- No usar `test.skip` para tests que implementas — deben PASAR en verde

### Architecture References

- [Source: epics.md#Story-5.2] Acceptance Criteria completos
- [Source: packages/shared/src/db/schema.ts] — `crmSyncQueue`, `listings`, `agencyCrmConnections` tables
- [Source: supabase/functions/crm-webhook/index.ts] — stub a implementar
- [Source: apps/web/src/app/api/v1/agency/crm/connect/route.ts] — patrón de API Route
- [Source: apps/web/src/app/api/v1/agency/crm/connect/route.test.ts] — patrón de tests Vitest

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (BAD — Story Step 1: Create)

### Debug Log References

### Completion Notes List

### File List
