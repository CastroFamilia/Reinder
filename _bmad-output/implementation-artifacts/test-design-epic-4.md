# Test Design — Epic 4: Panel del Agente Representante
_Generated: 2026-04-28 | Mode: Epic-Level | Stack: fullstack (Next.js 15 + Expo RN + Supabase)_

---

## 1. Scope

**Epic Goal:** The agent can manage their bonded buyers list, receive real-time match notifications, explore per-client activity history, and act directly from notifications via deep link.

**Stories in scope:** 4.1, 4.2, 4.3, 4.4

**Key dependencies (assumed done):**
- `agentBuyerBonds` table (Epic 3) with RLS policy limiting agent to own bonds
- `pushTokens` table with stored Expo push tokens per user
- `match_events` table with buyer-match associations
- Supabase Realtime enabled on `match_events`

---

## 2. Risk Assessment Matrix

| Risk ID | Category | Description | P | I | Score | Mitigation |
|---------|----------|-------------|---|---|-------|-----------|
| R1 | TECH | Supabase Realtime subscription leak on AgentDashboard unmount | 2 | 3 | **6** 🚨 | Test cleanup in `useEffect` return; assert no duplicate channels |
| R2 | SEC | Missing RLS — agent A reads agent B's client bonds/matches | 2 | 3 | **6** 🚨 | Policy test with two-agent fixture; assert 0 rows cross-agent |
| R3 | PERF | Client list N+1 queries without pagination when >50 clients | 1 | 2 | 2 | Assert single paginated DB query in API test |
| R4 | BUS | Deep link cold-start race condition before Expo hydration | 2 | 2 | 4 | Mock `Linking.getInitialURL`, assert navigation to detail screen |
| R5 | DATA | Stale/missing push_token → push silently fails | 2 | 2 | 4 | Assert badge fallback path when push delivery fails |
| R6 | TECH | Push token not refreshed in Supabase after Expo token rotation | 1 | 3 | 3 | Test token registration on app mount |

**High-risk items requiring dedicated test coverage before implementation:** R1 (Realtime leak), R2 (RLS isolation)

---

## 3. Test Coverage Matrix

### Story 4.1 — Lista de Clientes Vinculados

| ID | Scenario | Level | Priority | File Hint |
|----|----------|-------|----------|-----------|
| T4.1-01 | Agent only sees their own bonded clients (RLS) | API/Unit (Vitest) | **P0** | `agent-clients.test.ts` |
| T4.1-02 | `AgentClientCard` renders name, bond date, match count, `has-new-matches` badge | Component | **P0** | `AgentClientCard.test.tsx` |
| T4.1-03 | List ordered by `last_match_at` DESC | API/Unit | **P1** | `agent-clients.test.ts` |
| T4.1-04 | Empty state message when no bonds exist | Component | **P1** | `AgentClientCard.test.tsx` |
| T4.1-05 | Tap client card → navigate to client detail screen | Component/Integration | **P1** | `AgentClientsScreen.test.tsx` |

### Story 4.2 — Notificación en Tiempo Real

| ID | Scenario | Level | Priority | File Hint |
|----|----------|-------|----------|-----------|
| T4.2-01 | `match.created` Realtime event triggers AgentDashboard re-render | Component | **P0** | `AgentDashboard.test.tsx` |
| T4.2-02 | Push notification dispatched via Expo Push Service on new match | API/Unit | **P0** | `match-notification.test.ts` |
| T4.2-03 | Subscription cleaned up on component unmount (no leak) | Component | **P0** | `AgentDashboard.test.tsx` |
| T4.2-04 | Badge unread count shown when push not enabled | Component | **P1** | `AgentClientsScreen.test.tsx` |
| T4.2-05 | push_token from `push_tokens` table used in dispatch | API/Unit | **P1** | `match-notification.test.ts` |

### Story 4.3 — Historial por Cliente

| ID | Scenario | Level | Priority | File Hint |
|----|----------|-------|----------|-----------|
| T4.3-01 | Matches section returns correct match_events for client | API/Unit | **P0** | `client-history.test.ts` |
| T4.3-02 | Rejections section returns correct swipe_events (reject) for client | API/Unit | **P0** | `client-history.test.ts` |
| T4.3-03 | Cross-agent RLS isolation: agent cannot read other agent's client history | API/Unit | **P0** | `client-history.test.ts` |
| T4.3-04 | Pagination: `limit=20`, cursor-based, 21st item triggers next page | API/Unit | **P1** | `client-history.test.ts` |
| T4.3-05 | Property detail opens on row tap | Component | **P1** | `ClientHistoryScreen.test.tsx` |

### Story 4.4 — Deep Link

| ID | Scenario | Level | Priority | File Hint |
|----|----------|-------|----------|-----------|
| T4.4-01 | Cold start: `Linking.getInitialURL` with match deep link → navigate to match detail | Unit | **P0** | `deep-link.test.ts` |
| T4.4-02 | Background: `Linking` event listener fires → navigate to match detail | Unit | **P0** | `deep-link.test.ts` |
| T4.4-03 | "Marcar como gestionado" → match archived (status=`managed`) in DB | API/Unit | **P0** | `match-archive.test.ts` |
| T4.4-04 | Archived matches appear in "Gestionados" section, not in main feed | Component | **P1** | `AgentMatchesScreen.test.tsx` |
| T4.4-05 | Listing agent contact info visible in match detail view | Component | **P1** | `MatchDetailScreen.test.tsx` |

---

## 4. Execution Strategy

| Gate | Suite | Trigger |
|------|-------|---------|
| PR | All P0 + P1 Vitest tests (unit + component) | Every push |
| Nightly | Full Vitest suite + integration tests | Scheduled |

Estimated effort: P0 tests ~20-35h, P1 tests ~15-25h. Total: **35–60h** for full Epic 4 test suite.

---

## 5. Quality Gates

- P0 pass rate = **100%** (blocks merge)
- P1 pass rate ≥ **95%**
- RLS isolation tests (T4.1-01, T4.3-03) must pass — security gate
- Realtime subscription leak test (T4.2-03) must pass — stability gate
- Coverage target ≥ **80%** on new Epic 4 files

---

## 6. Open Assumptions

1. `agentBuyerBonds` RLS policy is already implemented and tested (Epic 3)
2. Expo Push Service token registration (`pushTokens` table) is already implemented
3. Supabase Realtime is enabled on `match_events` table in project settings
4. `has-new-matches` flag can be derived from `match_events` timestamp vs `agent_last_seen_at` (needs schema field or computed query)
