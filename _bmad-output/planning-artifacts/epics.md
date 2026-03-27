---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
---

# Reinder - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Reinder, decomposing the requirements from the PRD, UX Design and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: El comprador puede registrarse con email o Google OAuth
FR2: El comprador debe aceptar Términos y Condiciones antes de acceder al contenido
FR3: El agente puede registrarse y autenticarse en la plataforma
FR4: El administrador de agencia puede crear y gestionar su cuenta institucional
FR5: El sistema requiere autenticación para acceder a cualquier contenido de propiedades
FR6: El comprador puede visualizar propiedades en formato de tarjeta de pantalla completa
FR7: El comprador puede hacer match (swipe derecho / acción positiva) sobre una propiedad
FR8: El comprador puede rechazar (swipe izquierdo / acción negativa) una propiedad
FR9: El sistema presenta propiedades del feed una a una en sesiones de corta duración
FR10: El comprador puede acceder a su historial completo de matches
FR11: El comprador puede ver el detalle ampliado de una propiedad antes de decidir
FR12: El sistema distingue visualmente propiedades con estado "Vendida" mediante badge
FR13: El agente puede generar un link de referral único para invitar a un comprador
FR14: El comprador puede aceptar o rechazar el vínculo con un agente representante
FR15: El vínculo comprador–agente caduca periódicamente y requiere reconfirmación activa
FR16: El comprador puede desvincular a su agente representante en cualquier momento
FR17: El sistema sobreescribe el "listing agent" por el agente representante del comprador en toda la UI
FR18: El agente puede visualizar todos sus clientes compradores vinculados
FR19: El agente recibe notificación inmediata cuando un cliente hace match
FR20: El agente puede ver el historial de matches de cada cliente vinculado
FR21: El agente puede ver qué propiedades ha rechazado cada cliente
FR22: La agencia puede conectar su CRM para importar sus exclusivas activas
FR23: El sistema sincroniza listings desde el CRM (real-time o batch, configurable)
FR24: El sistema valida exclusividad del listing mediante referencia catastral / CRU
FR25: El sistema detecta y bloquea listings duplicados hasta resolución manual
FR26: La agencia puede marcar una propiedad como retirada del mercado (eliminación inmediata del feed)
FR27: La agencia puede marcar una propiedad como vendida (visible brevemente con badge "Vendida")
FR28: El sistema genera páginas indexables por motores de búsqueda para cada listing activo
FR29: El sistema implementa datos estructurados schema.org para propiedades inmobiliarias
FR30: Los usuarios no autenticados ven una preview del listing con prompt de registro al acceder desde buscador
FR31: El administrador puede activar y desactivar agencias integradas
FR32: El administrador puede revisar y resolver listings marcados como duplicados
FR33: El administrador puede monitorear métricas globales de la plataforma
FR34: El agente puede archivar un match gestionado para mantener su panel organizado

### NonFunctional Requirements

NFR1: Las tarjetas de propiedad cargan en ≤1s en condiciones de red móvil 4G
NFR2: Las animaciones de swipe se ejecutan a ≥60fps en dispositivos con ≤3 años de antigüedad
NFR3: Las notificaciones de match al agente se entregan en ≤5 segundos tras la acción del comprador
NFR4: Las páginas de listing indexables (SEO) renderizan en servidor con Time to First Byte ≤2s
NFR5: Toda comunicación entre cliente y servidor usa HTTPS/TLS 1.3
NFR6: Los tokens de sesión expiran tras 30 días de inactividad
NFR7: Los datos de comportamiento del comprador (swipes, matches) se almacenan encriptados en reposo
NFR8: El sistema no expone datos personales del comprador a las agencias sin consentimiento explícito
NFR9: Los links de referral agente–comprador son de un solo uso o tienen expiración configurable
NFR10: La arquitectura soporta escalar a 10x usuarios sin rediseño estructural
NFR11: La sincronización de CRM no degrada el rendimiento de la UI del comprador (procesos desacoplados)
NFR12: La API de integración con CRMs tiene documentación pública y SLA de disponibilidad del 99.5%
NFR13: El sistema gestiona fallos de sincronización CRM con reintentos automáticos y alertas al admin
NFR14: Los datos estructurados schema.org de listings se actualizan en ≤24h tras cambios en el CRM
NFR15: Disponibilidad del servicio ≥99.5% mensual (excluyendo ventanas de mantenimiento programado)
NFR16: Los datos de matcheos del comprador no se pierden ante fallos de servidor (durabilidad garantizada)

### Additional Requirements

- **Monorepo Turborepo + pnpm workspaces:** La primera historia de implementación debe inicializar el monorepo con `apps/web` (Next.js 15), `apps/mobile` (Expo React Native) y `packages/shared` (tipos compartidos, schema Drizzle, constantes)
- **Supabase como BaaS central:** Configurar proyecto Supabase en región EU-West (GDPR), activar Auth, Realtime, Storage y encryption at rest. Es la dependencia crítica que bloquea toda implementación posterior.
- **Drizzle ORM + schema inicial:** Definir schema de base de datos en `packages/shared/db/schema.ts`; incluir tablas `users`, `user_profiles`, `listings`, `swipe_events`, `match_events`, `referral_tokens`, `push_tokens`, `agencies`, `agency_crm_connections`
- **Row Level Security (RLS):** Activar RLS en todas las tablas de Supabase desde el inicio. Política de acceso denegado por defecto. 4 roles: `buyer`, `agent`, `agency_admin`, `platform_admin`
- **Supabase Edge Functions para CRM sync:** Función `crm-webhook` que recibe webhooks de CRM → valida → encola en DB; worker `pg_cron` para procesamiento asíncrono. NUNCA sincronizar en el request path del comprador (NFR11)
- **Supabase Edge Function para push notifications:** Función `push-notifications` que envía notificaciones via Expo Push Service (unifica APNS + FCM) usando tokens registrados en tabla `push_tokens`
- **CI/CD GitHub Actions:** Pipeline `ci.yml` (lint + typecheck + test en PRs) y `release.yml` (EAS Build en tags de release)
- **Sentry monitoring:** SDK configurado en `apps/web` (Next.js plugin) y `apps/mobile` (Expo plugin)
- **Vercel Analytics + PostHog:** Script en `apps/web/layout.tsx` para tracking de plataforma compatible con GDPR
- **Secuencia de implementación arquitectónica:** monorepo → Supabase + schema → Auth → Swipe UI + feed → Realtime notifications → CRM connector → Panel agente → SEO/Gated content

### UX Design Requirements

UX-DR1: Implementar sistema de tokens de diseño compartido en `design-tokens.json`: colores (`--bg-primary: #0D0D0D`, `--accent-primary: #FF6B00`, `--text-primary: #F5F0E8`, `--surface: #1E1A15`, `--accent-reject: #8B3A3A`, `--accent-sold: #6B4E00`, `--text-muted: #9E9080`, `--border: #2E2820`), tipografía (Clash Display + Inter), espaciado (base 8px), animaciones (`--duration-fast: 150ms`, `--duration-normal: 300ms`, `--duration-payoff: 600ms`, `--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)`), radios (`--radius-card: 24px`, `--radius-btn: 12px`, `--radius-pill: 999px`)
UX-DR2: Crear componente `PropertyCard` — tarjeta full-screen glassmorphism (`backdrop-filter: blur(20px)`), con fallback `background: rgba(30,26,21,0.95)`. Estados: default, loading (skeleton glassmorphism pulsante con naranja sutil en bordes), sold. Incluir hero image, precio en Clash Display 32px/700, nombre propiedad, metadatos, y superposición de badge. Alt text en imagen requerido.
UX-DR3: Crear componente `SwipeActions` — botones reject/info/match con glow naranja en el botón de match. Estados: default, pressed, animating. Incluir labels ARIA "Me interesa" / "No me interesa" + soporte teclado como alternativa al gesto.
UX-DR4: Crear componente `MatchPayoff` — overlay de celebración de match usando React Native Reanimated 3 worklets (NFR2: 60fps). Animación naranja expansiva + SFX de "found it". Auto-cierre en 1.5s. Estados: appear, celebrating, dismiss. Curva: `--ease-spring`.
UX-DR5: Crear componente `MatchRecapScreen` — galería de últimos 3-5 matches que aparece automáticamente tras acumular ese número de matches. Permite reconfirmar (match reforzado, agente notificado) o descartar (eliminado del historial). Estados: loading, populated, empty.
UX-DR6: Crear componente `PropertyBadge` — chips de estado para EXCLUSIVA (naranja), VENDIDA (ámbar oscuro `--accent-sold`), NUEVA. Visibles en tarjeta sin interrumpir la foto. Tamaño small (13px/400).
UX-DR7: Crear componente `GlassPanel` — base reutilizable glassmorphism con tres niveles de intensidad (light, medium, heavy blur). Base para tarjetas, modales y paneles de toda la app.
UX-DR8: Crear componente `TabBar` — navegación inferior rol-based. Comprador: 3 tabs (Swipe / Matches / Perfil). Agente: 2 tabs (Clientes / Notificaciones). Naranja en estado activo. Height: 60px.
UX-DR9: Crear componente `AgentClientCard` — tarjeta de cliente en panel del agente. Estados: default, has-new-matches. Acceso directo al historial del cliente con un tap.
UX-DR10: Implementar el Swipe Loop completo en mobile — apertura directa a primera tarjeta (cero pantallas intermedias), gesto de swipe derecho/izquierdo implementado con React Native Gesture Handler + Reanimated 3, tap para abrir detalle como bottom sheet. La vista de detalle se abre como sheet bottom-up, no como nueva pantalla. Gesto de back via swipe desde borde izquierdo.
UX-DR11: Implementar jerarquía de botones consistente en todaléa app: Primary (naranja sólido + glow), Secondary (glass + borde naranja translúcido), Destructive (glass + borde rojo apagado `#8B3A3A`), Ghost (solo texto naranja).
UX-DR12: Implementar feedback de error de red como toast glass en borde inferior: "Sin conexión — guardando para cuando vuelvas". Empty state de feed vacío con CTA de ajuste de zona. Empty state de feed agotado: "Has visto todas las propiedades de hoy — vuelve mañana" + badge de nuevas esperadas.
UX-DR13: Implementar gradiente de fondo radial global: `radial-gradient` desde `rgba(255,107,0,0.12)` hacia `#0D0D0D` — da calor sin saturar. Verificar rendimiento de `backdrop-filter: blur(20px)` en Android mid-range antes de release.
UX-DR14: Implementar deep linking para notificaciones — qualquier notificación push abre directamente el item relevante, cero pantallas intermedias. Flujo: tap en notificación → detalle del match del cliente.
UX-DR15: Implementar badge "X nuevas propiedades desde tu última visita" que aparece al reabrir la app tras una sesión previa.
UX-DR16: Implementar onboarding flow diferenciado: (a) llegada via referral link → acepta vínculo agente → registro → T&C → feed con agente; (b) llegada orgánica SEO landing → registro → T&C → feed sin agente + banner `AgentReferralBanner` (Phase 2) de invitación a vincular agente.

### FR Coverage Map

FR1: Epic 1 — Registro con email o Google OAuth
FR2: Epic 1 — Aceptación de T&C en onboarding (GDPR)
FR3: Epic 1 — Registro y autenticación del agente
FR4: Epic 1 — Cuenta institucional de agencia
FR5: Epic 1 — Acceso autenticado obligatorio a todo el contenido
FR6: Epic 2 — Tarjeta full-screen de propiedad en swipe feed
FR7: Epic 2 — Match (swipe derecho) con feedback visual/sonoro
FR8: Epic 2 — Descarte (swipe izquierdo) de propiedad
FR9: Epic 2 — Feed secuencial de propiedades (una a una)
FR10: Epic 2 — Historial completo de matches del comprador
FR11: Epic 2 — Vista de detalle ampliado de propiedad
FR12: Epic 2 — Badge visual de estado "Vendida"
FR13: Epic 3 — Generación de link de referral único por el agente
FR14: Epic 3 — Aceptación / rechazo del vínculo por el comprador
FR15: Epic 3 — Caducidad periódica del vínculo y reconfirmación
FR16: Epic 3 — Desvinculación voluntaria del agente representante
FR17: Epic 3 — Sobreescritura del listing agent por agente representante en UI
FR18: Epic 4 — Visualización de clientes vinculados en panel del agente
FR19: Epic 4 — Notificación inmediata al agente en cada match de cliente
FR20: Epic 4 — Historial de matches por cliente en el panel
FR21: Epic 4 — Historial de rechazos por cliente en el panel
FR22: Epic 5 — Conexión de CRM para importar exclusivas activas
FR23: Epic 5 — Sincronización de listings desde CRM (real-time / batch)
FR24: Epic 5 — Validación de exclusividad mediante referencia catastral / CRU
FR25: Epic 5 — Detección y bloqueo de listings duplicados hasta resolución
FR26: Epic 5 — Marca de propiedad como retirada (eliminación inmediata del feed)
FR27: Epic 5 — Marca de propiedad como vendida (badge temporal)
FR28: Epic 6 — Páginas de listing indexables por motores de búsqueda
FR29: Epic 6 — Datos estructurados schema.org en páginas de listing
FR30: Epic 6 — Preview de listing para no autenticados con prompt de registro
FR31: Epic 7 — Activación/desactivación de agencias por el admin
FR32: Epic 7 — Revisión y resolución de listings duplicados por el admin
FR33: Epic 7 — Monitoreo de métricas globales de plataforma
FR34: Epic 4 — Archivado de match gestionado por el agente

## Epic List

### Epic 1: Identidad y Acceso — Los usuarios pueden registrarse, autenticarse y gestionar sus cuentas según su rol

Un comprador, agente o administrador de agencia puede crear su cuenta, iniciar sesión (email o Google OAuth), aceptar los Términos y Condiciones (GDPR), y acceder a la plataforma según su rol. El sistema implementa RBAC completo con Row Level Security en Supabase, JWT con refresh tokens, y la restricción de acceso autenticado obligatorio a todo el contenido de propiedades.

**FRs cubiertos:** FR1, FR2, FR3, FR4, FR5
**NFRs aplicados:** NFR5 (TLS 1.3), NFR6 (tokens 30 días), NFR8 (datos sin exponer a agencias sin consentimiento)
**Requisitos de Arquitectura:** Monorepo Turborepo + pnpm setup, Supabase proyecto EU-West + Auth, Drizzle schema inicial (tablas users, user_profiles, agencies), RLS con 4 roles
**Requisitos UX:** UX-DR16 (onboarding diferenciado: referral vs. orgánico), UX-DR1 (design tokens aplicados en pantallas de auth)

---

### Epic 2: Swipe Loop — El comprador puede descubrir, hacer match y gestionar su historial de propiedades

Un comprador autenticado puede ver propiedades en formato de tarjeta full-screen glassmorphism, hacer match o descartar con gesto de swipe o botones accesibles, ver el detalle ampliado de una propiedad antes de decidir, revisar su historial completo de matches, y ver el badge visual cuando una propiedad está vendida. El sistema entrega el match recap cada 3–5 matches y muestra el badge de "X nuevas propiedades" al reabrir la app.

**FRs cubiertos:** FR6, FR7, FR8, FR9, FR10, FR11, FR12
**NFRs aplicados:** NFR1 (≤1s carga tarjeta en 4G), NFR2 (≥60fps animaciones), NFR7 (swipe_events encriptados en reposo), NFR16 (durabilidad de matcheos)
**Requisitos de Arquitectura:** `features/swipe/` en mobile (Expo), Reanimated 3 worklets en UI thread, React Native Gesture Handler, Zustand `useSwipeStore`, prefetch buffer de 10 tarjetas, tabla `swipe_events` + `match_events` en Drizzle
**Requisitos UX:** UX-DR2 (PropertyCard glassmorphism), UX-DR3 (SwipeActions con ARIA), UX-DR4 (MatchPayoff Reanimated 3), UX-DR5 (MatchRecapScreen), UX-DR6 (PropertyBadge), UX-DR7 (GlassPanel), UX-DR10 (swipe loop completo), UX-DR12 (empty states), UX-DR13 (gradiente fondo), UX-DR15 (badge nuevas propiedades)

---

### Epic 3: Vínculo Comprador–Agente Representante — El comprador puede vincularse con su agente de confianza

Un agente puede generar un link de referral único para invitar a su cliente comprador. El comprador puede aceptar o rechazar el vínculo, que caduca periódicamente y requiere reconfirmación activa. El comprador puede desvincularse en cualquier momento. Una vez vinculado, el sistema sobreescribe el "listing agent" por el agente representante del comprador en toda la UI, garantizando que cada propiedad se muestra en el contexto del representante de confianza del comprador.

**FRs cubiertos:** FR13, FR14, FR15, FR16, FR17
**NFRs aplicados:** NFR9 (referral tokens de un solo uso con expiración configurable)
**Requisitos de Arquitectura:** `features/agent-link/` en web + mobile, tabla `referral_tokens` con expiración, constante `REFERRAL_TOKEN_TTL_DAYS`, evento Realtime `referral.accepted` / `referral.expired`, Edge Function para push notification de aceptación
**Requisitos UX:** UX-DR16 (flow onboarding via referral link), UX-DR14 (deep link: notificación → aceptar vínculo)

---

### Epic 4: Panel del Agente Representante — El agente puede gestionar sus clientes y actuar sobre matches en tiempo real

Un agente autenticado con rol `agent` puede ver la lista de todos sus clientes compradores vinculados, recibir notificaciones push inmediatas cuando un cliente hace match (≤5s), ver el historial de matches y rechazos de cada cliente, y acceder directamente al detalle del match desde la notificación sin pasos intermedios. El panel es la superficie de inteligencia en tiempo real que diferencia a Reinder de cualquier herramienta existente.

**FRs cubiertos:** FR18, FR19, FR20, FR21, FR34
**NFRs aplicados:** NFR3 (notificación ≤5 segundos)
**Requisitos de Arquitectura:** `features/agent-panel/` en web, Supabase Realtime WebSocket subscriptions (`match.created` event), Expo Push Notifications → APNS + FCM, tabla `push_tokens`, hook `use-realtime-matches.ts`, Zustand `useAgentStore`
**Requisitos UX:** UX-DR8 (TabBar agente: Clientes / Notificaciones), UX-DR9 (AgentClientCard), UX-DR14 (deep link notificación → detalle match), UX-DR11 (jerarquía de botones en acciones del panel)

---

### Epic 5: Gestión de Listings e Integración CRM — Las agencias pueden publicar y gestionar su inventario exclusivo en Reinder

Una agencia puede conectar su CRM (Inmovilla) para importar sus exclusivas activas de forma automática. El sistema sincroniza listings en tiempo real (webhooks) con fallback a batch nocturno, valida exclusividad mediante referencia catastral/CRU, detecta y bloquea duplicados hasta resolución manual, y gestiona el ciclo de vida completo del listing (activa → retirada → vendida con badge temporal). Todo el procesamiento CRM ocurre de forma desacoplada, sin impacto en el rendimiento de la UI del comprador.

**FRs cubiertos:** FR22, FR23, FR24, FR25, FR26, FR27
**NFRs aplicados:** NFR11 (CRM sync desacoplada), NFR12 (API CRM con SLA 99.5%), NFR13 (reintentos automáticos + alertas), NFR14 (schema.org ≤24h)
**Requisitos de Arquitectura:** `features/listings/` en web, Supabase Edge Function `crm-webhook`, `pg_cron` worker para queue asíncrona, patrón Adapter para múltiples CRMs, tablas `listings`, `agencies`, `agency_crm_connections`, evento Realtime `listing.updated` / `listing.removed` / `crm.sync.completed`, circuit breaker con retry exponencial
**Requisitos UX:** UX-DR6 (PropertyBadge: VENDIDA / EXCLUSIVA / NUEVA), UX-DR11 (botones de acción en gestión de listings)

---

### Epic 6: Descubrimiento Orgánico y SEO — Cualquier persona puede descubrir Reinder desde buscadores y convertirse en usuario

El sistema genera páginas de listing indexables por motores de búsqueda con datos estructurados schema.org, renderizadas en servidor (SSR) en el dominio web (Next.js 15). Un usuario no autenticado que llega desde Google ve una preview del listing de calidad más un prompt claro de registro/login antes de acceder al contenido completo. Este gated content SEO actúa como el principal canal de adquisición orgánica de compradores para Reinder.

**FRs cubiertos:** FR28, FR29, FR30
**NFRs aplicados:** NFR4 (TTFB ≤2s en SSR), NFR5 (TLS 1.3)
**Requisitos de Arquitectura:** Next.js App Router `app/(public)/listings/[id]/page.tsx`, `features/listings/lib/structured-data.ts` para schema.org, SSR con Vercel Edge Runtime, caché agresivo de páginas de listing
**Requisitos UX:** UX-DR2 (PropertyCard adaptada para preview pública), layout de landing SEO (Phase 2: UX-DR16 funneling hacia registro)

---

### Epic 7: Administración de Plataforma — El equipo de Reinder puede operar y mantener la calidad de la plataforma

El administrador de Reinder (`platform_admin`) puede activar y desactivar agencias integradas, revisar y resolver listings marcados como duplicados pendientes de validación, y monitorear métricas globales de la plataforma (sesiones, matches, engagement, estado de integraciones CRM). Este epic también incluye la infraestructura de observabilidad: Sentry para errores en web + mobile, Vercel Analytics + PostHog para métricas de producto compatibles con GDPR, y el pipeline CI/CD completo.

**FRs cubiertos:** FR31, FR32, FR33
**NFRs aplicados:** NFR10 (arquitectura escalable a 10x), NFR15 (disponibilidad ≥99.5%), NFR16 (durabilidad de datos)
**Requisitos de Arquitectura:** `features/admin/` en web, Sentry SDK (Next.js + Expo plugins), Vercel Analytics + PostHog en `apps/web/layout.tsx`, GitHub Actions CI/CD (`ci.yml` + `release.yml`), RBAC `platform_admin`
**Requisitos UX:** UX-DR11 (botones y jerarquía visual en paneles admin), UX-DR13 (consistencia del sistema de diseño)

---

## Epic 1: Identidad y Acceso

Los usuarios (comprador, agente, agencia) pueden registrarse, autenticarse y acceder a la plataforma según su rol, con la infraestructura base del monorepo y el sistema de diseño operativos.

### Story 1.1: Inicialización del Monorepo y Sistema de Diseño Base

Como desarrollador del equipo Reinder,
quiero inicializar el monorepo Turborepo con las apps web y mobile y el sistema de tokens de diseño,
para que toda la implementación posterior tenga una base técnica y visual consistente.

**Acceptance Criteria:**

**Given** un repositorio Git vacío
**When** se ejecuta el script de inicialización del monorepo
**Then** existe la estructura `apps/web` (Next.js 15), `apps/mobile` (Expo blank-typescript) y `packages/shared` con TypeScript configurado
**And** `design-tokens.json` existe en `packages/shared` con todos los tokens de color (`--bg-primary: #0D0D0D`, `--accent-primary: #FF6B00`, etc.), tipografía (Clash Display + Inter), espaciado base 8px, animaciones y radios del spec UX-DR1
**And** `pnpm dev` desde la raíz arranca web y mobile en paralelo via Turborepo
**And** `packages/shared/src/types/api.ts` exporta `ApiResponse<T>` y `ApiError`
**And** `turbo.json` y `pnpm-workspace.yaml` están correctamente configurados

---

### Story 1.2: Configuración de Supabase y Schema de Base de Datos Inicial

Como desarrollador del equipo Reinder,
quiero configurar el proyecto Supabase en EU-West y definir el schema inicial con Drizzle ORM,
para que la infraestructura de datos esté lista antes de implementar cualquier flujo de usuario.

**Acceptance Criteria:**

**Given** un proyecto Supabase creado en región EU-West (Frankfurt)
**When** se ejecuta `drizzle-kit migrate`
**Then** existen las tablas `users`, `user_profiles`, `agencies`, `agency_crm_connections`, `listings`, `swipe_events`, `match_events`, `referral_tokens`, `push_tokens` con todos los campos en `snake_case`
**And** Row Level Security está activado en todas las tablas con política de acceso denegado por defecto
**And** los 4 roles RBAC (`buyer`, `agent`, `agency_admin`, `platform_admin`) están definidos
**And** el schema Drizzle vive en `packages/shared/src/db/schema.ts` e importable desde web y mobile
**And** encryption at rest está activada en Supabase
**And** `.env.local.example` en `apps/web` documenta todas las variables de entorno necesarias

---

### Story 1.3: Registro de Comprador con Email y Aceptación de T&C

Como comprador,
quiero registrarme en Reinder con email y contraseña aceptando los Términos y Condiciones,
para que pueda acceder al contenido con mi cuenta y con consentimiento GDPR registrado.

**Acceptance Criteria:**

**Given** un usuario no autenticado en la pantalla de registro
**When** introduce email, contraseña válida y acepta los T&C
**Then** se crea una cuenta en Supabase Auth con rol `buyer` y un registro en `user_profiles`
**And** el usuario es redirigido al swipe feed
**And** la aceptación de T&C queda registrada con timestamp en `user_profiles.terms_accepted_at`
**And** si el email ya existe, se muestra: "Ya existe una cuenta con este email. ¿Quieres iniciar sesión?"
**And** si la contraseña tiene menos de 8 caracteres, se muestra error de validación antes de enviar
**And** el botón "Crear cuenta" está desactivado hasta que se marque el checkbox de T&C

---

### Story 1.4: Registro y Login con Google OAuth

Como comprador,
quiero registrarme e iniciar sesión con mi cuenta de Google,
para que el acceso sea más rápido sin tener que recordar otra contraseña.

**Acceptance Criteria:**

**Given** un usuario no autenticado en la pantalla de login o registro
**When** pulsa "Continuar con Google" y completa el flujo OAuth
**Then** se crea o recupera su cuenta en Supabase Auth y es autenticado correctamente
**And** si es nuevo usuario vía Google, ve la pantalla de aceptación de T&C antes de acceder al feed
**And** si ya tenía cuenta de Google, accede directamente al feed (T&C ya aceptados)
**And** un JWT válido queda almacenado con expiración de 30 días de inactividad (NFR6)
**And** toda la comunicación ocurre sobre HTTPS/TLS 1.3 (NFR5)

---

### Story 1.5: Login de Agente y Administrador de Agencia

Como agente representante o administrador de agencia,
quiero iniciar sesión en Reinder con mis credenciales,
para que pueda acceder al panel correspondiente a mi rol.

**Acceptance Criteria:**

**Given** un agente o admin de agencia con cuenta existente en la pantalla de login
**When** introduce sus credenciales correctas
**Then** es autenticado y redirigido al panel de su rol (`agent` → panel de clientes; `agency_admin` → gestión de listings)
**And** las políticas RLS de Supabase restringen el acceso a los datos correctos según ese rol
**And** credenciales incorrectas muestran: "Email o contraseña incorrectos"
**And** un usuario `buyer` que intente acceder a `/agent/*` recibe 403 y es redirigido al feed

---

### Story 1.6: Protección de Rutas y Redirección de Usuarios No Autenticados

Como sistema Reinder,
quiero redirigir a cualquier usuario no autenticado que intente acceder a contenido protegido hacia la pantalla de login,
para que todo el contenido de propiedades requiera autenticación (FR5).

**Acceptance Criteria:**

**Given** un usuario no autenticado
**When** intenta navegar a `/swipe`, `/matches`, `/agent/*`, o `/agency/*`
**Then** es redirigido a `/login` con el mensaje: "Inicia sesión para continuar"
**And** tras el login exitoso, es redirigido de vuelta a la URL original
**And** el middleware Next.js (`middleware.ts`) protege todas las rutas de dashboard en web
**And** el root layout de Expo (`_layout.tsx`) protege todas las tabs mobile y redirige al flujo de auth si no hay sesión activa

---

## Epic 2: Swipe Loop

El comprador autenticado puede descubrir propiedades en formato glassmorphism, hacer match o descartar con animaciones fluidas a 60fps, ver el detalle, gestionar su historial de matches y ver badges de estado.

### Story 2.1: Componentes Base — GlassPanel, PropertyBadge y Design Foundation

Como comprador,
quiero ver la app con la estética glassmorphism oscura y naranja desde el primer momento,
para que la experiencia visual premium sea consistente en toda la aplicación.

**Acceptance Criteria:**

**Given** la app mobile arrancada en iOS/Android
**When** se renderiza cualquier pantalla
**Then** el fondo tiene el gradiente radial desde `rgba(255,107,0,0.12)` hacia `#0D0D0D` (UX-DR13)
**And** `GlassPanel` está disponible con 3 niveles de blur (light 8px, medium 16px, heavy 24px), con fallback `background: rgba(30,26,21,0.95)` cuando `backdrop-filter` no está soportado (UX-DR7)
**And** `PropertyBadge` renderiza EXCLUSIVA (naranja), VENDIDA (ámbar `#6B4E00`) y NUEVA en 13px/400 (UX-DR6)
**And** los tokens de design system están aplicados globalmente, sin valores de color hardcodeados fuera de `design-tokens.json`
**And** la jerarquía de botones Primary/Secondary/Destructive/Ghost está implementada con los estilos exactos del spec UX-DR11

---

### Story 2.2: Feed de Propiedades — PropertyCard y SwipeActions

Como comprador,
quiero ver propiedades en formato de tarjeta full-screen glassmorphism con botones de acción accesibles,
para que pueda visualizar claramente cada propiedad y tomar mi decisión.

**Acceptance Criteria:**

**Given** un comprador autenticado en la tab de Swipe
**When** la pantalla carga
**Then** ve la primera tarjeta de propiedad en pantalla completa con hero image, precio en Clash Display 32px/700, nombre, metadatos (habitaciones, m², ubicación) y badges de estado superpuestos
**And** la tarjeta tiene glassmorphism (`backdrop-filter: blur(20px)`) sobre el gradiente de fondo
**And** la imagen tiene alt text descriptivo (accesibilidad)
**And** mientras carga, se muestra skeleton loading glassmorphism pulsante con naranja sutil en bordes
**And** los botones `SwipeActions` (✗ reject / ⓘ info / ♥ match) son visibles con el botón match con glow naranja
**And** los botones tienen labels ARIA "No me interesa" / "Ver detalle" / "Me interesa" y soportan navegación por teclado (UX-DR3)
**And** el feed pre-carga las próximas 10 tarjetas buffer para garantizar ≤1s de carga en 4G (NFR1)

---

### Story 2.3: Gesto de Swipe con Match y MatchPayoff Animation

Como comprador,
quiero hacer swipe derecho o pulsar el botón de match y ver una animación de celebración,
para que el match se sienta gratificante desde el primer gesto.

**Acceptance Criteria:**

**Given** un comprador con una tarjeta de propiedad activa en pantalla
**When** hace swipe derecho o pulsa el botón de match
**Then** la tarjeta se anima hacia la derecha con overlay naranja creciente usando Reanimated 3 worklets en el UI thread (≥60fps, NFR2)
**And** aparece el overlay `MatchPayoff` con animación naranja expansiva y SFX de "found it", con curva `--ease-spring` y `--duration-payoff: 600ms`
**And** el overlay se cierra automáticamente tras 1.5s y muestra la siguiente tarjeta
**And** el evento de match se registra via `POST /api/v1/swipe-events` con `action: 'match'` en `match_events`
**And** si no hay conexión, el evento se encola localmente y se sincroniza cuando vuelve la conexión
**And** todo el procesamiento de animación ocurre en el UI thread sin pasar por el JS bridge
**And** los registros en `match_events` se almacenan encriptados en reposo en Supabase (NFR7) — verificable mediante Supabase Dashboard > Encryption at Rest

---

### Story 2.4: Gesto de Descarte

Como comprador,
quiero hacer swipe izquierdo o usar el botón de descarte para descartar una propiedad,
para que la app no vuelva a mostrarla.

**Acceptance Criteria:**

**Given** un comprador con una tarjeta de propiedad activa en pantalla
**When** hace swipe izquierdo o pulsa el botón de descarte
**Then** la tarjeta se anima hacia la izquierda con overlay `--accent-reject: #8B3A3A` sutil — sin SFX negativo
**And** la siguiente tarjeta aparece inmediatamente sin delay perceptible
**And** el evento de descarte se registra via `POST /api/v1/swipe-events` con `action: 'reject'` en `swipe_events`
**And** la propiedad descartada no vuelve a aparecer en el feed de ese comprador
**And** el gesto de back desde el borde izquierdo NO activa el descarte — está reservado para navegación del sistema
**And** los registros en `swipe_events` se almacenan encriptados en reposo en Supabase (NFR7) — misma garantía que `match_events`

---

### Story 2.5: Vista de Detalle de Propiedad (Bottom Sheet)

Como comprador,
quiero ver el detalle completo de una propiedad antes de decidir si hacer match o descarte,
para que pueda tomar una decisión informada sin salir del flujo de swipe.

**Acceptance Criteria:**

**Given** un comprador con una tarjeta de propiedad activa
**When** pulsa el botón de info ⓘ o hace tap en la tarjeta
**Then** aparece un bottom sheet animado con el detalle completo: galería de fotos, precio, dirección, habitaciones, m², descripción, planta, garaje y datos del agente representante (si vinculado)
**And** el bottom sheet usa `GlassPanel` level medium y no reemplaza la pantalla actual (es modal)
**And** dentro del detalle hay botones "Me interesa" (Primary naranja) y "No me interesa" (Destructive) que ejecutan match/descarte y cierran el sheet
**And** el botón "Volver" (Ghost) cierra el sheet sin registrar ninguna acción
**And** el gesto de swipe desde el borde izquierdo cierra el sheet y regresa a la tarjeta (UX-DR10)

---

### Story 2.6: Match Recap Screen

Como comprador,
quiero ver un resumen de mis últimas 3-5 propiedades matcheadas para reconfirmar o descartar,
para que la app me ayude a clarificar mis preferencias sin interrumpir el ritmo del swipe.

**Acceptance Criteria:**

**Given** un comprador que ha acumulado 3-5 nuevos matches consecutivos
**When** completa el 3er o 5o match
**Then** aparece automáticamente la `MatchRecapScreen` con una galería de miniaturas de las propiedades matcheadas
**And** en cada miniatura hay dos acciones: "Confirmar" (naranja) y "Descartar" (rojo apagado)
**And** al confirmar, el match queda reforzado y el agente representante recibe notificación
**And** al descartar desde el recap, el match se elimina del historial del comprador
**And** tras gestionar todos los recaps, el comprador regresa automáticamente al feed de swipe
**And** si cierra la app durante el recap, el estado se preserva y el recap reaparece al reabrir

---

### Story 2.7: Historial de Matches y Badge "Nuevas Propiedades"

Como comprador,
quiero acceder a mi historial de matches y ver cuántas propiedades nuevas hay al reabrir la app,
para que pueda revisar mis propiedades guardadas y saber si hay novedades.

**Acceptance Criteria:**

**Given** un comprador autenticado con al menos un match registrado
**When** abre la tab "Matches"
**Then** ve la lista completa de matches ordenadas por fecha (más recientes primero) con miniatura, precio y dirección
**And** las propiedades con estado "Vendida" aparecen con badge VENDIDA (`--accent-sold`) y overlay semitransparente (FR12)
**And** al pulsar en cualquier match, se abre el detalle completo (bottom sheet)
**And** al reabrir la app tras una sesión previa, aparece el badge "X nuevas propiedades desde tu última visita" en la tab Swipe (UX-DR15)
**And** si no hay matches aún, se muestra: "Swipea para empezar a matchear"

---

### Story 2.8: TabBar de Comprador con Navegación Rol-Based

Como comprador,
quiero tener una navegación clara en la parte inferior de la app,
para que pueda acceder a Swipe, Matches y Perfil con un solo tap.

**Acceptance Criteria:**

**Given** un comprador autenticado en la app mobile
**When** ve la navegación inferior
**Then** el `TabBar` muestra 3 tabs: "Swipe", "Matches" y "Perfil" (UX-DR8)
**And** el tab activo se muestra en naranja `#FF6B00`
**And** el TabBar tiene 60px de alto y usa `GlassPanel` como fondo
**And** si hay nuevos matches sin revisar, aparece un badge numérico sobre la tab "Matches"
**And** un usuario con rol `agent` ve un `TabBar` diferente (Clientes / Notificaciones — ver Epic 4)

---

### Story 2.9a: Filtros de Búsqueda — Onboarding de Preferencias

Como comprador,
quiero configurar mis preferencias de búsqueda al entrar a la app por primera vez,
para que el feed de swipe solo me muestre propiedades relevantes a lo que realmente busco desde el primer momento.

**Acceptance Criteria:**

**Given** un comprador que completa el registro o login por primera vez
**When** accede al swipe feed
**Then** aparece un modal de onboarding "¿Qué estás buscando?" con campos: zona(s), precio máximo, habitaciones mínimas y m² mínimos (zona obligatoria, resto opcionales)
**And** al guardar, las preferencias se persisten en Supabase `user_profiles.search_preferences` y el comprador accede al feed filtrado inmediatamente
**And** el feed `GET /api/v1/listings` aplica los filtros activos como query params — el comprador nunca ve propiedades fuera de sus criterios
**And** si el comprador pulsa "Saltar", el feed muestra todas las propiedades activas y `search_preferences` queda como `null`
**And** los filtros persisten entre sesiones — al reabrir la app el feed aplica los filtros sin re-mostrar el onboarding

---

### Story 2.9b: Filtros de Búsqueda — Edición en Sesión

Como comprador,
quiero poder editar mis preferencias de búsqueda en cualquier momento desde la tab de Swipe,
para que el feed refleje mis criterios actualizados sin perder mi historial de swipes.

**Acceptance Criteria:**

**Given** un comprador autenticado en la tab de Swipe
**When** pulsa el botón ⚙️ de filtros
**Then** se abre un sheet con los filtros actuales (zona, precio, habitaciones, m²) pre-cargados desde `user_profiles.search_preferences`
**And** al guardar los cambios, las preferencias se actualizan en Supabase y el feed se reinicia (cursor a `null`) aplicando los nuevos criterios
**And** el historial de swipes previo (matches y rechazos) no se elimina al cambiar filtros
**And** si el comprador cierra el sheet sin guardar, los filtros anteriores permanecen activos
**And** si el comprador borra todos los filtros y guarda, el feed vuelve a mostrar todas las propiedades activas

---

## Epic 3: Vínculo Comprador–Agente Representante

El agente puede generar links de referral únicos. El comprador puede aceptar/rechazar el vínculo, reconfirmarlo periódicamente y desvincularse en cualquier momento. Una vez vinculado, el agente representante reemplaza al listing agent en la UI.

### Story 3.1: Generación de Link de Referral por el Agente

Como agente representante,
quiero generar un link de referral único para cada uno de mis clientes compradores,
para que puedan vincularse conmigo como su representante con un solo clic.

**Acceptance Criteria:**

**Given** un agente autenticado con rol `agent` en su panel
**When** pulsa "Generar link para cliente"
**Then** se genera un token único en `referral_tokens` con expiración `REFERRAL_TOKEN_TTL_DAYS` (30 días) y `used: false`
**And** el agente ve el link completo `https://reinder.app/referral/{token}` y puede copiarlo al portapapeles con un tap
**And** el link es de un solo uso — una vez aceptado, `used: true` y no puede reutilizarse (NFR9)
**And** los tokens expirados muestran estado "Expirado" con opción de generar uno nuevo
**And** el agente puede ver la lista de todos sus links activos y su estado (pendiente / aceptado / expirado)

---

### Story 3.2: Aceptación del Vínculo por el Comprador vía Referral Link

Como comprador,
quiero recibir el link de mi agente, abrirlo y aceptar el vínculo,
para que él pueda ver mis matches y actuar en mi nombre de forma proactiva.

**Acceptance Criteria:**

**Given** un comprador que abre un link de referral válido `/referral/{token}`
**When** está autenticado (o se registra durante el flujo)
**Then** ve una pantalla con el nombre del agente y la explicación del vínculo: "Elena será tu agente representante y verá tus matches en tiempo real"
**And** hay dos botones: "Aceptar vínculo" (Primary naranja) y "No, gracias" (Ghost)
**And** al aceptar, se crea el vínculo en DB, el token queda `used: true`, y se emite el evento `referral.accepted`
**And** el comprador es redirigido al feed con: "¡Perfecto! Elena es ahora tu agente representante"
**And** el agente recibe notificación push: "Tu cliente {nombre} ha aceptado el vínculo"
**And** si el token está expirado o ya usado: "Este link ya no es válido. Pídele a tu agente que genere uno nuevo"

---

### Story 3.3: Reconfirmación Periódica y Desvinculación Voluntaria

Como comprador,
quiero que mi vínculo con el agente se reconfirme periódicamente y poder desvincularlo en cualquier momento,
para que tenga control total sobre quién representa mis intereses en Reinder.

**Acceptance Criteria:**

**Given** un comprador con vínculo activo cuyo token lleva más de `REFERRAL_TOKEN_TTL_DAYS` días sin reconfirmar
**When** abre la app
**Then** ve un banner no bloqueante: "Tu vínculo con Elena caduca pronto — ¿deseas renovarlo?" con botones "Renovar" y "Desvincular"
**And** al pulsar "Renovar", el vínculo se extiende y el agente recibe notificación de reconfirmación
**And** al desvincular (o ignorar hasta expiración), el vínculo se elimina, el agente recibe evento `referral.expired` y deja de ver los matches de ese comprador
**And** desde "Perfil" el comprador puede desvincular al agente en cualquier momento sin esperar a la expiración (FR16)
**And** tras la desvinculación, los listings vuelven a mostrar el listing agent original

---

### Story 3.4: Sobreescritura del Listing Agent en la UI

Como comprador vinculado a un agente representante,
quiero ver a mi agente como el contacto en cada propiedad en lugar del agente que la publicó,
para que todos mis matches y consultas pasen por mi representante de confianza.

**Acceptance Criteria:**

**Given** un comprador autenticado vinculado a un agente representante (Elena)
**When** visualiza cualquier tarjeta de propiedad, su detalle o su historial de matches
**Then** ve el nombre, foto y datos de contacto de Elena, NO del agente que publicó la propiedad en el CRM (FR17)
**And** el dato se obtiene del vínculo activo del comprador en DB, no del listing
**And** si el comprador NO tiene agente vinculado, ve un banner discreto en el detalle: "¿Tienes un agente? Pídele tu link de Reinder"
**And** el agente representante sobreescrito aparece también en Match Recap y en el historial de matches

---

## Epic 4: Panel del Agente Representante

El agente puede gestionar su lista de clientes vinculados, recibir notificaciones inmediatas de matches, explorar historial de actividad por cliente y actuar desde la notificación en tiempo real.

### Story 4.1: Lista de Clientes Vinculados en el Panel del Agente

Como agente representante,
quiero ver la lista de todos mis clientes compradores vinculados en mi panel,
para que tenga visión clara de quién me representa y acceso rápido a la actividad de cada uno.

**Acceptance Criteria:**

**Given** un agente autenticado con rol `agent` en la tab "Clientes"
**When** carga el panel
**Then** ve la lista de todos sus compradores usando el componente `AgentClientCard` (UX-DR9)
**And** cada card muestra: nombre del cliente, fecha de vínculo, número de matches totales, e indicador visual (badge naranja) si hay nuevos matches no vistos (`has-new-matches`)
**And** la lista está ordenada por actividad reciente (último match primero)
**And** si no tiene clientes vinculados: "Aún no tienes clientes vinculados — envía tu link de referral para empezar"
**And** puede pulsar en cualquier client card para ver el historial detallado de ese cliente (FR18, FR20, FR21)

---

### Story 4.2: Notificación en Tiempo Real de Match de Cliente

Como agente representante,
quiero recibir una notificación inmediata cuando uno de mis clientes hace match,
para que pueda actuar antes que cualquier otro agente.

**Acceptance Criteria:**

**Given** un agente con clientes vinculados y app web abierta o mobile con push activadas
**When** uno de sus clientes hace match con una propiedad
**Then** el agente recibe la notificación en ≤5 segundos (NFR3)
**And** en web (panel abierto): el `AgentDashboard` se actualiza via Supabase Realtime WebSocket (evento `match.created`) sin refrescar la página
**And** en mobile (cerrada o background): push notification via Expo Push Service → APNS/FCM: "Tu cliente Marcos ha hecho match con una propiedad en Chamberí"
**And** la notificación push usa el `push_token` del agente almacenado en `push_tokens`
**And** sin push habilitado, el match aparece como badge no leído en "Clientes" al abrir la app

---

### Story 4.3: Historial de Matches y Rechazos por Cliente

Como agente representante,
quiero ver el historial completo de matches y rechazos de cada uno de mis clientes,
para que tenga la información necesaria para asesorarlos con precisión.

**Acceptance Criteria:**

**Given** un agente en el panel, accediendo al perfil de un cliente específico
**When** abre la vista de detalle del cliente
**Then** ve dos secciones: "Matches" y "Rechazados", cada una con lista de propiedades correspondiente
**And** cada propiedad muestra: miniatura, precio, dirección y fecha del match/rechazo
**And** los datos están protegidos por RLS — solo el agente vinculado puede acceder (NFR8)
**And** puede pulsar en cualquier propiedad para ver su detalle completo
**And** con más de 20 matches, la lista implementa paginación para no cargar todos los datos a la vez

---

### Story 4.4: Deep Link Notificación → Detalle del Match

Como agente representante,
quiero que al pulsar en la notificación de match llegue directamente al detalle de esa propiedad,
para que pueda actuar en segundos sin perder tiempo navegando por la app.

**Acceptance Criteria:**

**Given** un agente que recibe una notificación push de match de un cliente
**When** pulsa la notificación
**Then** se abre directamente la vista de detalle de la propiedad matcheada con datos del cliente (nombre, fecha del match) — sin pasar por el panel principal (UX-DR14)
**And** el deep link funciona tanto si la app estaba cerrada (cold start) como en background
**And** desde esa vista hay acceso al contacto del agente que publicó el listing (para coordinar visita)
**And** hay un botón "Marcar como gestionado" que archiva el match en el panel del agente (FR34)
**And** los matches archivados quedan en un apartado "Gestionados" separado del feed principal de matches sin resolver

---

## Epic 5: Gestión de Listings e Integración CRM

Las agencias pueden conectar su CRM para importar exclusivas automáticamente. El sistema sincroniza y valida listings de forma desacoplada y gestiona el ciclo de vida completo de cada propiedad.

### Story 5.1: Conexión de CRM de Agencia (Inmovilla)

Como administrador de agencia,
quiero conectar el CRM de mi agencia a Reinder,
para que mis exclusivas activas se importen automáticamente al swipe feed.

**Acceptance Criteria:**

**Given** un usuario con rol `agency_admin` en "Ajustes > Integración CRM"
**When** introduce sus credenciales de Inmovilla (API key o webhook URL)
**Then** se crea un registro en `agency_crm_connections` con tipo de CRM, credenciales encriptadas y estado `pending_sync`
**And** Reinder realiza una sincronización inicial de todos los listings activos del CRM
**And** el admin ve progreso de importación y, al finalizar, el número de listings importados
**And** credenciales incorrectas muestran: "No podemos conectar con tu CRM. Verifica las credenciales"
**And** desde ese momento los webhooks del CRM son procesados automáticamente por la Edge Function `crm-webhook`

---

### Story 5.2: Sincronización de Listings via Webhook y Batch Desacoplados

Como sistema Reinder,
quiero sincronizar listings desde el CRM de forma desacoplada del request path del comprador,
para que la ingesta de inventario no impacte en el rendimiento del swipe feed (NFR11).

**Acceptance Criteria:**

**Given** una agencia con CRM conectado que actualiza un listing en Inmovilla
**When** el CRM envía un webhook a `supabase/functions/crm-webhook`
**Then** la Edge Function valida la autenticidad del webhook y encola el evento en la queue DB, retornando `200 OK` inmediatamente
**And** el worker `pg_cron` (cada 5 min) procesa la queue y hace upsert del listing en `listings`
**And** los eventos Realtime `listing.updated` / `listing.removed` se emiten y el feed se actualiza
**And** fallos del CRM se reintentan con backoff exponencial (3 intentos) y alertan al admin vía email si persisten (NFR13)
**And** el batch nocturno `pg_cron` re-sincroniza listings no actualizados en las últimas 24h
**And** NUNCA se bloquea el request path del comprador por procesamiento del CRM

---

### Story 5.3: Validación de Exclusividad y Detección de Duplicados

Como sistema Reinder,
quiero validar exclusividad y detectar duplicados al importar listings,
para que el feed solo contenga propiedades de calidad verificada.

**Acceptance Criteria:**

**Given** un nuevo listing importado desde el CRM
**When** el worker de queue lo procesa
**Then** verifica la referencia catastral/CRU contra la base de datos de Reinder (FR24)
**And** si la misma referencia catastral existe de otra agencia, el listing queda en `pending_review` y el admin recibe alerta
**And** sin duplicado, el listing pasa a `active` y queda disponible en el feed
**And** listings en `pending_review` NO aparecen en el swipe feed hasta resolución manual (FR25)
**And** si el servicio de catastro no responde, el listing pasa a `active` con flag `exclusivity_unverified: true` para revisión posterior (validación best-effort)

---

### Story 5.4: Ciclo de Vida del Listing — Retirada y Vendida

Como administrador de agencia,
quiero poder marcar manualmente una propiedad como retirada del mercado o como vendida,
para que los compradores vean siempre información actualizada del estado del inventario.

**Acceptance Criteria:**

**Given** un administrador de agencia en el panel de gestión de listings
**When** selecciona un listing activo y elige "Retirar del mercado"
**Then** el listing cambia a estado `withdrawn`, se emite `listing.removed`, y desaparece inmediatamente del swipe feed de todos los compradores (FR26)

**Given** un administrador de agencia que elige "Marcar como vendida" en un listing activo
**When** confirma la acción
**Then** el listing cambia a `sold`, permanece visible en el feed con badge VENDIDA durante 72h y luego se elimina automáticamente (FR27)
**And** los compradores que habían hecho match la ven en su historial con badge VENDIDA
**And** el evento `listing.updated` se emite y todos los feeds reflejan el cambio en tiempo real

---

## Epic 6: Descubrimiento Orgánico y SEO

El sistema genera páginas SSR indexables para cada listing activo, con datos estructurados schema.org y un gated content pattern que convierte visitantes orgánicos en usuarios registrados.

### Story 6.1: Páginas de Listing SSR Indexables por Google

Como equipo de Reinder,
quiero que cada listing activo tenga una URL pública indexable,
para que Reinder capture tráfico orgánico de compradores que buscan propiedades en Google.

**Acceptance Criteria:**

**Given** un listing activo en la base de datos de Reinder
**When** Google bot o cualquier crawler accede a `/listings/{id}`
**Then** recibe una página HTML renderizada en servidor (SSR via Next.js 15) con: título, precio, descripción, ubicación e imagen principal
**And** el TTFB es ≤2 segundos (NFR4)
**And** la página incluye `<title>`, `<meta name="description">`, `og:image`, `og:price` correctos
**And** el caché se invalida automáticamente cuando el listing cambia de estado (ISR o revalidación tag-based)
**And** listings `withdrawn` o `sold` (pasadas 72h) devuelven 404

---

### Story 6.2: Datos Estructurados Schema.org en Páginas de Listing

Como equipo de Reinder,
quiero que cada página de listing incluya datos estructurados schema.org,
para que Google muestre rich snippets en los resultados de búsqueda.

**Acceptance Criteria:**

**Given** una página de listing SSR renderizada
**When** se inspecciona el HTML del `<head>`
**Then** contiene `<script type="application/ld+json">` con schema `RealEstateListing` que incluye: `name`, `description`, `price`, `address` (con `streetAddress`, `addressLocality`, `addressCountry`), `numberOfRooms`, `floorSize` e `image`
**And** el schema se genera en `features/listings/lib/structured-data.ts` como Server Component
**And** la validación pasa sin errores en el Rich Results Test de Google
**And** el schema se actualiza en ≤24h tras cambios en el CRM (NFR14)

---

### Story 6.3: Gated Content — Preview para Usuarios No Autenticados

Como visitante orgánico que llega desde Google,
quiero poder ver una preview del listing antes de registrarme,
para que pueda evaluar si la propiedad me interesa antes de crear una cuenta.

**Acceptance Criteria:**

**Given** un usuario no autenticado que accede a `/listings/{id}` desde un motor de búsqueda
**When** carga la página
**Then** ve una preview del listing: imagen principal, precio, tipo de propiedad, ubicación y descripción parcial (primeras 2 líneas)
**And** hay un prompt visible: "Regístrate gratis para ver todos los detalles y empezar a hacer match con propiedades" con botones "Registrarme" (Primary naranja) y "Iniciar sesión" (Secondary)
**And** el contenido completo (galería completa, descripción completa, datos del agente) está oculto hasta autenticación
**And** la implementación cumple directrices de Google para gated content SEO — sin cloaking
**And** tras el registro/login, el usuario es redirigido de vuelta al mismo listing con acceso completo

---

## Epic 7: Administración de Plataforma

El administrador de Reinder puede activar agencias, resolver duplicados y monitorear métricas globales, con la infraestructura de observabilidad y CI/CD completamente operativos.

### Story 7.1: CI/CD Pipeline y Observabilidad (Sentry + Analytics)

Como equipo de desarrollo de Reinder,
quiero tener un pipeline CI/CD automatizado y herramientas de observabilidad configuradas,
para que el proceso de deployment sea seguro y tengamos visibilidad de errores y métricas desde el primer día.

**Acceptance Criteria:**

**Given** un Pull Request abierto en el repositorio de GitHub
**When** se hace push al PR
**Then** el GitHub Action `ci.yml` ejecuta: `pnpm lint && pnpm typecheck && pnpm test` y reporta el resultado en el PR
**And** un merge a `main` dispara deploy automático a Vercel (web)

**Given** un tag de release `v*.*.*` creado en GitHub
**When** se hace push del tag
**Then** el GitHub Action `release.yml` dispara EAS Build para iOS y Android y sube a TestFlight y Google Play Internal

**And** Sentry está configurado en `apps/web` (Next.js plugin) y `apps/mobile` (Expo plugin) capturando errores con contexto de rol de usuario
**And** el script de Vercel Analytics + PostHog está en `apps/web/layout.tsx` respetando configuración GDPR

---

### Story 7.2: Panel de Activación de Agencias

Como administrador de plataforma,
quiero poder activar y desactivar agencias integradas en Reinder,
para que tenga control total sobre qué agencias y listings están visibles en el feed.

**Acceptance Criteria:**

**Given** un administrador con rol `platform_admin` en `/admin/agencies`
**When** carga la página
**Then** ve la lista de todas las agencias con su estado (activa / inactiva / pendiente) y número de listings publicados
**And** puede activar o desactivar cualquier agencia con un toggle — el cambio se aplica en tiempo real
**And** desactivar una agencia retira inmediatamente todos sus listings del feed (emite `listing.removed` para cada uno) sin eliminar los datos
**And** activar una agencia vuelve a publicar todos sus listings activos
**And** el acceso está protegido por RLS — solo `platform_admin` puede acceder (cualquier otro rol recibe 403)

---

### Story 7.3: Resolución de Listings Duplicados

Como administrador de plataforma,
quiero revisar y resolver listings marcados como duplicados por el sistema de validación,
para que el feed mantenga la calidad y no muestre propiedades duplicadas.

**Acceptance Criteria:**

**Given** un administrador en `/admin/listings` filtrando por estado `pending_review`
**When** abre un listing en revisión
**Then** ve la causa de la revisión ("Referencia catastral duplicada con listing #X de Agencia Y")
**And** puede ver ambos listings en conflicto lado a lado para comparar
**And** tiene tres opciones: "Aprobar este listing" (el otro queda en revisión), "Rechazar este listing" (vuelve a `withdrawn`), "Ambos son válidos" (ambos pasan a `active`)
**And** la resolución se registra con timestamp y el ID del admin que la realizó (auditoría)
**And** tras la resolución, se emite el evento Realtime correspondiente y el feed se actualiza

---

### Story 7.4: Dashboard de Métricas Globales de Plataforma

Como administrador de plataforma,
quiero ver métricas globales del funcionamiento de Reinder en un dashboard,
para que pueda detectar anomalías, medir el éxito del producto y tomar decisiones operativas.

**Acceptance Criteria:**

**Given** un administrador con rol `platform_admin` en `/admin/metrics`
**When** carga el dashboard
**Then** ve las siguientes métricas (actualización diaria mínima):
  - Usuarios activos (últimas 24h, 7d, 30d)
  - Total swipes (matches + rechazos) por período
  - Ratio match/reject global
  - Agencias activas y total de listings en el feed
  - Estado de integraciones CRM (última sincronización, errores recientes)
  - % de usuarios con agente representante vinculado
**And** las métricas se muestran en tarjetas usando `GlassPanel` con tipografía Inter
**And** los datos son agregados/anonimizados — sin datos personales identificables (GDPR, NFR8)
**And** el acceso está restringido por RLS a `platform_admin` únicamente
