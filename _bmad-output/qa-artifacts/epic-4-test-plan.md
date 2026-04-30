# Epic 4: Panel del Agente Representante — Test Plan & Risk Assessment

## 1. Context & Scope
**Epic Goal:** The agent can manage their linked clients and act upon their real-time matches through a dedicated panel.
**Functional Requirements Covered:** FR18, FR19, FR20, FR21, FR34.
**Non-Functional Requirements Covered:** NFR3 (Push notifications delivered in ≤5 seconds).

## 2. Risk Assessment
| Risk | Probability | Impact | Mitigation Strategy |
|------|------------|--------|----------------------|
| **R1:** Push notifications failing to deliver within 5s | High | High | Implement local E2E tests for the Expo Push Notification hook; mock Supabase Edge Functions. |
| **R2:** Realtime WebSockets dropping silently | Medium | High | Reconnection logic in `use-realtime-matches.ts`; fallback polling or manual refresh on app foreground. |
| **R3:** Supabase RLS incorrectly leaking client data to the wrong agent | Low | Critical | Strict RLS policy testing using specific agent profiles and verifying 403s on unauthorized accesses. |
| **R4:** Deep Links failing to parse or route correctly | Medium | Medium | Unit tests for Expo Router's deep linking parser; verify the schema mapping. |

## 3. Test Strategy

### 3.1 Unit Testing (Frontend)
- **Zustand Store (`useAgentStore`):** Test state updates when receiving new matches via WebSocket. Test sorting mechanisms (e.g., placing clients with new matches at the top).
- **Components:** Test the `AgentClientCard` for its different states (default vs. has-new-matches). Test the Agent's TabBar configuration.

### 3.2 Integration Testing (Backend/DB)
- **RLS Policies:** Execute queries as different agent roles to ensure an agent can ONLY see the `user_profiles` and `match_events` of buyers currently linked to them via an active `referral_tokens` bond.
- **Edge Functions:** Trigger a mock match event and verify the Edge Function attempts to enqueue a push notification via the `push_tokens` table.

### 3.3 Acceptance Testing (ATDD)
- **Scenario 1:** Agent logs in, views the 'Clientes' tab, and sees a list of active linked clients.
- **Scenario 2:** A linked buyer makes a match. The Agent receives a real-time WebSocket update in their panel and the client card highlights the new match.
- **Scenario 3:** Agent taps on a client card and views the complete history of matches and rejections for that client.
- **Scenario 4:** Agent taps on a specific match from the history and accesses the detailed view of the property.
- **Scenario 5:** Agent archives a managed match to clear it from their active view.

## 4. Automation Plan
- **Playwright / Cypress:** Since this is a React Native (Expo) app, E2E tests will primarily run using Detox or Maestro, but given the web output, Playwright will cover the web dashboard for the agent.
- **CI Pipeline:** The CI/CD pipeline will automatically run the RLS integration tests and the unit tests for the agent features upon PR creation.
