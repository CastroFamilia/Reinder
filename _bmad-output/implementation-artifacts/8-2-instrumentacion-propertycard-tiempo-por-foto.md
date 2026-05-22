# Story 8.2: Instrumentación de PropertyCard — Tiempo por Foto

Status: in-progress

**GH Issue:** (to be assigned)

## Story

Como sistema Reinder,
quiero registrar cuánto tiempo pasa el comprador en cada foto de una propiedad,
para que las agencias puedan identificar qué fotos generan más atención.

## Acceptance Criteria

1. **Given** un comprador viendo una PropertyCard con galería de fotos
   **When** navega entre fotos o abandona la tarjeta
   **Then** se registra un evento `photo_view` con `{ photo_index: N, duration_ms: M }` por cada foto vista más de 500ms

2. **And** la instrumentación usa `useEngagementTracker()` y no añade re-renders al componente `PropertyCard`

3. **And** al hacer swipe (match o reject) se cierra automáticamente el tracker de la foto activa con el tiempo acumulado

## Tasks / Subtasks

- [ ] **Task 1 — Photo view tracker helper**
  - [ ] Create `packages/shared/src/engagement/photo-view-tracker.ts`
  - [ ] Tracks time per photo using timestamps (no timers = no memory leaks)
  - [ ] Auto-stops on `stopAndFlush()` call (triggered by swipe/navigation)
  - [ ] Integrates with `createEngagementTracker()` for event submission
  - [ ] Ref-based — zero re-renders

- [ ] **Task 2 — Tests**
  - [ ] Photo viewed >500ms → event created
  - [ ] Photo viewed <500ms → no event
  - [ ] Swipe auto-closes tracker
  - [ ] Multiple photos tracked independently
  - [ ] No re-render verification (ref-based)

## Dev Notes

### Implementation Pattern

Since PropertyCard lives in mobile (Expo) and web components aren't built yet,
this story creates a framework-agnostic photo view tracker that works in both
React (via ref) and vanilla JS contexts.

```typescript
// Usage in any component:
const photoTracker = createPhotoViewTracker({
  engagementTracker, // from createEngagementTracker()
});

// When user navigates to photo 3:
photoTracker.onPhotoChange(3);

// When user swipes away (match/reject):
photoTracker.stopAndFlush();
```

### File Locations

```
packages/shared/src/engagement/
├── photo-view-tracker.ts       ← NEW
└── photo-view-tracker.test.ts  ← NEW
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 8.2]
- [Source: packages/shared/src/engagement/use-engagement-tracker.ts — dependency]
- [Source: test-design-epic-8.md — T8.2-01 through T8.2-05]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (BAD pipeline)

### File List

