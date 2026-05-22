# Test Design — Epic 8: Engagement Intelligence

## 1. Scope

**Epic Goal:** Reinder instrumenta el micro-comportamiento del comprador (tiempo por foto, scroll depth, reafirmaciones de match) y lo convierte en inteligencia accionable para agentes y agencias. Dashboards de analytics por listing, buyer intent score, y aggregation jobs para read models pre-agregados.

**Stories in scope:** 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7

**Key dependencies:**
- Supabase RLS (buyer INSERT, platform_admin SELECT, agencies NEVER see individual data)
- Drizzle ORM (new tables: `listing_engagement_events`, `listing_analytics_hourly`, `buyer_intent_scores`)
- Supabase Realtime (`match.reaffirmed` event emission)
- Edge Function push-notifications (`match_reaffirm_urgent` type)
- pg_cron (hourly aggregation job)
- Existing components: PropertyCard, PropertyDetailSheet, MatchRecapScreen

---

## 2. Risk Assessment Matrix

| Risk ID | Category | Description | P | I | Score | Mitigation |
|---------|----------|-------------|---|---|-------|------------|
| R1 | PRIV | Agency accesses individual buyer engagement data → GDPR violation (NFR8) | 1 | 3 | **3** | RLS restricts raw events to `platform_admin` only; agency APIs serve only aggregated/anonymized data |
| R2 | PERF | Engagement tracking causes re-renders → swipe animation drops below 60fps (NFR2) | 2 | 3 | **6** 🚨 | Ref-based tracking (no state), batch flushing, zero useEffect dependencies on tracking state |
| R3 | PERF | Analytics dashboard queries raw events table → slow load (NFR11) | 2 | 3 | **6** 🚨 | Dashboard queries ONLY read models (`listing_analytics_hourly`, `buyer_intent_scores`), never `listing_engagement_events` |
| R4 | DATA | Aggregation job fails → stale read models, misleading analytics | 2 | 2 | **4** | Graceful degradation: stale data shown (never error UI), admin alert if >3h stale |
| R5 | SEC | Non-authenticated user submits fake engagement events | 1 | 2 | **2** | RLS enforces `buyer` role on INSERT, `buyer_id` matched to `auth.uid()` |
| R6 | PRIV | Buyer intent score leaks to unauthorized agents | 1 | 3 | **3** | Agent can only see scores for their bonded clients (RLS via `agent_buyer_bonds`) |
| R7 | DATA | Photo view events fire for <500ms views → noise in analytics | 1 | 1 | **1** | Client-side threshold: events only created for views >500ms |

**High-risk items requiring dedicated test coverage:** R2, R3

---

## 3. Test Coverage Matrix

### Story 8.1 — Schema Engagement Events + Instrumentación Base

| ID | Scenario | Level | Priority | File Hint |
|----|----------|-------|----------|-----------|
| T8.1-01 | `listing_engagement_events` table exists with correct columns | Migration | **P0** | `schema.test.ts` |
| T8.1-02 | `useEngagementTracker()` exposes all required callbacks | Unit | **P0** | `use-engagement-tracker.test.ts` |
| T8.1-03 | Events are batched locally, not sent per-event | Unit | **P0** | `use-engagement-tracker.test.ts` |
| T8.1-04 | `POST /api/v1/engagement/events` accepts batch of events | API | **P0** | `engagement-events.test.ts` |
| T8.1-05 | Non-authenticated request → 401 | API | **P0** | `engagement-events.test.ts` |
| T8.1-06 | Non-buyer role → 403 on event submission | API | **P0** | `engagement-events.test.ts` |
| T8.1-07 | Events with mismatched `buyer_id` vs auth.uid → rejected | API | **P1** | `engagement-events.test.ts` |

### Story 8.2 — Instrumentación PropertyCard (Tiempo por Foto)

| ID | Scenario | Level | Priority | File Hint |
|----|----------|-------|----------|-----------|
| T8.2-01 | Photo viewed >500ms → `photo_view` event with correct payload | Unit | **P0** | `property-card-tracking.test.ts` |
| T8.2-02 | Photo viewed <500ms → no event created | Unit | **P0** | `property-card-tracking.test.ts` |
| T8.2-03 | Swipe (match/reject) auto-closes active photo tracker | Unit | **P0** | `property-card-tracking.test.ts` |
| T8.2-04 | Tracking does NOT cause re-renders (ref-based) | Unit | **P0** | `property-card-tracking.test.ts` |
| T8.2-05 | Multiple photos tracked independently per session | Unit | **P1** | `property-card-tracking.test.ts` |

### Story 8.3 — Instrumentación PropertyDetailSheet (Scroll Depth)

| ID | Scenario | Level | Priority | File Hint |
|----|----------|-------|----------|-----------|
| T8.3-01 | Opening sheet → `detail_open` event | Unit | **P0** | `detail-sheet-tracking.test.ts` |
| T8.3-02 | Closing sheet → `detail_close` with `duration_ms` + `scroll_depth` with `max_depth_pct` | Unit | **P0** | `detail-sheet-tracking.test.ts` |
| T8.3-03 | Scroll depth correctly calculated as percentage (0-100) | Unit | **P0** | `detail-sheet-tracking.test.ts` |
| T8.3-04 | Match/reject from sheet → engagement events fire before close | Unit | **P0** | `detail-sheet-tracking.test.ts` |
| T8.3-05 | No scroll → `max_depth_pct: 0` | Unit | **P1** | `detail-sheet-tracking.test.ts` |

### Story 8.4 — Tracking Match Reaffirm (Recap Screen)

| ID | Scenario | Level | Priority | File Hint |
|----|----------|-------|----------|-----------|
| T8.4-01 | Reaffirm → `match_reaffirm` event linked to original `match_event` | API | **P0** | `match-reaffirm.test.ts` |
| T8.4-02 | `POST /api/v1/matches/[id]/reaffirm` creates event + emits Realtime | API | **P0** | `match-reaffirm.test.ts` |
| T8.4-03 | Push notification sent with type `urgent` to bonded agent | Integration | **P0** | `match-reaffirm.test.ts` |
| T8.4-04 | Non-owner buyer → 403 on reaffirm | API | **P0** | `match-reaffirm.test.ts` |
| T8.4-05 | Already-reaffirmed match → idempotent (no duplicate event) | API | **P1** | `match-reaffirm.test.ts` |

### Story 8.5 — Dashboard Analytics Listing (Agencias)

| ID | Scenario | Level | Priority | File Hint |
|----|----------|-------|----------|-----------|
| T8.5-01 | `GET /api/v1/agency/listings/[id]/analytics` returns aggregated metrics | API | **P0** | `listing-analytics.test.ts` |
| T8.5-02 | Response contains NO PII — only aggregated numbers (NFR8) | API | **P0** | `listing-analytics.test.ts` |
| T8.5-03 | Listing with <10 views → "Datos insuficientes" flag | API | **P0** | `listing-analytics.test.ts` |
| T8.5-04 | Queries read models only, never `listing_engagement_events` (NFR11) | Unit | **P0** | `listing-analytics.test.ts` |
| T8.5-05 | Underperformance alert when avg view time >30% below platform avg | Unit | **P1** | `listing-analytics.test.ts` |
| T8.5-06 | Non `agency_admin` → 403 | API | **P0** | `listing-analytics.test.ts` |

### Story 8.6 — Buyer Intent Score (Panel Agente)

| ID | Scenario | Level | Priority | File Hint |
|----|----------|-------|----------|-----------|
| T8.6-01 | `GET /api/v1/agent/clients/[id]/intent-score` returns score 0-100 | API | **P0** | `buyer-intent-score.test.ts` |
| T8.6-02 | Score formula uses: matches, reaffirm ratio, avg view time, consistency | Unit | **P0** | `intent-score-calculator.test.ts` |
| T8.6-03 | Intensity classification: 🔥 (reaffirmed), ⭐ (match + high time), · (quick match) | Unit | **P0** | `intent-score-calculator.test.ts` |
| T8.6-04 | Agent can only see scores for bonded clients | API | **P0** | `buyer-intent-score.test.ts` |
| T8.6-05 | Non-agent role → 403 | API | **P0** | `buyer-intent-score.test.ts` |
| T8.6-06 | No engagement data → score = 0, indicator = · | Unit | **P1** | `intent-score-calculator.test.ts` |

### Story 8.7 — Aggregation Jobs + Read Models

| ID | Scenario | Level | Priority | File Hint |
|----|----------|-------|----------|-----------|
| T8.7-01 | `listing_analytics_hourly` table exists with correct columns | Migration | **P0** | `schema.test.ts` |
| T8.7-02 | Aggregation function correctly computes avg view time per listing | Unit | **P0** | `aggregation-job.test.ts` |
| T8.7-03 | Aggregation function correctly computes buyer intent scores | Unit | **P0** | `aggregation-job.test.ts` |
| T8.7-04 | Job failure → read models retain last successful values (no error) | Unit | **P0** | `aggregation-job.test.ts` |
| T8.7-05 | Admin alert when job >3h stale | Integration | **P1** | `aggregation-job.test.ts` |
| T8.7-06 | `GET /api/v1/admin/analytics/job-status` returns last run info | API | **P1** | `job-status.test.ts` |
| T8.7-07 | Zero queries on `listing_engagement_events` from any user-facing endpoint | Audit | **P0** | `no-raw-queries.test.ts` |

---

## 4. Execution Strategy

| Gate | Suite | Trigger |
|------|-------|---------|
| PR | All P0 tests (T8.1-01..07, T8.2-01..04, T8.3-01..04, T8.4-01..04, T8.5-01..04/06, T8.6-01..05, T8.7-01..04/07) | Every push |
| Nightly | P1 tests (T8.2-05, T8.3-05, T8.4-05, T8.5-05, T8.6-06, T8.7-05/06) | Scheduled |

Estimated effort: P0 tests ~40–50h, P1 tests ~10–15h. Total: **50–65h**

---

## 5. Quality Gates

- P0 pass rate = **100%** (blocks merge)
- P1 pass rate ≥ **95%**
- **Zero PII** in any agency/agent-facing API response
- **Zero raw event queries** from user-facing endpoints
- All engagement APIs enforce auth + role checks
- Coverage target ≥ **80%** in `features/intelligence/` and engagement routes
- Tracking instrumentation causes **zero re-renders** in PropertyCard/DetailSheet

---

## 6. Open Assumptions

1. `listing_engagement_events` is append-only — no UPDATE/DELETE from application code.
2. PropertyCard and PropertyDetailSheet exist in `apps/web/src/components/` (or equivalent).
3. MatchRecapScreen exists and has a "Confirm" action wired from Epic 2.
4. `agent_buyer_bonds` table enforces the agent-client visibility boundary.
5. pg_cron is available in the Supabase project and can be scheduled via SQL migration.
6. Supabase Realtime channels are already configured from Epic 4.
