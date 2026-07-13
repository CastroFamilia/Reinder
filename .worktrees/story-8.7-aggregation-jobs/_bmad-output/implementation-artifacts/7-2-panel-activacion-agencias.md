# Story 7.2: Panel de Activación de Agencias

Status: ready-for-dev

**GH Issue:** (to be assigned)

## Story

Como administrador de plataforma,
quiero poder activar y desactivar agencias integradas en Reinder,
para que tenga control total sobre qué agencias y listings están visibles en el feed.

## Acceptance Criteria

1. **Given** un administrador con rol `platform_admin` en `/admin/agencies`  
   **When** carga la página  
   **Then** ve la lista de todas las agencias con su estado (activa/inactiva) y número de listings publicados

2. **And** puede activar o desactivar cualquier agencia con un toggle — el cambio se aplica en tiempo real

3. **And** desactivar una agencia retira inmediatamente todos sus listings del feed (status → `withdrawn`) sin eliminar los datos

4. **And** activar una agencia vuelve a publicar todos sus listings activos (status → `active`)

5. **And** el acceso está protegido — solo `platform_admin` puede acceder (cualquier otro rol recibe 403)

## Tasks / Subtasks

- [ ] **Task 1 — `requirePlatformAdmin` guard helper**
  - [ ] Create `apps/web/src/lib/auth/require-platform-admin.ts`
  - [ ] Reusable for 7.2, 7.3, 7.4 admin endpoints

- [ ] **Task 2 — API: GET `/api/v1/admin/agencies`**
  - [ ] List all agencies with `isActive` status and listing count
  - [ ] Protected by `requirePlatformAdmin`

- [ ] **Task 3 — API: PATCH `/api/v1/admin/agencies/[id]`**
  - [ ] Toggle `isActive` on the agency
  - [ ] When deactivating: batch-update all agency listings to `withdrawn`
  - [ ] When activating: batch-update all agency listings to `active`
  - [ ] Return updated agency

- [ ] **Task 4 — Tests**
  - [ ] ATDD tests: auth guard 403, list agencies, toggle + listing cascade

## Dev Notes

### Database Schema

```sql
-- agencies table (existing)
agencies.id          UUID PK
agencies.name        TEXT
agencies.is_active   BOOLEAN DEFAULT true
agencies.created_at  TIMESTAMPTZ
agencies.updated_at  TIMESTAMPTZ

-- listings table (existing)
listings.agency_id   UUID FK → agencies.id
listings.status      TEXT ('active', 'withdrawn', 'sold', 'pending_review')
```

### Auth Guard Pattern

```typescript
// apps/web/src/lib/auth/require-platform-admin.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function requirePlatformAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  
  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'platform_admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { user, profile };
}
```

### File Locations

```
apps/web/src/
├── lib/auth/
│   └── require-platform-admin.ts  ← NEW (reused by 7.3, 7.4)
└── app/api/v1/admin/
    └── agencies/
        ├── route.ts               ← NEW (GET list)
        ├── route.test.ts          ← NEW
        └── [id]/
            ├── route.ts           ← NEW (PATCH toggle)
            └── route.test.ts      ← NEW
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 7.2]
- [Source: packages/shared/src/db/schema.ts — agencies table]
- [Source: apps/web/src/app/api/v1/agency/crm/connect/route.ts — auth pattern]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (BAD pipeline)

### File List
