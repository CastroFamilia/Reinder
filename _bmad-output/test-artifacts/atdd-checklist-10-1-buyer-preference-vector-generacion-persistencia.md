---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04-generate-tests
  - step-04c-aggregate
  - step-05-validate-and-complete
lastStep: step-05-validate-and-complete
lastSaved: '2026-07-15T13:22:00+02:00'
inputDocuments:
  - _bmad-output/implementation-artifacts/10-1-buyer-preference-vector-generacion-persistencia.md
  - _bmad-output/test-artifacts/test-design-epic-10.md
  - packages/shared/vitest.config.ts
  - packages/shared/src/db/schema.ts
---

# ATDD Checklist: Story 10.1 — Buyer Preference Vector: Generación y Persistencia

**Date:** 2026-07-15
**Author:** TEA Agent (ATDD)
**Primary Test Level:** Unit + API

---

## Story Summary

**As a** plataforma Reinder
**I want** generar un `buyer_preference_vector` por comprador basado en su historial de `swipe_events` y `engagement_events`
**So that** las stories posteriores (10.2–10.5) puedan personalizar la presentación de listings según las preferencias implícitas de cada comprador

---

## Stack Detection

- **Detected Stack:** `fullstack` (Next.js + shared packages, Vitest, no Playwright)
- **Test Framework:** Vitest (with `vi.mock`, `vi.fn()`)
- **Generation Mode:** AI Generation (acceptance criteria are clear, standard unit/API patterns)

---

## Acceptance Criteria Coverage

| AC | Description | Test IDs | Level |
|----|-------------|----------|-------|
| AC1 | Tabla `buyer_preference_vectors` en Drizzle schema | T10.1-01 to T10.1-11 | Unit |
| AC2 | Estructura del preference vector | T10.1-16 to T10.1-26 | Unit |
| AC3 | Lógica de generación del preference vector | T10.1-12 to T10.1-15, T10.1-27 to T10.1-30 | Unit |
| AC4 | Aggregation job batch (pg_cron) | *(integration-level, verified at migration/runtime)* | Integration |
| AC5 | API endpoint de trigger manual | T10.1-35 to T10.1-42 | API |
| AC6 | RLS Policies | *(integration-level, requires running DB)* | Integration |
| AC7 | Migración SQL con RLS y pg_cron | *(integration-level, verified at migration execution)* | Integration |
| AC8 | Tipos TypeScript exportados | T10.1-31 to T10.1-34 | Unit |

### AC4, AC6 & AC7 Note
RLS policies (AC6), migration idempotency (AC7), and pg_cron scheduling (AC4) are integration-level concerns that require a running Supabase database. These are validated during migration execution and should have dedicated integration tests if Supabase local dev is available. The ATDD unit tests focus on the Drizzle schema and application logic layers.

---

## Failing Tests Created (RED Phase)

### Unit Tests — Schema (11 tests)

**File:** `packages/shared/src/db/schema-buyer-preference-vectors.test.ts`

| Test ID | Priority | Description | Status |
|---------|----------|-------------|--------|
| T10.1-01 | P0 | Exports buyerPreferenceVectors table | 🔴 RED (skipped) |
| T10.1-02 | P0 | Has all required columns per AC1 | 🔴 RED (skipped) |
| T10.1-03 | P0 | id is UUID with defaultRandom | 🔴 RED (skipped) |
| T10.1-04 | P0 | buyerId is UUID NOT NULL | 🔴 RED (skipped) |
| T10.1-05 | P0 | vector is JSONB NOT NULL | 🔴 RED (skipped) |
| T10.1-06 | P1 | swipeCount is INTEGER NOT NULL default 0 | 🔴 RED (skipped) |
| T10.1-07 | P1 | engagementEventCount is INTEGER NOT NULL default 0 | 🔴 RED (skipped) |
| T10.1-08 | P1 | version is INTEGER NOT NULL default 1 | 🔴 RED (skipped) |
| T10.1-09 | P1 | lastComputedAt is TIMESTAMPTZ NOT NULL | 🔴 RED (skipped) |
| T10.1-10 | P2 | createdAt is TIMESTAMPTZ NOT NULL with defaultNow | 🔴 RED (skipped) |
| T10.1-11 | P2 | updatedAt is TIMESTAMPTZ NOT NULL with defaultNow | 🔴 RED (skipped) |

### Unit Tests — Computation Logic (19 tests)

**File:** `packages/shared/src/personalization/compute-preference-vector.test.ts`

| Test ID | Priority | Description | Status |
|---------|----------|-------------|--------|
| T10.1-12 | P0 | Returns null when buyer has <10 swipes | 🔴 RED (skipped) |
| T10.1-13 | P0 | Returns null when buyer has exactly 9 swipes | 🔴 RED (skipped) |
| T10.1-14 | P0 | Returns vector when buyer has exactly 10 swipes | 🔴 RED (skipped) |
| T10.1-15 | P0 | Returns vector with matchRate=0 when all rejects | 🔴 RED (skipped) |
| T10.1-16 | P0 | Vector contains all required dimensions per AC2 | 🔴 RED (skipped) |
| T10.1-17 | P0 | price_affinity has correct sub-fields | 🔴 RED (skipped) |
| T10.1-18 | P0 | size_affinity has correct sub-fields | 🔴 RED (skipped) |
| T10.1-19 | P0 | bedroom_affinity has correct sub-fields | 🔴 RED (skipped) |
| T10.1-20 | P0 | location_affinity has correct sub-fields | 🔴 RED (skipped) |
| T10.1-21 | P1 | photo_engagement has correct sub-fields | 🔴 RED (skipped) |
| T10.1-22 | P1 | engagement_depth has correct sub-fields | 🔴 RED (skipped) |
| T10.1-23 | P0 | match_rate is number between 0 and 1 | 🔴 RED (skipped) |
| T10.1-24 | P1 | reaffirm_rate is number between 0 and 1 | 🔴 RED (skipped) |
| T10.1-25 | P0 | All numeric values are finite (no NaN/Infinity) | 🔴 RED (skipped) |
| T10.1-26 | P1 | Vector serializes correctly as JSON (JSONB compat) | 🔴 RED (skipped) |
| T10.1-27 | P0 | match_rate equals matches/total_swipes | 🔴 RED (skipped) |
| T10.1-28 | P0 | price_affinity.mean reflects matched listings avg price | 🔴 RED (skipped) |
| T10.1-29 | P1 | location_affinity.preferred_cities from matched listings | 🔴 RED (skipped) |
| T10.1-30 | P1 | bedroom_affinity.mode is most frequent bedroom count | 🔴 RED (skipped) |

### Unit Tests — Types & Exports (4 tests)

**File:** `packages/shared/src/personalization/types.test.ts`

| Test ID | Priority | Description | Status |
|---------|----------|-------------|--------|
| T10.1-31 | P0 | Exports BuyerPreferenceVector from personalization module | 🔴 RED (skipped) |
| T10.1-32 | P0 | Exports computePreferenceVector function | 🔴 RED (skipped) |
| T10.1-33 | P0 | Exports PREFERENCE_VECTOR_VERSION constant | 🔴 RED (skipped) |
| T10.1-34 | P0 | Exports MIN_SWIPES_THRESHOLD constant (=10) | 🔴 RED (skipped) |

### API Tests — Admin Compute Endpoint (8 tests)

**File:** `apps/web/src/app/api/v1/admin/preference-vectors/compute/route.test.ts`

| Test ID | Priority | Description | Status |
|---------|----------|-------------|--------|
| T10.1-35 | P0 | Returns 403 when buyer attempts access | 🔴 RED (skipped) |
| T10.1-36 | P0 | Returns 403 when agent attempts access | 🔴 RED (skipped) |
| T10.1-37 | P0 | Returns 403 when agency_admin attempts access | 🔴 RED (skipped) |
| T10.1-38 | P0 | Returns 401 when no user session | 🔴 RED (skipped) |
| T10.1-39 | P0 | Returns success with vector details for single buyer | 🔴 RED (skipped) |
| T10.1-40 | P1 | Response shape follows ApiResponse convention (single) | 🔴 RED (skipped) |
| T10.1-41 | P0 | Returns batch result when no buyerId provided | 🔴 RED (skipped) |
| T10.1-42 | P1 | Batch response has correct types | 🔴 RED (skipped) |

---

## Priority Distribution

| Priority | Count | Description |
|----------|-------|-------------|
| P0 | 26 | Critical path — schema exports, computation logic, auth, threshold behavior |
| P1 | 12 | Important — sub-field types, response shapes, edge cases |
| P2 | 4 | Low priority — timestamp defaults |
| **Total** | **42** | 🔴 ALL SKIPPED |

---

## Running Tests

```bash
# Run all failing tests for this story (shared package)
pnpm --filter @reinder/shared test packages/shared/src/db/schema-buyer-preference-vectors.test.ts packages/shared/src/personalization/

# Run schema tests only
pnpm --filter @reinder/shared test packages/shared/src/db/schema-buyer-preference-vectors.test.ts

# Run computation logic tests only
pnpm --filter @reinder/shared test packages/shared/src/personalization/compute-preference-vector.test.ts

# Run types/exports tests only
pnpm --filter @reinder/shared test packages/shared/src/personalization/types.test.ts

# Run API tests only
pnpm --filter @reinder/web test apps/web/src/app/api/v1/admin/preference-vectors/compute/route.test.ts
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

**TEA Agent Responsibilities:**

- ✅ All 42 tests written and skipped (RED phase)
- ✅ Test structure follows project conventions (Vitest, async imports)
- ✅ Mock requirements documented (Supabase client, DB layer)
- ✅ Implementation checklist created

**Verification:**

- All tests are skipped and will fail when `.skip()` is removed (module imports fail)
- Failure messages are clear and actionable
- Tests fail due to missing implementation, not test bugs

---

### GREEN Phase (DEV Team - Next Steps)

**Implementation order:**

1. **Task 1:** Create Drizzle schema table `buyer_preference_vectors` in `packages/shared/src/db/schema.ts` → un-skip T10.1-01 to T10.1-11
2. **Task 2:** Create types in `packages/shared/src/personalization/types.ts` and barrel `index.ts` → un-skip T10.1-31 to T10.1-34
3. **Task 3:** Implement `computePreferenceVector()` in `packages/shared/src/personalization/compute-preference-vector.ts` → un-skip T10.1-12 to T10.1-30
4. **Task 4:** Create API route `apps/web/src/app/api/v1/admin/preference-vectors/compute/route.ts` → un-skip T10.1-35 to T10.1-42
5. **Task 5:** Create SQL migration with RLS + pg_cron (AC4, AC6, AC7 — integration-level)

---

## Knowledge Base References Applied

- **data-factories.md** — Factory patterns for test data generation
- **component-tdd.md** — Component test strategies
- **test-quality.md** — Test design principles (Given-When-Then, isolation)
- **test-levels-framework.md** — Unit vs API vs Integration selection

---

## Notes

- AC4 (pg_cron), AC6 (RLS), AC7 (migration) are integration-level and require a running database — not covered in unit ATDD tests
- The `computePreferenceVector` function uses dependency injection (`deps`) for testability — mocking DB calls
- All tests follow the project convention of dynamic `await import()` for TDD RED phase compatibility
- `buyer_id` references `auth.users.id` (no FK constraint) — cleanup handled at application layer per project conventions

---

**Generated by TEA Agent (ATDD)** — 2026-07-15
