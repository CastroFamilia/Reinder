---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2026-03-15'
inputDocuments: ['_bmad-output/planning-artifacts/prd.md', '_bmad-output/planning-artifacts/ux-design-specification.md']
project_name: 'Reinder'
user_name: 'SantiCas'
date: '2026-03-15'
---

# Architecture Decision Document — Reinder

## Project Context Analysis

### Requirements Overview

**Functional Requirements (33 FRs en 6 dominios):**

| Dominio | FRs | Implicación arquitectónica principal |
|---|---|---|
| Identidad y Acceso | FR1–FR5 | Auth multi-rol (comprador, agente, agencia, admin); OAuth + JWT; 4 roles RBAC |
| Descubrimiento/Swipe | FR6–FR12 | Feed engine con prefetch; motor de match/reject; gestión de estado de listing |
| Vínculo Comprador–Agente | FR13–FR17 | Sistema de referral con tokens únicos; vínculo periódico con expiración; sobreescritura de datos en UI |
| Panel del Agente | FR18–FR21 | Notificaciones en tiempo real; agregación de historial por cliente |
| Gestión de Listings | FR22–FR27 | Conector CRM (webhooks + batch); validación catastral; ciclo de vida de listing |
| SEO + Admin | FR28–FR33 | SSR híbrido; schema.org; panel admin de plataforma |

**Non-Functional Requirements (16 NFRs críticos):**

| NFR | Requisito | Decisión arquitectónica implicada |
|---|---|---|
| NFR1 | Listing ≤1s en 4G | CDN de imágenes + prefetch de cards; lazy load optimizado |
| NFR2 | Animaciones ≥60fps | Rendering nativo (React Native Reanimated); sin JavaScript bridge en el swipe crítico |
| NFR3 | Match notification ≤5s | WebSockets o push server → arquitectura event-driven, no polling |
| NFR4 | SSR TTFB ≤2s | Edge rendering o SSR regional; caché agresivo de páginas de listing |
| NFR7 | Datos swipe encriptados en reposo | Encryption at rest en base de datos; separación de datos comportamentales |
| NFR10 | Escala a 10x sin rediseño | Arquitectura stateless; base de datos horizontal; queues para CRM sync |
| NFR11 | CRM sync no degrada UI | Procesamiento asíncrono desacoplado; queue separado de la API del comprador |

**Scale & Complexity:**

- Dominio primario: Full-stack Web (Next.js SSR) + Mobile nativo (React Native)
- Complejidad: **Media-Alta** — 4 roles, tiempo real, integraciones externas, two-sided marketplace
- Componentes arquitectónicos estimados: ~8 dominios (Auth, Feed/Match engine, CRM connector, Notification service, Agent dashboard, SEO layer, Admin panel, Analytics)

### Technical Constraints & Dependencies

- **CRM externo (Inmovilla y otros):** Integración vía webhook/API; no controlamos el SLA del tercero → necesitamos retry + circuit breaker
- **MLS / Catastro Español:** API externa para verificación de exclusividad; latencia variable → procesamiento async, no en tiempo real durante el swipe
- **App Stores (Apple + Google):** Ciclo de release de apps móviles; las decisiones de UI críticas deben considerar review time
- **GDPR:** Jurisdicción española/europea — consentimiento en onboarding, datos en reposo encriptados, separación de datos personales vs comportamentales
- **Greenfield:** Sin deuda técnica, pero sin usuarios reales → las decisiones de arquitectura deben priorizar velocidad de desarrollo del MVP sobre optimización prematura

### Cross-Cutting Concerns Identified

1. **Autenticación y RBAC** — 4 roles (comprador, agente, agencia, admin) con permisos distintos en todas las capas
2. **Event System** — Matches generan eventos que fluyen a notificaciones de agentes; lifecycle de listings genera eventos que actualizan el feed
3. **Real-time Infrastructure** — Match notifications ≤5s requieren WebSocket o APNS/FCM push en toda la plataforma
4. **Media Management** — Imágenes de propiedades (alta resolución); CDN + optimización es transversal a web y mobile
5. **Data Partitioning** — Separación de datos comportamentales (swipes) vs personales (identidad) por GDPR
6. **CRM Integration Layer** — Patrón Adapter para soportar múltiples CRMs con interfaz unificada interna
7. **Gated Content Pattern** — Páginas indexables para SEO que requieren auth para contenido completo; afecta routing en todas las plataformas


## Starter Template Evaluation

### Primary Technology Domain

Full-stack Web (Next.js 15) + Mobile nativo (Expo/React Native) — **monorepo pnpm/Turborepo** para compartir lógica de negocio.

### Arquitectura de Monorepo

```
reinder/
├── apps/
│   ├── web/          # Next.js 15 (SSR, SEO, panel agente, admin)
│   └── mobile/       # Expo React Native (swipe UI, comprador)
├── packages/
│   ├── shared/       # Types, API client, constantes, utilidades
│   └── ui/           # Componentes compartibles (si aplica)
├── turbo.json
└── package.json (pnpm workspace)
```

### Comandos de Inicialización

```bash
# Web
npx create-next-app@latest apps/web --ts --eslint --app --src-dir --import-alias "@/*" --turbopack

# Mobile
npx create-expo-app@latest apps/mobile --template blank-typescript
```

### Decisiones Arquitectónicas Establecidas por el Starter

| Área | Decisión |
|---|---|
| Lenguaje | TypeScript estricto en toda la plataforma |
| Routing Web | Next.js App Router (React Server Components) |
| Routing Mobile | Expo Router (file-based, equivalente App Router) |
| Build tooling Web | Turbopack (dev), Webpack (prod) |
| Build tooling Mobile | Metro bundler |
| Monorepo | Turborepo + pnpm workspaces |
| Code sharing | `packages/shared` para types, API client, constantes |

> **Nota:** La inicialización del monorepo con estos comandos debe ser la primera historia de implementación.

---

## Core Architectural Decisions

### Decision Priority Analysis

**Decisiones Críticas (Bloquean Implementación):**
- Backend: Supabase (PostgreSQL + Auth + Realtime + Storage)
- ORM: Drizzle ORM
- API: REST via Next.js Route Handlers + Supabase Realtime
- Auth: Supabase Auth (email + Google OAuth) con RBAC por Row Level Security

**Decisiones Importantes (Forman la Arquitectura):**
- State management: Zustand (web + mobile)
- Styling: Tailwind CSS v4 (web) + NativeWind v4 (mobile)
- Hosting: Vercel (web) + Expo EAS (mobile)
- Notificaciones: Supabase Realtime (web) + Expo Push Notifications (mobile/APNS+FCM)

**Decisiones Diferidas (Post-MVP):**
- Redis/Upstash para cache del feed (cuando el volumen lo justifique)
- Analytics avanzados de listings (panel de agencia Phase 2)
- CDN de imágenes dedicado (Cloudinary) si Supabase Storage no es suficiente

---

### Data Architecture

**Backend principal:** Supabase (PostgreSQL gestionado)
- Región: EU West (Frankfurt) — GDPR compliance
- Encryption at rest: activada por defecto en Supabase
- Backups: automáticos diarios incluidos en plan

**ORM:** Drizzle ORM (TypeScript-first, schema as code, compatible con Supabase)
- Migraciones: Drizzle Kit (`drizzle-kit generate` + `drizzle-kit migrate`)
- Schemas en `packages/shared/db/schema.ts` — visible para web y mobile

**Caching:** Supabase integrado (query-level) en MVP; Upstash Redis post-MVP para feed del comprador

**Separación de datos (GDPR):**
- Tabla `user_profiles`: datos personales identificables
- Tabla `swipe_events`: comportamiento anónimo (buyer_id + listing_id + action)
- Tabla `match_events`: solo IDs, sin datos personales directos

---

### Authentication & Security

**Proveedor:** Supabase Auth
- Métodos: email/password + Google OAuth (FR1–FR2)
- JWT automático con refresh tokens
- Next.js: `@supabase/ssr` para SSR/RSC compatibility
- React Native: `@supabase/supabase-js` con AsyncStorage

**RBAC — 4 Roles (Row Level Security en Supabase):**

| Rol | Descripción | Acceso |
|---|---|---|
| `buyer` | Comprador final | Swipe feed, historial matches, vínculo agente |
| `agent` | Agente representante | Panel clientes, notificaciones matches, historial por cliente |
| `agency_admin` | Admin de agencia | Gestión listings, analytics de agencia |
| `platform_admin` | Admin Reinder | Gestión global, activación agencias, resolución duplicados |

**Política de seguridad:**
- RLS activado en todas las tablas — acceso denegado por defecto
- NFR5: TLS 1.3 en todas las comunicaciones (Supabase/Vercel por defecto)
- NFR6: Tokens expiran a los 30 días de inactividad (Supabase Auth configurable)
- NFR9: Referral tokens de un solo uso con expiración configurable

---

### API & Communication Patterns

**Patrón principal:** REST API via Next.js 15 App Router Route Handlers
- Base URL: `/api/v1/` en el dominio web
- Mobile y web consumen la misma API
- Sin GraphQL en MVP (overhead innecesario; REST es suficiente)

**Real-time (Notificaciones de match ≤5s — NFR3):**
- Web: Supabase Realtime (WebSocket subscriptions sobre cambios de DB)
- Mobile: Expo Push Notifications → APNS (iOS) + FCM (Android)
- Flujo: Swipe evento → Supabase trigger → Realtime broadcast → Agente recibe notificación

**CRM Sync (desacoplado — NFR11):**
- Supabase Edge Functions para webhooks de CRM entrantes
- Cola de procesamiento: `pg_cron` o Supabase Background Tasks
- Retry con backoff exponencial en fallos de CRM (circuit breaker)
- El feed del comprador NO está bloqueado por el sync del CRM

**Notificaciones Push Mobile:**
- Expo Push Notification Service (unifica APNS + FCM)
- Tokens registrados en tabla `push_tokens` por usuario

---

### Frontend Architecture

**Web (Next.js 15 App Router):**
- State management: **Zustand** (stores client-side; un store por dominio)
- Styling: **Tailwind CSS v4** (utility-first, config en `packages/shared/tailwind.config.ts`)
- Animaciones: **Framer Motion** (transiciones de UI, panel del agente)
- Data fetching: React Server Components para datos estáticos + TanStack Query para datos dinámicos del cliente

**Mobile (Expo / React Native):**
- State management: **Zustand** (mismo patrón que web)
- Styling: **NativeWind v4** (Tailwind para React Native — mismas clases utility)
- Animaciones swipe: **React Native Reanimated 3** (worklets JS en UI thread → 60fps garantizado — NFR2)
- Gestos: **React Native Gesture Handler** (swipe gestures de alta precisión)
- Navegación: **Expo Router** (file-based, integrado con Supabase Auth)

---

### Infrastructure & Deployment

| Componente | Solución | Justificación |
|---|---|---|
| Web hosting | Vercel | Integración nativa Next.js, Edge Runtime, preview deploys por PR |
| Mobile builds | Expo EAS | Builds en cloud, OTA updates sin App Store, submission automatizado |
| Base de datos | Supabase (EU-West) | GDPR en Europa, managed PostgreSQL, Auth+Realtime incluidos |
| CDN imágenes | Supabase Storage | Integrado, sin coste adicional en MVP |
| CI/CD | GitHub Actions | Auto-deploy → Vercel en push; EAS Build en tags de release |
| Monitoring errores | Sentry (web + mobile) | SDK unificado para Next.js y Expo |
| Analytics plataforma | Vercel Analytics + PostHog | Privacidad-first, compatible GDPR |

### Decision Impact Analysis

**Secuencia de implementación:**
1. Setup monorepo (Turborepo + pnpm)
2. Supabase proyecto + schema inicial (Drizzle)
3. Auth flow (web + mobile)
4. Swipe UI + feed engine (mobile primero)
5. Realtime notifications
6. CRM connector (Inmovilla)
7. Panel del agente (web)
8. SEO/Gated content (web)

**Dependencias entre decisiones:**
- Supabase Auth → dependen todos los flujos autenticados
- Drizzle schema → depende CRM connector, feed engine, notificaciones
- Expo Router → depende toda la navegación mobile
- Zustand stores → dependen los componentes client-side de ambas plataformas

---

## Implementation Patterns & Consistency Rules

### Puntos de Conflicto Potencial Identificados: 6 áreas

### Naming Patterns

**Base de datos — snake_case, plural:**
```sql
-- Tablas: plural, snake_case
users, user_profiles, listings, swipe_events, match_events, referral_tokens, push_tokens, agencies, agency_crm_connections

-- Columnas: snake_case
user_id, created_at, listing_id, buyer_id, agent_id, agency_id

-- Foreign keys: {entidad}_id (NO fk_{entidad})
buyer_id, agent_id, listing_id

-- Índices: idx_{tabla}_{columna}
idx_swipe_events_buyer_id, idx_listings_agency_id
```

**API endpoints — plural, kebab-case:**
```
GET    /api/v1/listings
GET    /api/v1/listings/:id
POST   /api/v1/swipe-events
GET    /api/v1/matches
GET    /api/v1/agent/clients
GET    /api/v1/agent/matches
GET    /api/v1/agency/listings
POST   /api/v1/agency/listings
POST   /api/v1/referrals
PATCH  /api/v1/referrals/:token/accept
```

**Código TypeScript — convenciones estrictas:**
```ts
// Componentes React: PascalCase
SwipeCard, ListingDetail, AgentDashboard, MatchHistoryList

// Archivos de componentes: kebab-case
swipe-card.tsx, listing-detail.tsx, agent-dashboard.tsx

// Variables y funciones: camelCase
const userId = ...; const listingId = ...;
function getMatchHistory() {}

// Constantes globales: SCREAMING_SNAKE_CASE
const MAX_SWIPE_PREFETCH = 10;
const REFERRAL_TOKEN_TTL_DAYS = 30;

// Tipos e interfaces: PascalCase con prefijo descriptivo
interface Listing { ... }
type SwipeAction = 'match' | 'reject';
```

### Structure Patterns

**Organización por feature (NO por tipo):**
```
features/
├── auth/           # FR1–FR5: registro, login, T&C, OAuth
├── swipe/          # FR6–FR12: feed, swipe UI, match engine
├── agent-link/     # FR13–FR17: referral, vínculo comprador-agente
├── agent-panel/    # FR18–FR21: dashboard, notificaciones
├── listings/       # FR22–FR30: CRM sync, ciclo vida, SEO pages
└── admin/          # FR31–FR33: gestión plataforma
```

**Tests co-located junto al archivo fuente:**
```
swipe-card.tsx
swipe-card.test.tsx     ← junto al componente, NO en /tests separado
use-swipe-store.ts
use-swipe-store.test.ts
```

### Format Patterns

**Respuesta API — wrapper estándar OBLIGATORIO:**
```ts
// ✅ CORRECTO — toda Route Handler devuelve este formato
type ApiResponse<T> = { data: T; error: null } | { data: null; error: ApiError }
type ApiError = { code: string; message: string }

// Ejemplo éxito
{ data: { listing: {...} }, error: null }

// Ejemplo error
{ data: null, error: { code: "NOT_FOUND", message: "Listing no encontrado" } }

// ❌ PROHIBIDO — respuesta directa sin wrapper
{ listing: {...} }
```

**Fechas:** ISO 8601 siempre (`2026-03-15T16:01:00Z`). Nunca Unix timestamps en la API.

**JSON fields:** `camelCase` en cliente TypeScript / `snake_case` en DB. La transformación la hace Drizzle ORM automáticamente.

### Communication Patterns

**Eventos Supabase Realtime — dot.notation:**
```
match.created       ← buyer hace match → agente notificado
listing.updated     ← estado de listing cambia (activa/vendida/retirada)
listing.removed     ← listing retirado del mercado
referral.accepted   ← comprador acepta vínculo con agente
referral.expired    ← vínculo expirado por reconfirmación pendiente
crm.sync.completed  ← batch de CRM procesado
```

**Zustand stores — un store por dominio:**
```ts
useSwipeStore    // feed queue, card actual, prefetch buffer
useMatchStore    // historial matches del comprador
useAgentStore    // clientes vinculados, stream de matches en tiempo real
useAuthStore     // sesión de usuario, rol, perfil
useListingStore  // gestión listings de agencia (web)
```

### Process Patterns

**Error handling — cascada estándar en Route Handlers:**
```ts
// 1. Validar input con Zod → devolver { data: null, error }
// 2. Supabase error → log Sentry → return { data: null, error }
// 3. Network error → retry 3x con backoff exponencial
// 4. NUNCA hacer throw en Route Handlers → siempre return ApiResponse
```

**Loading states — nomenclatura fija:**
```ts
isLoading       // carga inicial de datos
isSubmitting    // formulario en envío
isFetching      // refetch en background
// ❌ PROHIBIDO: loading, fetching, submitting (sin prefijo 'is')
```

**CRM Sync — patrón obligatorio de desacoplamiento (NFR11):**
```
Webhook CRM → Supabase Edge Function (valida) → inserta en queue DB → pg_cron worker procesa
↑ NUNCA sincronizar CRM en el request path del comprador ↑
```

### Enforcement Guidelines

**Todo agente de IA DEBE:**
- Usar `snake_case` en schemas Drizzle/DB y `camelCase` en TypeScript
- Devolver `ApiResponse<T>` desde TODAS las Route Handlers
- Aplicar RLS en cada nueva tabla creada en Supabase
- Co-locar tests junto al archivo fuente (`.test.tsx`)
- Usar Zod para validación en Route Handlers (no solo en cliente)
- Respetar `is` prefix en booleanos de estado (isLoading, isSubmitting)
- Procesar CRM sync de forma asíncrona, nunca en request path del comprador
- Usar dot.notation para nombres de eventos Realtime

---

## Project Structure & Boundaries

### Mapeo FR → Estructura de Directorios

| Dominio FRs | Directorio |
|---|---|
| FR1–FR5 (Auth) | `features/auth/` en web y mobile |
| FR6–FR12 (Swipe) | `features/swipe/` en mobile; `features/listings/` en web |
| FR13–FR17 (Agente-Comprador link) | `features/agent-link/` en mobile + web |
| FR18–FR21 (Panel Agente) | `features/agent-panel/` en web |
| FR22–FR27 (Listings/CRM) | `features/listings/` en web + Supabase Edge Functions |
| FR28–FR30 (SEO) | `app/(public)/listings/[id]/` en web (Next.js App Router) |
| FR31–FR33 (Admin) | `features/admin/` en web |

### Complete Project Directory Structure

```
reinder/
├── .github/
│   └── workflows/
│       ├── ci.yml              # Lint, test, type-check en PRs
│       └── release.yml         # EAS Build en tags
├── apps/
│   ├── web/                    # Next.js 15 App Router
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── globals.css
│   │   │   │   ├── (auth)/
│   │   │   │   │   ├── login/page.tsx
│   │   │   │   │   ├── register/page.tsx
│   │   │   │   │   └── terms/page.tsx
│   │   │   │   ├── (public)/
│   │   │   │   │   └── listings/
│   │   │   │   │       └── [id]/page.tsx   # SEO gated content (FR28–FR30)
│   │   │   │   ├── (dashboard)/
│   │   │   │   │   ├── agent/
│   │   │   │   │   │   ├── page.tsx        # Panel agente (FR18–FR21)
│   │   │   │   │   │   └── clients/[id]/page.tsx
│   │   │   │   │   └── agency/
│   │   │   │   │       ├── listings/page.tsx  # Gestión listings (FR22–FR27)
│   │   │   │   │       └── settings/page.tsx
│   │   │   │   ├── admin/
│   │   │   │   │   ├── agencies/page.tsx   # FR31
│   │   │   │   │   ├── listings/page.tsx   # FR32
│   │   │   │   │   └── metrics/page.tsx    # FR33
│   │   │   │   └── api/
│   │   │   │       └── v1/
│   │   │   │           ├── listings/
│   │   │   │           │   ├── route.ts
│   │   │   │           │   └── [id]/route.ts
│   │   │   │           ├── swipe-events/route.ts
│   │   │   │           ├── matches/route.ts
│   │   │   │           ├── referrals/
│   │   │   │           │   └── [token]/route.ts
│   │   │   │           ├── agent/
│   │   │   │           │   ├── clients/route.ts
│   │   │   │           │   └── matches/route.ts
│   │   │   │           └── agency/
│   │   │   │               └── listings/route.ts
│   │   │   ├── features/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── login-form.tsx
│   │   │   │   │   │   ├── login-form.test.tsx
│   │   │   │   │   │   └── terms-modal.tsx
│   │   │   │   │   └── hooks/
│   │   │   │   │       └── use-auth.ts
│   │   │   │   ├── listings/
│   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── listing-seo-page.tsx
│   │   │   │   │   │   ├── listing-seo-page.test.tsx
│   │   │   │   │   │   └── listing-status-badge.tsx
│   │   │   │   │   └── lib/
│   │   │   │   │       └── structured-data.ts  # schema.org (FR29)
│   │   │   │   ├── agent-panel/
│   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── client-list.tsx
│   │   │   │   │   │   ├── match-feed.tsx
│   │   │   │   │   │   └── match-feed.test.tsx
│   │   │   │   │   └── hooks/
│   │   │   │   │       └── use-realtime-matches.ts
│   │   │   │   └── admin/
│   │   │   │       └── components/
│   │   │   │           ├── agency-table.tsx
│   │   │   │           └── duplicate-resolver.tsx
│   │   │   ├── components/         # Componentes reutilizables cross-feature
│   │   │   │   ├── ui/             # Botones, inputs, modales base
│   │   │   │   └── layout/         # Header, Sidebar, Footer
│   │   │   ├── lib/
│   │   │   │   ├── supabase/
│   │   │   │   │   ├── client.ts   # Supabase browser client
│   │   │   │   │   └── server.ts   # Supabase server client (@supabase/ssr)
│   │   │   │   ├── validations/    # Zod schemas compartidos web
│   │   │   │   └── utils.ts
│   │   │   ├── stores/             # Zustand stores (web)
│   │   │   │   ├── use-auth-store.ts
│   │   │   │   ├── use-agent-store.ts
│   │   │   │   └── use-listing-store.ts
│   │   │   └── middleware.ts       # Auth middleware Next.js
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── .env.local.example
│   │
│   └── mobile/                     # Expo React Native
│       ├── src/
│       │   ├── app/                # Expo Router (file-based)
│       │   │   ├── _layout.tsx     # Root layout + auth guard
│       │   │   ├── (auth)/
│       │   │   │   ├── login.tsx
│       │   │   │   └── register.tsx
│       │   │   ├── (tabs)/
│       │   │   │   ├── swipe.tsx   # Tab principal — swipe feed
│       │   │   │   └── matches.tsx # Historial de matcheos
│       │   │   └── agent-link.tsx  # Aceptar referral de agente
│       │   ├── features/
│       │   │   ├── swipe/
│       │   │   │   ├── components/
│       │   │   │   │   ├── swipe-card.tsx          # Animated card
│       │   │   │   │   ├── swipe-card.test.tsx
│       │   │   │   │   ├── swipe-deck.tsx          # Card stack + gesture
│       │   │   │   │   └── listing-preview.tsx
│       │   │   │   ├── hooks/
│       │   │   │   │   └── use-swipe-gesture.ts    # Reanimated 3 worklet
│       │   │   │   └── lib/
│       │   │   │       └── prefetch-buffer.ts      # Prefetch 10 cards
│       │   │   ├── matches/
│       │   │   │   └── components/
│       │   │   │       └── match-list.tsx
│       │   │   ├── auth/
│       │   │   │   └── components/
│       │   │   │       └── onboarding-flow.tsx
│       │   │   └── agent-link/
│       │   │       └── components/
│       │   │           └── referral-accept.tsx
│       │   ├── components/         # Componentes reutilizables cross-feature
│       │   │   └── ui/
│       │   ├── lib/
│       │   │   └── supabase/
│       │   │       └── client.ts   # Supabase RN client + AsyncStorage
│       │   └── stores/             # Zustand stores (mobile)
│       │       ├── use-swipe-store.ts
│       │       ├── use-match-store.ts
│       │       └── use-auth-store.ts
│       ├── app.json
│       ├── eas.json
│       └── tsconfig.json
│
├── packages/
│   └── shared/                     # Código compartido web + mobile
│       ├── src/
│       │   ├── db/
│       │   │   ├── schema.ts       # Drizzle schema — fuente de verdad
│       │   │   └── migrations/
│       │   ├── types/
│       │   │   ├── listing.ts      # Tipos de dominio compartidos
│       │   │   ├── user.ts
│       │   │   ├── match.ts
│       │   │   └── api.ts          # ApiResponse<T>, ApiError
│       │   ├── validations/
│       │   │   └── listing.schema.ts  # Zod schemas compartidos
│       │   └── constants/
│       │       └── index.ts        # REFERRAL_TOKEN_TTL_DAYS, MAX_SWIPE_PREFETCH, etc.
│       ├── package.json
│       └── tsconfig.json
│
├── supabase/                       # Supabase local dev + Edge Functions
│   ├── migrations/                 # Migraciones SQL (generadas por Drizzle Kit)
│   ├── functions/
│   │   ├── crm-webhook/            # Recibe webhooks de CRM (FR22–FR23)
│   │   │   └── index.ts
│   │   └── push-notifications/     # Envía push via Expo (FR19)
│   │       └── index.ts
│   └── config.toml
│
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

### Architectural Boundaries

**API Boundaries:**
- Boundary entrada: `/api/v1/` en `apps/web` — única puerta de entrada HTTP para web y mobile
- Boundary Supabase: Row Level Security en BD — segunda capa de control de acceso
- Boundary CRM: Supabase Edge Functions — aíslan la lógica de integración del core
- Boundary push: Expo Push Service — abstrae APNS/FCM del código de aplicación

**Data Boundaries (GDPR):**
- `user_profiles` — datos personales, acceso solo por el propio usuario y `platform_admin`
- `swipe_events` — comportamental, nunca expuesto directamente a agencias
- `match_events` — señal de intención, accesible por el agente asignado del comprador
- Agregados anonimizados para analytics de agencia (post-MVP)

**Code Sharing Boundary:**
- `packages/shared` es la única fuente para: tipos de dominio, schema Drizzle, validaciones Zod, constantes
- `apps/web` y `apps/mobile` JAMÁS duplican tipos — siempre importan de `@reinder/shared`

### Integration Points

**Flujo de datos principal — Swipe a Notificación:**
```
Mobile swipe → POST /api/v1/swipe-events → Supabase DB insert
→ Supabase Realtime trigger → broadcast a canal del agente
→ Web: useRealTimeMatches hook actualiza AgentDashboard
→ Mobile: Expo Push Notification al agente (si offline)
```

**Flujo CRM Sync:**
```
CRM webhook → supabase/functions/crm-webhook → validar + encolar en DB
→ pg_cron job (cada N min) → procesa queue → upsert listings
→ Supabase Realtime → feed de swipe actualizado
```

**External Integrations:**
- **Supabase Auth:** OAuth con Google via Supabase (no Clerk ni Auth.js)
- **CRM (Inmovilla):** webhook entrante + API poll como fallback
- **Expo Push:** llamada HTTP desde supabase Edge Function con token guardado en `push_tokens`
- **Sentry:** SDK en `apps/web` (Next.js plugin) y `apps/mobile` (Expo plugin)
- **Vercel Analytics + PostHog:** script en `apps/web/layout.tsx`

### Development Workflow Integration

**Dev local:**
```bash
pnpm dev       # Turborepo arranca web (Next.js) + mobile (Expo) en paralelo
supabase start # DB local + Auth + Edge Functions emuladas
```

**CI/CD:**
- PR → GitHub Actions: `pnpm lint && pnpm typecheck && pnpm test`
- Merge main → Vercel deploy automático (web)
- Tag `v*.*.*` → EAS Build (mobile) → TestFlight + Google Play Internal


---

## Architecture Validation Results

### Coherence Validation ✅

**Compatibilidad de tecnologías:**
Todas las tecnologías seleccionadas son oficialmente compatibles entre sí. Next.js 15 + `@supabase/ssr`, Expo + Supabase JS SDK, Drizzle ORM + PostgreSQL Supabase, NativeWind v4 + Expo Router, Reanimated 3 + Gesture Handler y Zustand en web y mobile son combinaciones probadas en producción en 2025. Sin conflictos de versiones ni decisiones contradictorias detectadas.

**Consistencia de patrones:**
Los patrones de naming (snake_case DB / camelCase TypeScript), la organización por features, el wrapper `ApiResponse<T>` y las reglas de enforcement son coherentes con el stack elegido y entre sí.

**Alineamiento de estructura:**
El árbol de directorios refleja exactamente las decisiones arquitectónicas: App Router en web, Expo Router en mobile, packages/shared como fuente única de tipos, supabase/ para Edge Functions.

### Requirements Coverage Validation ✅

**Cobertura de Functional Requirements (33/33):**

| Dominio | FRs | Estado |
|---|---|---|
| Auth (FR1–FR5) | Supabase Auth, RLS, OAuth | ✅ |
| Swipe/Feed (FR6–FR12) | `features/swipe/`, prefetch buffer, Reanimated 3 | ✅ |
| Vínculo agente (FR13–FR17) | referral tokens, `features/agent-link/`, RLS | ✅ |
| Panel agente (FR18–FR21) | `features/agent-panel/`, Supabase Realtime | ✅ |
| Listings/CRM (FR22–FR27) | Edge Functions, pg_cron queue, ciclo de vida | ✅ |
| SEO (FR28–FR30) | Next.js SSR, schema.org, `(public)/listings/[id]` | ✅ |
| Admin (FR31–FR33) | `features/admin/`, `platform_admin` RBAC | ✅ |

**Cobertura de Non-Functional Requirements (16/16):**

| NFR crítico | Solución | Estado |
|---|---|---|
| NFR1: Listing ≤1s 4G | Supabase Storage CDN + prefetch 10 cards | ✅ |
| NFR2: Animaciones ≥60fps | Reanimated 3 worklets en UI thread | ✅ |
| NFR3: Notificación ≤5s | Supabase Realtime WebSocket + Expo Push | ✅ |
| NFR4: TTFB ≤2s | Next.js SSR + Vercel Edge Runtime | ✅ |
| NFR5–7: Seguridad | TLS default, JWT 30d, encryption at rest Supabase | ✅ |
| NFR10: Escala 10x | API stateless, PostgreSQL horizontal, Vercel | ✅ |
| NFR11: CRM desacoplado | Edge Function + pg_cron queue separada | ✅ |
| GDPR | Separación `user_profiles`/`swipe_events`, RLS por rol | ✅ |

### Implementation Readiness Validation ✅

**Completitud de decisiones:** Todas las decisiones críticas documentadas con versiones verificadas mediante búsqueda web. Sin técnicas de implementación ambiguas.

**Completitud de estructura:** Árbol de directorios completo y específico. Todos los archivos relevantes nombrados. Mapeo FR→directorio explícito.

**Completitud de patrones:** 6 categorías de conflicto potencial identificadas y resueltas con ejemplos concretos y contraejemplos. 8 reglas de enforcement explícitas para agentes de IA.

### Gap Analysis Results

**Gaps críticos:** Ninguno ✅

**Gaps importantes (no bloquean MVP):**
- Schema Drizzle detallado (columnas y tipos exactos) — a definir en historias de implementación
- Políticas RLS SQL específicas — a definir junto al schema en la primera historia
- Configuración detallada de `turbo.json` — a definir en la historia de setup del monorepo

**Gaps opcionales (post-MVP):**
- Rate limiting en Route Handlers
- Storybook para design system
- Redis/Upstash para cache del feed cuando el volumen lo justifique

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Contexto del proyecto analizado en profundidad
- [x] Escala y complejidad evaluadas (Media-Alta)
- [x] Constraints técnicas identificadas (CRM, GDPR, App Stores)
- [x] Cross-cutting concerns mapeados (7 identificados)

**✅ Architectural Decisions**
- [x] Decisiones críticas documentadas con versiones verificadas
- [x] Stack tecnológico completamente especificado
- [x] Patrones de integración definidos
- [x] Consideraciones de rendimiento abordadas

**✅ Implementation Patterns**
- [x] Convenciones de naming establecidas con ejemplos
- [x] Patrones de estructura definidos (feature-based)
- [x] Patrones de comunicación especificados (Realtime events)
- [x] Patrones de proceso documentados (error handling, loading states, CRM sync)

**✅ Project Structure**
- [x] Estructura de directorios completa y específica
- [x] Boundaries de componentes establecidos
- [x] Puntos de integración mapeados
- [x] Mapeo completo FR→directorio

### Architecture Readiness Assessment

**Estado General: LISTO PARA IMPLEMENTACIÓN** 🟢

**Nivel de Confianza: Alto**

**Puntos Fuertes:**
1. Supabase como BaaS resuelve Auth + Realtime + Storage + GDPR con cero infraestructura propia en MVP
2. Monorepo pnpm/Turborepo garantiza tipos compartidos y evita desincronización web/mobile
3. Reanimated 3 worklets aseguran 60fps del swipe sin compromiso de rendimiento
4. Separación de datos comportamentales/personales baked in desde el diseño (GDPR estructural)
5. CRM sync completamente desacoplado del request path del comprador (NFR11 garantizado)

**Áreas para Mejora Futura:**
- Schema Drizzle detallado y políticas RLS SQL (primera iteración de implementación)
- Rate limiting y protección contra abuso de la API
- Cache Redis para el feed cuando el inventario crezca

### Implementation Handoff

**Guías para Agentes de IA:**
- Seguir todas las decisiones arquitectónicas exactamente como están documentadas
- Usar los patrones de implementación de forma consistente en todos los componentes
- Respetar la estructura del proyecto y los boundaries definidos
- Consultar este documento para cualquier decisión técnica antes de implementar
- NUNCA duplicar tipos — siempre importar desde `@reinder/shared`
- Aplicar RLS en cada nueva tabla de Supabase sin excepción

**Primera Prioridad de Implementación:**
```bash
# 1. Inicializar monorepo
mkdir reinder && cd reinder
pnpm init
pnpm add -D turbo

# 2. Crear apps
npx create-next-app@latest apps/web --ts --eslint --app --src-dir --import-alias "@/*" --turbopack
npx create-expo-app@latest apps/mobile --template blank-typescript

# 3. Crear packages/shared
mkdir -p packages/shared/src

# 4. Configurar Supabase (EU-West)
supabase init
```
