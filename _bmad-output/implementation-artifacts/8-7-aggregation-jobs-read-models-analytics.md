# Story 8.7: Aggregation Jobs para Read Models de Analytics

Status: in-progress

**GH Issue:** (to be assigned)

## Story

Como sistema Reinder,
quiero procesar los raw engagement events en read models pre-agregados,
para que los dashboards de agencia y agente funcionen con latencia mínima sin impactar el swipe feed.

## Acceptance Criteria

1. **Given** eventos acumulados en `listing_engagement_events`
   **When** el aggregation job se ejecuta
   **Then** actualiza `listing_analytics_hourly` (metrics por listing) y `buyer_intent_scores` (score por comprador)

2. **And** los dashboards consumen únicamente los read models — zero queries sobre `listing_engagement_events` en requests de usuario

3. **And** si el job falla, los read models mantienen los valores de la última ejecución exitosa

4. **And** `GET /api/v1/admin/analytics/job-status` devuelve info del último run

## Tasks / Subtasks

- [ ] **Task 1 — Aggregation functions (TypeScript)**
  - [ ] `aggregateListingAnalytics()` — computes hourly analytics per listing
  - [ ] `calculateBuyerIntentScores()` — computes intent scores per buyer
  - [ ] Both functions operate on raw events → read model tables
  - [ ] Error handling: catch and log, never corrupt read models

- [ ] **Task 2 — Admin job-status API**
  - [ ] `GET /api/v1/admin/analytics/job-status`
  - [ ] Returns: lastRunAt, status, processedEvents, duration
  - [ ] Auth: platform_admin only

- [ ] **Task 3 — pg_cron SQL migration**
  - [ ] SQL file with aggregation function + schedule
  - [ ] NOTE: pg_cron must be enabled in Supabase dashboard manually

- [ ] **Task 4 — Tests**
  - [ ] T8.7-02: Aggregation correctly computes avg view time per listing
  - [ ] T8.7-03: Aggregation correctly computes buyer intent scores
  - [ ] T8.7-04: Job failure → read models retain last values
  - [ ] T8.7-06: Admin job-status API returns last run info

## Dev Notes

### Score Formula (buyer_intent_scores)

```
score = clamp(0, 100,
  (matchCount × 15) +
  (reaffirmRatio × 25) +
  (avgViewTimeVsGlobal × 30) +
  (preferenceConsistency × 30)
)
```

Where:
- matchCount: raw count of matches (capped contribution at 15 × 5 = 75)
- reaffirmRatio: reaffirms / matches (0-1)
- avgViewTimeVsGlobal: buyer's avg photo view time / global avg (1.0 = average)
- preferenceConsistency: how consistently they interact with similar listings (0-1)

### File Locations

```
packages/shared/src/engagement/
├── aggregation.ts            ← NEW (aggregation logic)
└── aggregation.test.ts       ← NEW

apps/web/src/app/api/v1/admin/analytics/
├── job-status/route.ts       ← NEW
└── job-status/route.test.ts  ← NEW

packages/shared/src/db/
└── migrations/
    └── 008-engagement-aggregation-cron.sql  ← NEW (pg_cron setup)
```

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (BAD pipeline)

### File List

