---
storyId: '10.4'
storyTitle: 'Adaptación de Highlights de Descripción por Perfil'
stepsCompleted:
  - 'step-01-preflight-and-context'
  - 'step-02-generation-mode'
  - 'step-03-test-strategy'
  - 'step-04-generate-tests'
  - 'step-04c-aggregate'
  - 'step-05-validate-and-complete'
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-07-27'
tddPhase: 'RED'
detectedStack: 'fullstack'
generationMode: 'ai-generation'
executionMode: 'sequential'
inputDocuments:
  - '_bmad-output/implementation-artifacts/10-4-adaptacion-highlights-descripcion-perfil.md'
  - 'packages/shared/src/personalization/fit-score-types.ts'
  - 'packages/shared/src/personalization/index.ts'
  - 'packages/shared/src/personalization/compute-listing-fit-score.test.ts'
  - 'packages/shared/vitest.config.ts'
---

# ATDD Checklist — Story 10.4: Adaptación de Highlights de Descripción por Perfil

## 🔴 TDD Red Phase — All Tests are FAILING (test.skip)

All acceptance tests are generated with `test.skip()` — they will fail until the feature modules are implemented. This is intentional (TDD red phase).

---

## Test Files Generated

| # | Test File | Level | AC Coverage | Status |
|---|-----------|-------|-------------|--------|
| 1 | `packages/shared/src/personalization/extract-description-highlights.test.ts` | Unit | AC1, AC2, AC3, AC7 | 🔴 RED (skipped) |

---

## Acceptance Criteria → Test Mapping

### AC1 — Pure function `extractDescriptionHighlights()`

| Test | Priority | Status |
|------|----------|--------|
| Returns `DescriptionHighlight[]` with correct shape (text, category, relevanceScore) | P0 | 🔴 |
| Extracts highlights with correct categories from multi-category description | P0 | 🔴 |
| Categorizes price keywords correctly | P0 | 🔴 |
| Orders highlights by relevanceScore DESC | P0 | 🔴 |
| Returns maximum 5 highlights when more candidates exist | P0 | 🔴 |
| Is pure — same input produces same output | P1 | 🔴 |
| Is synchronous — no promises returned | P1 | 🔴 |
| Highlight text is max ~150 characters | P1 | 🔴 |
| All highlights receive relevanceScore 0.5 when dimensionScores undefined | P0 | 🔴 |
| All highlights receive relevanceScore 0.5 when dimensionScores null | P0 | 🔴 |
| Maintains original order when dimensionScores absent | P1 | 🔴 |
| Returns empty array for empty description | P0 | 🔴 |
| Returns empty array for null description | P0 | 🔴 |
| Returns empty array for undefined description | P0 | 🔴 |
| Returns empty/general for description without keywords | P1 | 🔴 |

### AC2 — Category-to-DimensionScores Mapping

| Test | Priority | Status |
|------|----------|--------|
| price → priceScore × 1.0 | P0 | 🔴 |
| size → sizeScore × 1.0 | P0 | 🔴 |
| bedrooms → bedroomScore × 1.0 | P0 | 🔴 |
| location → locationScore × 1.0 | P0 | 🔴 |
| amenity → max(sizeScore, bedroomScore) × 0.7 | P0 | 🔴 |
| general → 0.3 fixed | P0 | 🔴 |
| relevanceScore clamped to [0, 1] | P1 | 🔴 |

### AC3 — TypeScript Types Exported

| Test | Priority | Status |
|------|----------|--------|
| HIGHLIGHT_KEYWORDS exported with all categories | P0 | 🔴 |
| HIGHLIGHT_KEYWORDS.price contains expected Spanish keywords | P0 | 🔴 |
| HIGHLIGHT_KEYWORDS.size contains expected Spanish keywords | P0 | 🔴 |
| HIGHLIGHT_KEYWORDS.bedrooms contains expected Spanish keywords | P0 | 🔴 |
| HIGHLIGHT_KEYWORDS.location contains expected Spanish keywords | P0 | 🔴 |
| HIGHLIGHT_KEYWORDS.amenity contains expected Spanish keywords | P0 | 🔴 |
| extractDescriptionHighlights is a function | P0 | 🔴 |

### AC7 — Exhaustive Scenarios

| Test | Priority | Status |
|------|----------|--------|
| Multiple categories detected and correctly assigned | P0 | 🔴 |
| Keywords with tildes matched correctly (habitación/habitaciones) | P0 | 🔴 |
| No duplicate content — each sentence gets single category | P0 | 🔴 |
| With dimensionScores — ordered by relevance DESC | P0 | 🔴 |
| Without dimensionScores — all 0.5, original order | P0 | 🔴 |
| Max 5 highlights enforced | P0 | 🔴 |
| Top 5 most relevant selected | P1 | 🔴 |

### NFR2 — Performance

| Test | Priority | Status |
|------|----------|--------|
| Executes in < 1ms for typical description | P1 | 🔴 |

---

## Test Strategy Notes

### Why Unit Tests Only (No E2E in ATDD Phase)

Story 10.4's core is a **pure function** (`extractDescriptionHighlights()`) in `@reinder/shared`. The ATDD acceptance tests focus on:

1. **Unit level (P0)**: The pure function with all AC scenarios — this is where the business logic lives
2. **Component/Integration tests** (AC4, AC5, AC6): Deferred to dev phase — they depend on UI components and API routes that don't exist yet and require mocking the full rendering/request pipeline

The unit tests comprehensively cover AC1, AC2, AC3, and AC7 which define the complete behavior contract of the extraction function. Mobile/web component tests (AC4/AC5) and API integration tests (AC6) will be created during the dev phase when the components are implemented.

### Red Phase Compliance

- ✅ All tests use `test.skip()` — will be skipped (not run) in CI
- ✅ Imports reference modules that don't exist yet (`@ts-expect-error`)
- ✅ Tests assert expected behavior, not current behavior
- ✅ Tests will pass only when the feature is correctly implemented

---

## Summary Statistics

| Metric | Value |
|--------|-------|
| Total tests | 33 |
| P0 tests | 23 |
| P1 tests | 10 |
| ACs covered | AC1, AC2, AC3, AC7 |
| ACs deferred | AC4, AC5, AC6 (UI/API — dev phase) |
| Test files | 1 |
| TDD phase | 🔴 RED |
