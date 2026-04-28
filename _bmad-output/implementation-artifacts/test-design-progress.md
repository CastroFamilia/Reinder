---
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
lastSaved: '2026-04-28'
inputDocuments:
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - packages/shared/src/db/schema.ts
---

# Test Design Progress — Epic 4: Panel del Agente Representante

## Step 1: Mode Detection
- **Mode:** Epic-Level (sprint-status.yaml exists)
- **Epic:** 4 — Panel del Agente Representante
- **Stack:** fullstack (Next.js 15 + Expo React Native + Supabase + Drizzle ORM)

## Step 2: Context Loaded
- Epic 4 stories loaded: 4.1, 4.2, 4.3, 4.4 with acceptance criteria
- Key integration points: agentBuyerBonds, pushTokens, match_events tables
- Supabase Realtime WebSocket for real-time notifications
- Expo Push Service → APNS/FCM for mobile push
- RLS policies for agent-scoped data access
- Test stack: Vitest (globals: true, aliases array-style)

## Step 3: Risk Assessment

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation |
|---------|----------|-------------|-------------|--------|-------|-----------|
| R1 | TECH | Supabase Realtime WebSocket subscription leak (Story 4.2) | 2 | 3 | 6 🚨 | Test subscription cleanup on unmount, assert no duplicate listeners |
| R2 | SEC | RLS policy missing for agentBuyerBonds — agent sees other agents' clients (Story 4.1, 4.3) | 2 | 3 | 6 🚨 | Explicit RLS policy test for cross-agent data isolation |
| R3 | PERF | Client list query without pagination causes N+1 when >50 clients (Story 4.1) | 1 | 2 | 2 | Assert paginated query via API test |
| R4 | BUS | Deep link cold-start race condition — notification arrives before app hydration (Story 4.4) | 2 | 2 | 4 | Test cold start scenario with Expo Linking mock |
| R5 | DATA | push_token stale/missing — notification not delivered (Story 4.2) | 2 | 2 | 4 | Test graceful degradation: badge fallback when push fails |
| R6 | TECH | Expo Push Service token refresh not propagated to Supabase (Story 4.2) | 1 | 3 | 3 | Test token registration flow on app start |

## Step 4: Coverage Plan

### 4.1 — Lista de Clientes Vinculados

| Scenario | Level | Priority |
|----------|-------|----------|
| Agent sees only their bonded clients (RLS isolation) | API (Vitest) | P0 |
| Client card shows correct match count + has-new-matches badge | Component | P0 |
| List ordered by most recent match timestamp | API (Vitest) | P1 |
| Empty state when no clients | Component | P1 |
| Tap client card navigates to client detail | E2E | P1 |

### 4.2 — Notificación en Tiempo Real

| Scenario | Level | Priority |
|----------|-------|----------|
| Realtime WebSocket fires on match.created event | API (Vitest mock) | P0 |
| AgentDashboard updates without page refresh | Component | P0 |
| Push notification sent via Expo Push Service on match | API (Vitest) | P0 |
| Badge appears when push disabled | Component | P1 |
| No duplicate subscriptions on re-render | Component | P1 |

### 4.3 — Historial de Matches y Rechazos

| Scenario | Level | Priority |
|----------|-------|----------|
| Agent sees client's matches AND rejections in correct sections | API (Vitest) | P0 |
| Cross-agent data isolation (RLS) | API (Vitest) | P0 |
| Pagination fires after 20 items | API (Vitest) | P1 |
| Property detail opens from match row | Component | P1 |

### 4.4 — Deep Link

| Scenario | Level | Priority |
|----------|-------|----------|
| Cold-start notification routes to match detail | Unit | P0 |
| Background app notification routes to match detail | Unit | P0 |
| "Marcar como gestionado" archives match | API (Vitest) | P0 |
| Archived matches appear in "Gestionados" tab | Component | P1 |
| Listing agent contact visible in match detail | Component | P1 |

### Quality Gates
- P0 pass rate = 100%
- P1 pass rate ≥ 95%
- Coverage target ≥ 80% on Epic 4 new files
