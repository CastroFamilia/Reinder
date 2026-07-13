# Story 1.4: Registro y Login con Google OAuth

Status: done

## Story

Como comprador,
quiero registrarme e iniciar sesión con mi cuenta de Google,
para que el acceso sea más rápido sin tener que recordar otra contraseña.

## Acceptance Criteria

1. **Given** un usuario no autenticado en la pantalla de login o registro **When** pulsa "Continuar con Google" y completa el flujo OAuth **Then** se crea o recupera su cuenta en Supabase Auth y es autenticado correctamente

2. **And** si es nuevo usuario vía Google, ve la pantalla de aceptación de T&C antes de acceder al feed

3. **And** si ya tenía cuenta de Google, accede directamente al feed (T&C ya aceptados)

4. **And** un JWT válido queda almacenado con expiración de 30 días de inactividad (NFR6)

5. **And** toda la comunicación ocurre sobre HTTPS/TLS 1.3 (NFR5 — garantizado por Supabase/Vercel por defecto)

## Tasks / Subtasks

- [x] **Task 1 — Configurar Google OAuth en Supabase** (AC: 1, 4, 5)
  - [x] En la Consola de Google Cloud: crear proyecto, habilitar Google OAuth 2.0, obtener `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`
  - [x] En Supabase Dashboard → Authentication → Providers → Google: pegar las credenciales y activar
  - [x] Añadir `https://<supabase-project>.supabase.co/auth/v1/callback` como Authorized redirect URI en Google Cloud Console
  - [x] Añadir a `.env.local` (y actualizar `.env.local.example`):
    ```
    NEXT_PUBLIC_SUPABASE_URL=...
    NEXT_PUBLIC_SUPABASE_ANON_KEY=...
    NEXT_PUBLIC_APP_URL=http://localhost:3000    # usado para construir redirect URLs
    ```

- [x] **Task 2 — Server Action de OAuth en web** (AC: 1, 2, 3)
  - [x] Crear `apps/web/src/features/auth/actions/oauth.ts`
  - [x] Implementar `signInWithGoogle()` usando `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: ... } })`
  - [x] El `redirectTo` apunta a `/api/auth/callback` (Task 3)

- [x] **Task 3 — Route Handler de callback OAuth** (AC: 1, 2, 3, 4)
  - [x] Crear `apps/web/src/app/api/auth/callback/route.ts`
  - [x] Intercambiar `code` por sesión usando `supabase.auth.exchangeCodeForSession(code)`
  - [x] Detectar si el usuario es nuevo (sin fila en `user_profiles`) → crear perfil sin `terms_accepted_at` → redirigir a `/terms`
  - [x] Si ya tiene `user_profiles.terms_accepted_at` → redirigir a `/swipe`

- [x] **Task 4 — Pantalla de aceptación de T&C para usuarios OAuth nuevos** (AC: 2, 3)
  - [x] Crear `apps/web/src/app/(auth)/terms/page.tsx` (Server Component con auth guard)
  - [x] Crear `apps/web/src/app/(auth)/terms/terms-form.tsx` (Client Component con botón "Aceptar y continuar")
  - [x] Server Action `acceptTerms()` que actualiza `user_profiles.terms_accepted_at = now()` y redirige a `/swipe`
  - [x] Si el usuario llega a `/terms` sin sesión activa, redirigir a `/login`

- [x] **Task 5 — Botón "Continuar con Google" en páginas de auth** (AC: 1)
  - [x] Crear `apps/web/src/features/auth/components/google-auth-button.tsx` (Client Component)
  - [x] Estilo: Secondary (glass + borde naranja translúcido, según UX-DR11), con icono SVG de Google + texto "Continuar con Google"
  - [x] Usar `isSubmitting` a través de `useFormStatus` (correcto naming convention)
  - [x] Botón añadido a `register-form.tsx` con separador "O continúa con email"
  - [x] Login form incluye el botón integrado

- [x] **Task 6 — Página de Login completa** (AC: 1)
  - [x] Crear `apps/web/src/app/(auth)/login/page.tsx` (Server Component)
  - [x] Crear `apps/web/src/app/(auth)/login/login-form.tsx` (Client Component)
  - [x] Formulario con email + contraseña usando `loginUser()` Server Action con `supabase.auth.signInWithPassword()`
  - [x] Al éxito → redirigir a `/swipe` via `router.push()` + `router.refresh()`
  - [x] Errores: "Email o contraseña incorrectos." para credenciales inválidas
  - [x] Incluir botón "Continuar con Google" (Task 5) en posición prominente
  - [x] Incluir link "¿No tienes cuenta? Regístrate gratis"

- [x] **Task 7 — Actualizar RLS para `user_profiles` con OAuth** (AC: 1, 2)
  - [x] `rls-user-profiles-policies.sql` ya incluye política UPDATE (creada en Story 1.2) — verificado ✅
  - [x] La política INSERT permite al callback route crear el perfil OAuth vía Drizzle

- [x] **Task 8 — Verificar typecheck** (AC: todos)
  - [x] `pnpm --filter @reinder/web typecheck` → ✅ 0 errores

- [x] **Review Follow-ups (Code Review 2026-03-18)**
  - [x] [AI-Review][MEDIUM] **M1**: `callback/route.ts` — INSERT del perfil fallaba silenciosamente y continuaba a `/terms` → corregido a `redirect('/login?error=profile_creation_failed')` [route.ts:73]
  - [x] [AI-Review][MEDIUM] **M2**: `terms.ts` — `acceptTerms()` usaba UPDATE sin verificar filas afectadas → cambiado a UPSERT con `.select('id')` para detectar 0 rows [terms.ts:24]
  - [ ] [AI-Review][LOW] **L1**: Sin tests para `loginUser()`, `acceptTerms()` ni lógica del callback route
  - [ ] [AI-Review][LOW] **L2**: `login-form.tsx` y `register-form.tsx` usan `<a>` en lugar de `<Link>` de Next.js [login-form.tsx:227, register-form.tsx:303]
  - [ ] [AI-Review][LOW] **L3**: `terms/page.tsx` no redirige a `/swipe` si el usuario ya tiene `terms_accepted_at != null`

## Dev Notes

### Patrón OAuth con Supabase + Next.js 15 App Router (PKCE flow)

Supabase usa PKCE (Proof Key for Code Exchange) por defecto para OAuth en SSR. El flujo es:

1. Usuario pulsa "Continuar con Google"
2. `supabase.auth.signInWithOAuth()` genera un URL de autorización de Google + code_verifier (guardado en cookie por `@supabase/ssr`)
3. El browser redirige a Google → usuario acepta
4. Google redirige a `redirectTo` (nuestro callback) con `?code=...`
5. El Route Handler intercambia el `code` por tokens usando `exchangeCodeForSession(code)` — esto crea/actualiza la sesión en cookies

```ts
// apps/web/src/features/auth/actions/oauth.ts
"use server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function signInWithGoogle(): Promise<void> {
  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${appUrl}/api/auth/callback`,
      queryParams: {
        access_type: "offline",
        prompt: "consent",  // Fuerza pantalla de consentimiento para obtener refresh_token
      },
    },
  });

  if (error) redirect("/login?error=oauth_init_failed");
  redirect(data.url!);
}
```

### Pantalla de T&C para OAuth nuevos (terms-form.tsx)

La pantalla de T&C se muestra sólo a usuarios nuevos de Google OAuth. El callback route handler crea el perfil con `terms_accepted_at = null` y redirige a `/terms`. La Server Action `acceptTerms()` actualiza `terms_accepted_at` con Drizzle y redirige a `/swipe`.

### Tokens y sesión — NFR6 (30 días de inactividad)

Supabase Auth gestiona automáticamente la expiración. Verificar que en **Dashboard → Auth → Configuration → JWT expiry** está en 2592000 segundos (30 días). `@supabase/ssr` renueva el access_token automáticamente vía cookies.

### Design Tokens Aplicables
- Fondo: `#0D0D0D`
- Acento primario: `#FF6B00`
- Secondary button: `background: rgba(30,26,21,0.6)`, `border: 1px solid rgba(255,107,0,0.35)`
- Texto: `#F5F0E8`
- Surface: `#1E1A15`
- Border: `#2E2820`

### Project Structure Notes

**Archivos creados en esta historia:**
```
apps/web/src/
├── app/
│   ├── api/auth/callback/route.ts      ← NUEVO
│   └── (auth)/
│       ├── login/
│       │   ├── page.tsx                ← NUEVO
│       │   └── login-form.tsx          ← NUEVO
│       └── terms/
│           ├── page.tsx                ← NUEVO
│           └── terms-form.tsx          ← NUEVO
├── features/auth/
│   ├── actions/
│   │   ├── oauth.ts                    ← NUEVO
│   │   ├── terms.ts                    ← NUEVO
│   │   └── login.ts                    ← NUEVO
│   ├── components/
│   │   └── google-auth-button.tsx      ← NUEVO
│   └── lib/
│       └── validation.test.ts          ← NUEVO (tests)
└── __mocks__/
    └── server-only.ts                  ← NUEVO (mock para tests)
```

**Archivos modificados:**
```
apps/web/src/app/(auth)/register/register-form.tsx  ← GoogleAuthButton + separador añadidos
apps/web/src/app/globals.css                         ← dark theme + @keyframes spin
apps/web/package.json                                ← script "test": "vitest run" añadido
apps/web/vitest.config.ts                            ← NUEVO (configuración de tests)
apps/web/vitest.setup.ts                             ← NUEVO (setup de tests)
```

### References

- Supabase OAuth PKCE: [architecture.md#Authentication & Security]
- `@supabase/ssr` server client: [Story 1.3 Dev Notes]
- UX-DR11 (Secondary button style): [ux-design-specification.md]
- NFR5 (TLS 1.3), NFR6 (tokens 30 días): [epics.md#NonFunctional Requirements]

## Dev Agent Record

### Agent Model Used

Gemini 2.5 Pro (Antigravity)

### Debug Log References

(ninguno)

### Completion Notes List

- ✅ Server Action `signInWithGoogle()` implementada en `oauth.ts` usando flujo PKCE — `@supabase/ssr` gestiona el code_verifier automáticamente via cookies.
- ✅ Route Handler `api/auth/callback/route.ts` completo: intercambia `code` por sesión, detecta usuarios nuevos vs. existentes, crea `user_profile` sin `terms_accepted_at` para nuevos OAuth, redirige correctamente a `/terms` o `/swipe`.
- ✅ `GoogleAuthButton` con icono Google SVG, estilo Secondary glass+naranja (UX-DR11), estado `pending` via `useFormStatus`, spinner con `@keyframes spin`.
- ✅ Login page completa (`login/page.tsx` + `login-form.tsx`) con Google OAuth en posición prominente + email/password como alternativa. Loading state nombrado `isSubmitting` (naming convention).
- ✅ Terms page (`terms/page.tsx` + `terms-form.tsx`) con auth guard server-side y Server Action `acceptTerms()` que actualiza `terms_accepted_at` via Drizzle.
- ✅ `register-form.tsx` actualizado con `GoogleAuthButton` + separador "O continúa con email".
- ✅ `globals.css` actualizado: Reinder dark theme por defecto + `@keyframes spin` para spinner del botón Google.
- ✅ RLS policies verificadas — ya cubiertas desde Story 1.2 (INSERT + SELECT + UPDATE en `user_profiles`).
- ✅ Vitest configurado y 8 tests de `validateRegisterInput` pasan al 100%.
- ✅ `pnpm --filter @reinder/web typecheck` → 0 errores.

### File List

**Nuevos:**
- `apps/web/src/features/auth/actions/oauth.ts`
- `apps/web/src/features/auth/actions/terms.ts`
- `apps/web/src/features/auth/actions/login.ts`
- `apps/web/src/features/auth/components/google-auth-button.tsx`
- `apps/web/src/features/auth/lib/validation.test.ts`
- `apps/web/src/app/api/auth/callback/route.ts`
- `apps/web/src/app/(auth)/login/page.tsx`
- `apps/web/src/app/(auth)/login/login-form.tsx`
- `apps/web/src/app/(auth)/terms/page.tsx`
- `apps/web/src/app/(auth)/terms/terms-form.tsx`
- `apps/web/src/__mocks__/server-only.ts`
- `apps/web/vitest.config.ts`
- `apps/web/vitest.setup.ts`

**Modificados:**
- `apps/web/src/app/(auth)/register/register-form.tsx` — GoogleAuthButton + separador añadidos
- `apps/web/src/app/globals.css` — dark theme Reinder + `@keyframes spin`
- `apps/web/package.json` — script `"test": "vitest run"` añadido
- `apps/web/src/app/api/auth/callback/route.ts` — **[Code Review Fix M1]** INSERT error ahora redirige a `/login?error=profile_creation_failed` en lugar de continuar silenciosamente
- `apps/web/src/features/auth/actions/terms.ts` — **[Code Review Fix M2]** UPDATE cambiado a UPSERT con `.select('id')` para verificar filas afectadas
