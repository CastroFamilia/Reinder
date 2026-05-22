# Story 8.1: Schema de Engagement Events e Instrumentación Base

Status: in-progress

**GH Issue:** (to be assigned)

## Story

Como desarrollador del equipo Reinder,
quiero definir el schema de `listing_engagement_events` e implementar el hook `useEngagementTracker()`,
para que la app pueda capturar micro-comportamiento del comprador de forma desacoplada del swipe loop principal.

## Acceptance Criteria

1. **Given** la app mobile con Epic 2 completada
   **When** se ejecuta la migración y se actualiza el código
   **Then** existe la tabla `listing_engagement_events` con campos: `id`, `buyer_id`, `listing_id`, `session_id`, `event_type`, `payload jsonb`, `created_at`

2. **And** el hook `useEngagementTracker()` existe en `packages/shared` y acepta `listingId` + `sessionId` como parámetros

3. **And** el hook expone callbacks: `trackPhotoView(photoIndex, durationMs)`, `trackScrollDepth(maxDepthPct)`, `trackDetailOpen()`, `trackDetailClose(durationMs)`, `trackMatchReaffirm()`

4. **And** los eventos se encolan localmente y se envían en batch (no por evento individual) para no impactar el rendimiento de la UI (NFR2)

5. **And** RLS restringe la escritura a `buyer` autenticado y la lectura a `platform_admin` únicamente — las agencias nunca ven datos individuales de compradores (NFR8)

6. **And** `POST /api/v1/engagement/events` acepta un batch de eventos y los inserta en la tabla

7. **And** el endpoint rechaza requests no autenticados (401) y roles no-buyer (403)

## Tasks / Subtasks

- [ ] **Task 1 — Schema: `listing_engagement_events` table**
  - [ ] Add to `packages/shared/src/db/schema.ts`
  - [ ] Fields: `id` (uuid pk), `buyer_id` (uuid, ref auth.users), `listing_id` (uuid, FK listings), `session_id` (uuid), `event_type` (text), `payload` (jsonb), `created_at` (timestamptz)
  - [ ] Index on `listing_id` for aggregation queries
  - [ ] Index on `buyer_id` for RLS enforcement
  - [ ] `event_type` enum or constrained text: 'photo_view', 'photo_swipe', 'scroll_depth', 'detail_open', 'detail_close', 'match_reaffirm'

- [ ] **Task 2 — `useEngagementTracker()` hook**
  - [ ] Create `packages/shared/src/engagement/use-engagement-tracker.ts`
  - [ ] Accept `listingId`, `sessionId` params
  - [ ] Expose: `trackPhotoView(photoIndex, durationMs)`, `trackScrollDepth(maxDepthPct)`, `trackDetailOpen()`, `trackDetailClose(durationMs)`, `trackMatchReaffirm()`
  - [ ] Local event queue (array ref) with batch flush
  - [ ] Flush on: queue reaches 10 events, or component unmount, or explicit `flush()` call
  - [ ] No re-renders — all state managed via refs

- [ ] **Task 3 — API: `POST /api/v1/engagement/events`**
  - [ ] Accept `{ events: EngagementEvent[] }` body
  - [ ] Validate auth (401 if not authenticated)
  - [ ] Validate role (403 if not buyer)
  - [ ] Validate `buyer_id` matches `auth.uid()`
  - [ ] Batch insert into `listing_engagement_events`

- [ ] **Task 4 — ATDD Tests**
  - [ ] Schema validation tests
  - [ ] Hook API contract tests
  - [ ] Batch flushing behavior tests
  - [ ] API endpoint auth/role/insert tests

## Dev Notes

### Database Schema Addition

```sql
-- listing_engagement_events (append-only)
CREATE TABLE listing_engagement_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL,           -- ref auth.users
  listing_id UUID NOT NULL REFERENCES listings(id),
  session_id UUID NOT NULL,
  event_type TEXT NOT NULL,         -- photo_view | scroll_depth | detail_open | detail_close | match_reaffirm
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_engagement_listing_id ON listing_engagement_events(listing_id);
CREATE INDEX idx_engagement_buyer_id ON listing_engagement_events(buyer_id);
CREATE INDEX idx_engagement_event_type ON listing_engagement_events(event_type);
```

### Event Payload Schemas

```typescript
// photo_view
{ photo_index: number; duration_ms: number }

// scroll_depth
{ max_depth_pct: number }  // 0-100

// detail_open
{}  // no payload needed

// detail_close
{ duration_ms: number }

// match_reaffirm
{ match_event_id: string }
```

### Engagement Tracker Hook API

```typescript
interface UseEngagementTrackerOptions {
  listingId: string;
  sessionId: string;
  flushEndpoint?: string;  // default: '/api/v1/engagement/events'
  batchSize?: number;       // default: 10
}

interface EngagementTracker {
  trackPhotoView: (photoIndex: number, durationMs: number) => void;
  trackScrollDepth: (maxDepthPct: number) => void;
  trackDetailOpen: () => void;
  trackDetailClose: (durationMs: number) => void;
  trackMatchReaffirm: () => void;
  flush: () => Promise<void>;
}
```

### File Locations

```
packages/shared/src/
├── db/schema.ts                        ← MODIFY (add listing_engagement_events)
├── engagement/
│   ├── use-engagement-tracker.ts       ← NEW
│   ├── use-engagement-tracker.test.ts  ← NEW
│   └── types.ts                        ← NEW (EngagementEvent type)

apps/web/src/
├── app/api/v1/engagement/events/
│   ├── route.ts                        ← NEW
│   └── route.test.ts                   ← NEW
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 8.1]
- [Source: packages/shared/src/db/schema.ts]
- [Source: test-design-epic-8.md — T8.1-01 through T8.1-07]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (BAD pipeline)

### File List

