# Story G1: Cold Start Onboarding — Flujo de Bienvenida Post-Registro

Status: ready-for-dev

## Story

Como comprador nuevo,
quiero un flujo de onboarding guiado después de registrarme,
para que pueda configurar mis preferencias de búsqueda y ver mis primeras propiedades de inmediato.

## Acceptance Criteria

1. **Given** un comprador que completa su primer login (registro o primer acceso post-registro) **When** accede al swipe feed en mobile o al home en web **Then** el sistema detecta que `user_profiles.onboarding_completed` es `false` y lanza el flujo de onboarding antes de mostrar contenido

2. **Given** el flujo de onboarding se ha lanzado **When** se muestra el Step 1 **Then** aparece una pantalla de bienvenida con el valor principal del producto: "Encuentra tu casa ideal deslizando" — con branding Reinder (logo, gradiente radial de fondo, tipografía Clash Display) y un CTA "Empezar" que avanza al Step 2

3. **Given** el comprador está en Step 2 del onboarding **When** ve la pantalla de preferencias rápidas **Then** se muestra un formulario compacto con: zonas (chips text input, max 5), precio máximo (pill selector: 200k / 400k / 600k / 800k / 1M / 2M), habitaciones mínimas (pills: 1+ / 2+ / 3+/ 4+), m² mínimos (pills: 40+ / 60+ / 80+ / 100+) — **reutilizando la lógica y el layout de `SearchFiltersModal`** existente (Story 2.9)

4. **Given** el comprador completa Step 2 y guarda sus preferencias **When** pulsa "Ver propiedades" **Then** las preferencias se guardan en `user_profiles.search_preferences` (PATCH /api/v1/buyer/preferences existente), `user_profiles.onboarding_completed` se marca como `true`, y el comprador es redirigido automáticamente al swipe feed (mobile) o al home dashboard (web) con las preferencias ya aplicadas al feed

5. **Given** el flujo de onboarding se ha completado una vez **When** el comprador vuelve a abrir la app o acceder al home **Then** el onboarding NO se muestra de nuevo — controlado por `user_profiles.onboarding_completed === true` persistido en base de datos (no solo en AsyncStorage local)

6. **Given** el comprador está en cualquier step del onboarding **When** pulsa "Saltar" (visible como botón Ghost en todos los steps) **Then** se marca `onboarding_completed = true` en DB, se cierra el onboarding y se muestra el feed/home sin preferencias configuradas (todas las propiedades activas)

7. **Given** la plataforma es mobile (Expo/React Native) **When** se lanza el onboarding **Then** se muestra como una serie de pantallas full-screen con transición de swipe horizontal (Animated.View o Reanimated) — bloqueando acceso al feed hasta completar o saltar

8. **Given** la plataforma es web (Next.js) **When** un comprador con `onboarding_completed = false` accede a `/home` **Then** se muestra un modal overlay (`OnboardingModal`) centrado sobre el dashboard con backdrop oscuro — el contenido del home es visible pero no interactivo hasta que se complete o salte el onboarding

## Tasks / Subtasks

- [ ] **Task 1 — Schema: añadir `onboarding_completed` a `user_profiles`** (AC: 1, 5)
  - [ ] Crear migración SQL: `ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;`
  - [ ] Actualizar Drizzle schema en `packages/shared/src/db/schema.ts`: añadir `onboardingCompleted: boolean("onboarding_completed").notNull().default(false)`
  - [ ] Aplicar migración en local

- [ ] **Task 2 — API: endpoint PATCH /api/v1/buyer/onboarding-complete** (AC: 4, 6)
  - [ ] Crear `apps/web/src/app/api/v1/buyer/onboarding-complete/route.ts`
  - [ ] Marca `user_profiles.onboarding_completed = true` para el `buyer_id` del JWT
  - [ ] Response: `{ data: { onboardingCompleted: true }, error: null }`
  - [ ] Alternativa: reutilizar PATCH `/api/v1/buyer/preferences` existente, extendiendo el body para aceptar `{ onboardingCompleted?: boolean }` — evaluar cuál es más limpio

- [ ] **Task 3 — API: exponer `onboarding_completed` en GET /api/v1/buyer/profile** (AC: 1)
  - [ ] Verificar que el endpoint de perfil del comprador ya devuelve `onboardingCompleted` (puede que ya lo devuelva si retorna todo el `user_profiles` row)
  - [ ] Si no lo incluye, añadir `onboardingCompleted` al select del endpoint
  - [ ] Mobile API client: asegurar que `fetchProfile` incluye `onboardingCompleted` en el tipo de retorno

- [ ] **Task 4 — Mobile: componente `OnboardingWelcomeStep`** (AC: 2)
  - [ ] Crear `apps/mobile/src/features/onboarding/components/onboarding-welcome-step.tsx`
  - [ ] Pantalla full-screen con `ScreenBackground` (gradiente radial)
  - [ ] Logo Reinder en la parte superior
  - [ ] Headline: "Encuentra tu casa ideal deslizando" (tipografía Clash Display `sizeH1`)
  - [ ] Subtítulo: "Reinder analiza tus gustos para mostrarte solo lo que importa"
  - [ ] Ilustración o emoji hero: 🏠✨ (o imagen generada)
  - [ ] CTA primario: "Empezar" (`Button variant="primary"`)
  - [ ] CTA secundario: "Saltar" (`Button variant="ghost"`)
  - [ ] Tests: render, tap Empezar navega al step 2, tap Saltar cierra onboarding

- [ ] **Task 5 — Mobile: componente `OnboardingPreferencesStep`** (AC: 3, 4)
  - [ ] Crear `apps/mobile/src/features/onboarding/components/onboarding-preferences-step.tsx`
  - [ ] Reutilizar la lógica de campos de `SearchFiltersModal` (zonas chips, precio pills, habitaciones pills, m² pills) — extraer a un componente compartido `SearchPreferencesForm` si hay código duplicado significativo
  - [ ] Header: "¿Qué estás buscando?"
  - [ ] Subtítulo: "Personalizamos tu feed para que solo veas lo que te interesa"
  - [ ] CTA primario: "Ver propiedades" (llama a save preferences + marca onboarding done)
  - [ ] CTA secundario: "Saltar" (marca onboarding done sin guardar preferencias)
  - [ ] `GlassPanel` level `medium` para el contenedor de campos
  - [ ] Tests: render campos, interacción, submit, skip

- [ ] **Task 6 — Mobile: pantalla contenedora `OnboardingScreen`** (AC: 7)
  - [ ] Crear `apps/mobile/src/features/onboarding/screens/onboarding-screen.tsx`
  - [ ] Controla el step actual (0: welcome, 1: preferences) con state local
  - [ ] Transición horizontal animada entre steps (Reanimated `SlideInRight` / `SlideOutLeft`)
  - [ ] Indicador de progreso: 2 dots en la parte inferior
  - [ ] Se renderiza como `Modal visible={!onboardingCompleted}` en `SwipeScreen` o en el layout de tabs
  - [ ] Tests: navegación entre steps, callback de finalización

- [ ] **Task 7 — Mobile: integrar onboarding en el flujo de navegación** (AC: 1, 5, 7)
  - [ ] En `SwipeScreen` (o el layout de tabs principal): al montar, comprobar `onboardingCompleted` desde el perfil del usuario (fetch o cache)
  - [ ] Si `false`: mostrar `OnboardingScreen` como modal bloqueante
  - [ ] Si `true`: flujo normal (load feed con preferencias del `useSearchStore`)
  - [ ] Considerar: ¿el flag de onboarding del `useSearchStore.hasCompletedOnboarding` (local) se sincroniza con el nuevo flag de DB? Recomendación: el flag de DB es la fuente de verdad, pero el local sirve como fast-check para evitar fetch innecesarios
  - [ ] Tests: onboarding aparece solo la primera vez

- [ ] **Task 8 — Web: componente `OnboardingModal`** (AC: 8)
  - [ ] Crear `apps/web/src/components/onboarding/OnboardingModal.tsx` (client component con `"use client"`)
  - [ ] Modal overlay con backdrop `rgba(0,0,0,0.6)` + blur
  - [ ] Contenedor `card` centrado (max-width 520px)
  - [ ] Step 1 (welcome): headline + subtitle + CTA "Empezar"
  - [ ] Step 2 (preferencias): campos de filtros (zonas, precio, habitaciones, m²) — versión web de los mismos campos
  - [ ] Botones: "Ver propiedades" (primario) y "Saltar" (ghost)
  - [ ] Al completar: llama a PATCH onboarding-complete + preferences, luego cierra el modal
  - [ ] Animación de entrada: `animate-fade-in` existente
  - [ ] Tests: render, navegación de steps, submit, skip

- [ ] **Task 9 — Web: integrar OnboardingModal en `/home` page** (AC: 8)
  - [ ] En `BuyerHomePage` (`apps/web/src/app/(protected)/home/page.tsx`): pasar `onboardingCompleted` del profile como prop
  - [ ] Renderizar `<OnboardingModal show={!onboardingCompleted} />` condicionalmente
  - [ ] El modal debe poder mutar estado local para cerrarse sin esperar re-render de la página server-side
  - [ ] Tests: modal aparece cuando `onboardingCompleted = false`, no aparece si `true`

- [ ] **Task 10 — Verificación typecheck y tests** (AC: todos)
  - [ ] `pnpm --filter @reinder/shared typecheck` → 0 errores
  - [ ] `pnpm --filter @reinder/mobile typecheck` → 0 errores
  - [ ] `pnpm --filter @reinder/mobile test` → todos los tests pasan
  - [ ] `pnpm --filter @reinder/web typecheck` → 0 errores
  - [ ] `pnpm --filter @reinder/web test` → todos los tests pasan

## Dev Notes

### 🗂️ Nueva Feature Folder

```
apps/mobile/src/features/onboarding/
  components/
    onboarding-welcome-step.tsx          ← Step 1: bienvenida
    onboarding-welcome-step.test.tsx
    onboarding-preferences-step.tsx      ← Step 2: preferencias rápidas
    onboarding-preferences-step.test.tsx
  screens/
    onboarding-screen.tsx                ← Contenedor con step navigation
    onboarding-screen.test.tsx

apps/web/src/components/onboarding/
    OnboardingModal.tsx                  ← Modal overlay para web
    OnboardingModal.test.tsx
```

---

### 📦 Archivos a crear/modificar

```
CREAR:
  packages/shared/src/db/migrations/XXXX_add_onboarding_completed.sql
  apps/mobile/src/features/onboarding/components/onboarding-welcome-step.tsx
  apps/mobile/src/features/onboarding/components/onboarding-welcome-step.test.tsx
  apps/mobile/src/features/onboarding/components/onboarding-preferences-step.tsx
  apps/mobile/src/features/onboarding/components/onboarding-preferences-step.test.tsx
  apps/mobile/src/features/onboarding/screens/onboarding-screen.tsx
  apps/mobile/src/features/onboarding/screens/onboarding-screen.test.tsx
  apps/web/src/components/onboarding/OnboardingModal.tsx
  apps/web/src/components/onboarding/OnboardingModal.test.tsx
  apps/web/src/app/api/v1/buyer/onboarding-complete/route.ts

MODIFICAR:
  packages/shared/src/db/schema.ts                           ← añadir onboardingCompleted
  apps/mobile/src/features/swipe/screens/swipe-screen.tsx     ← integrar check onboarding DB
  apps/web/src/app/(protected)/home/page.tsx                  ← renderizar OnboardingModal
```

---

### 🗄️ Schema de Supabase

```sql
-- Migration: add onboarding_completed to user_profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN user_profiles.onboarding_completed IS
  'True when the buyer has completed or skipped the cold-start onboarding flow';
```

Drizzle schema change:
```typescript
// En packages/shared/src/db/schema.ts — dentro de userProfiles table
onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
```

---

### 🔄 Relación con `useSearchStore.hasCompletedOnboarding`

El `hasCompletedOnboarding` existente en `useSearchStore` (AsyncStorage local, Story 2.9) controla si el **modal de filtros de búsqueda** se muestra en el swipe feed. El nuevo `user_profiles.onboarding_completed` (DB) controla si el **onboarding completo de cold start** se muestra.

Son flags **independientes** que operan a niveles distintos:
- `onboardingCompleted` (DB): ¿El usuario ha visto la bienvenida + ha tenido la oportunidad de configurar preferencias? → Solo una vez en la vida del usuario
- `hasCompletedOnboarding` (local): ¿El modal de filtros del swipe se ha completado? → Ya debería estar `true` si el usuario pasó por G1

**Sincronización:** Cuando el Step 2 del onboarding guarda preferencias, también debe llamar `useSearchStore.markOnboardingDone()` para evitar que el modal de búsqueda (Story 2.9) vuelva a aparecer duplicado.

---

### 🎨 UX del Onboarding

**Principio de diseño:** El onboarding debe sentirse como una experiencia premium, no un formulario. Inspiración: Duolingo primer-uso + Tinder first-match.

**Step 1 — Welcome (mobile):**
- Pantalla full-screen con `ScreenBackground` (gradiente radial `--bg-gradient-start` → `--bg-gradient-end`)
- Hero con emoji grande (🏠✨) o lottie animation si disponible
- Headline: `"Encuentra tu casa ideal deslizando"` (Clash Display, `sizeH1`)
- Subtítulo en Space Grotesk, `textMuted`
- Botón primario naranja (`accentPrimary`) pulsante con `--ease-spring`
- Botón ghost "Saltar" discreto pero accesible

**Step 2 — Preferencias (mobile):**
- Reutilizar exactamente los componentes de UI de `SearchFiltersModal`: zones input + chips, price pills, rooms pills, sqm pills
- Wrappearlos en un `GlassPanel level="medium"` con `ScrollView` por si el contenido excede la pantalla
- Header: "¿Qué estás buscando?"
- Botón primario: "Ver propiedades" → no "Guardar" — orientado a la acción inmediata

**Web OnboardingModal:**
- Modal centrado, max-width 520px, con `border-radius: var(--radius-card)` y `backdrop-filter: blur(12px)`
- Misma secuencia de 2 steps pero en layout vertical dentro del modal
- Transición entre steps: `animate-fade-in` CSS existente

---

### 🔗 API Reutilizada

- **PATCH /api/v1/buyer/preferences** (Story 2.9): ya existe y persiste `search_preferences` → reutilizar para guardar preferencias del Step 2
- **GET /api/v1/buyer/profile** o equivalente: necesita devolver `onboardingCompleted` para que el check inicial funcione
- **NUEVO: PATCH /api/v1/buyer/onboarding-complete**: marca `onboarding_completed = true` — separado del de preferences para mantener responsabilidades claras

---

### 🔗 Dependencias Cruzadas

- **Story 2.9 (done):** `SearchFiltersModal` + `useSearchStore` — reutilizar campos UI y store de preferencias
- **Story 2.2/2.3 (done):** Feed de swipe — el onboarding aplica filtros al feed existente
- **Gap G3:** El onboarding NO incluye el vínculo con agente (eso es G3) — son complementarios pero independientes
- **Story 3.1/3.2 (done):** Referral link — un buyer que llegó por referral link ya tiene agente; el onboarding sigue siendo necesario para configurar preferencias

---

### ⚠️ Consideraciones de Edge Cases

1. **Usuario que ya tiene preferencias pero `onboarding_completed = false`:** Puede pasar si se creó la cuenta antes de G1 y ya usó `SearchFiltersModal`. Solución: migración que marca `onboarding_completed = true` para usuarios que ya tienen `search_preferences IS NOT NULL`
2. **Multi-dispositivo:** Si el usuario completa onboarding en mobile, la web debe saberlo. El flag en DB garantiza consistencia
3. **Usuario que vuelve antes de completar:** Si cierra la app en Step 1, al reabrir ve Step 1 de nuevo (onboarding_completed sigue false)

---

### Referencias

- [roadmap.md: Gap G1](../../_bmad-output/planning-artifacts/roadmap.md) — Consolidación línea 134
- [Story 2.9: SearchFiltersModal](./2-9-filtros-busqueda-buyer-onboarding.md) — Componentes reutilizables
- [search-filters-modal.tsx](../../apps/mobile/src/features/search/components/search-filters-modal.tsx) — UI de filtros existente
- [use-search-store.ts](../../apps/mobile/src/stores/use-search-store.ts) — Store de preferencias con persist
- [schema.ts](../../packages/shared/src/db/schema.ts) — Schema actual de user_profiles
- [home/page.tsx](../../apps/web/src/app/(protected)/home/page.tsx) — Buyer home web donde se integra el modal
- [swipe-screen.tsx](../../apps/mobile/src/features/swipe/screens/swipe-screen.tsx) — Punto de integración del onboarding mobile
- [prd.md: Cold-start risk](../../_bmad-output/planning-artifacts/prd.md) — Riesgo identificado en PRD
- [tokens.ts](../../apps/mobile/src/lib/tokens.ts) — Design tokens para styling consistente
- [GlassPanel](../../apps/mobile/src/components/ui/glass-panel.tsx) — Componente glassmorphism del design system

## Change Log

- **2026-06-19 (story creation):** Story G1 creada como parte de la fase de Consolidación post-Epic 11. Gap identificado en sesión de party-mode multi-agente (2026-05-22). Status: ready-for-dev.
