# Story 10.5: Control de Privacidad — Desactivación de Personalización desde Perfil

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

Como comprador de Reinder,
quiero poder desactivar la personalización del contenido desde mi perfil,
para que pueda controlar cómo la plataforma usa mis datos de comportamiento y cumplir con mi derecho GDPR a revocar el consentimiento de personalización.

## Contexto del Epic

**Epic 10 — Personalized Content Layer:** Cada comprador ve la versión del listing más relevante para su perfil implícito. El `buyer_preference_vector` (Story 10.1) alimenta el `listing_fit_score` (Story 10.2), que selecciona la foto de portada personalizada (Story 10.3) y adapta los highlights de descripción (Story 10.4). **Esta story (10.5)** cierra el epic proporcionando el control de privacidad obligatorio por GDPR.

**FR cubierto:** FR-E10-5 — La personalización respeta el consentimiento GDPR capturado en onboarding y puede desactivarse desde Perfil.
**NFRs aplicados:** NFR8 (personalización basada exclusivamente en datos internos — sin cookies cross-site ni datos de terceros), NFR7 (datos de swipe encriptados en reposo).
**Pre-requisitos:** Stories 10.1–10.4 completadas (la infraestructura de personalización debe existir para poder desactivarla).

**Posición en el epic:** Story 10.5 es la **última story** del Epic 10. Es el cierre del epic y el cumplimiento legal GDPR.

**Dependencias directas:**
- Story 10.1 (done): tabla `buyer_preference_vectors`, módulo `packages/shared/src/personalization/`
- Story 10.2: tabla `listing_fit_scores`, lógica de cálculo de afinidad
- Story 10.3: lógica de selección de foto personalizada en el feed
- Story 10.4: lógica de adaptación de highlights de descripción
- Story 11.5 (done): página de perfil web (`apps/web/src/app/(protected)/profile/page.tsx`)
- Story 2.8 (done): `ProfileScreen` mobile (`apps/mobile/src/features/profile/screens/profile-screen.tsx`)

## Acceptance Criteria (BDD)

### AC1 — Campo `personalization_enabled` en `user_profiles`
**Given** la migración de Story 10.5 ejecutada en Supabase
**When** consulto el schema de la tabla `user_profiles`
**Then** existe el campo `personalization_enabled` (BOOLEAN NOT NULL DEFAULT TRUE)
**And** todos los usuarios existentes tienen `personalization_enabled = true` (comportamiento por defecto)
**And** el campo está definido en la tabla `userProfiles` de `packages/shared/src/db/schema.ts`

### AC2 — API endpoint para toggle de personalización
**Given** un `buyer` autenticado
**When** hace `PATCH /api/v1/buyer/personalization` con body `{ enabled: false }`
**Then** actualiza `user_profiles.personalization_enabled = false` para su `id` (auth.uid())
**And** responde `{ data: { personalizationEnabled: false, updatedAt: "<timestamp>" }, error: null }`

**Given** un `buyer` autenticado con personalización desactivada
**When** hace `PATCH /api/v1/buyer/personalization` con body `{ enabled: true }`
**Then** actualiza `user_profiles.personalization_enabled = true` para su `id`
**And** responde `{ data: { personalizationEnabled: true, updatedAt: "<timestamp>" }, error: null }`

**Given** un usuario con rol `agent`, `agency_admin` o `platform_admin`
**When** intenta acceder al endpoint
**Then** responde 403

**Given** un usuario no autenticado
**When** intenta acceder al endpoint
**Then** responde 401

### AC3 — Toggle UI en Profile web
**Given** un comprador autenticado en la página de Perfil web (`/profile`)
**When** la página se renderiza
**Then** existe una sección "Privacidad y Datos" con un toggle switch etiquetado "Personalización de contenido"
**And** debajo del toggle hay un texto explicativo: "Cuando está activa, Reinder adapta las fotos y descripción de cada propiedad a tus preferencias. Tus datos nunca se comparten con terceros."
**And** el toggle refleja el valor actual de `personalization_enabled` del perfil del usuario
**And** la sección tiene testID `privacy-settings-section` y el toggle tiene testID `personalization-toggle`

**Given** el comprador pulsa el toggle para desactivar la personalización
**When** la petición PATCH se completa
**Then** el toggle cambia a estado desactivado con feedback visual
**And** aparece un toast de confirmación: "Personalización desactivada. Verás las propiedades tal como las publica la agencia."
**And** NO se eliminan datos (el preference_vector persiste para posible reactivación)

**Given** el comprador pulsa el toggle para reactivar la personalización
**When** la petición PATCH se completa
**Then** el toggle cambia a estado activado con feedback visual
**And** aparece un toast de confirmación: "Personalización activada. Verás contenido adaptado a tus preferencias."

### AC4 — Toggle UI en Profile mobile
**Given** un comprador autenticado en la `ProfileScreen` mobile
**When** la pantalla se renderiza
**Then** existe una sección "Privacidad" dentro del ScrollView con un toggle switch etiquetado "Personalización de contenido"
**And** debajo del toggle hay un texto explicativo (igual que web)
**And** el toggle refleja el valor actual de `personalization_enabled`
**And** el componente tiene testID `personalization-toggle`

**Given** el comprador pulsa el toggle
**When** la petición a Supabase se completa
**Then** el toggle se actualiza con feedback visual (usando el design system naranja/glass)
**And** aparece un toast glass (patrón UX-DR12)

### AC5 — Efecto en el swipe feed (personalización desactivada)
**Given** un comprador con `personalization_enabled = false`
**When** el swipe feed carga listings
**Then** se usa la foto de portada por defecto de la agencia (no la personalizada de Story 10.3)
**And** se muestra la descripción en orden original (no los highlights adaptados de Story 10.4)
**And** el `listing_fit_score` NO se consulta para este comprador
**And** el rendimiento del feed no se degrada (la verificación es una simple lectura booleana)

**Given** un comprador con `personalization_enabled = true` (default o reactivado)
**When** el swipe feed carga listings
**Then** se aplica la personalización completa (fotos + highlights según preference_vector)

### AC6 — El preference_vector NO se elimina al desactivar
**Given** un comprador que desactiva la personalización
**When** el pg_cron de aggregation se ejecuta (cada 6h)
**Then** el aggregation job OMITE a este comprador (no recalcula su vector)
**And** el vector existente se preserva intacto en `buyer_preference_vectors`
**And** al reactivar la personalización, el vector previo se usa inmediatamente sin esperar recálculo

### AC7 — RLS: el buyer solo modifica su propio `personalization_enabled`
**Given** RLS habilitado en `user_profiles`
**When** un buyer intenta UPDATE de `personalization_enabled` en otro buyer
**Then** la operación falla (RLS deniega — política existente: `id = auth.uid()`)
**And** las RLS policies existentes de `user_profiles` NO se modifican (ya restringen al propio usuario)

### AC8 — Migración SQL
**Given** el archivo de migración `supabase/migrations/YYYYMMDD000001_add_personalization_enabled.sql`
**When** se ejecuta la migración
**Then** añade la columna `personalization_enabled BOOLEAN NOT NULL DEFAULT TRUE` a `user_profiles`
**And** es idempotente (ejecutar 2 veces no genera error — usar `IF NOT EXISTS` guard)
**And** no modifica RLS existentes (las policies de `user_profiles` ya permiten SELECT/UPDATE por el propio buyer)

## Tasks / Subtasks

- [ ] Task 1: Migración SQL + Schema Drizzle (AC: #1, #8)
  - [ ] 1.1 Crear migración `supabase/migrations/YYYYMMDD000001_add_personalization_enabled.sql`
  - [ ] 1.2 Añadir campo `personalizationEnabled` a la tabla `userProfiles` en `packages/shared/src/db/schema.ts`
- [ ] Task 2: API endpoint PATCH (AC: #2)
  - [ ] 2.1 Crear `apps/web/src/app/api/v1/buyer/personalization/route.ts`
  - [ ] 2.2 Auth guard: solo rol `buyer`
  - [ ] 2.3 Validación de input con Zod: `{ enabled: boolean }`
  - [ ] 2.4 Tests de auth, validación y response shape
- [ ] Task 3: Toggle UI en Profile web (AC: #3)
  - [ ] 3.1 Crear componente `PrivacySettings` en `apps/web/src/components/profile/PrivacySettings.tsx`
  - [ ] 3.2 Integrar en `apps/web/src/app/(protected)/profile/page.tsx` — nueva sección "Privacidad y Datos"
  - [ ] 3.3 Lógica de toggle con optimistic UI + rollback on error
  - [ ] 3.4 Toast de confirmación (usar patrón existente de la app)
- [ ] Task 4: Toggle UI en Profile mobile (AC: #4)
  - [ ] 4.1 Crear componente `PersonalizationToggle` en `apps/mobile/src/features/profile/components/personalization-toggle.tsx`
  - [ ] 4.2 Integrar en `ProfileScreen` — nueva sección "Privacidad" usando `GlassPanel`
  - [ ] 4.3 Actualización vía Supabase client directo (`supabase.from('user_profiles').update(...)`)
  - [ ] 4.4 Toast glass de confirmación (patrón UX-DR12)
- [ ] Task 5: Guard en swipe feed (AC: #5)
  - [ ] 5.1 Modificar lógica de feed para verificar `personalization_enabled` antes de aplicar personalización
  - [ ] 5.2 Fallback a contenido original de la agencia cuando desactivado
  - [ ] 5.3 Test: feed con personalización activada vs desactivada
- [ ] Task 6: Guard en aggregation job (AC: #6)
  - [ ] 6.1 Modificar `compute_buyer_preference_vectors()` para excluir buyers con `personalization_enabled = false`
  - [ ] 6.2 Test: vector preservado tras desactivación, reusado tras reactivación
- [ ] Task 7: Tests de integración (AC: #7)
  - [ ] 7.1 Test RLS: buyer solo modifica su propio campo
  - [ ] 7.2 Test end-to-end: toggle → API → verificación en DB → efecto en feed

## Dev Notes

### Archivos que esta story CREA (no existen aún)

```
supabase/migrations/
└── YYYYMMDD000001_add_personalization_enabled.sql  # Migración

apps/web/src/app/api/v1/buyer/personalization/
└── route.ts                                        # API endpoint PATCH
└── route.test.ts                                   # Tests del endpoint

apps/web/src/components/profile/
└── PrivacySettings.tsx                             # Sección de privacidad web

apps/mobile/src/features/profile/components/
└── personalization-toggle.tsx                      # Toggle mobile
└── personalization-toggle.test.tsx                  # Tests del toggle
```

### Archivos que esta story MODIFICA

```
packages/shared/src/db/schema.ts                    # Añadir campo personalizationEnabled a userProfiles (L52-75)
apps/web/src/app/(protected)/profile/page.tsx        # Integrar sección PrivacySettings (L25-312)
apps/mobile/src/features/profile/screens/profile-screen.tsx  # Integrar PersonalizationToggle (L54-358)
```

### Archivos de Stories 10.2–10.4 que esta story necesita MODIFICAR (guards de personalización)

> **NOTA CRÍTICA:** Las stories 10.2–10.4 están en estado `backlog` y probablemente no estarán completadas cuando esta story se desarrolle. El dev agent DEBE:
> 1. Verificar si los archivos de 10.2–10.4 existen (feed personalizado, foto personalizada, highlights)
> 2. Si NO existen: documentar los puntos de integración donde irán los guards, pero NO crear stubs
> 3. Si SÍ existen: añadir el guard `if (!personalizationEnabled)` en los puntos de integración relevantes

### Patrón de API route a seguir

**Reusar el patrón de `apps/web/src/app/api/v1/admin/preference-vectors/compute/route.ts` (Story 10.1):**
- Auth: `createServerClient()` → verificar sesión → verificar rol
- Respuesta: `ApiResponse<T>` de `@reinder/shared`
- Error handling: `{ data: null, error: { code: string, message: string } }`
- **DIFERENCIA:** Este endpoint es accesible por `buyer` (no solo `platform_admin`)

### Schema actual de `user_profiles` (referencia para ubicar el nuevo campo)

El campo `personalizationEnabled` debe añadirse DESPUÉS de `searchPreferences` y ANTES de `createdAt`:

```typescript
// En packages/shared/src/db/schema.ts, dentro de userProfiles:
searchPreferences: jsonb("search_preferences").$type<{...}>(),
personalizationEnabled: boolean("personalization_enabled").notNull().default(true),  // ← AÑADIR AQUÍ
createdAt: timestamp("created_at", ...),
```

### Migración SQL — formato requerido

```sql
-- Usar IF NOT EXISTS para idempotencia
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'personalization_enabled'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN personalization_enabled BOOLEAN NOT NULL DEFAULT TRUE;
  END IF;
END $$;
```

**NO crear nuevas RLS policies.** Las políticas existentes de `user_profiles` ya cubren:
- SELECT: buyer puede leer su propio perfil
- UPDATE: buyer puede actualizar su propio perfil
- El campo se beneficia automáticamente de estas policies

### Convenciones de código del proyecto

- **ORM:** Drizzle ORM 0.45.x — camelCase en TypeScript, snake_case en DB
- **API response shape:** `{ data: T | null, error: { code: string, message: string } | null }` (patrón `ApiResponse<T>` de `packages/shared/src/types/api.ts`)
- **Auth guard pattern:** Verificar role en route handler con `createServerClient()` de `@supabase/ssr`
- **Test framework:** Vitest para unit tests en `packages/shared`, testing-library para componentes
- **Import alias:** `@reinder/shared` para imports desde packages/shared, `@/` para imports relativos en web
- **Design tokens:** `Colors`, `Typography`, `Spacing`, `Radius` desde `apps/mobile/src/lib/tokens`
- **Toast pattern web:** Usar el sistema de toast existente en la app web (verificar `apps/web/src/components/ui/` o `apps/web/src/hooks/`)
- **Toast pattern mobile:** GlassPanel en borde inferior (UX-DR12)

### Integración con aggregation job de Story 10.1

El pg_cron job `compute_buyer_preference_vectors()` (schedule `15 */6 * * *`) debe filtrar buyers con `personalization_enabled = false`. Modificar la query del job o la función `computePreferenceVector()` para añadir este filtro:

```sql
-- En el job, añadir WHERE clause:
WHERE ... AND up.personalization_enabled = TRUE
```

O en la función TypeScript del API trigger:
```typescript
// Filtrar buyers con personalización desactivada
const eligibleBuyers = activeBuyers.filter(b => b.personalizationEnabled !== false);
```

### Comportamiento al reactivar

Cuando un buyer reactiva la personalización (`enabled: true`):
1. El vector existente se usa INMEDIATAMENTE (no hay delay)
2. El aggregation job lo incluirá en la próxima ejecución (cada 6h) para refrescar el vector
3. No se necesita recálculo manual ni endpoint especial

### GDPR / Privacidad

- Este toggle implementa el derecho GDPR a retirar consentimiento para procesamiento de datos personalizados
- Los datos NO se eliminan al desactivar (GDPR Art. 17 — derecho al olvido — es un flujo separado que implica eliminación de cuenta completa)
- El toggle controla SOLO la aplicación de personalización, NO la recolección de engagement events (que sigue cubierta por el consentimiento general de T&C)
- El texto explicativo del toggle debe comunicar claramente qué se activa/desactiva

### Consideraciones de UX

- **Web:** La sección "Privacidad y Datos" debe seguir el estilo de las secciones existentes en `/profile` (glassmorphism cards, colores del design system)
- **Mobile:** Usar `GlassPanel` level "medium" para la sección de privacidad, igual que el resto de la `ProfileScreen`
- **Toggle switch:** Usar naranja `--accent-primary` (#FF6B00) para estado activo, gris muted para inactivo
- **Optimistic UI:** Cambiar el toggle inmediatamente y revertir si la petición falla

### Cron schedule existente — referencia (NO modificar schedules)

| Job existente | Schedule | 
|--------------|----------|
| CRM sync worker | `*/5 * * * *` |
| Engagement aggregation | `0 * * * *` |
| Experiment results | `30 * * * *` |
| Preference vectors (10.1) | `15 */6 * * *` |
| Experiment recommendations | `0 6 * * 1` |

### Project Structure Notes

- Alineado con la estructura de monorepo: lógica compartida en `packages/shared`, API en `apps/web`, UI mobile en `apps/mobile`
- El campo `personalizationEnabled` se añade a la tabla `user_profiles` existente — no crea tabla nueva
- Los componentes de UI siguen la convención de features existente: `features/profile/components/` en mobile, `components/profile/` en web

### References

- [Source: epics.md#Epic 10, líneas 386-424](file:///Users/santiagocastro/Desktop/Projects%20Antigravity/Reinder/_bmad-output/planning-artifacts/epics.md#L386)
- [Source: prd.md#GDPR, líneas 172-177](file:///Users/santiagocastro/Desktop/Projects%20Antigravity/Reinder/_bmad-output/planning-artifacts/prd.md#L172)
- [Source: architecture.md#Data Boundaries GDPR, líneas 602-606](file:///Users/santiagocastro/Desktop/Projects%20Antigravity/Reinder/_bmad-output/planning-artifacts/architecture.md#L602)
- [Schema: user_profiles table](file:///Users/santiagocastro/Desktop/Projects%20Antigravity/Reinder/packages/shared/src/db/schema.ts#L52-L75)
- [Schema: buyer_preference_vectors table](file:///Users/santiagocastro/Desktop/Projects%20Antigravity/Reinder/packages/shared/src/db/schema.ts#L614-L642)
- [Previous Story: 10-1 (done)](file:///Users/santiagocastro/Desktop/Projects%20Antigravity/Reinder/_bmad-output/implementation-artifacts/10-1-buyer-preference-vector-generacion-persistencia.md)
- [Web Profile page](file:///Users/santiagocastro/Desktop/Projects%20Antigravity/Reinder/apps/web/src/app/(protected)/profile/page.tsx)
- [Mobile ProfileScreen](file:///Users/santiagocastro/Desktop/Projects%20Antigravity/Reinder/apps/mobile/src/features/profile/screens/profile-screen.tsx)
- [Personalization module](file:///Users/santiagocastro/Desktop/Projects%20Antigravity/Reinder/packages/shared/src/personalization/index.ts)
- [Admin API: preference-vectors/compute](file:///Users/santiagocastro/Desktop/Projects%20Antigravity/Reinder/apps/web/src/app/api/v1/admin/preference-vectors/compute/route.ts)

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
