# CLAUDE.md — Proyecto Reinder

> Documento vivo. Se actualiza cada vez que se define algo importante sobre la visión, estructura o decisiones del proyecto.

---

## 🎯 Visión del Proyecto

**Reinder** es una plataforma B2B2C de descubrimiento inmobiliario basada en swipe. Los compradores descubren propiedades exclusivas deslizando tarjetas full-screen, sus agentes representantes reciben notificaciones en tiempo real de cada match, y las agencias conectan su CRM (Inmovilla) para publicar su inventario automáticamente.

**Tagline:** Swipe. Match. Move.

**Modelo de negocio:** Las agencias pagan (B2B); los compradores son gratuitos (B2C).
**MVP scope:** Swipe loop + vínculo comprador-agente + integración Inmovilla CRM.

---

## 📁 Estructura del Repositorio

```
Reinder/
├── CLAUDE.md                    # Este archivo — contexto clave del proyecto
├── _bmad/                       # Configuración y módulos BMAD
│   ├── _config/                 # Configuración global (bmad-help.csv)
│   ├── bmm/                     # Módulo BMM (metodología principal)
│   └── wds/                     # Módulo WDS (diseño UX)
├── _bmad-output/                # Artefactos generados
│   ├── planning-artifacts/      # PRD, Arquitectura, Epics
│   └── implementation-artifacts/# Sprint plans, Stories
├── design-artifacts/            # Artefactos de diseño UX (WDS)
│   ├── A-Product-Brief/
│   ├── B-Trigger-Map/
│   ├── C-UX-Scenarios/
│   ├── D-Design-System/
│   └── E-PRD/
└── docs/                        # Conocimiento del proyecto
```

---

## ⚙️ Configuración BMAD

| Parámetro | Valor |
|---|---|
| Proyecto | Reinder |
| Módulo activo | BMM + WDS |
| Idioma | Español |
| Nivel de usuario | Intermedio |
| Usuario | SantiCas |

---

## 🏗️ Decisiones de Arquitectura

| Área | Decisión |
|---|---|
| **Monorepo** | Turborepo + pnpm workspaces |
| **Web** | Next.js 15 (App Router) — deploy en Vercel |
| **Mobile** | Expo (React Native) — build con EAS |
| **Shared** | `packages/shared` — tipos, schema Drizzle, constantes |
| **Backend/BaaS** | Supabase (PostgreSQL + Auth + Realtime + Storage) en EU-West (GDPR) |
| **ORM** | Drizzle ORM — schema en `packages/shared/src/db/schema.ts` |
| **Auth** | Supabase Auth — email/password + Google OAuth, JWT 30 días |
| **RBAC** | 4 roles con RLS: `buyer`, `agent`, `agency_admin`, `platform_admin` |
| **Animaciones** | React Native Reanimated 3 (worklets en UI thread, ≥60fps) |
| **Gestos** | React Native Gesture Handler |
| **Estado (mobile)** | Zustand (`useSwipeStore`, `useAgentStore`) |
| **CRM sync** | Supabase Edge Function `crm-webhook` + `pg_cron` (desacoplado del request path) |
| **Push notifications** | Expo Push Service → APNS + FCM, tokens en tabla `push_tokens` |
| **SEO** | SSR con Next.js App Router + schema.org `RealEstateListing` |
| **Monitoring** | Sentry (web + mobile) + Vercel Analytics + PostHog (GDPR) |
| **CI/CD** | GitHub Actions: `ci.yml` (lint+test en PRs) + `release.yml` (EAS Build en tags) |
| **Design System** | Tokens en `packages/shared/design-tokens.json` — Clash Display + Inter, base 8px |
| **Glassmorphism** | `backdrop-filter: blur(20px)`, fallback `rgba(30,26,21,0.95)` |

**Paleta principal:** `#0D0D0D` fondo · `#FF6B00` accent · `#F5F0E8` texto · `#1E1A15` surface

**Secuencia de implementación:** monorepo → Supabase + schema → Auth → Swipe UI → Realtime → CRM → Panel agente → SEO

---

## 📋 Estado del Proyecto

| Fase | Estado |
|---|---|
| 1 — Análisis (Brief, Research) | ✅ Completo |
| 2 — Planning (PRD + UX Design) | ✅ Completo |
| 3 — Solutioning (Arquitectura, Epics) | ✅ Completo |
| 4 — Implementation | 🚧 En curso — Epic 1 casi completo |

### 🏃 Sprint Actual — Epic 1: Identidad y Acceso

| Story | Título | Estado |
|---|---|---|
| 1.1 | Inicialización Monorepo + Design System | ✅ done |
| 1.2 | Supabase + Schema de Base de Datos | ✅ done |
| 1.3 | Registro Comprador Email + T&C | ✅ done |
| 1.4 | Registro/Login Google OAuth | ✅ done |
| 1.5 | Login Agente y Admin de Agencia | ✅ done |
| 1.6 | Protección de Rutas + Redirección | 📋 backlog |

**Próximo paso:** Crear e implementar Story 1.6 → luego arranca Epic 2 (Swipe Loop).

Ver tracking completo: [`sprint-status.yaml`](_bmad-output/implementation-artifacts/sprint-status.yaml)

---

## 📌 Decisiones Importantes

- **Stack:** Next.js 15 (web) + Expo React Native (mobile), monorepo Turborepo + pnpm
- **Backend:** Supabase (PostgreSQL + Auth + Realtime + Storage) en EU-West (GDPR)
- **ORM:** Drizzle ORM — schema en `packages/shared/src/db/schema.ts`
- **Hosting:** Vercel (web) + Expo EAS (mobile)
- **Modelo de negocio:** B2B2C — agencias pagan, compradores son gratuitos
- **MVP scope:** Swipe loop + vínculo comprador-agente + integración Inmovilla CRM
- **Búsqueda conversacional (lenguaje natural con IA):** deliberadamente pospuesta a Phase 2
- **AgentReferralBanner** (para compradores sin agente en el feed): pospuesto a Phase 2
- **CRM sync:** NUNCA en el request path del comprador — siempre desacoplado via Edge Function + pg_cron
- **RLS:** Política de denegación por defecto en todas las tablas, desde el día 1
- **Referral tokens:** Single-use + expiración configurable (`REFERRAL_TOKEN_TTL_DAYS` = 30 días)
- **Swipe events:** Almacenados encriptados en reposo (NFR7); durabilidad garantizada ante fallos (NFR16)

---

## 🚀 Workflow de Git

> **Regla para todos los agentes:** Al finalizar cada story completamente (todos los criterios de aceptación cumplidos y el sprint-status actualizado), **SIEMPRE se debe hacer push a GitHub** usando el skill `git-helpers` con un commit descriptivo del tipo `feat: <descripción de la story>`.

**Pasos obligatorios al cerrar una story:**
1. Actualizar el estado de la story a `done` en `sprint-status.yaml` y `CLAUDE.md`
2. Hacer commit y push con el skill `git-helpers`
3. Confirmar al usuario que el push se realizó correctamente

---

## 🗂️ Protocolo de Ideas Futuras

> **Regla para todos los agentes:** Toda idea, feature o concepto que surja durante el trabajo y quede fuera del scope actual **DEBE añadirse a `future-ideas.md`**, además de donde quede documentado en el artefacto de la sesión.
>
> El archivo `future-ideas.md` es la fuente centralizada de todo el backlog estratégico y visión post-MVP.

**Ruta:** [`_bmad-output/planning-artifacts/future-ideas.md`](_bmad-output/planning-artifacts/future-ideas.md)

---

## 🔗 Artefactos Clave

| Artefacto | Ruta |
|---|---|
| PRD | `_bmad-output/planning-artifacts/prd.md` |
| UX Design Specification | `_bmad-output/planning-artifacts/ux-design-specification.md` |
| UX Design Directions | `_bmad-output/planning-artifacts/ux-design-directions.html` |
| Architecture | `_bmad-output/planning-artifacts/architecture.md` |
| Epics & Stories | `_bmad-output/planning-artifacts/epics.md` |
| **Sprint Status** | `_bmad-output/implementation-artifacts/sprint-status.yaml` |
| Ideas Futuras | `_bmad-output/planning-artifacts/future-ideas.md` |

