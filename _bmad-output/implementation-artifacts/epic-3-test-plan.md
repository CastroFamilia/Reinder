# Epic 3 Test Plan — Vínculo Comprador–Agente Representante

_Generated: 2026-04-27 | Status: ready for implementation_

## Overview

Test strategy for the buyer-agent representative link flow: secure referral token generation, single-use enforcement, bond creation, periodic reconfirmation, and UI override of listing agent data.

**Tech stack:** Expo (React Native), Next.js, Supabase Auth + RLS, Drizzle ORM, referral_tokens table, Edge Function push-notifications.

---

## Test Categories

- **Unit Tests:** Token generation logic, TTL calculation, single-use guard, RLS policies.
- **Integration Tests:** Supabase function triggers, Realtime event emission (referral.accepted / referral.expired), push notification delivery.
- **E2E Acceptance Tests:** Full flow from link generation to buyer acceptance and UI verification.

---

## Story 3.1: Generación de Link de Referral por el Agente

| Scenario | Type | Expected |
|----------|------|----------|
| Agent generates referral link | Happy Path | Token stored in `referral_tokens` with `used: false`, expires at `now + REFERRAL_TOKEN_TTL_DAYS` |
| Link URL format | Happy Path | Full URL `https://reinder.app/referral/{token}` visible + copyable |
| Single-use enforcement | NFR9 | Second use of same token rejected (token already `used: true`) |
| Token expiry display | Edge Case | Expired tokens show status "Expirado" with "Generar nuevo" CTA |
| Agent sees token list | Happy Path | List of own tokens with status: pendiente / aceptado / expirado |
| RLS: buyer cannot create token | Security | INSERT into `referral_tokens` as `buyer` role → RLS denies |

---

## Story 3.2: Aceptación del Vínculo por el Comprador

| Scenario | Type | Expected |
|----------|------|----------|
| Buyer opens valid link (authenticated) | Happy Path | Sees agent name + explanation; two CTA buttons |
| Buyer accepts bond | Happy Path | Bond created in DB, token `used: true`, event `referral.accepted` emitted |
| Redirect after acceptance | Happy Path | Buyer redirected to feed with toast "Elena es ahora tu agente representante" |
| Agent push notification | Happy Path | Agent receives push "Tu cliente {nombre} ha aceptado el vínculo" ≤5s |
| Token expired | Edge Case | Buyer sees "Este link ya no es válido. Pídele a tu agente que genere uno nuevo" |
| Token already used | Edge Case | Same error message as expired |
| Buyer not authenticated | Edge Case | Redirected to register/login; after auth, link flow resumes |
| Buyer rejects bond | Happy Path | No bond created, token remains unused |
| RLS: only linked agent sees bond | Security | Agent not linked to buyer cannot query their bond |

---

## Story 3.3: Reconfirmación Periódica y Desvinculación Voluntaria

| Scenario | Type | Expected |
|----------|------|----------|
| Bond approaching TTL expiry | Happy Path | Non-blocking banner "Tu vínculo con Elena caduca pronto — ¿deseas renovarlo?" |
| Buyer renews bond | Happy Path | Bond TTL extended, agent receives reconfirmation notification |
| Buyer ignores banner until expiry | Edge Case | Bond auto-expires, agent receives `referral.expired` event |
| Buyer unlinks from Perfil tab | Happy Path | Bond deleted, agent receives `referral.expired`, listings revert to listing agent |
| Post-unlink UI | Happy Path | PropertyCard shows original listing agent (not representative) |
| Concurrent unlink + renew | Edge Case | Atomic operation — only one succeeds |

---

## Story 3.4: Sobreescritura del Listing Agent en la UI

| Scenario | Type | Expected |
|----------|------|----------|
| Linked buyer views PropertyCard | Happy Path | Agent override: shows Elena's name/photo/contact, NOT listing agent |
| Linked buyer views PropertyDetailSheet | Happy Path | Same agent override in detail view |
| Linked buyer views Match Recap | Happy Path | Same agent override in recap screen |
| Linked buyer views Matches history | Happy Path | Same agent override in match history items |
| Unlinked buyer views PropertyDetail | Happy Path | Discrete banner "¿Tienes un agente? Pídele tu link de Reinder" |
| Agent data sourced from bond, not listing | Security | Data comes from `agent_buyer_bonds` join, not from `listings.agent_id` |

---

## NFR Tests

| NFR | Test | Verification |
|-----|------|-------------|
| NFR9 — Single-use token | Two concurrent requests to accept same token | Second request rejected atomically (DB unique constraint or optimistic lock) |
| NFR9 — Token TTL | Token with `expires_at` in the past | Query returns token as invalid; UI shows "Expirado" |
| NFR5 — TLS | All referral link traffic | HTTPS enforced; no HTTP fallback |
| NFR8 — Data privacy | Buyer bond data accessible to other agents | RLS denies cross-agent access to `agent_buyer_bonds` |

---

## Execution Order

Stories must be implemented sequentially: 3.1 → 3.2 → 3.3 + 3.4 (parallel).
Epic-level integration test (full flow) runs after 3.4 is complete.
