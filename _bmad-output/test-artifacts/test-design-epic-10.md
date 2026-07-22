---
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
lastSaved: '2026-07-15'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md'
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture.md'
---

# Test Design: Epic 10 — Personalized Content Layer

**Date:** 2026-07-15
**Author:** SantiCas
**Status:** Draft

---

## Executive Summary

**Scope:** Epic-level test design for Epic 10 — Personalized Content Layer

Epic 10 implementa la ventaja competitiva central de Reinder: cada comprador ve la versión del listing más relevante según su perfil implícito de comportamiento. El `buyer_preference_vector` se infiere del historial de swipes/engagement, se calcula un `listing_fit_score` por par comprador×listing, y el swipe feed adapta la foto de portada y los highlights de la descripción — todo con consentimiento GDPR explícito y sin cookies cross-site.

**FRs cubiertos:** FR-E10-1 a FR-E10-5
**NFRs críticos:** NFR8 (datos internos exclusivamente — sin cookies cross-site), NFR2 (selección de variante <5ms)

**Risk Summary:**

- Total risks identified: 12
- High-priority risks (≥6): 4
- Critical categories: SEC, PERF, DATA, TECH

**Coverage Summary:**

- P0 scenarios: 18 (~36–54 hours)
- P1 scenarios: 14 (~14–21 hours)
- P2/P3 scenarios: 16 (~8–14 hours)
- **Total effort**: ~58–89 hours (~8–12 days)

---

## Not in Scope

| Item | Reasoning | Mitigation |
| --- | --- | --- |
| **Generación de variantes con IA (Epic 9.6)** | Pertenece a Epic 9, no a personalización implícita | Cubierto en test design de Epic 9 |
| **Motor de A/B testing de agencias (Epic 9)** | Epic 9 tiene su propio motor de experimentos — Epic 10 es personalización automática por perfil | Interworking validado en sección de regresión |
| **Infraestructura de observabilidad (Sentry/PostHog)** | Cubierto en Epic 7 — test design de plataforma | Smoke tests incluyen verificación de que eventos se trackean |
| **CRM sync pipeline** | Cubierto en Epic 5; Epic 10 asume listings ya disponibles | Precondición verificada en entry criteria |
| **Registro/Autenticación de comprador** | Cubierto en Epic 1 — test design base | Precondición: buyer autenticado con consentimiento GDPR |

---

## Risk Assessment

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-001 | SEC | Datos del preference_vector expuestos a agencias vía RLS misconfiguration — fuga de datos de comportamiento individual del comprador | 2 | 3 | 6 | RLS policy tests automatizados; audit trail de accesos; test de penetración con rol `agent` intentando leer `buyer_preference_vectors` | QA + Sec | Pre-release |
| R-002 | PERF | Selección de variante personalizada excede 5ms en hot path del swipe feed, causando jank en animaciones 60fps | 3 | 2 | 6 | Benchmark automatizado de latencia de lookup `listing_fit_scores`; pre-computar scores con `pg_cron`; cache layer si P99 > 3ms | Dev + QA | Sprint E10.3 |
| R-003 | DATA | Preference vector desincronizado: aggregation job falla silenciosamente dejando vectores stale sin detección | 2 | 3 | 6 | Monitoring de freshness del vector (last_updated timestamp); alerta si vector > 48h stale; test de resiliencia del cron job | Dev + Ops | Sprint E10.1 |
| R-004 | SEC | Consentimiento GDPR no verificado en tiempo real: comprador revoca consentimiento pero personalización persiste hasta próximo batch | 2 | 3 | 6 | Revocación de consentimiento invalida vector inmediatamente (no batch); test E2E de flujo revocación → fallback instantáneo | Dev + Legal | Sprint E10.5 |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R-005 | TECH | Cardinalidad explosiva en `listing_fit_scores`: compradores activos × listings activos genera tabla masiva que degrada performance de `pg_cron` job | 2 | 2 | 4 | Limitar cálculo a compradores activos últimos 30 días × listings activos; partitioning; benchmark con dataset 10x | Dev |
| R-006 | DATA | Preference vector de usuario nuevo (cold start) genera recomendaciones irrelevantes o vacías sin fallback adecuado | 2 | 2 | 4 | Fallback explícito a portada por defecto de agencia; threshold mínimo de swipes para activar personalización | Dev |
| R-007 | BUS | Personalización selecciona portada subóptima que reduce engagement vs. portada manual de la agencia | 1 | 3 | 3 | Métricas de engagement pre/post personalización; kill switch por listing/agencia; A/B test personalizado vs. genérico | Product |
| R-008 | TECH | Conflicto Epic 9 ↔ Epic 10: A/B test de agencia y personalización intentan seleccionar portadas diferentes para el mismo listing | 2 | 2 | 4 | Regla de precedencia documentada: A/B test de agencia (Epic 9) > personalización automática (Epic 10); test de interacción | Dev |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
| --- | --- | --- | --- | --- | --- | --- |
| R-009 | OPS | pg_cron job de aggregation falla en window de mantenimiento de Supabase | 1 | 2 | 2 | Monitor + retry automático |
| R-010 | BUS | Comprador percibe personalización como "vigilancia" y desinstala la app | 1 | 2 | 2 | UX copy claro en settings; opt-out visible |
| R-011 | TECH | Cambio en schema de swipe_events (Epic 8) rompe aggregation job del preference_vector | 1 | 2 | 2 | Contract test entre Epic 8 output y Epic 10 input |
| R-012 | OPS | Dashboard de analytics de personalización muestra métricas incorrectas por race condition en materialized views | 1 | 1 | 1 | Monitor; refresh periódico de views |

### Risk Category Legend

- **TECH**: Technical/Architecture (flaws, integration, scalability)
- **SEC**: Security (access controls, auth, data exposure)
- **PERF**: Performance (SLA violations, degradation, resource limits)
- **DATA**: Data Integrity (loss, corruption, inconsistency)
- **BUS**: Business Impact (UX harm, logic errors, revenue)
- **OPS**: Operations (deployment, config, monitoring)

---

## Entry Criteria

- [ ] Epic 8 completa (masa crítica de `engagement_events` disponible)
- [ ] Revisión legal GDPR explícita del modelo de personalización completada
- [ ] Schema de `buyer_preference_vectors` y `listing_fit_scores` migrado en entorno de test
- [ ] `pg_cron` configurado y operativo en entorno de staging
- [ ] Seed data: ≥50 compradores con ≥100 swipe_events cada uno + ≥200 listings activos
- [ ] RLS policies para las nuevas tablas definidas y desplegadas
- [ ] Consentimiento GDPR flow de onboarding operativo (Epic 1 prerequisite)
- [ ] Feature flag `personalization_enabled` operativo para rollout gradual

## Exit Criteria

- [ ] Todos los tests P0 pasando (100%)
- [ ] Todos los tests P1 pasando (≥95% — failures triaged)
- [ ] No hay bugs abiertos de severidad high/critical
- [ ] Latencia de selección de variante P99 < 5ms verificada en staging
- [ ] RLS audit: rol `agent` y `agency_admin` NO pueden leer `buyer_preference_vectors`
- [ ] Flujo GDPR revocación → fallback verificado E2E
- [ ] Métricas de engagement personalizado vs. genérico baseline capturadas
- [ ] Cobertura de tests acordada como suficiente por QA y Dev

---

## Test Coverage Plan

> **Note:** P0/P1/P2/P3 = priority and risk classification, NOT execution timing. See Execution Strategy for when tests run.

### P0 (Critical)

**Criteria**: Blocks core journey + High risk (≥6) + No workaround

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| --- | --- | --- | --- | --- | --- |
| FR-E10-1: Generación de preference_vector desde historial de swipes | API + Unit | R-003 | 4 | QA | Vector generado correctamente desde swipe_events; edge cases: 0 swipes, 1 swipe, 1000 swipes |
| FR-E10-1: Persistencia del vector en `buyer_preference_vectors` | API | R-003 | 2 | QA | Vector guardado, actualizado, y con timestamp correcto |
| FR-E10-2: Cálculo de listing_fit_score | Unit + API | R-005 | 3 | Dev | Score correcto para diferentes vectores; boundary values |
| FR-E10-3: Selección de portada personalizada en swipe feed | E2E + API | R-002 | 3 | QA | Feed muestra portada personalizada según fit_score; fallback para usuario nuevo |
| FR-E10-5: GDPR — Revocación de consentimiento desactiva personalización | E2E | R-004 | 2 | QA | Revocación desde perfil → feed usa portada por defecto inmediatamente |
| RLS: buyer_preference_vectors no accesible por roles agent/agency_admin | API | R-001 | 2 | QA | SELECT con token agent → 0 rows; INSERT/UPDATE → denied |
| RLS: listing_fit_scores solo lectura para buyer autenticado (su propio score) | API | R-001 | 2 | QA | Buyer solo ve sus propios scores; no puede ver scores de otros buyers |

**Total P0**: 18 tests, ~36–54 hours

### P1 (High)

**Criteria**: Important features + Medium risk (3-4) + Common workflows

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| --- | --- | --- | --- | --- | --- |
| FR-E10-2: pg_cron job ejecuta cálculo batch de fit_scores | API | R-005 | 3 | QA | Job completa sin error; tabla actualizada; performance con 10x data |
| FR-E10-3: Fallback a portada de agencia cuando no hay preference_vector | API + E2E | R-006 | 2 | QA | Usuario nuevo ve portada por defecto; threshold mínimo de swipes respetado |
| FR-E10-4: Orden de highlights de descripción adaptado por perfil | API | - | 3 | QA | Highlights reordenados según vector; contenido original preservado |
| FR-E10-5: Toggle de personalización en Perfil del comprador | E2E | - | 2 | QA | Activar/desactivar → feed cambia entre personalizado y genérico |
| Interacción Epic 9 ↔ Epic 10: A/B test activo + personalización | API | R-008 | 2 | Dev | A/B test de agencia tiene precedencia sobre personalización |
| FR-E10-1: Aggregation job resilience — retry tras fallo | API | R-003 | 2 | Dev | Job falla → retry automático; vector no queda corrupto |

**Total P1**: 14 tests, ~14–21 hours

### P2 (Medium)

**Criteria**: Secondary features + Low risk (1-2) + Edge cases

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| --- | --- | --- | --- | --- | --- |
| FR-E10-1: Vector actualizado tras nuevos swipes (recalculación incremental) | Unit | - | 3 | Dev | Vector refleja actividad reciente; no crece ilimitadamente |
| FR-E10-2: listing_fit_score con listing sin fotos o con 1 sola foto | Unit | - | 2 | Dev | Edge case: no photo → skip personalización; 1 foto → sin cambio |
| FR-E10-3: Performance benchmark — selección de variante < 5ms P99 | API (Perf) | R-002 | 2 | QA | Benchmark con dataset realista (1000 buyers × 500 listings) |
| FR-E10-5: GDPR — Export de datos incluye preference_vector | API | R-004 | 1 | QA | Data export (GDPR Art. 20) incluye vector del comprador |
| FR-E10-5: GDPR — Deletion de cuenta elimina preference_vector y fit_scores | API | R-004 | 1 | QA | Account deletion cascade limpia todas las tablas de personalización |
| Contract: Schema swipe_events → aggregation job (Epic 8 ↔ 10) | Unit | R-011 | 2 | Dev | Cambios en schema de swipe_events detectados por contract test |

**Total P2**: 11 tests, ~6–10 hours

### P3 (Low) — Run on-demand

**Criteria**: Nice-to-have + Exploratory + Performance benchmarks

| Requirement | Test Level | Test Count | Owner | Notes |
| --- | --- | --- | --- | --- |
| Scalability: pg_cron job con dataset 10x (5000 buyers × 2000 listings) | API (Perf) | 1 | QA | Benchmark de duración del batch job |
| UX: Percepción de personalización por comprador (exploratory) | E2E | 1 | QA | Verificar que personalización no es "creepy" — portada cambia de forma natural |
| Analytics: Métricas de engagement personalizado vs. genérico baseline | E2E | 1 | QA | Dashboard muestra métricas correctas; filtros funcionan |
| Edge: Comprador con historial 100% reject (todos dislike) | Unit | 1 | Dev | Vector refleja preferencias negativas; no genera error |
| Edge: Listing eliminado mientras fit_score existe — cleanup | API | 1 | Dev | Foreign key cascade o cleanup job funciona correctamente |

**Total P3**: 5 tests, ~2–4 hours

---

## Execution Strategy

**Philosophy**: Run everything in PRs unless expensive/long-running. Playwright parallelization keeps 48 tests under 10–15 min.

### Every PR (~10–15 min with Playwright parallel)

All P0, P1, and P2 functional tests:
- Preference vector generation and persistence (API + Unit)
- listing_fit_score calculation (Unit + API)
- Personalized feed response (E2E)
- RLS policy enforcement for `buyer_preference_vectors` and `listing_fit_scores` (API)
- GDPR revocation → fallback (E2E)
- Highlights reordering (API)
- Toggle personalización in Perfil (E2E)
- Epic 9 ↔ Epic 10 precedence (API)
- Aggregation job retry (API)
- Cold start fallback (API + E2E)
- Contract tests swipe_events schema (Unit)

### Nightly (~30–60 min)

Performance and benchmark tests:
- Selección de variante P99 < 5ms benchmark (k6)
- pg_cron aggregation job duration benchmark
- GDPR export and deletion cascade (API — longer setup)

### Weekly/On-demand (~1–2 hours)

Scalability and exploratory:
- pg_cron job con dataset 10x (5000 buyers × 2000 listings)
- UX exploratory: personalización no percibida como invasiva
- Analytics dashboard metrics accuracy
- Edge cases: 100% reject history, listing eliminated during fit_score existence

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes |
| --- | --- | --- | --- | --- |
| P0 | 18 | 2.0–3.0 | ~36–54 | RLS, GDPR, and E2E flows — complex setup |
| P1 | 14 | 1.0–1.5 | ~14–21 | Standard API + E2E coverage |
| P2 | 11 | 0.5–1.0 | ~6–10 | Unit tests + benchmarks |
| P3 | 5 | 0.5–0.75 | ~2–4 | Exploratory + edge cases |
| **Total** | **48** | **-** | **~58–89** | **~8–12 days** |

### Prerequisites

**Test Data:**

- `BuyerWithSwipeHistory` factory: genera buyer con N swipe_events (configurable, faker-based, auto-cleanup)
- `ActiveListingsSet` factory: genera set de listings con fotos y descripciones variadas
- `PreferenceVectorSeed` fixture: preference_vectors pre-calculados para tests determinísticos
- `GDPRConsentedBuyer` fixture: buyer con consentimiento GDPR activo (setup/teardown)

**Tooling:**

- Playwright para E2E tests del swipe feed con personalización
- Vitest/Jest para unit tests de cálculos de vector y fit_score
- pg_tap o SQL test runner para RLS policy tests
- k6 o Artillery para performance benchmarks de latencia de lookup

**Environment:**

- Supabase staging con pg_cron habilitado
- Dataset seed de ≥50 buyers × ≥200 listings con swipe_events
- Feature flag `personalization_enabled` = true en staging
- Clock mock capability para tests de freshness del vector

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions)
- **P1 pass rate**: ≥95% (waivers required for failures)
- **P2/P3 pass rate**: ≥90% (informational)
- **High-risk mitigations**: 100% complete or approved waivers

### Coverage Targets

- **Critical paths**: ≥80% (preference vector generation → fit score → personalized feed)
- **Security scenarios**: 100% (RLS + GDPR revocation)
- **Business logic**: ≥70% (vector calculation, fit score, fallback logic)
- **Edge cases**: ≥50% (cold start, empty data, cascading deletes)

### Non-Negotiable Requirements

- [ ] All P0 tests pass
- [ ] No high-risk (≥6) items unmitigated
- [ ] Security tests (SEC category) pass 100%
- [ ] Performance: selección de variante P99 < 5ms (NFR2)
- [ ] Privacy: RLS audit completo para `buyer_preference_vectors` y `listing_fit_scores`
- [ ] GDPR: Revocación de consentimiento → fallback inmediato verificado

---

## Mitigation Plans

### R-001: Datos del preference_vector expuestos a agencias vía RLS misconfiguration (Score: 6)

**Mitigation Strategy:** Tests automatizados de RLS policies que verifican que los roles `agent` y `agency_admin` NO pueden realizar SELECT, INSERT, UPDATE ni DELETE en `buyer_preference_vectors`. Audit trail de accesos con Supabase logging. Test de penetración con token de agente intentando acceder a tablas de personalización.
**Owner:** QA + Security
**Timeline:** Sprint E10.1
**Status:** Planned
**Verification:** Suite de RLS tests pasa al 100%; pen test report limpio

### R-002: Selección de variante personalizada excede 5ms en hot path (Score: 6)

**Mitigation Strategy:** Benchmark automatizado de latencia del lookup en `listing_fit_scores` con dataset realista (1000 buyers × 500 listings). Pre-computar scores con `pg_cron` (nunca calcular en request path). Si P99 > 3ms, implementar cache layer (Redis o in-memory). Índice compuesto `(buyer_id, listing_id)` con `INCLUDE (photo_index, score)`.
**Owner:** Dev + QA
**Timeline:** Sprint E10.3
**Status:** Planned
**Verification:** Benchmark P99 < 5ms en 3 ejecuciones consecutivas en staging

### R-003: Preference vector desincronizado por fallo silencioso del aggregation job (Score: 6)

**Mitigation Strategy:** Campo `last_updated` en `buyer_preference_vectors` con alerta si > 48h stale. Monitoring del cron job con alerta en Sentry si falla. Test de resiliencia: simular fallo de cron → verificar retry automático → verificar que vector no queda corrupto. Dashboard de freshness de vectores.
**Owner:** Dev + Ops
**Timeline:** Sprint E10.1
**Status:** Planned
**Verification:** Cron job monitoreado; alerta dispara en < 5min tras fallo; test de resiliencia pasa

### R-004: Consentimiento GDPR no verificado en tiempo real tras revocación (Score: 6)

**Mitigation Strategy:** Revocación de consentimiento desde Perfil ejecuta inmediatamente: (1) soft-delete del preference_vector, (2) invalidación de fit_scores cached, (3) próximo request al feed usa portada por defecto. NO esperar al próximo batch de aggregation. Test E2E: revocar → refresh feed → verificar portada genérica. Test de data export y deletion cascade para GDPR Art. 17 y Art. 20.
**Owner:** Dev + Legal
**Timeline:** Sprint E10.5
**Status:** Planned
**Verification:** Test E2E de flujo revocación → fallback < 1s; data deletion audit limpio

---

## Assumptions and Dependencies

### Assumptions

1. Epic 8 (Engagement Analytics) está completa y hay masa crítica de `swipe_events` y `engagement_events` para generar preference_vectors significativos
2. El consentimiento GDPR capturado en onboarding (Epic 1) cubre el uso de datos de comportamiento para personalización interna
3. Supabase staging tiene pg_cron habilitado y operativo para ejecutar aggregation jobs
4. El schema de `swipe_events` (Epic 8) es estable y no cambiará durante la implementación de Epic 10
5. La revisión legal GDPR del modelo de personalización ha sido completada y aprobada antes de comenzar QA

### Dependencies

1. **Epic 8 completa** — `engagement_events` y `swipe_events` con volumen suficiente — Requerido antes de Sprint E10.1
2. **Revisión legal GDPR** — Aprobación explícita del modelo de personalización por datos internos — Requerida antes de Sprint E10.5
3. **Epic 9 stories 9.1-9.2** — Para testear interacción A/B test ↔ personalización (R-008) — Requerida antes de tests de interworking
4. **Feature flag infrastructure** — `personalization_enabled` operativo para rollout gradual — Requerido antes de Sprint E10.3

### Risks to Plan

- **Risk**: Revisión legal GDPR se retrasa y bloquea Story 10.5
  - **Impact**: No se puede validar flujo de revocación de consentimiento; release parcial sin GDPR compliance
  - **Contingency**: Ejecutar P0 y P1 de Stories 10.1-10.4 en paralelo; Story 10.5 como release blocker independiente

- **Risk**: Schema de swipe_events cambia en Epic 8 tardíamente
  - **Impact**: Aggregation job de preference_vector falla; vectores incorrectos
  - **Contingency**: Contract test (R-011) detecta cambio; fix rápido del mapper en aggregation job

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
| --- | --- | --- |
| **Swipe Feed API (Epic 2)** | Feed ahora incluye `personalized_photo_index` y `highlight_order` — cambio en response shape | Tests E2E de swipe feed existentes deben pasar con nuevo campo (backward compatible) |
| **Epic 8 — Engagement Analytics** | `swipe_events` y `engagement_events` son input del aggregation job | Schema stability; volumen de datos; contract test |
| **Epic 9 — A/B Testing** | Regla de precedencia: A/B test agencia > personalización automática | Test de interacción cuando ambos están activos para el mismo listing |
| **Epic 1 — Auth & GDPR Consent** | Consentimiento GDPR es prerequisito; revocación debe invalidar personalización | Tests de revocación del onboarding consent flow |
| **Supabase RLS** | Nuevas tablas `buyer_preference_vectors` y `listing_fit_scores` requieren RLS policies | Suite de RLS regression para todas las tablas existentes + nuevas |
| **pg_cron** | Nuevo cron job para aggregation y fit_score pre-computation | No debe interferir con cron jobs existentes (CRM sync, etc.) |

---

---

## Appendix

### Knowledge Base References

- `risk-governance.md` — Risk classification framework
- `probability-impact.md` — Risk scoring methodology
- `test-levels-framework.md` — Test level selection
- `test-priorities-matrix.md` — P0-P3 prioritization

### Related Documents

- PRD: `_bmad-output/planning-artifacts/prd.md`
- Epic: `_bmad-output/planning-artifacts/epics.md` (lines 386-425)
- Architecture: `_bmad-output/planning-artifacts/architecture.md`

---

**Generated by**: BMad TEA Agent — Test Architect Module
**Workflow**: `_bmad/tea/testarch/bmad-testarch-test-design`
**Version**: 4.0 (BMad v6)
