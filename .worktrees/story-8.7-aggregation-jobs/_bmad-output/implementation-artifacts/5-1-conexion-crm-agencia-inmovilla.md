# Story 5.1: Conexión de CRM de Agencia (Inmovilla)

Status: ready-for-dev

**GH Issue:** #11

## Story

Como administrador de agencia,
quiero conectar el CRM de mi agencia a Reinder,
para que mis exclusivas activas se importen automáticamente al swipe feed.

## Acceptance Criteria

1. **Given** un usuario con rol `agency_admin` en "Ajustes > Integración CRM"
   **When** introduce sus credenciales de Inmovilla (API key o webhook URL)
   **Then** se crea un registro en `agency_crm_connections` con tipo de CRM, credenciales encriptadas y estado `pending_sync`
2. **And** Reinder realiza una sincronización inicial de todos los listings activos del CRM
3. **And** el admin ve progreso de importación y, al finalizar, el número de listings importados
4. **And** credenciales incorrectas muestran: "No podemos conectar con tu CRM. Verifica las credenciales"
5. **And** desde ese momento los webhooks del CRM son procesados automáticamente por la Edge Function `crm-webhook`

## Tasks / Subtasks

- [ ] **Task 1 — UI de Integración CRM**
  - [ ] Crear página en `apps/web/src/app/(protected)/agency/settings/crm/page.tsx`
  - [ ] Formulario para "Inmovilla" con inputs: API Key y Webhook Endpoint
  - [ ] Estado de carga y manejo de errores
- [ ] **Task 2 — API Route de Conexión CRM**
  - [ ] Crear `POST /api/v1/agency/crm/connect`
  - [ ] Guard: solo rol `agency_admin`
  - [ ] Verificar conexión con mock API de Inmovilla
  - [ ] Upsert en `agency_crm_connections` con credenciales encriptadas y estado `pending_sync`
- [ ] **Task 3 — Endpoint de Webhook (Edge Function)**
  - [ ] Crear Supabase Edge Function `supabase/functions/crm-webhook`
  - [ ] Manejar payload inicial y validar autenticidad
- [ ] **Task 4 — Sincronización Inicial (Mock)**
  - [ ] Lógica de mock import de 10 listings aleatorios a estado `active`
  - [ ] Actualizar conexión a `status: active` tras sincronización

## Dev Notes

- Usa `pg_crypto` o similar para cifrar la API Key si la vas a guardar en PostgreSQL, o usa un vault de Supabase.
- Mantén la Edge Function mínima: solo recibir, encolar en BD (`crm_webhook_events` si la hay) y devolver 200.
- La importación inicial debe mockearse ya que Inmovilla real no está disponible en dev local, pero la interfaz y la estructura deben prepararse para un API Call real.
