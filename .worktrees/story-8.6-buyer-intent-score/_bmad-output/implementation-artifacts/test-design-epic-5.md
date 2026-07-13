# Test Design — Epic 5: Gestión de Listings e Integración CRM
_Generated: 2026-04-30 | Mode: Epic-Level | Stack: fullstack (Next.js 15 + Expo RN + Supabase)_

---

## 1. Scope

**Epic Goal:** Las agencias pueden conectar su CRM (Inmovilla) para importar exclusivas automáticamente. El sistema sincroniza y valida listings de forma desacoplada y gestiona el ciclo de vida completo de cada propiedad sin afectar el rendimiento de la UI del comprador.

**Stories in scope:** 5.1, 5.2, 5.3, 5.4

**Key dependencies:**
- Supabase Edge Functions (webhook listener)
- `pg_cron` para colas asíncronas
- Tablas: `agencies`, `agency_crm_connections`, `listings`

---

## 2. Risk Assessment Matrix

| Risk ID | Category | Description | P | I | Score | Mitigation |
|---------|----------|-------------|---|---|-------|-----------|
| R1 | TECH | Sobrecarga de la BD por picos de webhooks de CRM | 2 | 3 | **6** 🚨 | Webhook endpoint usa return inmediato y `pg_cron` batching |
| R2 | PERF | Inserciones masivas bloquean consultas de feed de compradores | 1 | 3 | **3** | Worker desacoplado, batching en low-traffic periods |
| R3 | DATA | Duplicidad de propiedades por misma referencia catastral | 3 | 2 | **6** 🚨 | Unique constraint + worker validation logic poniendo `pending_review` |
| R4 | BUS | listings no sincronizados tras fallo temporal del CRM | 2 | 3 | **6** 🚨 | Exponencial backoff + daily catch-up job |
| R5 | SEC | Webhook payload tampering | 1 | 3 | **3** | Validación de firma del webhook / API key |

**High-risk items requiring dedicated test coverage before implementation:** R1, R3, R4

---

## 3. Test Coverage Matrix

### Story 5.1 — Conexión de CRM Agencia (Inmovilla)

| ID | Scenario | Level | Priority | File Hint |
|----|----------|-------|----------|-----------|
| T5.1-01 | Configurar Inmovilla con credenciales correctas activa `pending_sync` | API | **P0** | `crm-connection.test.ts` |
| T5.1-02 | Credenciales incorrectas son rechazadas | API | **P0** | `crm-connection.test.ts` |
| T5.1-03 | Credenciales en la tabla `agency_crm_connections` se guardan encriptadas | DB | **P1** | `crm-security.test.ts` |

### Story 5.2 — Sincronización de Listings via Webhook y Batch

| ID | Scenario | Level | Priority | File Hint |
|----|----------|-------|----------|-----------|
| T5.2-01 | Edge Function responde 200 INMEDIATAMENTE tras encolar payload | Integration | **P0** | `webhook-perf.test.ts` |
| T5.2-02 | `pg_cron` worker procesa evento encolado y hace upsert del listing | Integration | **P0** | `worker-sync.test.ts` |
| T5.2-03 | Reintentos exponenciales en caso de fallo DB transitorio (hasta 3x) | Unit | **P1** | `worker-retry.test.ts` |

### Story 5.3 — Validación de Exclusividad y Detección de Duplicados

| ID | Scenario | Level | Priority | File Hint |
|----|----------|-------|----------|-----------|
| T5.3-01 | Referencia catastral nueva → listing `active` | Unit | **P0** | `listing-validation.test.ts` |
| T5.3-02 | Referencia catastral existente en otra agencia → listing `pending_review` | Unit | **P0** | `listing-validation.test.ts` |
| T5.3-03 | Si catastro timeout → listing `active` con `exclusivity_unverified: true` | Unit | **P1** | `listing-validation.test.ts` |

### Story 5.4 — Ciclo de Vida del Listing (Retirada y Vendida)

| ID | Scenario | Level | Priority | File Hint |
|----|----------|-------|----------|-----------|
| T5.4-01 | Admin retira listing → status `withdrawn`, se oculta del feed | API/UI | **P0** | `listing-lifecycle.test.ts` |
| T5.4-02 | Admin marca vendida → status `sold`, badge "VENDIDA", visible en historial de matches | API/UI | **P0** | `listing-lifecycle.test.ts` |
| T5.4-03 | Listing `sold` se auto-elimina del feed tras 72h | API/Cron | **P1** | `listing-cleanup.test.ts` |

---

## 4. Execution Strategy

| Gate | Suite | Trigger |
|------|-------|---------|
| PR | All P0 + P1 Vitest tests (unit + component) | Every push |
| Nightly | Integración E2E completa del Webhook | Scheduled |

Estimated effort: P0 tests ~25h, P1 tests ~15h. Total: **40h** para el test suite de Epic 5.

---

## 5. Quality Gates

- P0 pass rate = **100%** (blocks merge)
- P1 pass rate ≥ **95%**
- Coverage target ≥ **80%** en Supabase Edge Functions y Workers

---

## 6. Open Assumptions

1. La capa de webhook está securizada vía API Key y soportada en la infraestructura actual.
2. `pg_cron` extension está habilitada en Supabase EU-West.
