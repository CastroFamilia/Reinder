# Test Design — Epic 6: Descubrimiento Orgánico y SEO
_Generated: 2026-05-17 | Mode: Epic-Level | Stack: fullstack (Next.js 15 + Expo RN + Supabase)_

---

## 1. Scope

**Epic Goal:** El sistema genera páginas SSR indexables para cada listing activo, con datos estructurados schema.org y un gated content pattern que convierte visitantes orgánicos en usuarios registrados.

**Stories in scope:** 6.1, 6.2, 6.3

**Key dependencies:**
- Next.js 15 App Router con SSR/ISR (tag-based revalidation)
- Supabase DB (tabla `listings`, campo `status`)
- `packages/shared/src/db/schema.ts` (Drizzle ORM)
- Google Rich Results Test (schema.org validation)

---

## 2. Risk Assessment Matrix

| Risk ID | Category | Description | P | I | Score | Mitigation |
|---------|----------|-------------|---|---|-------|-----------|
| R1 | PERF | TTFB > 2s en páginas de listing SSR con consultas Supabase lentas | 2 | 3 | **6** 🚨 | ISR con revalidación por tag; query con índice en `listings.id + status` |
| R2 | SEO | Cache stale — listing `withdrawn`/`sold` sigue apareciendo en Google | 2 | 3 | **6** 🚨 | Revalidación tag-based al cambiar `status` en PATCH /api/listings/:id |
| R3 | SEO | Cloaking detectado por Google en gated content (contenido distinto para bot vs user) | 1 | 3 | **3** | Misma respuesta HTML para bot y user — solo JS oculta elementos en cliente |
| R4 | DATA | Schema.org incompleto o con campos nulos → rich snippet rechazado | 2 | 2 | **4** | Validación con Google Rich Results Test en CI + datos mínimos forzados |
| R5 | SEC | Acceso a listing `pending_review` vía URL directa sin autenticación | 1 | 3 | **3** | Solo listings `active` se renderizan; resto devuelven 404 |
| R6 | UX | Redirect post-login no redirige al listing original | 2 | 2 | **4** | `callbackUrl` en NextAuth / Supabase redirectTo preserva la URL de origen |

**High-risk items requiring dedicated test coverage before implementation:** R1, R2

---

## 3. Test Coverage Matrix

### Story 6.1 — Páginas de Listing SSR Indexables por Google

| ID | Scenario | Level | Priority | File Hint |
|----|----------|-------|----------|-----------|
| T6.1-01 | GET /listings/{id} de listing `active` → HTML completo con título, precio, descripción, imagen | API/SSR | **P0** | `listing-ssr.test.ts` |
| T6.1-02 | HTML incluye `<title>`, `<meta name="description">`, `og:image`, `og:price` correctos | Unit | **P0** | `listing-seo-meta.test.ts` |
| T6.1-03 | GET /listings/{id} de listing `withdrawn` → 404 | API | **P0** | `listing-ssr.test.ts` |
| T6.1-04 | GET /listings/{id} de listing `sold` con >72h → 404 | API | **P0** | `listing-ssr.test.ts` |
| T6.1-05 | TTFB ≤ 2s medido con curl en 3 peticiones consecutivas | Perf | **P1** | `listing-perf.test.ts` |
| T6.1-06 | Cache invalida automáticamente al cambiar `status` del listing | Integration | **P1** | `listing-cache-revalidation.test.ts` |

### Story 6.2 — Datos Estructurados Schema.org en Páginas de Listing

| ID | Scenario | Level | Priority | File Hint |
|----|----------|-------|----------|-----------|
| T6.2-01 | HTML contiene `<script type="application/ld+json">` con tipo `RealEstateListing` | Unit | **P0** | `structured-data.test.ts` |
| T6.2-02 | JSON-LD incluye: `name`, `description`, `price`, `address` (streetAddress, addressLocality, addressCountry), `numberOfRooms`, `floorSize`, `image` | Unit | **P0** | `structured-data.test.ts` |
| T6.2-03 | Campos opcionales nulos no generan campos `null` en el JSON-LD | Unit | **P1** | `structured-data.test.ts` |
| T6.2-04 | Schema se actualiza en ≤24h tras cambio en CRM (ISR revalidation tag trigger) | Integration | **P1** | `listing-cache-revalidation.test.ts` |

### Story 6.3 — Gated Content — Preview para Usuarios No Autenticados

| ID | Scenario | Level | Priority | File Hint |
|----|----------|-------|----------|-----------|
| T6.3-01 | Usuario no autenticado en /listings/{id} ve: imagen principal, precio, tipo, ubicación, primeras 2 líneas descripción | E2E/Component | **P0** | `gated-content.test.ts` |
| T6.3-02 | Usuario no autenticado NO ve: galería completa, descripción completa, datos del agente | E2E/Component | **P0** | `gated-content.test.ts` |
| T6.3-03 | CTA visible: "Regístrate gratis..." con botones "Registrarme" (primary) y "Iniciar sesión" (secondary) | Component | **P0** | `gated-content.test.ts` |
| T6.3-04 | Bot (User-Agent Googlebot) recibe misma respuesta HTML que usuario anónimo — no cloaking | API | **P0** | `gated-content-seo.test.ts` |
| T6.3-05 | Tras registro/login desde /listings/{id}, usuario es redirigido de vuelta al mismo listing con acceso completo | E2E | **P1** | `gated-content-redirect.test.ts` |

---

## 4. Execution Strategy

| Gate | Suite | Trigger |
|------|-------|---------|
| PR | T6.1-01/02/03/04, T6.2-01/02, T6.3-01/02/03/04 (todos P0) | Every push |
| Nightly | T6.1-05 (TTFB), T6.1-06 + T6.2-04 (cache revalidation) | Scheduled |

Estimated effort: P0 tests ~20–30h, P1 tests ~10–15h. Total: **30–45h** para el test suite de Epic 6.

---

## 5. Quality Gates

- P0 pass rate = **100%** (blocks merge)
- P1 pass rate ≥ **95%**
- No cloaking detectado por bot User-Agent check (T6.3-04 must pass)
- Coverage target ≥ **80%** en `features/listings/` y `app/listings/[id]/`

---

## 6. Open Assumptions

1. Next.js 15 ISR con `revalidateTag` está disponible y configurado en `apps/web`.
2. La tabla `listings` tiene índice en `(id, status)` para queries SSR performantes.
3. El campo `sold_at` (implementado en 5.4) se usa para calcular si han pasado >72h para el 404 de `sold`.
