# Story 7.1: CI/CD Pipeline y Observabilidad (Sentry + Analytics)

Status: ready-for-dev

**GH Issue:** (to be assigned)

## Story

Como equipo de desarrollo de Reinder,
quiero tener un pipeline CI/CD automatizado y herramientas de observabilidad configuradas,
para que el proceso de deployment sea seguro y tengamos visibilidad de errores y métricas desde el primer día.

## Acceptance Criteria

1. **Given** un Pull Request abierto en el repositorio de GitHub  
   **When** se hace push al PR  
   **Then** el GitHub Action `ci.yml` ejecuta: `pnpm lint && pnpm typecheck && pnpm test` y reporta el resultado en el PR

2. **And** un merge a `main` dispara deploy automático a Vercel (web)  
   *(Vercel GitHub integration handles this natively — no workflow needed)*

3. **Given** un tag de release `v*.*.*` creado en GitHub  
   **When** se hace push del tag  
   **Then** el GitHub Action `release.yml` dispara EAS Build para iOS y Android y sube a TestFlight y Google Play Internal

4. **And** Sentry está configurado en `apps/web` (Next.js plugin) y `apps/mobile` (Expo plugin) capturando errores con contexto de rol de usuario

5. **And** el script de Vercel Analytics + PostHog está en `apps/web/layout.tsx` respetando configuración GDPR

## Tasks / Subtasks

- [ ] **Task 1 — `.github/workflows/ci.yml`**
  - [ ] Create `.github/workflows/ci.yml`
  - [ ] Trigger: `pull_request` (branches: main)
  - [ ] Steps: checkout → pnpm setup → install → `pnpm lint` → `pnpm typecheck` → `pnpm test`
  - [ ] Node 20, pnpm 9+
  - [ ] Fail-fast: any step fails → job fails → blocks merge

- [ ] **Task 2 — `.github/workflows/release.yml`**
  - [ ] Create `.github/workflows/release.yml`
  - [ ] Trigger: `push` tags `v*.*.*`
  - [ ] Steps: checkout → setup EAS CLI → `eas build --platform all --profile production`
  - [ ] EAS secrets: `EXPO_TOKEN` from GitHub Secrets

- [ ] **Task 3 — Sentry SDK integration**
  - [ ] Install `@sentry/nextjs` in `apps/web`
  - [ ] Create `sentry.client.config.ts` and `sentry.server.config.ts`
  - [ ] Configure Sentry DSN from env: `NEXT_PUBLIC_SENTRY_DSN`
  - [ ] Add user context: `Sentry.setUser({ id, role })` in layout.tsx
  - [ ] Update `next.config.ts` with `withSentryConfig` wrapper

- [ ] **Task 4 — PostHog Analytics (GDPR-compliant)**
  - [ ] Install `posthog-js` in `apps/web`
  - [ ] Create `providers/PostHogProvider.tsx` client component
  - [ ] Add to `layout.tsx` wrapped in GDPR consent check
  - [ ] Env: `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`

- [ ] **Task 5 — Tests / validation**
  - [ ] Validate `ci.yml` YAML syntax
  - [ ] Validate `release.yml` YAML syntax
  - [ ] Verify Sentry config files exist and have DSN placeholder
  - [ ] Verify PostHog provider renders conditionally

## Dev Notes

### Architecture — CI/CD

The monorepo uses Turborepo with `turbo.json` already defining:
- `lint` → `pnpm lint` (each package)
- `typecheck` → `pnpm typecheck` (each package)
- `test` → `pnpm test` (each package, depends on build)
- `build` → `pnpm build` (each package)

The CI workflow calls `pnpm lint && pnpm typecheck && pnpm test` via turbo tasks.

### CI Workflow Template

```yaml
name: CI
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
```

### Release Workflow Template

```yaml
name: Release
on:
  push:
    tags: ['v*.*.*']

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: cd apps/mobile && eas build --platform all --profile production --non-interactive
```

### Sentry Configuration

```typescript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});

// sentry.server.config.ts — same but server-side
```

### PostHog Provider (Client Component)

```tsx
'use client';
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect } from 'react';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.posthog.com',
      persistence: 'localStorage+cookie', // GDPR: use localStorage primarily
      opt_in_site_apps: true,
    });
  }, []);
  return <PHProvider client={posthog}>{children}</PHProvider>;
}
```

### File Locations

```
.github/
└── workflows/
    ├── ci.yml          ← NEW
    └── release.yml     ← NEW
apps/web/
├── sentry.client.config.ts  ← NEW
├── sentry.server.config.ts  ← NEW
├── next.config.ts            ← MODIFY (withSentryConfig wrapper)
└── src/
    ├── app/layout.tsx         ← MODIFY (PostHog + Sentry user context)
    └── providers/
        └── PostHogProvider.tsx ← NEW
```

### Environment Variables Required

```env
# Sentry
NEXT_PUBLIC_SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
SENTRY_AUTH_TOKEN=sntrys_xxx  # for source map upload
SENTRY_ORG=reinder
SENTRY_PROJECT=reinder-web

# PostHog
NEXT_PUBLIC_POSTHOG_KEY=phc_xxx
NEXT_PUBLIC_POSTHOG_HOST=https://eu.posthog.com

# EAS (GitHub Secrets)
EXPO_TOKEN=xxx
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 7.1]
- [Source: _bmad-output/implementation-artifacts/test-design-epic-7.md#Story 7.1]
- [Source: turbo.json — lint, typecheck, test tasks defined]
- [Source: package.json — pnpm scripts: dev, build, lint, typecheck, test]
- NFR15: disponibilidad ≥99.5%
- NFR16: durabilidad de datos

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (BAD pipeline)

### Debug Log References

### Completion Notes List

### File List
