# Test Design — Epic 7: Administración de Plataforma

## 1. Scope

**Epic Goal:** El equipo de Reinder puede operar y mantener la calidad de la plataforma. CI/CD, observabilidad (Sentry + PostHog), panel de gestión de agencias, resolución de duplicados, y dashboard de métricas globales.

**Stories in scope:** 7.1, 7.2, 7.3, 7.4

**Key dependencies:**
- GitHub Actions (CI/CD pipeline)
- Sentry SDK (Next.js + Expo plugins)
- Vercel Analytics + PostHog (GDPR-compliant analytics)
- Supabase RLS (`platform_admin` role — RBAC enforcement)
- Supabase Realtime (event emission on agency/listing changes)
- Drizzle ORM (tables: `agencies`, `listings`, `user_profiles`)
- EAS Build (iOS + Android release pipeline)

---

## 2. Risk Assessment Matrix

| Risk ID | Category | Description | P | I | Score | Mitigation |
|---------|----------|-------------|---|---|-------|-----------|
| R1 | SEC | Non-admin user accesses `/admin/*` endpoints or pages → data leak | 1 | 3 | **3** | RLS enforces `platform_admin` at DB level; middleware + server component role check |
| R2 | INFRA | CI/CD pipeline fails silently — broken main not detected | 2 | 3 | **6** 🚨 | GitHub status checks block merge; fail-fast in `ci.yml` |
| R3 | DATA | Agency deactivation leaves orphan listings in feed | 2 | 3 | **6** 🚨 | Atomic batch update: deactivate agency → withdraw all listings in single transaction |
| R4 | SEC | Duplicate resolution audit trail missing → compliance risk | 1 | 2 | **2** | Resolution record includes admin_id, timestamp, action |
| R5 | PERF | Metrics dashboard queries scan all events → slow load | 2 | 2 | **4** | Pre-aggregated metrics tables (read models), not raw event queries |
| R6 | PRIV | Dashboard leaks PII — individual user data shown | 1 | 3 | **3** | Only aggregated/anonymized data; no user-level rows exposed |

**High-risk items requiring dedicated test coverage:** R2, R3

---

## 3. Test Coverage Matrix

### Story 7.1 — CI/CD Pipeline y Observabilidad

| ID | Scenario | Level | Priority | File Hint |
|----|----------|-------|----------|-----------|
| T7.1-01 | `ci.yml` runs lint, typecheck, test on PR push | Config | **P0** | `.github/workflows/ci.yml` (validate YAML) |
| T7.1-02 | `ci.yml` fails on test failure → blocks merge | Config | **P0** | `.github/workflows/ci.yml` |
| T7.1-03 | `release.yml` triggers on `v*.*.*` tag → EAS Build | Config | **P1** | `.github/workflows/release.yml` |
| T7.1-04 | Sentry DSN configured in `next.config.ts` and Expo config | Config | **P1** | `sentry.client.config.ts` |
| T7.1-05 | PostHog script in `layout.tsx` with GDPR consent check | Unit | **P1** | `layout.tsx` |

### Story 7.2 — Panel de Activación de Agencias

| ID | Scenario | Level | Priority | File Hint |
|----|----------|-------|----------|-----------|
| T7.2-01 | GET `/admin/agencies` → list of agencies with status and listing count | API | **P0** | `admin-agencies.test.ts` |
| T7.2-02 | PATCH `/api/v1/admin/agencies/[id]` toggle active → deactivates agency | API | **P0** | `admin-agencies-toggle.test.ts` |
| T7.2-03 | Deactivating agency → all its listings status set to `withdrawn` | Integration | **P0** | `admin-agencies-toggle.test.ts` |
| T7.2-04 | Activating agency → all its listings restored to `active` | Integration | **P0** | `admin-agencies-toggle.test.ts` |
| T7.2-05 | Non `platform_admin` role → 403 on admin endpoints | API | **P0** | `admin-auth-guard.test.ts` |
| T7.2-06 | Agency toggle emits Realtime event `listing.removed` / `listing.updated` | Integration | **P1** | `admin-agencies-toggle.test.ts` |

### Story 7.3 — Resolución de Listings Duplicados

| ID | Scenario | Level | Priority | File Hint |
|----|----------|-------|----------|-----------|
| T7.3-01 | GET `/admin/listings?status=pending_review` → list of flagged listings | API | **P0** | `admin-listings-review.test.ts` |
| T7.3-02 | GET `/api/v1/admin/listings/[id]/conflict` → show both conflicting listings side-by-side | API | **P0** | `admin-listings-conflict.test.ts` |
| T7.3-03 | POST approve → listing status changes to `active`, audit record created | API | **P0** | `admin-listings-resolve.test.ts` |
| T7.3-04 | POST reject → listing status changes to `withdrawn`, audit record created | API | **P0** | `admin-listings-resolve.test.ts` |
| T7.3-05 | POST approve-both → both listings set to `active`, audit for each | API | **P1** | `admin-listings-resolve.test.ts` |
| T7.3-06 | Resolution record includes: admin_id, timestamp, action, listing_ids | Unit | **P0** | `admin-listings-resolve.test.ts` |
| T7.3-07 | Non `platform_admin` → 403 | API | **P0** | `admin-auth-guard.test.ts` |

### Story 7.4 — Dashboard de Métricas Globales

| ID | Scenario | Level | Priority | File Hint |
|----|----------|-------|----------|-----------|
| T7.4-01 | GET `/api/v1/admin/metrics` → returns aggregated metrics (users, swipes, matches, agencies) | API | **P0** | `admin-metrics.test.ts` |
| T7.4-02 | Metrics are aggregated — no PII in response | Unit | **P0** | `admin-metrics.test.ts` |
| T7.4-03 | Dashboard renders GlassPanel cards with correct data | Component | **P1** | `admin-dashboard.test.tsx` |
| T7.4-04 | Non `platform_admin` → 403 | API | **P0** | `admin-auth-guard.test.ts` |

---

## 4. Execution Strategy

| Gate | Suite | Trigger |
|------|-------|---------|
| PR | T7.1-01/02, T7.2-01/02/03/04/05, T7.3-01/02/03/04/06/07, T7.4-01/02/04 (all P0) | Every push |
| Nightly | T7.2-06, T7.3-05, T7.4-03 (P1) | Scheduled |

Estimated effort: P0 tests ~25–35h, P1 tests ~10–15h. Total: **35–50h**

---

## 5. Quality Gates

- P0 pass rate = **100%** (blocks merge)
- P1 pass rate ≥ **95%**
- All admin endpoints return 403 for non-`platform_admin` roles
- Coverage target ≥ **80%** in `features/admin/` and `app/admin/`
- No PII leak in metrics API responses
- CI/CD pipeline YAML validates and runs successfully

---

## 6. Open Assumptions

1. `platform_admin` role is already defined in Supabase RLS policies (from Story 1.2).
2. The `agencies` table has a `status` column (`active`, `inactive`, `pending`) from Epic 5.
3. GitHub Actions runners have access to pnpm and Node.js 20+.
4. EAS credentials (Apple + Google) are configured as GitHub Secrets.
5. PostHog project token is available as environment variable.
6. Sentry DSN is available as environment variable.
