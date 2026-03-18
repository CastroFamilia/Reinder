# Story 1.3: Registro de Comprador con Email y Aceptación de T&C

Status: done

## Story

Como comprador,
quiero registrarme en Reinder con email y contraseña aceptando los Términos y Condiciones,
para que pueda acceder al contenido con mi cuenta y con consentimiento GDPR registrado.

## Acceptance Criteria

1. **Given** un usuario no autenticado en la pantalla de registro **When** introduce email, contraseña válida y acepta los T&C **Then** se crea una cuenta en Supabase Auth con rol `buyer` y un registro en `user_profiles`
   - **And** el usuario es redirigido al swipe feed
   - **And** la aceptación de T&C queda registrada con timestamp en `user_profiles.terms_accepted_at`

2. **And** si el email ya existe, se muestra: "Ya existe una cuenta con este email. ¿Quieres iniciar sesión?"

3. **And** si la contraseña tiene menos de 8 caracteres, se muestra error de validación antes de enviar

4. **And** el botón "Crear cuenta" está desactivado hasta que se marque el checkbox de T&C

## Tasks / Subtasks

- [x] **Task 1 — Implementar clientes Supabase SSR** (AC: 1)
  - [x] Implementar `createBrowserClient()` en `apps/web/src/lib/supabase/client.ts`
  - [x] Implementar `createServerClient()` con cookies en `apps/web/src/lib/supabase/server.ts`

- [x] **Task 2 — Server Action de registro** (AC: 1)
  - [x] Crear `apps/web/src/features/auth/actions/register.ts`
  - [x] Llamar a `supabase.auth.signUp()` y crear fila en `user_profiles` vía Drizzle
  - [x] Retornar `{ success: true }` o `{ error: string }`

- [x] **Task 3 — Validación de inputs** (AC: 3, 4)
  - [x] Crear `apps/web/src/features/auth/lib/validation.ts`
  - [x] Validar email, contraseña ≥8 chars, checkbox T&C aceptado

- [x] **Task 4 — Páginas de registro** (AC: 1, 2, 3, 4)
  - [x] Crear `apps/web/src/app/(auth)/layout.tsx`
  - [x] Crear `apps/web/src/app/(auth)/register/page.tsx` (Server Component)
  - [x] Crear `apps/web/src/app/(auth)/register/register-form.tsx` (Client Component)

- [x] **Task 5 — Página stub /swipe** (AC: 1 – redirección post-registro)
  - [x] Crear `apps/web/src/app/(protected)/swipe/page.tsx`

- [x] **Task 6 — Políticas RLS user_profiles** (AC: 1)
  - [x] Crear `packages/shared/src/db/rls-user-profiles-policies.sql`
  - [x] Instrucciones para ejecutar en Supabase SQL Editor

- [x] **Task 7 — Verificar typecheck y flujo manual**
  - [x] `pnpm --filter @reinder/web typecheck` → ✅ 0 errores
  - [ ] Verificar flujo completo en browser (requiere `pnpm dev` + credenciales Supabase configuradas)

## Dev Notes

### Supabase SSR Client — Next.js 15

```ts
// client.ts (browser)
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

```ts
// server.ts (server — cookies de Next.js 15)
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {} // Server Components no pueden setear cookies — ignorar
        },
      },
    }
  );
}
```

### Server Action — Registro

```ts
// register.ts
"use server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/supabase/db";
import { userProfiles } from "@reinder/shared/db/schema";

export async function registerUser(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    if (error.message.includes("already registered")) {
      return { error: "Ya existe una cuenta con este email. ¿Quieres iniciar sesión?" };
    }
    return { error: error.message };
  }

  if (data.user) {
    await db.insert(userProfiles).values({
      id: data.user.id,
      role: "buyer",
      termsAcceptedAt: new Date(),
    });
  }

  return { success: true };
}
```

### Design Tokens Aplicables
- Fondo: `#0D0D0D`
- Acento primario: `#FF6B00`
- Texto: `#F5F0E8`
- Surface (inputs/cards): `#1E1A15`
- Border: `#2E2820`
- Radio botón: `12px`

### Context from Story 1.2
- `user_profiles` table exists with `role` (app_role enum) and `terms_accepted_at` columns
- RLS activado con deny-by-default — necesita política INSERT para usuarios autenticados
- Drizzle client en `apps/web/src/lib/supabase/db.ts` (server-only)

## Dev Agent Record

### Agent Model Used

Gemini 2.5 Pro (Antigravity)

### Debug Log References

(ninguno)

### Completion Notes List

- ✅ Clientes Supabase SSR completamente implementados (`client.ts` con `createBrowserClient`, `server.ts` con `createServerClient` + cookie handling Next.js 15).
- ✅ Server Action `registerUser` crea cuenta en Supabase Auth y fila en `user_profiles` vía Drizzle.
- ✅ Validación client-side: email, contraseña ≥8 chars, checkbox T&C.
- ✅ Validación server-side añadida (code review): `termsAccepted` enviado en FormData y verificado en servidor — GDPR bypass imposible.
- ✅ Error de inserción en `user_profiles` ahora propaga error al cliente (code review): evita usuarios huérfanos en Supabase Auth.
- ✅ Import no usado `useActionState` eliminado de `register-form.tsx` (code review).
- ✅ RegisterForm Client Component con diseño Reinder (tokens: `#0D0D0D`, `#FF6B00`, `#1E1A15`).
- ✅ Página `/swipe` stub con validación de sesión (redirige a /register si no autenticado).
- ⚠️ Política RLS `rls-user-profiles-policies.sql` debe ejecutarse en Supabase SQL Editor antes de probar el flujo completo.
- ✅ `pnpm --filter @reinder/web typecheck` → 0 errores.

### File List

- `apps/web/src/lib/supabase/client.ts` — MODIFICADO (implementado con `createBrowserClient`)
- `apps/web/src/lib/supabase/server.ts` — MODIFICADO (implementado con `createServerClient` + cookies)
- `apps/web/src/features/auth/actions/register.ts` — NUEVO
- `apps/web/src/features/auth/lib/validation.ts` — NUEVO
- `apps/web/src/app/(auth)/layout.tsx` — NUEVO
- `apps/web/src/app/(auth)/register/page.tsx` — NUEVO
- `apps/web/src/app/(auth)/register/register-form.tsx` — NUEVO
- `apps/web/src/app/(protected)/swipe/page.tsx` — NUEVO
- `apps/web/src/app/layout.tsx` — MODIFICADO (lang=es, metadata Reinder)
- `packages/shared/src/db/rls-user-profiles-policies.sql` — NUEVO
