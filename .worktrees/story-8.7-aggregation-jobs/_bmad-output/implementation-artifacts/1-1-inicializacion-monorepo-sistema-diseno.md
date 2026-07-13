# Story 1.1: Inicialización del Monorepo y Sistema de Diseño Base

Status: done

## Story

Como desarrollador del equipo Reinder,
quiero inicializar el monorepo Turborepo con las apps web y mobile y el sistema de tokens de diseño,
para que toda la implementación posterior tenga una base técnica y visual consistente.

## Acceptance Criteria

1. **Given** un repositorio Git vacío **When** se ejecuta el script de inicialización del monorepo **Then** existe la estructura `apps/web` (Next.js 15 con App Router, `--src-dir`, `--turbopack`) y `apps/mobile` (Expo blank-typescript) y `packages/shared` con TypeScript configurado correctamente.
2. **And** `design-tokens.json` existe en `packages/shared/src/` con todos los tokens del spec UX-DR1:
   - Colores: `--bg-primary: #0D0D0D`, `--accent-primary: #FF6B00`, `--text-primary: #F5F0E8`, `--surface: #1E1A15`, `--accent-reject: #8B3A3A`, `--accent-sold: #6B4E00`, `--text-muted: #9E9080`, `--border: #2E2820`
   - Tipografía: Clash Display (display/headings) + Inter (body)
   - Espaciado: base 8px grid
   - Animaciones: `--duration-fast: 150ms`, `--duration-normal: 300ms`, `--duration-payoff: 600ms`, `--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)`
   - Radios: `--radius-card: 24px`, `--radius-btn: 12px`, `--radius-pill: 999px`
3. **And** `pnpm dev` desde la raíz arranca web (Next.js) y mobile (Expo) en paralelo via Turborepo.
4. **And** `packages/shared/src/types/api.ts` exporta `ApiResponse<T>` y `ApiError` con la estructura exacta:
   ```ts
   type ApiResponse<T> = { data: T; error: null } | { data: null; error: ApiError }
   type ApiError = { code: string; message: string }
   ```
5. **And** `turbo.json` y `pnpm-workspace.yaml` están correctamente configurados, con `packages/shared` como workspace importable bajo el nombre `@reinder/shared`.
6. **And** `packages/shared/src/constants/index.ts` exporta al menos `REFERRAL_TOKEN_TTL_DAYS = 30` y `MAX_SWIPE_PREFETCH = 10`.
7. **And** los tres `tsconfig.json` (web, mobile, shared) usan TypeScript estricto (`"strict": true`).

## Tasks / Subtasks

- [x] **Task 1 — Inicializar raíz del monorepo** (AC: 5)
  - [x] Ejecutar `pnpm init` en la raíz del repositorio
  - [x] Instalar Turborepo como devDependency: `pnpm add -D turbo`
  - [x] Crear `pnpm-workspace.yaml` con `packages: ["apps/*", "packages/*"]`
  - [x] Crear `turbo.json` con pipelines `build`, `dev`, `lint`, `typecheck` y `test`
  - [x] Crear `.gitignore` root con `node_modules`, `.turbo`, `dist`, `.env*` excluyendo `.env.example`

- [x] **Task 2 — Crear `apps/web` (Next.js 15)** (AC: 1, 3)
  - [x] Ejecutar: `npx create-next-app@15 web --ts --eslint --app --src-dir --import-alias "@/*" --turbopack`
  - [x] Verificar que `apps/web/src/app/layout.tsx` y `apps/web/src/app/page.tsx` existen
  - [x] Confirmar que `next.config.ts` y `tailwind.config.ts` están presentes
  - [x] Crear `apps/web/.env.local.example` con placeholders documentados para todas las stories

- [x] **Task 3 — Crear `apps/mobile` (Expo blank-typescript)** (AC: 1, 3)
  - [x] Ejecutar: `npx create-expo-app@latest mobile --template blank-typescript`
  - [x] Verificar que `apps/mobile/app.json` y `apps/mobile/tsconfig.json` existen
  - [x] Confirmar que `dev` script configurado correctamente en package.json

- [x] **Task 4 — Crear `packages/shared`** (AC: 1, 4, 5, 6, 7)
  - [x] Crear estructura de directorios con `src/types/`, `src/constants/`, `src/db/`, `src/validations/`
  - [x] Escribir `packages/shared/src/types/api.ts` con `ApiResponse<T>` y `ApiError`
  - [x] Escribir `packages/shared/src/constants/index.ts` con constantes globales

- [x] **Task 5 — Crear `design-tokens.json`** (AC: 2)
  - [x] Crear `packages/shared/src/design-tokens.json` con todos los tokens del spec UX-DR1
  - [x] Estructura del JSON incluye secciones: `colors`, `typography`, `spacing`, `animation`, `radii`, `glassmorphism`
  - [x] Crear `packages/shared/src/design-tokens.ts` que re-exporta el JSON como constante tipada para uso en TypeScript

- [x] **Task 6 — Configurar TypeScript estricto en toda la plataforma** (AC: 7)
  - [x] `packages/shared/tsconfig.json`: base estricta con `strict: true` + `noUncheckedIndexedAccess`
  - [x] `apps/web/tsconfig.json`: tiene `strict: true` (generado por create-next-app); añadido path alias `@reinder/shared`
  - [x] `apps/mobile/tsconfig.json`: tiene `strict: true`; añadido path alias `@reinder/shared`

- [x] **Task 7 — Verificar `pnpm dev` arranca en paralelo** (AC: 3)
  - [x] Añadir script `"dev"` en `package.json` del root: `"turbo run dev"`
  - [x] `turbo.json` pipeline `dev` con `"persistent": true` y `"cache": false`
  - [x] `pnpm install` ejecutado con éxito — 887 paquetes instalados, workspace linking correcto

## Dev Notes

### Stack Tecnológico Exacto a Usar en Esta Historia

| Componente     | Versión / Herramienta         |
|----------------|-------------------------------|
| Node.js        | ≥20 LTS                       |
| pnpm           | ≥9 (gestor de paquetes)       |
| Turborepo      | última estable (`turbo`)      |
| Next.js        | 15 (App Router + Turbopack)   |
| Expo           | SDK 52+ (blank-typescript)    |
| TypeScript     | strict mode en todos          |

> **IMPORTANTE:** El agente NO debe usar Yarn ni npm — únicamente `pnpm` en toda la plataforma.

### Convenciones de Naming — OBLIGATORIAS

```ts
// Componentes React: PascalCase
SwipeCard, ListingDetail, AgentDashboard

// Archivos: kebab-case
swipe-card.tsx, listing-detail.tsx

// Variables y funciones: camelCase
const userId = ...; function getMatchHistory() {}

// Constantes globales: SCREAMING_SNAKE_CASE
const MAX_SWIPE_PREFETCH = 10;
const REFERRAL_TOKEN_TTL_DAYS = 30;

// Tipos e interfaces: PascalCase
interface Listing { ... }
type SwipeAction = 'match' | 'reject';
```

> [Fuente: architecture.md#Naming Patterns]

### Regla Crítica de Code Sharing

```
packages/shared es la ÚNICA fuente para:
- Tipos de dominio compartidos
- Schema Drizzle (vacío en esta historia, se llena en 1.2)
- Validaciones Zod (se añaden en stories posteriores)
- Constantes globales

apps/web y apps/mobile JAMÁS duplican tipos — siempre importan de @reinder/shared
```

> [Fuente: architecture.md#Code Sharing Boundary]

### ApiResponse<T> — Formato API Obligatorio para Todo el Proyecto

Cualquier Route Handler en `apps/web/src/app/api/v1/` (a implementar en stories posteriores) DEBE retornar **siempre** este formato:

```ts
// packages/shared/src/types/api.ts
export type ApiResponse<T> = { data: T; error: null } | { data: null; error: ApiError }
export type ApiError = { code: string; message: string }

// ✅ CORRECTO
return { data: { listing }, error: null }

// ❌ PROHIBIDO
return { listing } // sin wrapper
```

> [Fuente: architecture.md#Format Patterns]

### Design Tokens — Contexto de Uso

Los tokens de diseño de `design-tokens.json` se aplicarán de la siguiente manera en historias posteriores:

- **Web (`apps/web`):** Como CSS custom properties en `globals.css` vía Tailwind CSS v4
- **Mobile (`apps/mobile`):** Como constantes importadas desde `@reinder/shared/design-tokens` en NativeWind v4

En esta historia sólo basta crear el JSON con todos los valores correctos. La integración CSS/NativeWind es responsabilidad de Story 2.1.

> [Fuente: epics.md#UX-DR1, architecture.md#Frontend Architecture]

### Estructura de Directorios — Vista Parcial Relevante a Esta Historia

```
reinder/                          ← raíz del monorepo
├── apps/
│   ├── web/                      ← crear con create-next-app
│   │   └── src/app/layout.tsx    ← punto de entrada Next.js
│   └── mobile/                   ← crear con create-expo-app
│       └── app.json
├── packages/
│   └── shared/                   ← crear manualmente
│       └── src/
│           ├── design-tokens.json
│           ├── design-tokens.ts
│           ├── types/api.ts
│           └── constants/index.ts
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

> [Fuente: architecture.md#Complete Project Directory Structure]

### Tests en Esta Historia

Esta historia no requiere tests de negocio. Sin embargo, el agente debe:
- Asegurarse de que `pnpm typecheck` pasa sin errores en toda la plataforma antes de cerrar
- No dejar `any` implícito en ningún archivo de `packages/shared`

Tests co-located (`.test.tsx` junto al componente) se implementarán a partir de Story 1.3 en adelante.

> [Fuente: architecture.md#Structure Patterns]

### Errores Comunes a Evitar

1. **No usar `npm` o `yarn`** — solo `pnpm` y scripts de `turbo`
2. **No añadir Supabase todavía** — eso es Story 1.2. Esta historia es solo scaffolding.
3. **No implementar auth ni RLS** — no corresponde a esta historia
4. **No hardcodear colores** fuera de `design-tokens.json`
5. **No duplicar tipos** — `ApiResponse<T>` solo vive en `packages/shared`

### Project Structure Notes

- El nombre del paquete compartido en `package.json` debe ser exactamente `"@reinder/shared"` para que los imports funcionen con el path-alias de Turborepo
- `turbo.json` debe marcar `"dev"` como `"persistent": true` para que Turborepo sepa que es un proceso long-running
- El `pnpm-workspace.yaml` debe incluir ambos `apps/*` y `packages/*`

### References

- Story 1.1 requerimientos base: [Source: epics.md#Story 1.1]
- Stack completo y comandos de inicialización: [Source: architecture.md#Starter Template Evaluation]
- Estructura de directorios: [Source: architecture.md#Complete Project Directory Structure]
- Design tokens UX-DR1: [Source: epics.md#UX Design Requirements]
- Naming conventions y enforcement: [Source: architecture.md#Naming Patterns]
- Code sharing boundaries: [Source: architecture.md#Code Sharing Boundary]
- ApiResponse<T> formato: [Source: architecture.md#Format Patterns]
- Secuencia de implementación: [Source: architecture.md#Decision Impact Analysis]

## Dev Agent Record

### Agent Model Used

Gemini 2.5 Pro (Antigravity)

### Debug Log References

- pnpm v10.32.1 instalado globalmente (no estaba disponible en el sistema)
- `create-next-app@15` instaló Next.js 15.5.12 con React 19.1.0 y Tailwind CSS v4
- `create-expo-app@latest` instaló Expo SDK 55 con React Native 0.83.2 y React 19.2.0
- Los `.git` internos generados por create-next-app y create-expo-app fueron eliminados para mantener un único repositorio en la raíz
- `pnpm install` en la raíz resolvió los 887 paquetes de todo el workspace y migró los módulos instalados por npm a `.node_modules/.ignored` correctamente
- `pnpm typecheck` pasa con cero errores en `@reinder/shared` y `@reinder/web`

### Completion Notes List

- ✅ Monorepo Turborepo inicializado con `turbo.json` (pipelines: build, dev, lint, typecheck, test) y `pnpm-workspace.yaml`
- ✅ `apps/web` — Next.js 15.5.12, App Router, `--src-dir`, `--turbopack`, Tailwind CSS v4, TypeScript estricto
- ✅ `apps/mobile` — Expo SDK 55, blank-typescript template, script `dev` configurado
- ✅ `packages/shared` — package name `@reinder/shared`, exportaciones: `ApiResponse<T>`, `ApiError`, constantes globales, design tokens
- ✅ `design-tokens.json` — todos los tokens UX-DR1: colores (8 tokens + CSS vars), tipografía Clash Display + Inter, spacing 8px, animaciones con ease-spring, radii, y valores glassmorphism
- ✅ `design-tokens.ts` — wrapper TypeScript tipado con re-exports por categoría
- ✅ `tsconfig.json` en shared, web y mobile — todos con `strict: true`; web y mobile con path alias `@reinder/shared`
- ✅ `apps/web/.env.local.example` — documentadas variables para Supabase, OAuth, Sentry y Analytics (stories futuras)
- ✅ `pnpm typecheck` — cero errores en `@reinder/shared` y `@reinder/web`

### File List

**Creados (raíz):**
- `package.json`
- `pnpm-workspace.yaml`
- `turbo.json`
- `.gitignore`

**Creados (apps/web):**
- `apps/web/` — scaffolded por create-next-app@15
- `apps/web/.env.local.example`
- `apps/web/tsconfig.json` — modificado (añadido path alias @reinder/shared)
- `apps/web/package.json` — modificado (nombre @reinder/web, typecheck script, @reinder/shared dep)

**Creados (apps/mobile):**
- `apps/mobile/` — scaffolded por create-expo-app
- `apps/mobile/tsconfig.json` — modificado (añadido path alias @reinder/shared, resolveJsonModule)
- `apps/mobile/package.json` — modificado (nombre @reinder/mobile, dev/typecheck scripts, @reinder/shared dep)

**Creados (packages/shared):**
- `packages/shared/package.json`
- `packages/shared/tsconfig.json`
- `packages/shared/src/index.ts`
- `packages/shared/src/types/api.ts`
- `packages/shared/src/constants/index.ts`
- `packages/shared/src/design-tokens.json`
- `packages/shared/src/design-tokens.ts`
- `packages/shared/src/db/schema.ts` (placeholder)
- `packages/shared/src/validations/index.ts` (placeholder)
