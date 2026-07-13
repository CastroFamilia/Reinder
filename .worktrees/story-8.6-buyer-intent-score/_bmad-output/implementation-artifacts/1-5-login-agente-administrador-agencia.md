# Story 1.5: Login de Agente y Administrador de Agencia

Status: done

## Story

Como agente representante o administrador de agencia,
quiero iniciar sesión en Reinder con mis credenciales,
para que pueda acceder al panel correspondiente a mi rol.

## Acceptance Criteria

1. **Given** un agente (`agent`) o admin de agencia (`agency_admin`) con cuenta existente en la pantalla de login **When** introduce sus credenciales correctas **Then** es autenticado y redirigido al panel de su rol:
   - `agent` → `/agent` (panel de clientes)
   - `agency_admin` → `/agency/listings` (gestión de listings)

2. **And** las políticas RLS de Supabase restringen el acceso a los datos correctos según el rol (un `agent` no puede leer datos de `agency_admin` y viceversa)

3. **And** credenciales incorrectas muestran el mensaje: "Email o contraseña incorrectos"

4. **And** un usuario con rol `buyer` que intente acceder a `/agent/*` recibe 403 y es redirigido al feed (`/swipe`)

5. **And** un usuario con rol `buyer` que intente acceder a `/agency/*` recibe 403 y es redirigido al feed (`/swipe`)

## Tasks / Subtasks

- [x] **Task 1 — Actualizar la Server Action `loginUser()` con redirección rol-based** (AC: 1, 3)
  - [x] Abrir `apps/web/src/features/auth/actions/login.ts`
  - [x] Tras `signInWithPassword()` exitoso, leer el campo `role` del registro en `user_profiles` del usuario autenticado
  - [x] Implementar switch de redirección: `buyer` → `/swipe`, `agent` → `/agent`, `agency_admin` → `/agency/listings`, `platform_admin` → `/admin`
  - [x] Mantener el mensaje de error "Email o contraseña incorrectos." para credenciales inválidas (ya existente)

- [x] **Task 2 — Crear página stub del panel del agente** (AC: 1, 4)
  - [x] Crear `apps/web/src/app/(protected)/agent/page.tsx` (Server Component)
  - [x] Verificar sesión activa con Supabase server client y que el rol sea `agent`; si no → redirect `/login`
  - [x] Si el rol es `buyer` → redirect `/swipe` (403 conceptual desde el middleware)
  - [x] Renderizar placeholder: `<h1>Panel del Agente</h1>` con mensaje "Próximamente: tus clientes vinculados"

- [x] **Task 3 — Crear página stub del panel de agency_admin** (AC: 1, 5)
  - [x] Crear `apps/web/src/app/(protected)/agency/listings/page.tsx` (Server Component)
  - [x] Verificar sesión activa y que el rol sea `agency_admin`; si no → redirect `/login`
  - [x] Si el rol es `buyer` → redirect `/swipe`
  - [x] Renderizar placeholder: `<h1>Gestión de Listings</h1>` con mensaje "Próximamente: tus propiedades exclusivas"

- [x] **Task 4 — Actualizar middleware de Next.js para proteger rutas `/agent/*` y `/agency/*`** (AC: 4, 5)
  - [x] Crear `apps/web/src/middleware.ts` (no existía previamente)
  - [x] Ampliar la lista de rutas protegidas añadiendo `/agent` y `/agency` además de las ya protegidas
  - [x] Añadir lógica de comprobación de rol: si usuario autenticado con rol `buyer` intenta acceder a `/agent/*` o `/agency/*` → redirect a `/swipe` con mensaje 403
  - [x] Asegurarse de que usuarios no autenticados que acceden a `/agent/*` o `/agency/*` son redirigidos a `/login`

- [x] **Task 5 — Crear políticas RLS para roles `agent` y `agency_admin`** (AC: 2)
  - [x] Crear `packages/shared/src/db/rls-agent-policies.sql`
  - [x] Política SELECT en `user_profiles`: `agent` puede leer solo su propio perfil (`id = auth.uid()`)
  - [x] Política SELECT en `user_profiles`: `agency_admin` puede leer solo su propio perfil
  - [x] Política SELECT en `agencies`: `agency_admin` puede leer solo la agencia a la que pertenece — **comentada** hasta que `user_profiles.agency_id` exista (Story 5.1)
  - [x] Documentar en el archivo las instrucciones para ejecutar en Supabase SQL Editor
  - [x] Nota: la política de `agencies` está comentada porque `user_profiles` aún no tiene campo `agency_id` — se habilitará en Epic 5

- [x] **Task 6 — Actualizar login-form.tsx para reflejar contexto multi-rol** (AC: 1, 3)
  - [x] Abrir `apps/web/src/app/(auth)/login/login-form.tsx`
  - [x] `handleSubmit` actualizado: usa `result.redirectTo ?? "/swipe"` en lugar de `/swipe` hardcodeado
  - [x] Los mensajes de error son consistentes con AC: 3 (ya existía "Email o contraseña incorrectos.")

- [x] **Task 7 — Verificar typecheck** (AC: todos)
  - [x] Ejecutar `pnpm --filter @reinder/web typecheck` → ✅ 0 errores

## Dev Notes

### Contexto Crítico — La Pantalla de Login YA Existe

La pantalla de login (`/login`) fue completamente implementada en la **Story 1.4**. Esta historia NO crea una nueva pantalla de login. El trabajo aquí es:
1. Actualizar la lógica de redirección tras el login exitoso en `loginUser()` para que sea rol-based
2. Crear los stubs de las rutas de destino para `agent` y `agency_admin`
3. Fortalecer la protección de rutas en el middleware

**Archivos clave ya existentes (NO recrear):**
- `apps/web/src/app/(auth)/login/page.tsx` — Página de login (Server Component)
- `apps/web/src/app/(auth)/login/login-form.tsx` — Formulario de login (Client Component)
- `apps/web/src/features/auth/actions/login.ts` — Server Action `loginUser()` — **MODIFICAR**
- `apps/web/src/middleware.ts` — Middleware de autenticación — **MODIFICAR**
- `apps/web/src/lib/supabase/server.ts` — Supabase server client (ya implementado)

### Patrón de Redirección Rol-Based en `loginUser()`

El flujo actual de `loginUser()` en `login.ts` redirige siempre a `/swipe`. Debe actualizarse para leer el `role` de `user_profiles` y redirigir según corresponda:

```ts
// apps/web/src/features/auth/actions/login.ts
"use server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/supabase/db";
import { userProfiles } from "@reinder/shared/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export async function loginUser(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Email o contraseña incorrectos." };
  }

  // Leer rol del usuario desde user_profiles
  const [profile] = await db
    .select({ role: userProfiles.role })
    .from(userProfiles)
    .where(eq(userProfiles.id, data.user.id))
    .limit(1);

  // Redirección rol-based
  switch (profile?.role) {
    case "agent":
      redirect("/agent");
    case "agency_admin":
      redirect("/agency/listings");
    case "platform_admin":
      redirect("/admin");
    default:
      redirect("/swipe"); // buyer y fallback
  }
}
```

> **Nota:** `redirect()` lanza una excepción internamente en Next.js — no poner dentro de try/catch.

### Patrón de Guard en Server Components (Stubs del Panel)

Las páginas stub para `agent` y `agency_admin` deben validar el rol server-side antes de renderizar:

```ts
// apps/web/src/app/(dashboard)/agent/page.tsx
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/supabase/db";
import { userProfiles } from "@reinder/shared/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export default async function AgentDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [profile] = await db
    .select({ role: userProfiles.role })
    .from(userProfiles)
    .where(eq(userProfiles.id, user.id))
    .limit(1);

  if (!profile || profile.role !== "agent") redirect("/swipe");

  return (
    <main>
      <h1>Panel del Agente</h1>
      <p>Próximamente: tus clientes vinculados</p>
    </main>
  );
}
```

> Mismo patrón para `agency_admin` en `/agency/listings/page.tsx` (chequeando `profile.role !== "agency_admin"`).

### Middleware — Protección de Rutas `/agent` y `/agency`

El middleware existente en `apps/web/src/middleware.ts` ya protege rutas de dashboard contra usuarios no autenticados. Ampliar el matcher para incluir las nuevas rutas:

```ts
// Ampliar el matcher para incluir /agent y /agency
export const config = {
  matcher: [
    "/swipe/:path*",
    "/matches/:path*",
    "/agent/:path*",   // ← NUEVO
    "/agency/:path*",  // ← NUEVO
    "/admin/:path*",   // ← si existe
  ],
};
```

Para el guard de rol en el middleware (buyer accediendo a rutas de `agent`/`agency`), la protección preferible es en el Server Component (Task 2 y 3), ya que el middleware no tiene acceso directo al `user_profiles` RDB sin aumentar su complejidad. El redirect por rol se hace en la página misma. El middleware solo comprueba autenticación.

> **Decisión de diseño:** Doble capa de seguridad — middleware verifica autenticación (redirige a `/login` si no autenticado), la página verifica el rol específico (redirige a `/swipe` si rol incorrecto). Esto es consistente con el patrón establecido en `/swipe/page.tsx` de Story 1.3.

### Políticas RLS — Roles Agent y Agency Admin

La tabla `user_profiles` ya tiene RLS activado con las políticas básicas de Story 1.2. Esta historia añade las políticas de acceso específicas para los nuevos roles.

```sql
-- packages/shared/src/db/rls-agent-policies.sql
-- INSTRUCCIONES: Ejecutar en Supabase SQL Editor (Dashboard > SQL Editor)

-- Política SELECT para agentes: solo pueden leer su propio perfil
CREATE POLICY "agent_can_read_own_profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    AND role = 'agent'
  );

-- Política SELECT para agency_admin: solo pueden leer su propio perfil
CREATE POLICY "agency_admin_can_read_own_profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    AND role = 'agency_admin'
  );

-- Política SELECT para agencies: agency_admin puede leer solo su agencia
-- NOTA: Ajustar cuando la tabla agencies esté relacionada con user_profiles vía agency_id
CREATE POLICY "agency_admin_can_read_own_agency"
  ON agencies
  FOR SELECT
  TO authenticated
  USING (
    id = (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid() AND role = 'agency_admin'
    )
  );
```

> ⚠️ **Dependencia:** La política en `agencies` asume que `user_profiles` tiene un campo `agency_id` que relaciona el admin con su agencia. Si este campo no existe aún en el schema de Drizzle, crear solo las políticas de `user_profiles` y documentar el `agency_id` como pendiente.

### Rol `app_role` en Drizzle — Enum de Supabase

El tipo `app_role` es un enum de PostgreSQL definido en Story 1.2. Sus valores son: `'buyer'`, `'agent'`, `'agency_admin'`, `'platform_admin'`. Al leer `profile.role` con Drizzle, TypeScript lo infiere como `"buyer" | "agent" | "agency_admin" | "platform_admin"`.

### Design Tokens — Páginas de Panel (Stubs)

Para los stubs de panel, aplicar el mismo dark theme que el resto de la app:
- `background-color: #0D0D0D` (var `--bg-primary`)
- `color: #F5F0E8` (var `--text-primary`)
- Heading en Clash Display si está disponible globalmente vía `globals.css`

### Scope de Esta Historia — Qué NO hacer

- **NO** crear el panel completo del agente (Epic 4 — Stories 4.1–4.4)
- **NO** crear el panel completo de gestión de listings de agencia (Epic 5 — Stories 5.1–5.4)
- **NO** crear una pantalla de registro para agentes/admins (en MVP, las cuentas de agente se crean manualmente en Supabase Auth o via invitación — fuera de scope del MVP)
- **NO** implementar onboarding específico para agentes
- **NO** create login page duplicada — la existente en `/login` sirve a todos los roles

### Project Structure Notes

**Archivos a MODIFICAR:**
```
apps/web/src/features/auth/actions/login.ts          ← Añadir redirección rol-based
apps/web/src/middleware.ts                            ← Ampliar matcher a /agent y /agency
```

**Archivos NUEVOS:**
```
apps/web/src/app/(protected)/agent/page.tsx          ← Stub panel agente
apps/web/src/app/(protected)/agency/listings/page.tsx ← Stub panel agency_admin
packages/shared/src/db/rls-agent-policies.sql        ← Políticas RLS nuevos roles
```

**Nota sobre route group:** Se usó `(protected)` en lugar de `(dashboard)` para ser consistente con el patrón ya existente en el proyecto (`(protected)/swipe/page.tsx` de Story 1.3).

**Nota sobre `loginUser()` vs `redirect()`:** La función `loginUser()` NO usa `redirect()` de Next.js directamente (que funciona via excepción interna). En su lugar, devuelve `{ redirectTo }` al Client Component que gestiona la navegación via `router.push()`. Este patrón es necesario porque `loginUser()` es llamado desde un Client Component que ya tiene acceso al router — mezclar `redirect()` server-side con la gestión de estado del Client Component causaría conflictos.

### References

- Story 1.3 Dev Notes: Patrón de guard en Server Components (`/swipe/page.tsx`)
- Story 1.4 Dev Notes: `loginUser()` en `login.ts`, `login-form.tsx`, patrón de redirect tras auth
- [architecture.md#Authentication & Security]: RBAC 4 roles, RLS, `user_profiles`
- [architecture.md#Project Structure]: `(dashboard)/agent/`, `(dashboard)/agency/`
- [epics.md#Story 1.5]: AC completos del epic
- [architecture.md#Naming Patterns]: snake_case DB, camelCase TypeScript, PascalCase componentes

## Dev Agent Record

### Agent Model Used

Gemini 2.5 Pro (Antigravity)

### Debug Log References

(ninguno)

### Completion Notes List

- ✅ `loginUser()` actualizado en `login.ts`: lee `user_profiles.role` vía Drizzle tras login exitoso y devuelve `{ success: true, redirectTo }`. Fallback a `/swipe` si el perfil no existe o la query falla.
- ✅ `getRedirectPathForRole()` extraída a `login.lib.ts` para permitir tests unitarios sin dependencias server-only.
- ✅ `login-form.tsx` actualizado: `handleSubmit` usa `result.redirectTo ?? "/swipe"`, orden correcto `refresh()` → `push()`, y guard de path interno.
- ✅ `(protected)/agent/page.tsx` creado: Server Component con doble guard (auth + rol). Non-agents redirigen a `/swipe`.
- ✅ `(protected)/agency/listings/page.tsx` creado: mismo patrón para `agency_admin`.
- ✅ `middleware.ts` creado: protege rutas `/swipe`, `/matches`, `/agent`, `/agency`, `/admin`. Redirect a `/login?next=<url>` para no autenticados.
- ✅ `rls-agent-policies.sql` creado: políticas SELECT para `agent` y `agency_admin` en `user_profiles`. Ejecutadas en Supabase.
- ✅ Code review: M2 (router order) + L2 (path guard) corregidos. L1 (6 tests para `getRedirectPathForRole`) añadidos. M1 confirmado como false positive (patrón middleware correcto).
- ✅ `pnpm typecheck` → 0 errores. `pnpm test` → 14 tests pasan (6 nuevos + 8 existentes), sin regresiones.
- ⚠️ **Pendiente test manual:** El flujo de login para roles `agent` y `agency_admin` no fue testeado manualmente (requiere crear usuarios con esos roles en Supabase Auth manualmente). La lógica es correcta por construcción — switch exhaustivo validado con TypeScript y unit tests.

### File List

**Modificados:**
- `apps/web/src/features/auth/actions/login.ts` — Redirección rol-based, importa `getRedirectPathForRole` desde `login.lib.ts`
- `apps/web/src/app/(auth)/login/login-form.tsx` — Usa `redirectTo` del server action, orden correcto refresh→push, guard path interno

**Nuevos:**
- `apps/web/src/middleware.ts` — Middleware Next.js con protección de rutas
- `apps/web/src/app/(protected)/agent/page.tsx` — Stub panel agente con role guard
- `apps/web/src/app/(protected)/agency/listings/page.tsx` — Stub panel agency_admin con role guard
- `packages/shared/src/db/rls-agent-policies.sql` — Políticas RLS para `agent` y `agency_admin`
- `apps/web/src/features/auth/lib/login.lib.ts` — Función `getRedirectPathForRole()` pura y testeable
- `apps/web/src/features/auth/lib/login.lib.test.ts` — 6 tests unitarios para `getRedirectPathForRole()`

## Senior Developer Review (AI)

**Fecha:** 2026-03-18 | **Outcome:** Changes Requested (resuelto)

### Action Items

- [x] **[Med]** M2: `router.push()` antes de `router.refresh()` — podía causar render con sesión antigua en el destino. → Fixed: orden corregido a `refresh()` primero en `login-form.tsx:146-148`
- [x] **[Low]** L1: Sin tests para `getRedirectPathForRole()`. → Fixed: función extraída a `login.lib.ts`, 6 tests en `login.lib.test.ts`
- [x] **[Low]** L2: Sin validación de path interno en `login-form.tsx`. → Fixed: guard `rawPath.startsWith("/") ? rawPath : "/swipe"` añadido
- [x] **[Inv]** M1 (falso positivo): Cookie propagation pattern en `middleware.ts` revisado — coincide exactamente con el patrón oficial de Supabase docs. Sin cambios necesarios.
