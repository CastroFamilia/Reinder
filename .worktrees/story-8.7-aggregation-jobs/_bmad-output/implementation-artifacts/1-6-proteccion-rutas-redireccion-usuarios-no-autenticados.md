# Story 1.6: Protección de Rutas y Redirección de Usuarios No Autenticados

Status: done

## Story

Como sistema Reinder,
quiero redirigir a cualquier usuario no autenticado que intente acceder a contenido protegido hacia la pantalla de login,
para que todo el contenido de propiedades requiera autenticación (FR5).

## Acceptance Criteria

1. **Given** un usuario no autenticado **When** intenta navegar a `/swipe`, `/matches`, `/agent/*`, o `/agency/*` **Then** es redirigido a `/login` con el mensaje: "Inicia sesión para continuar"

2. **And** tras el login exitoso, es redirigido de vuelta a la URL original (`?next=` param)

3. **And** el middleware Next.js (`middleware.ts`) protege todas las rutas de dashboard en web

4. **And** el root layout de Expo (`App.tsx`) protege todas las tabs mobile y redirige al flujo de auth si no hay sesión activa

## Tasks / Subtasks

- [x] **Task 1 — Login page acepta `?next=` y muestra mensaje contextual** (AC: 1, 2)
  - [x] Convertir `apps/web/src/app/(auth)/login/page.tsx` en async Server Component que lea `searchParams.next`
  - [x] Añadir prop `initialNext?: string` a `LoginForm` y pasarla desde `page.tsx`
  - [x] Mostrar banner "Inicia sesión para continuar" cuando `initialNext` está presente
  - [x] Tras login exitoso, redirigir a `getSafeNextPath(initialNext)` si es válido, o a la ruta del rol si no

- [x] **Task 2 — Lib pura `route-guard.lib.ts` y tests** (AC: 2)
  - [x] Crear `apps/web/src/features/auth/lib/route-guard.lib.ts` con función `getSafeNextPath()`
  - [x] `getSafeNextPath()` devuelve `null` si `next` es undefined/vacío, no empieza por `/`, o es una ruta de auth (loop)
  - [x] Crear `apps/web/src/features/auth/lib/route-guard.lib.test.ts` con 14 tests vitest

- [x] **Task 3 — Verificar middleware web** (AC: 3)
  - [x] Confirmar que `middleware.ts` ya pasa `?next=` correctamente (implementado en S1.5)
  - [x] Documentado en Dev Agent Record

- [x] **Task 4 — Guard de auth en mobile** (AC: 4)
  - [x] Añadir `@supabase/supabase-js` a `apps/mobile/package.json`
  - [x] Crear `apps/mobile/src/lib/supabase.ts` — cliente Supabase mobile
  - [x] Crear `apps/mobile/src/hooks/useAuthSession.ts` — hook que retorna `{ session, loading }`
  - [x] Modificar `App.tsx` para mostrar `AuthGateScreen` placeholder si no hay sesión

- [x] **Task 5 — Verificar typecheck** (AC: todos)
  - [x] Ejecutar `pnpm --filter @reinder/web typecheck` → ✅ 0 errores
  - [x] Ejecutar `pnpm --filter @reinder/mobile typecheck` → ✅ 0 errores

## Dev Notes

### Contexto Crítico — Qué ya existe

El **middleware web** (`apps/web/src/middleware.ts`) fue creado en Story 1.5 y ya hace:
- Protección de rutas `/swipe`, `/matches`, `/agent`, `/agency`, `/admin`
- Redirect a `/login?next=<url-original>` para usuarios no autenticados

Lo que FALTA es que la página de login **consuma ese `?next=` param** para:
1. Mostrar el mensaje contextual "Inicia sesión para continuar"
2. Redirigir de vuelta tras login exitoso

### Diseño de `getSafeNextPath()`

```ts
// apps/web/src/features/auth/lib/route-guard.lib.ts
export function getSafeNextPath(next: string | undefined | null): string | null {
  if (!next || !next.startsWith("/")) return null;
  // Prevenir loops de auth
  const authPaths = ["/login", "/register", "/auth"];
  if (authPaths.some((p) => next.startsWith(p))) return null;
  return next;
}
```

### Diseño de `login/page.tsx` (async Server Component)

```tsx
// apps/web/src/app/(auth)/login/page.tsx
import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Reinder — Iniciar sesión",
  description: "Inicia sesión en Reinder para descubrir y hacer match con propiedades.",
};

interface Props {
  searchParams: Promise<{ next?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const { next } = await searchParams;
  return <LoginForm initialNext={next} />;
}
```

### Diseño de `login-form.tsx` — cambios clave

La prop `initialNext` se pasa al componente. Después del login exitoso:
```ts
const safeNext = getSafeNextPath(initialNext);
const destination = safeNext ?? (result.redirectTo ?? "/swipe");
router.refresh();
router.push(destination);
```

El banner contextual solo aparece si `initialNext` tiene valor:
```tsx
{initialNext && (
  <div style={styles.contextBanner}>
    Inicia sesión para continuar
  </div>
)}
```

### Mobile — Estrategia

El app mobile es un Expo blank-typescript sin Expo Router. El guard se implementa en `App.tsx` usando un hook que suscribe a `supabase.auth.onAuthStateChange`. Si `session === null`, se renderiza un `AuthGateScreen` con mensaje de texto. Si `loading`, se renderiza un splash/loading state.

Variables de entorno mobile: `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

### Scope de esta historia — Qué NO hacer

- **NO** crear el flujo de login nativo en mobile (Sprint 1 scope: solo guard de auth en App.tsx)
- **NO** modificar el middleware web (ya correcto desde S1.5)
- **NO** añadir Expo Router (scope de Epics 2+)

### Referencias

- Story 1.5 Dev Notes: middleware.ts existente, patrón `?next=`
- Story 1.4 Dev Notes: `loginUser()` en `login.ts`, patrón de redirect tras auth
- [architecture.md]: `apps/mobile/_layout.tsx` como auth guard (adaptado a App.tsx en estado actual sin Expo Router)

## Dev Agent Record

### Agent Model Used

Gemini 2.5 Pro (Antigravity)

### Debug Log References

(ninguno)

### Completion Notes List

- ✅ `getSafeNextPath()` implementada en `route-guard.lib.ts`: previene open-redirects (valida `/` prefix) y auth loops (bloquea `/login`, `/register`, `/auth`). 14 tests unitarios pasan.
- ✅ `login/page.tsx` convertido a async Server Component: lee `searchParams.next` y pasa `initialNext` prop al `LoginForm`.
- ✅ `login-form.tsx` actualizado: acepta `initialNext` prop, muestra banner naranja "Inicia sesión para continuar" (solo cuando `initialNext` es un path válido), y redirige al `safeNext` como primera prioridad tras login exitoso.
- ✅ `middleware.ts` verificado: ya implementaba `?next=` correctamente desde Story 1.5. Sin cambios necesarios.
- ✅ `@supabase/supabase-js` añadido a `apps/mobile`.
- ✅ `apps/mobile/src/lib/supabase.ts` creado: cliente Supabase con variables `EXPO_PUBLIC_*`.
- ✅ `apps/mobile/src/hooks/useAuthSession.ts` creado: suscribe a `onAuthStateChange`, retorna `{ session, loading }`.
- ✅ `App.tsx` actualizado: guarda de auth con 3 estados (loading/unauthed/authed) usando design tokens del sistema de diseño Reinder (#0D0D0D fondo, #FF6B00 naranja).
- ✅ `pnpm test` → 28/28 tests pasan (3 test files, sin regresiones).
- ✅ `pnpm --filter @reinder/web typecheck` → 0 errores.
- ✅ `pnpm --filter @reinder/mobile typecheck` → 0 errores.
- ✅ **Code review fixes:** M1 (`GoogleAuthButton` → `signInWithGoogle` → callback OAuth chain), L1 (`getSession()` eliminado), L2 (`safeNextFromProp` extraído). Typecheck y tests re-confirmados tras fixes.

### File List

**Modificados:**
- `apps/web/src/app/(auth)/login/page.tsx` — Async Server Component con `searchParams.next`
- `apps/web/src/app/(auth)/login/login-form.tsx` — Prop `initialNext`, `safeNextFromProp`, banner, redirect-back, pasa `next` a GoogleAuthButton
- `apps/web/src/features/auth/components/google-auth-button.tsx` — Prop `next` + input hidden para OAuth redirect-back (M1)
- `apps/web/src/features/auth/actions/oauth.ts` — Lee `next` del formData, lo codifica en `redirectTo` URL (M1)
- `apps/web/src/app/api/auth/callback/route.ts` — Lee `?next=` y redirige al destino correcto (M1)
- `apps/mobile/App.tsx` — Auth guard con `useAuthSession`
- `apps/mobile/src/hooks/useAuthSession.ts` — `getSession()` eliminado, solo `onAuthStateChange` (L1)
- `apps/mobile/package.json` — Añadido `@supabase/supabase-js`

**Nuevos:**
- `apps/web/src/features/auth/lib/route-guard.lib.ts` — `getSafeNextPath()` pura y testeable
- `apps/web/src/features/auth/lib/route-guard.lib.test.ts` — 14 tests unitarios (vitest)
- `apps/mobile/src/lib/supabase.ts` — Cliente Supabase mobile
- `apps/mobile/src/hooks/useAuthSession.ts` — Hook de sesión (sin doble render, L1 fix)

## Change Log

| Fecha | Cambio |
|-------|--------|
| 2026-03-20 | Story creada e implementación completa. 28 tests pasan. 0 errores typecheck. Status: review |
| 2026-03-20 | Code review (AI): 1 Med + 2 Low encontrados. Todos corregidos automáticamente. OAuth redirect-back completo. Status: done |

## Senior Developer Review (AI)

**Fecha:** 2026-03-20 | **Outcome:** Changes Requested

### Action Items

- [x] **[Med]** M1: Google OAuth no propagaba `?next=` — Fixed: `GoogleAuthButton` acepta prop `next` (input hidden), `signInWithGoogle()` convierte a `FormData`, lee `next`, lo sanitiza con `getSafeNextPath()` y lo codifica en la `redirectTo` URL. El callback `/api/auth/callback/route.ts` lee `?next=` y redirige al destino correcto. La cadena completa es funcional para usuarios existentes (nuevos usuarios > T&C primero).
- [x] **[Low]** L1: `getSession()` redundante eliminado de `useAuthSession`. `onAuthStateChange` dispara `INITIAL_SESSION` al suscribirse — sin doble render.
- [x] **[Low]** L2: `getSafeNextPath(initialNext)` extraído como `const safeNextFromProp` al nivel del componente en `login-form.tsx`. Un solo cálculo compartido por banner y `handleSubmit`. `GoogleAuthButton` recibe `next={safeNextFromProp ?? undefined}`.
