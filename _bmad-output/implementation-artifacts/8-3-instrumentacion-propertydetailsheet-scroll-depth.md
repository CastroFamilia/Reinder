# Story 8.3: Instrumentación de PropertyDetailSheet — Scroll Depth

Status: in-progress

**GH Issue:** (to be assigned)

## Story

Como sistema Reinder,
quiero registrar qué porcentaje de la descripción lee el comprador en el detail sheet,
para que las agencias sepan si sus descripciones se leen o se ignoran.

## Acceptance Criteria

1. **Given** un comprador que abre el PropertyDetailSheet
   **When** scrollea la descripción y cierra el sheet
   **Then** se registra un evento `scroll_depth` con `{ max_depth_pct: N }` (0-100) al cerrar el sheet

2. **And** se registra un evento `detail_open` al abrir y `detail_close` con `{ duration_ms: M }` al cerrar

3. **And** si el comprador hace match o reject desde el sheet, esos eventos se registran antes del cierre

## Dev Notes

### File Locations

```
packages/shared/src/engagement/
├── detail-sheet-tracker.ts       ← NEW
└── detail-sheet-tracker.test.ts  ← NEW
```

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (BAD pipeline)

### File List

