---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04-generate-tests
  - step-04c-aggregate
  - step-05-validate-and-complete
lastStep: step-05-validate-and-complete
lastSaved: '2026-06-22T17:20:00+02:00'
inputDocuments:
  - _bmad-output/implementation-artifacts/9-1-schema-experimentos-motor-asignacion-variantes.md
  - packages/shared/vitest.config.ts
  - apps/web/vitest.config.ts
  - apps/web/src/app/api/v1/swipe-events/route.test.ts
  - packages/shared/src/db/schema.ts
---

# ATDD Checklist: Story 9.1 — Schema de Experimentos y Motor de Asignación de Variantes

## Stack Detection

- **Detected Stack:** `fullstack` (Next.js + shared packages, Vitest, no Playwright)
- **Test Framework:** Vitest (with `vi.mock`, `vi.fn()`)
- **Generation Mode:** AI Generation (acceptance criteria are clear, standard API/unit patterns)

## TDD Red Phase (Current)

✅ Failing tests generated — all use `it.skip()` (Vitest equivalent of `test.skip()`)

| Category | Test File | Tests | Status |
|----------|-----------|-------|--------|
| Unit — assignVariant() | `packages/shared/src/experiments/assign-variant.test.ts` | 6 | 🔴 RED (skipped) |
| API — GET assignment | `apps/web/src/app/api/v1/experiments/assignment/route.test.ts` | 7 | 🔴 RED (skipped) |
| API — POST experiments | `apps/web/src/app/api/v1/experiments/route.test.ts` | 9 | 🔴 RED (skipped) |
| Unit — Drizzle Schema | `packages/shared/src/db/schema-experiments.test.ts` | 10 | 🔴 RED (skipped) |
| **Total** | | **32** | 🔴 ALL SKIPPED |

## Acceptance Criteria Coverage

| AC | Description | Test IDs | Level |
|----|-------------|----------|-------|
| AC1 | Tabla `listing_experiments` | T9.1-23, T9.1-24 | Unit |
| AC2 | Tabla `experiment_assignments` | T9.1-27, T9.1-28 | Unit |
| AC3 | Tabla `experiment_results` | T9.1-29, T9.1-30, T9.1-31 | Unit |
| AC4 | Motor de asignación determinístico | T9.1-01 to T9.1-06 | Unit |
| AC5 | GET /api/v1/experiments/assignment | T9.1-07 to T9.1-13 | API |
| AC6 | POST /api/v1/experiments | T9.1-14 to T9.1-22 | API |
| AC7 | RLS — agencias no ven asignaciones | *(covered at integration level in migration SQL)* | Integration |
| AC8 | Drizzle schema compiles | T9.1-23 to T9.1-32 | Unit |
| AC9 | Migración SQL | *(verified at migration execution level)* | Integration |

### AC7 & AC9 Note
RLS policies (AC7) and migration idempotency (AC9) are integration-level concerns that require a running database. These are validated during migration execution and should have dedicated integration tests if Supabase local dev is available. The ATDD unit tests focus on the Drizzle schema and application logic layers.

## Priority Distribution

| Priority | Count | Description |
|----------|-------|-------------|
| P0 | 20 | Critical path — schema exports, CRUD operations, auth, determinism |
| P1 | 12 | Important — performance, edge cases, validation, response format |
| P2 | 0 | — |
| P3 | 0 | — |

## Test Strategy Rationale

1. **Unit tests for assignVariant()** — pure function with zero dependencies, ideal for exhaustive unit testing (determinism, distribution, performance)
2. **Unit tests for Drizzle schema** — verify table exports, column presence, and enum values without DB
3. **API route tests** — vi.mock Supabase client + Drizzle db, test HTTP status codes, auth guards, response shapes
4. **No E2E tests** — story is backend/API-only; no UI components in scope

## Next Steps (TDD Green Phase)

After implementing the feature:

1. Remove `it.skip()` from all test files
2. Run tests:
   - `pnpm --filter @reinder/shared test` (assignVariant + schema)
   - `pnpm --filter @reinder/web test` (API routes)
3. Verify tests PASS (green phase)
4. If any tests fail:
   - Either fix implementation (feature bug)
   - Or fix test (test bug)
5. Commit passing tests

## Implementation Guidance

### Files to Create/Modify

| Action | File |
|--------|------|
| NEW | `packages/shared/src/experiments/assign-variant.ts` |
| NEW | `packages/shared/src/types/experiment.ts` |
| MODIFY | `packages/shared/src/db/schema.ts` (add 2 enums + 3 tables) |
| MODIFY | `packages/shared/src/types/index.ts` (re-export) |
| NEW | `apps/web/src/app/api/v1/experiments/route.ts` |
| NEW | `apps/web/src/app/api/v1/experiments/assignment/route.ts` |
| NEW | `supabase/migrations/20260622000001_experiments_schema.sql` |
| NEW | `packages/shared/src/db/rls-experiments-policies.sql` |

### Key Constraints (from story guardrails)

- variant fields use TEXT (not pgEnum) with check constraint
- `assignVariant()` uses SHA-256 hash, NOT Math.random()
- `assignVariant()` is pure — no DB lookup
- `experiment_assignments` DENIED to agency_admin (NFR8)
- `bigint` for `total_view_time_ms`
- Manual SQL migration (not drizzle-kit generate)
- `agency_id` desnormalized in `listing_experiments` for RLS performance

## Risks & Assumptions

1. **RLS testing gap** — RLS policies cannot be tested at unit level; require Supabase local instance
2. **Migration idempotency** — `IF NOT EXISTS` verified manually or during CI migration run
3. **Schema column introspection** — Drizzle table column access via `Object.keys()` may differ across versions; tests may need adjustment
