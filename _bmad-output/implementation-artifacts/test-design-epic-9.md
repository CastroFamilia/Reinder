# Test Design — Epic 9: Content Optimization & A/B Testing

## 1. Scope

**Epic Goal:** Las agencias pueden experimentar con contenido (portada, título, descripción) y Reinder optimiza automáticamente el rendimiento de los listings. El motor asigna variantes aleatoriamente a compradores, mide el impacto en métricas de engagement (view time, match rate, reaffirm rate), declara ganadora al alcanzar significancia estadística, y auto-promueve la variante ganadora. Incluye recomendaciones proactivas para listings underperforming y generación de variantes con IA (GPT-4o) con human-in-the-loop.

**Stories in scope:** 9.1, 9.2, 9.3, 9.4, 9.5, 9.6

**Key dependencies:**
- Supabase RLS (agency_admin sees own experiments + aggregated results; NEVER individual buyer assignments — NFR8)
- Drizzle ORM (new tables: `listing_experiments`, `experiment_assignments`, `experiment_results`, `experiment_results_timeseries`, `experiment_recommendations`, `ai_generation_usage`)
- SHA-256 deterministic assignment engine (node:crypto, <1ms per call)
- Statistical significance engine (Welch's t-test, z-test for proportions)
- Aggregation pipeline (experiment metrics from `listing_engagement_events` + `swipe_events`)
- pg_cron (weekly recommendation job, periodic significance evaluation)
- OpenAI GPT-4o API (variant generation — Story 9.6)
- Existing tables: `listings`, `agencies`, `user_profiles`, `listing_engagement_events`, `swipe_events`, `listing_analytics_hourly`

---

## 2. Risk Assessment Matrix

| Risk ID | Category | Description | P | I | Score | Mitigation |
|---------|----------|-------------|---|---|-------|------------|
| R1 | SEC | Agency accesses individual buyer assignments → violates NFR8 / privacy | 1 | 3 | **3** | RLS deny-by-default on `experiment_assignments` for `agency_admin`; no UI query path exists |
| R2 | DATA | SHA-256 assignment hash breaks determinism (different variant on retry) → corrupted experiment data | 1 | 3 | **3** | Pure function with zero external state; extensive unit tests with 10K+ sample verification |
| R3 | TECH | Auto-promotion updates wrong listing content → data corruption | 2 | 3 | **6** 🚨 | Transaction wraps promotion; idempotency check; rollback if listing not found; integration test per experiment type |
| R4 | DATA | Statistical engine declares winner prematurely (Type I error) → bad content promoted | 2 | 3 | **6** 🚨 | Dual guardrails: min_sample_size (100) + min_duration (48h); ALL metrics must agree; mixed results = keep running |
| R5 | PERF | Aggregation job query on `listing_engagement_events` is O(n) on all events → slow/timeout | 2 | 2 | **4** | Cumulative recompute bounded by experiment start date; indexed by listing_id + created_at; job runs in background (NFR11) |
| R6 | SEC | OpenAI API key exposed in client bundle or logs | 1 | 3 | **3** | Server-only endpoint; key from env vars; never logged; rate-limited per agency |
| R7 | BUS | AI-generated content contains offensive/prohibited terms → reputational damage | 2 | 3 | **6** 🚨 | Content safety validation; prohibited terms list; human-in-the-loop approval before publish |
| R8 | PERF | AI variant generation >10s timeout → poor UX | 2 | 2 | **4** | 10s hard timeout on OpenAI call; graceful 503 fallback; no rate-limit penalty on failures |
| R9 | DATA | Partial UNIQUE constraint on `listing_experiments` not enforced → multiple active experiments per listing | 1 | 3 | **3** | Constraint created in SQL migration (not Drizzle); API also checks before INSERT (409 response); migration test |
| R10 | TECH | State machine allows invalid transitions → experiments in inconsistent state | 2 | 2 | **4** | Explicit transition map in PATCH handler; invalid → 400; completed/cancelled are terminal states |
| R11 | DATA | Underperformance detection false positives → agencies annoyed by irrelevant recommendations | 2 | 1 | **2** | z-score threshold -1.0 on 2+ metrics; min 50 impressions; 3 per agency per week cap; dismiss action |
| R12 | OPS | Aggregation job fails silently → stale experiment metrics → wrong winner decision | 2 | 3 | **6** 🚨 | Job failure does NOT trigger auto-promotion; significance engine checks `updated_at` freshness; admin alerting |

**High-risk items requiring dedicated test coverage:** R3, R4, R7, R12

---

## 3. Test Coverage Matrix

### Story 9.1 — Schema de Experimentos y Motor de Asignación

| ID | Scenario | Level | Priority | File Hint |
|----|----------|-------|----------|-----------|
| T9.1-01 | `listing_experiments` table exists with all columns and correct types | Migration | **P0** | `schema.test.ts` |
| T9.1-02 | `experiment_assignments` table exists with UNIQUE(experiment_id, buyer_id) | Migration | **P0** | `schema.test.ts` |
| T9.1-03 | `experiment_results` table exists with UNIQUE(experiment_id, variant) | Migration | **P0** | `schema.test.ts` |
| T9.1-04 | Partial UNIQUE constraint: only 1 active experiment per listing (draft/running/paused) | Migration | **P0** | `schema.test.ts` |
| T9.1-05 | `experimentStatusEnum` and `experimentTypeEnum` created correctly | Migration | **P0** | `schema.test.ts` |
| T9.1-06 | `assignVariant()` is deterministic — same input → same output (100 calls) | Unit | **P0** | `assign-variant.test.ts` |
| T9.1-07 | `assignVariant()` distribution is 50/50 ±5% with n=10,000 random UUIDs | Unit | **P0** | `assign-variant.test.ts` |
| T9.1-08 | `assignVariant()` is pure — no side effects, no DB access, no external state | Unit | **P0** | `assign-variant.test.ts` |
| T9.1-09 | `assignVariant()` performance: 1000 calls in <100ms | Unit | **P1** | `assign-variant.test.ts` |
| T9.1-10 | `GET /api/v1/experiments/assignment` — buyer with running experiment → 200 + correct variant | API | **P0** | `experiment-assignment.test.ts` |
| T9.1-11 | `GET /api/v1/experiments/assignment` — no active experiment → 200 + `{ data: null }` | API | **P0** | `experiment-assignment.test.ts` |
| T9.1-12 | `GET /api/v1/experiments/assignment` — unauthenticated → 401 | API | **P0** | `experiment-assignment.test.ts` |
| T9.1-13 | `GET /api/v1/experiments/assignment` — non-buyer role → 403 | API | **P0** | `experiment-assignment.test.ts` |
| T9.1-14 | Assignment upsert is idempotent (same buyer+experiment → same row) | API | **P0** | `experiment-assignment.test.ts` |
| T9.1-15 | `POST /api/v1/experiments` — agency_admin creates experiment in `draft` status | API | **P0** | `experiment-crud.test.ts` |
| T9.1-16 | `POST /api/v1/experiments` — auto-populates `variant_a` from listing content | API | **P0** | `experiment-crud.test.ts` |
| T9.1-17 | `POST /api/v1/experiments` — creates 2 `experiment_results` rows (a + b, zeroed) | API | **P0** | `experiment-crud.test.ts` |
| T9.1-18 | `POST /api/v1/experiments` — listing with active experiment → 409 | API | **P0** | `experiment-crud.test.ts` |
| T9.1-19 | `POST /api/v1/experiments` — buyer role → 403 | API | **P0** | `experiment-crud.test.ts` |
| T9.1-20 | `POST /api/v1/experiments` — listing not owned by agency → 403 | API | **P1** | `experiment-crud.test.ts` |
| T9.1-21 | RLS: agency_admin SELECT on `experiment_assignments` returns 0 rows (NFR8) | API | **P0** | `rls-experiments.test.ts` |
| T9.1-22 | RLS: agency_admin can SELECT own `listing_experiments` | API | **P0** | `rls-experiments.test.ts` |
| T9.1-23 | RLS: agency_admin can SELECT `experiment_results` for own experiments | API | **P0** | `rls-experiments.test.ts` |
| T9.1-24 | RLS: agency_admin CANNOT see other agency's experiments | API | **P0** | `rls-experiments.test.ts` |
| T9.1-25 | Drizzle schema compiles without TypeScript errors (`pnpm typecheck`) | Build | **P0** | CI pipeline |

### Story 9.2 — UI de Creación de Experimento para Agencias

| ID | Scenario | Level | Priority | File Hint |
|----|----------|-------|----------|-----------|
| T9.2-01 | `GET /api/v1/experiments` — agency_admin → 200 + filtered by own agency_id | API | **P0** | `experiment-list.test.ts` |
| T9.2-02 | `GET /api/v1/experiments` — buyer role → 403 | API | **P0** | `experiment-list.test.ts` |
| T9.2-03 | `GET /api/v1/experiments?status=running` — filters by status correctly | API | **P1** | `experiment-list.test.ts` |
| T9.2-04 | `GET /api/v1/experiments/[id]` — own experiment → 200 + experiment + listing + results | API | **P0** | `experiment-detail.test.ts` |
| T9.2-05 | `GET /api/v1/experiments/[id]` — other agency's experiment → 404 | API | **P0** | `experiment-detail.test.ts` |
| T9.2-06 | `PATCH /api/v1/experiments/[id]` — valid transition draft → running → 200 + sets started_at | API | **P0** | `experiment-transitions.test.ts` |
| T9.2-07 | `PATCH /api/v1/experiments/[id]` — invalid transition completed → running → 400 | API | **P0** | `experiment-transitions.test.ts` |
| T9.2-08 | `PATCH /api/v1/experiments/[id]` — running → paused → running (cycle) works | API | **P1** | `experiment-transitions.test.ts` |
| T9.2-09 | `PATCH /api/v1/experiments/[id]` — non-owner agency → 403 | API | **P0** | `experiment-transitions.test.ts` |
| T9.2-10 | `PATCH /api/v1/experiments/[id]` — transition to cancelled sets completed_at | API | **P1** | `experiment-transitions.test.ts` |
| T9.2-11 | `ExperimentStatusBadge` renders correct color per status | Component | **P1** | `experiment-status-badge.test.tsx` |
| T9.2-12 | `ImageVariantPicker` marks image[0] as non-selectable "Variante A" | Component | **P1** | `image-variant-picker.test.tsx` |
| T9.2-13 | `ImageVariantPicker` emits correct image data on selection | Component | **P1** | `image-variant-picker.test.tsx` |
| T9.2-14 | Listing with 1 image → create button disabled + warning message | Component | **P1** | `create-experiment-form.test.tsx` |
| T9.2-15 | Non-agency_admin redirect from `/agency/experiments` | E2E | **P1** | `experiments-auth.test.ts` |

### Story 9.3 — Medición de Impacto y Dashboard de Resultados

| ID | Scenario | Level | Priority | File Hint |
|----|----------|-------|----------|-----------|
| T9.3-01 | Migration: `sum_view_time_sq_ms` column added to `experiment_results` | Migration | **P0** | `schema.test.ts` |
| T9.3-02 | Migration: `experiment_results_timeseries` table with correct UNIQUE and indices | Migration | **P0** | `schema.test.ts` |
| T9.3-03 | Aggregation job: correctly computes impressions per variant from assignments + events | Unit | **P0** | `aggregate-experiment-results.test.ts` |
| T9.3-04 | Aggregation job: correctly sums `total_view_time_ms` by variant | Unit | **P0** | `aggregate-experiment-results.test.ts` |
| T9.3-05 | Aggregation job: correctly computes `sum_view_time_sq_ms` (sum of squares) | Unit | **P0** | `aggregate-experiment-results.test.ts` |
| T9.3-06 | Aggregation job: correctly counts matches and reaffirms per variant | Unit | **P0** | `aggregate-experiment-results.test.ts` |
| T9.3-07 | Aggregation job: ONLY processes experiments with status `running` | Unit | **P0** | `aggregate-experiment-results.test.ts` |
| T9.3-08 | Aggregation job: skips draft/paused/completed/cancelled experiments | Unit | **P0** | `aggregate-experiment-results.test.ts` |
| T9.3-09 | Aggregation job: timeseries UPSERT is idempotent (same hour → update, not duplicate) | Unit | **P1** | `aggregate-experiment-results.test.ts` |
| T9.3-10 | `GET /api/v1/experiments/[id]/results` — returns per-variant metrics + derived rates | API | **P0** | `experiment-results-api.test.ts` |
| T9.3-11 | `GET /api/v1/experiments/[id]/results` — includes timeseries data for charts | API | **P1** | `experiment-results-api.test.ts` |
| T9.3-12 | `GET /api/v1/experiments/[id]/results` — includes baseline_metrics (7-day pre-experiment avg) | API | **P1** | `experiment-results-api.test.ts` |
| T9.3-13 | `GET /api/v1/experiments/[id]/results` — no baseline data → `baseline_metrics: null` | API | **P1** | `experiment-results-api.test.ts` |
| T9.3-14 | `GET /api/v1/experiments/[id]/results` — non-owner → 404 | API | **P0** | `experiment-results-api.test.ts` |
| T9.3-15 | RLS: agency_admin can SELECT timeseries for own experiments only | API | **P0** | `rls-experiments.test.ts` |
| T9.3-16 | Results API returns ONLY aggregated data — zero PII (NFR8) | API | **P0** | `experiment-results-api.test.ts` |

### Story 9.4 — Auto-promoción de Variante Ganadora (Significancia Estadística)

| ID | Scenario | Level | Priority | File Hint |
|----|----------|-------|----------|-----------|
| T9.4-01 | z-test: correct p_a, p_b, p_pooled, SE, z-score, p-value for match_rate | Unit | **P0** | `significance-engine.test.ts` |
| T9.4-02 | z-test: correctly identifies significant result (p < 0.05) | Unit | **P0** | `significance-engine.test.ts` |
| T9.4-03 | z-test: correctly identifies non-significant result (p ≥ 0.05) | Unit | **P0** | `significance-engine.test.ts` |
| T9.4-04 | Welch's t-test: correct mean, variance, t-statistic, df (Welch-Satterthwaite), p-value for view_time | Unit | **P0** | `significance-engine.test.ts` |
| T9.4-05 | Welch's t-test: handles equal variances correctly (degenerates to Student's t) | Unit | **P1** | `significance-engine.test.ts` |
| T9.4-06 | Guardrail: experiment <48h → skipped with reason `MIN_DURATION_NOT_MET` | Unit | **P0** | `significance-guardrails.test.ts` |
| T9.4-07 | Guardrail: n per variant < min_sample_size → skipped with reason `MIN_SAMPLE_SIZE_NOT_MET` | Unit | **P0** | `significance-guardrails.test.ts` |
| T9.4-08 | Guardrail: both met → proceeds to statistical evaluation | Unit | **P0** | `significance-guardrails.test.ts` |
| T9.4-09 | Winner declaration: ALL 3 metrics significant + consistent direction → status=completed + winner_variant set | Integration | **P0** | `auto-promotion.test.ts` |
| T9.4-10 | Mixed results: 2/3 metrics favor B, 1 favors A → no winner declared, stays running | Integration | **P0** | `auto-promotion.test.ts` |
| T9.4-11 | Auto-promotion `cover_image`: listing.images reordered (winner image → index 0) | Integration | **P0** | `auto-promotion.test.ts` |
| T9.4-12 | Auto-promotion `title`: listing.title updated to winner variant's title | Integration | **P0** | `auto-promotion.test.ts` |
| T9.4-13 | Auto-promotion `description`: listing.description updated to winner variant's description | Integration | **P0** | `auto-promotion.test.ts` |
| T9.4-14 | Auto-promotion is idempotent — running twice doesn't corrupt listing data | Integration | **P0** | `auto-promotion.test.ts` |
| T9.4-15 | Significance evaluation does NOT run if aggregation data is stale (>3h since last update) | Unit | **P1** | `significance-guardrails.test.ts` |
| T9.4-16 | z-test with n=0 (zero impressions) → graceful skip, no division by zero | Unit | **P0** | `significance-engine.test.ts` |
| T9.4-17 | Welch's t-test with zero variance → graceful skip | Unit | **P1** | `significance-engine.test.ts` |

### Story 9.5 — Recomendaciones Proactivas para Listings Underperforming

| ID | Scenario | Level | Priority | File Hint |
|----|----------|-------|----------|-----------|
| T9.5-01 | Migration: `experiment_recommendations` table with correct schema, indices, RLS | Migration | **P0** | `schema.test.ts` |
| T9.5-02 | Detection: listing with z-score < -1.0 on 2+ metrics → flagged underperforming | Unit | **P0** | `underperformance-detector.test.ts` |
| T9.5-03 | Detection: listing with z-score > -1.0 → NOT flagged | Unit | **P0** | `underperformance-detector.test.ts` |
| T9.5-04 | Detection: listing with <50 impressions → excluded from analysis | Unit | **P0** | `underperformance-detector.test.ts` |
| T9.5-05 | Detection: listing with active experiment → excluded | Unit | **P0** | `underperformance-detector.test.ts` |
| T9.5-06 | Detection: listing with pending recommendation → excluded | Unit | **P1** | `underperformance-detector.test.ts` |
| T9.5-07 | Detection: agency with 1 listing → uses platform avg as fallback, relaxed threshold -0.5 | Unit | **P1** | `underperformance-detector.test.ts` |
| T9.5-08 | Recommendation type: worst metric view_time → recommends `cover_image` | Unit | **P0** | `recommendation-engine.test.ts` |
| T9.5-09 | Recommendation type: worst metric match_rate (view_time OK) → recommends `title` | Unit | **P0** | `recommendation-engine.test.ts` |
| T9.5-10 | Recommendation type: worst metric reaffirm_rate → recommends `description` | Unit | **P0** | `recommendation-engine.test.ts` |
| T9.5-11 | Recommendation type: 2+ metrics equally bad → recommends `title_and_description` | Unit | **P1** | `recommendation-engine.test.ts` |
| T9.5-12 | Limit: max 3 recommendations per agency per ISO week | Unit | **P0** | `recommendation-engine.test.ts` |
| T9.5-13 | Expiration: pending recommendations >14 days → auto-expired | Unit | **P1** | `recommendation-expiration.test.ts` |
| T9.5-14 | `GET /api/v1/agency/recommendations` — returns pending recommendations sorted by priority_score DESC | API | **P0** | `recommendations-api.test.ts` |
| T9.5-15 | `GET /api/v1/agency/recommendations` — non-agency_admin → 403 | API | **P0** | `recommendations-api.test.ts` |
| T9.5-16 | `PATCH /api/v1/agency/recommendations/[id]` — dismiss → status=dismissed | API | **P1** | `recommendations-api.test.ts` |
| T9.5-17 | `PATCH /api/v1/agency/recommendations/[id]` — accept → links to created experiment | API | **P1** | `recommendations-api.test.ts` |
| T9.5-18 | RLS: agency_admin sees only own agency recommendations | API | **P0** | `rls-experiments.test.ts` |
| T9.5-19 | Priority score normalized to 0–100 range | Unit | **P1** | `recommendation-engine.test.ts` |

### Story 9.6 — Generación de Variantes con IA (Human-in-the-loop)

| ID | Scenario | Level | Priority | File Hint |
|----|----------|-------|----------|-----------|
| T9.6-01 | Migration: `ai_generation_usage` table with correct schema and index | Migration | **P0** | `schema.test.ts` |
| T9.6-02 | `POST /api/v1/experiments/generate-variants` — returns 3 variants with label, title, description | API | **P0** | `generate-variants.test.ts` |
| T9.6-03 | Generated variants respect language of original listing content | API | **P1** | `generate-variants.test.ts` |
| T9.6-04 | Generated titles ≤120 chars, descriptions ≤500 chars | Unit | **P0** | `ai-variant-service.test.ts` |
| T9.6-05 | Content safety: no prohibited terms in generated content | Unit | **P0** | `content-safety.test.ts` |
| T9.6-06 | Rate limiting: 11th request in 24h → 429 + Retry-After header | API | **P0** | `generate-variants.test.ts` |
| T9.6-07 | Rate limiting: failed AI call does NOT increment counter | API | **P0** | `generate-variants.test.ts` |
| T9.6-08 | OpenAI API error (500/timeout) → 503 AI_SERVICE_UNAVAILABLE | API | **P0** | `generate-variants.test.ts` |
| T9.6-09 | Missing OPENAI_API_KEY → 503 AI_NOT_CONFIGURED | API | **P0** | `generate-variants.test.ts` |
| T9.6-10 | Non-agency_admin → 403 | API | **P0** | `generate-variants.test.ts` |
| T9.6-11 | Listing not owned by agency → 404 LISTING_NOT_FOUND | API | **P0** | `generate-variants.test.ts` |
| T9.6-12 | Listing without description → generates title-only variants | API | **P1** | `generate-variants.test.ts` |
| T9.6-13 | AI usage logged: agency_id, listing_id, model, token counts | API | **P1** | `generate-variants.test.ts` |
| T9.6-14 | Total AI call ≤10s (timeout enforced) | API | **P1** | `ai-variant-service.test.ts` |
| T9.6-15 | "Generar con IA" button visible only for title/description experiment types | Component | **P1** | `create-experiment-form.test.tsx` |
| T9.6-16 | "Generar con IA" button hidden for `cover_image` experiment type | Component | **P1** | `create-experiment-form.test.tsx` |

---

## 4. Not in Scope

| Item | Reasoning | Mitigation |
|------|-----------|------------|
| **Swipe feed performance** | Variant assignment is <1ms hash-based; feed rendering tested in Epic 2 | Assignment API has <50ms SLA already covered by T9.1-10 |
| **Supabase infrastructure (pg_cron scheduling)** | Platform-level concern; jobs tested as callable functions | Jobs can be invoked manually for test verification |
| **OpenAI API integration testing** | External service; mocked in all tests | Contract tests verify request/response shapes |
| **Mobile app (React Native) rendering** | Experiment assignment consumed via API; mobile UI is out of scope for this epic | API contract ensures mobile compatibility |

---

## 5. Entry Criteria

- [x] Requirements and acceptance criteria agreed (stories 9.1–9.6 in `ready-for-dev`)
- [ ] Story 9.1 schema migration applied to test environment
- [ ] Existing Epic 8 tables (`listing_engagement_events`, `swipe_events`, `listing_analytics_hourly`) populated with seed data
- [ ] Test environment with Supabase project configured
- [ ] `OPENAI_API_KEY` available in test env (or mock configured)
- [ ] Feature deployed to staging environment
- [ ] Test data factories for agencies, listings, buyers ready

## 6. Exit Criteria

- [ ] All P0 tests passing (100%)
- [ ] All P1 tests passing (≥95% or failures triaged)
- [ ] No open high-severity bugs
- [ ] Zero PII in any agency-facing API response (NFR8 verified)
- [ ] RLS policies verified: agency_admin cannot access `experiment_assignments`
- [ ] Auto-promotion tested for all experiment types (cover_image, title, description)
- [ ] Statistical engine validated against known reference values
- [ ] AI generation rate limiting confirmed functional

---

## 7. Execution Strategy

| Gate | Suite | Trigger |
|------|-------|---------|
| PR | All P0 tests (~65 scenarios): schema validation, assignment engine, API auth/CRUD, RLS, significance engine, aggregation correctness, auto-promotion safety, AI error handling, rate limiting | Every push |
| Nightly | P1 tests (~35 scenarios): distribution verification, performance benchmarks, baseline metrics, timeseries, component rendering, edge cases, AI content quality | Scheduled |

---

## 8. Resource Estimates

| Priority | Count | Hours/Test | Total Hours | Notes |
|----------|-------|------------|-------------|-------|
| P0 | ~65 | 1.5–2.0 | ~100–130 | Complex setup: multi-table seeding, statistical verification, RLS testing |
| P1 | ~35 | 0.5–1.0 | ~18–35 | Standard coverage: component tests, edge cases, performance |
| **Total** | **~100** | **—** | **~118–165** | **~15–21 days (1 engineer)** |

### Prerequisites

**Test Data:**
- Agency + listing factory (with images array, title, description)
- Buyer user factory (authenticated, role=buyer)
- Experiment factory (creates listing_experiments + experiment_results + experiment_assignments)
- Engagement events factory (photo_view, match, reaffirm with configurable variant assignments)

**Tooling:**
- Vitest (unit + integration tests — existing project setup)
- Supabase test helpers (RLS verification with different auth contexts)
- Statistical reference values (pre-computed z-test and t-test results for known inputs)

**Environment:**
- Supabase project with RLS enabled and all migrations applied
- OpenAI API mock (msw or similar for HTTP interception)

---

## 9. Quality Gates

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions)
- **P1 pass rate**: ≥95% (waivers required for failures)
- **High-risk mitigations (R3, R4, R7, R12)**: 100% complete
- **Security (RLS/NFR8)**: 100% — zero individual buyer data exposed to agencies

### Coverage Targets

- **Critical paths (assignment, creation, significance, auto-promotion)**: ≥85%
- **Security/RLS scenarios**: 100%
- **Statistical engine**: ≥90% (verified against reference implementations)
- **Business logic**: ≥75%
- **Edge cases**: ≥50%

### Non-Negotiable Requirements

- [ ] All P0 tests pass
- [ ] No high-risk (≥6) items unmitigated (R3, R4, R7, R12)
- [ ] RLS: `experiment_assignments` returns 0 rows for agency_admin — ALWAYS
- [ ] Auto-promotion is idempotent and transaction-safe
- [ ] Statistical engine handles zero-division and edge cases gracefully
- [ ] AI content generation respects rate limits and safety filters

---

## 10. Mitigation Plans

### R3: Auto-promotion corrupts listing content (Score: 6)

**Mitigation Strategy:** Wrap promotion in database transaction. Verify listing exists and matches experiment's listing_id before update. Test each experiment type independently. Idempotency test: run promotion twice, verify listing state is correct.
**Owner:** Dev Lead
**Timeline:** During Story 9.4 implementation
**Status:** Planned
**Verification:** T9.4-11, T9.4-12, T9.4-13, T9.4-14

### R4: Premature winner declaration (Type I error) (Score: 6)

**Mitigation Strategy:** Dual guardrails enforced in code: min_sample_size (configurable, default 100) and min_duration (48h). ALL three metrics must reach significance AND agree on the same winner. Mixed results = keep running. Verified with known statistical reference values.
**Owner:** Dev Lead
**Timeline:** During Story 9.4 implementation
**Status:** Planned
**Verification:** T9.4-06, T9.4-07, T9.4-08, T9.4-09, T9.4-10

### R7: AI-generated offensive content (Score: 6)

**Mitigation Strategy:** Content safety validation layer: prohibited terms list checked server-side before returning variants. Human-in-the-loop: agency must explicitly approve before creating experiment. Prompt engineering includes explicit content guidelines.
**Owner:** Dev Lead
**Timeline:** During Story 9.6 implementation
**Status:** Planned
**Verification:** T9.6-05

### R12: Stale aggregation data leads to wrong winner (Score: 6)

**Mitigation Strategy:** Significance engine checks `experiment_results.updated_at`. If >3h stale, skips evaluation and logs warning. Admin alerting for consistently stale data. Auto-promotion ONLY triggers through significance engine (never manual).
**Owner:** Dev Lead
**Timeline:** During Stories 9.3 + 9.4 implementation
**Status:** Planned
**Verification:** T9.4-15

---

## 11. Assumptions and Dependencies

### Assumptions

1. `listing_engagement_events` and `swipe_events` tables (Epic 8) are populated and accessible.
2. `listing_analytics_hourly` (Story 8.7) provides pre-experiment baseline metrics.
3. `assignVariant()` uses `node:crypto` (server-side only) — not Web Crypto API.
4. pg_cron is available for scheduling aggregation and recommendation jobs.
5. OpenAI GPT-4o API is accessible from the server environment.
6. The project uses Vitest for testing (consistent with monorepo configuration).

### Dependencies

1. **Story 9.1** — all subsequent stories depend on schema + assignment engine
2. **Story 9.2** — depends on 9.1 (API endpoints + types)
3. **Story 9.3** — depends on 9.1 (schema) + Epic 8 tables (engagement events)
4. **Story 9.4** — depends on 9.3 (aggregated results + sum_view_time_sq_ms)
5. **Story 9.5** — depends on 9.1 (schema) + 8.7 (listing_analytics_hourly)
6. **Story 9.6** — depends on 9.1 (schema) + 9.2 (UI components)

### Risks to Plan

- **Risk**: OpenAI API may be rate-limited or unavailable in CI
  - **Impact**: Story 9.6 tests may fail intermittently
  - **Contingency**: Use HTTP mocks (msw) for all AI tests; no live API calls in CI

---

## 12. Interworking & Regression

| Service/Component | Impact | Regression Scope |
|-------------------|--------|------------------|
| **listings table** | Auto-promotion modifies `images`, `title`, `description` | All listing display tests (Epic 2 feed, Epic 6 SSR pages) |
| **listing_engagement_events** | Aggregation job reads from this table | Epic 8 engagement tracking tests |
| **listing_analytics_hourly** | Baseline metrics + underperformance detection reads | Epic 8 aggregation tests |
| **swipe_events** | Match count aggregation reads | Epic 2 swipe tests |
| **user_profiles + RLS** | Auth guards on all API endpoints | Epic 1 auth tests, Epic 4 agent panel tests |
| **Agency dashboard** | New "Experimentos A/B" navigation item | Epic 5 CRM tests, Epic 8 analytics dashboard tests |

---

## 13. Follow-on Workflows (Manual)

- Run `*atdd` to generate failing P0 tests (separate workflow; not auto-run).
- Run `*automate` for broader coverage once implementation exists.

---

## Appendix

### Knowledge Base References

- `risk-governance.md` — Risk classification framework
- `probability-impact.md` — Risk scoring methodology
- `test-levels-framework.md` — Test level selection
- `test-priorities-matrix.md` — P0–P3 prioritization

### Related Documents

- PRD: `_bmad-output/planning-artifacts/prd.md`
- Epics: `_bmad-output/planning-artifacts/epics.md`
- Architecture: `_bmad-output/planning-artifacts/architecture.md`
- Story 9.1: `_bmad-output/implementation-artifacts/9-1-schema-experimentos-motor-asignacion-variantes.md`
- Story 9.2: `_bmad-output/implementation-artifacts/9-2-ui-creacion-experimento-agencias-portada-ab.md`
- Story 9.3: `_bmad-output/implementation-artifacts/9-3-medicion-impacto-dashboard-resultados-experimento.md`
- Story 9.4: `_bmad-output/implementation-artifacts/9-4-auto-promocion-variante-ganadora-significancia.md`
- Story 9.5: `_bmad-output/implementation-artifacts/9-5-recomendaciones-proactivas-experimentos-underperforming.md`
- Story 9.6: `_bmad-output/implementation-artifacts/9-6-generacion-variantes-titulo-descripcion-ia.md`
- Prior test design: `_bmad-output/implementation-artifacts/test-design-epic-8.md`

---

**Generated by**: BMad TEA Agent — Test Architect Module
**Workflow**: `_bmad/tea/testarch/bmad-testarch-test-design`
**Version**: 5.0 (Step-File Architecture)
**Date**: 2026-06-22
**Mode**: Epic-Level (Phase 4)
**Execution Mode**: Sequential
