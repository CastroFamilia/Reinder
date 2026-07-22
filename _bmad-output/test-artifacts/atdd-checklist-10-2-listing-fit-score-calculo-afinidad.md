---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04-generate-tests
  - step-05-validate-and-complete
lastStep: step-05-validate-and-complete
lastSaved: '2026-07-22'
storyId: 10-2-listing-fit-score-calculo-afinidad
detectedStack: fullstack
generationMode: ai-generation
inputDocuments:
  - _bmad-output/implementation-artifacts/10-2-listing-fit-score-calculo-afinidad.md
  - packages/shared/src/personalization/types.ts
  - packages/shared/src/personalization/compute-preference-vector.test.ts
  - packages/shared/src/personalization/index.ts
  - packages/shared/src/db/schema.ts
---

# ATDD Checklist — Story 10.2: Listing Fit Score

## Summary

Story 10.2 calculates a `listing_fit_score` between each buyer's `preference_vector` and listing characteristics. This ATDD checklist maps acceptance criteria to failing test cases (TDD red phase).

## Test Files Created

| File | Level | ACs Covered | Test Count |
|------|-------|-------------|------------|
| `packages/shared/src/personalization/compute-listing-fit-score.test.ts` | Unit | AC2, AC3, AC9 | 43 tests |
| `apps/web/src/app/api/v1/admin/fit-scores/compute/route.test.ts` | API/Integration | AC6, AC7 | 13 tests |

**Total: 56 tests** — all `test.skip()` (TDD red phase)

## AC → Test Mapping

### AC1 — Tabla `listing_fit_scores` en Drizzle schema

| Test ID | Description | Level | Priority | Status |
|---------|-------------|-------|----------|--------|
| — | Schema validation — covered by Drizzle migration (no runtime test needed) | Schema | P0 | ✅ Covered by migration |

> **Note:** AC1 is validated by the Drizzle schema definition and SQL migration. Runtime tests for schema are not typical in this project's test patterns. The schema is verified at migration time.

### AC2 — Estructura del dimension_scores

| Test ID | Description | Level | Priority | Status |
|---------|-------------|-------|----------|--------|
| T10.2-06 | dimension_scores contains all 6 required dimensions | Unit | P0 | 🔴 test.skip |
| T10.2-07 | all dimension scores are numbers in [0, 1] and finite | Unit | P0 | 🔴 test.skip |
| T10.2-08 | overall_score is weighted mean of dimensions | Unit | P0 | 🔴 test.skip |
| T10.2-09 | overall_score is in [0, 1] range | Unit | P0 | 🔴 test.skip |
| T10.2-10 | recommendedPhotoIndex is null (computed in 10.3) | Unit | P1 | 🔴 test.skip |

### AC3 — Lógica de cálculo del fit score

#### priceScore

| Test ID | Description | Level | Priority | Status |
|---------|-------------|-------|----------|--------|
| T10.2-11 | priceScore = 1.0 within buyer range | Unit | P0 | 🔴 test.skip |
| T10.2-12 | priceScore = 1.0 at rangeMin boundary | Unit | P0 | 🔴 test.skip |
| T10.2-13 | priceScore = 1.0 at rangeMax boundary | Unit | P0 | 🔴 test.skip |
| T10.2-14 | priceScore decays exponentially outside range | Unit | P0 | 🔴 test.skip |
| T10.2-15 | priceScore decreases as distance increases | Unit | P1 | 🔴 test.skip |
| T10.2-16 | priceScore minimum is 0.0 | Unit | P1 | 🔴 test.skip |

#### sizeScore

| Test ID | Description | Level | Priority | Status |
|---------|-------------|-------|----------|--------|
| T10.2-17 | sizeScore uses gaussian distance from mean | Unit | P0 | 🔴 test.skip |
| T10.2-18 | sizeScore = exp(-0.5 * ((sizeSqm - mean) / stddev)^2) | Unit | P0 | 🔴 test.skip |
| T10.2-19 | sizeScore with stddev=0 → exact match=1.0, else=0.5 | Unit | P1 | 🔴 test.skip |

#### bedroomScore

| Test ID | Description | Level | Priority | Status |
|---------|-------------|-------|----------|--------|
| T10.2-20 | bedroomScore from distribution lookup | Unit | P0 | 🔴 test.skip |
| T10.2-21 | bedroomScore = 0.1 when not in distribution | Unit | P0 | 🔴 test.skip |

#### locationScore

| Test ID | Description | Level | Priority | Status |
|---------|-------------|-------|----------|--------|
| T10.2-22 | locationScore = 1.0 for first preferredCity | Unit | P0 | 🔴 test.skip |
| T10.2-23 | locationScore = 0.8 for second preferredCity | Unit | P0 | 🔴 test.skip |
| T10.2-24 | locationScore = 0.6 for third preferredCity | Unit | P0 | 🔴 test.skip |
| T10.2-25 | locationScore min 0.3 for cities in preferredCities | Unit | P0 | 🔴 test.skip |
| T10.2-26 | locationScore uses haversine decay for non-preferred city | Unit | P0 | 🔴 test.skip |
| T10.2-27 | locationScore = 0.5 at ~100km from geoCentroid | Unit | P1 | 🔴 test.skip |
| T10.2-28 | locationScore = 0.1 with no match and no geoCentroid | Unit | P1 | 🔴 test.skip |

#### photoAffinityScore

| Test ID | Description | Level | Priority | Status |
|---------|-------------|-------|----------|--------|
| T10.2-29 | photoAffinityScore > 0.5 with preferred indices | Unit | P0 | 🔴 test.skip |
| T10.2-30 | photoAffinityScore = 0.5 neutral with no data | Unit | P0 | 🔴 test.skip |

#### engagementDepthScore

| Test ID | Description | Level | Priority | Status |
|---------|-------------|-------|----------|--------|
| T10.2-31 | engagementDepthScore = 1.0 for high engagement | Unit | P0 | 🔴 test.skip |
| T10.2-32 | engagementDepthScore scales linearly 0.3–1.0 | Unit | P0 | 🔴 test.skip |

#### Incomplete Data Handling

| Test ID | Description | Level | Priority | Status |
|---------|-------------|-------|----------|--------|
| T10.2-33 | null price → priceScore = 0.5 | Unit | P0 | 🔴 test.skip |
| T10.2-34 | null coordinates → locationScore = 0.5 | Unit | P0 | 🔴 test.skip |
| T10.2-35 | null sizeSqm → sizeScore = 0.5 | Unit | P0 | 🔴 test.skip |
| T10.2-36 | null bedrooms → bedroomScore = 0.5 | Unit | P0 | 🔴 test.skip |
| T10.2-37 | overall_score reponderates with incomplete data | Unit | P0 | 🔴 test.skip |
| T10.2-38 | weight redistribution with single null field | Unit | P1 | 🔴 test.skip |

#### Function Signature

| Test ID | Description | Level | Priority | Status |
|---------|-------------|-------|----------|--------|
| T10.2-39 | computeListingFitScore is synchronous | Unit | P0 | 🔴 test.skip |
| T10.2-40 | return shape has 3 keys | Unit | P0 | 🔴 test.skip |

#### Edge Cases

| Test ID | Description | Level | Priority | Status |
|---------|-------------|-------|----------|--------|
| T10.2-41 | perfect match → overallScore > 0.8 | Unit | P1 | 🔴 test.skip |
| T10.2-42 | complete mismatch → overallScore < 0.4 | Unit | P1 | 🔴 test.skip |
| T10.2-43 | deterministic output | Unit | P2 | 🔴 test.skip |

### AC4 — Aggregation job batch (pg_cron)

> **Note:** AC4 is tested at integration level during implementation. The aggregation job involves pg_cron scheduling, SQL functions, and UPSERT logic — these are covered by the SQL migration and validated during Task 3 implementation. The `computeListingFitScore()` core logic is the unit-testable part (AC3).

### AC5 — Invalidación de scores

> **Note:** AC5 involves a SQL trigger (`AFTER UPDATE` on `listings`). This is validated during migration execution and Task 5 integration tests. Cannot be unit tested without a live DB.

### AC6 — API endpoint de trigger manual

| Test ID | Description | Level | Priority | Status |
|---------|-------------|-------|----------|--------|
| T10.2-44 | platform_admin succeeds | API | P0 | 🔴 test.skip |
| T10.2-45 | buyer returns 403 | API | P0 | 🔴 test.skip |
| T10.2-46 | agent returns 403 | API | P0 | 🔴 test.skip |
| T10.2-47 | agency_admin returns 403 | API | P0 | 🔴 test.skip |
| T10.2-48 | unauthenticated returns 401 | API | P0 | 🔴 test.skip |
| T10.2-49 | buyerId param accepted | API | P0 | 🔴 test.skip |
| T10.2-50 | listingId param accepted | API | P0 | 🔴 test.skip |
| T10.2-51 | buyerId + listingId computes pair | API | P0 | 🔴 test.skip |
| T10.2-52 | empty body triggers full batch | API | P0 | 🔴 test.skip |
| T10.2-53 | response shape matches spec | API | P0 | 🔴 test.skip |
| T10.2-54 | durationMs is positive number | API | P1 | 🔴 test.skip |
| T10.2-55 | rejects invalid buyerId | API | P1 | 🔴 test.skip |
| T10.2-56 | rejects invalid listingId | API | P1 | 🔴 test.skip |

### AC7 — RLS Policies

> **Note:** RLS policy tests require a live Supabase instance. Auth behavior is partially covered by the API endpoint tests (T10.2-44 through T10.2-48). Full RLS testing is deferred to integration testing during Task 5.

### AC8 — Migración SQL

> **Note:** Migration idempotency is validated by running `supabase db reset` twice. This is a deployment-level test, not a unit test.

### AC9 — Tipos TypeScript exportados

| Test ID | Description | Level | Priority | Status |
|---------|-------------|-------|----------|--------|
| T10.2-01 | exports computeListingFitScore function | Unit | P0 | 🔴 test.skip |
| T10.2-02 | exports DimensionScores (via result shape) | Unit | P0 | 🔴 test.skip |
| T10.2-03 | exports FIT_SCORE_WEIGHTS constant | Unit | P0 | 🔴 test.skip |
| T10.2-04 | exports FIT_SCORE_VERSION constant | Unit | P0 | 🔴 test.skip |
| T10.2-05 | exports ListingFitScoreRow (type-only) | Unit | P1 | 🔴 test.skip |

### AC10 — Consulta de feed personalizado

> **Note:** AC10 is a performance requirement validated at integration level with the `idx_lfs_buyer_overall` index. This is covered by the DB migration and `EXPLAIN ANALYZE` during implementation.

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Haversine accuracy | Low | 100m error acceptable per AC3 |
| Weight redistribution with incomplete data | Medium | T10.2-37 and T10.2-38 cover edge cases |
| Numeric precision (NUMERIC(5,4)) | Low | All scores clamped to [0, 1] |
| pg_cron schedule collision | Low | Schedule at min 45, verified against existing crons |

## Next Steps

1. **Implementation (dev-story):** Implement all production code to make these tests pass
2. **Remove test.skip():** As each feature is implemented, remove `test.skip()` and run tests
3. **Integration tests:** AC4, AC5, AC7, AC8 require Supabase for full validation
