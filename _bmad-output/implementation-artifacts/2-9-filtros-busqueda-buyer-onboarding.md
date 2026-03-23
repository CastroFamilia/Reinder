# Story 2.9: Filtros de Búsqueda del Comprador

Status: ready-for-dev

## Story

Como comprador,
quiero configurar mis preferencias de búsqueda al entrar a la app por primera vez (y poder editarlas después),
para que el feed de swipe solo me muestre propiedades relevantes a lo que realmente busco.

## Acceptance Criteria

1. **Given** un comprador que completa el registro o login por primera vez **When** accede al swipe feed **Then** aparece un modal de onboarding "¿Qué estás buscando?" antes de mostrar el feed, con campos: zona(s), precio máximo, habitaciones mínimas y m² mínimos — todos opcionales excepto la zona

2. **And** al guardar las preferencias, se persisten en Supabase como `search_preferences` en `user_profiles` y el comprador accede inmediatamente al feed filtrado

3. **And** el feed `GET /api/v1/listings` pasa los filtros activos como query params (`zone`, `max_price`, `min_rooms`, `min_sqm`) y el servidor filtra los resultados antes de devolverlos — el comprador nunca ve propiedades fuera de sus criterios

4. **And** en la tab de Swipe hay un botón ⚙️ / "Búsqueda" que permite editar los filtros en cualquier momento sin perder el historial de swipes

5. **And** si el comprador no configura filtros en el onboarding (pulsa "Saltar"), el feed muestra todas las propiedades activas disponibles (comportamiento actual)

6. **And** los filtros guardados persisten entre sesiones — al reabrir la app el feed ya aplica los filtros sin re-mostrar el onboarding

7. **And** si se modifica un filtro, el feed se reinicia (cursor a null) y muestra propiedades desde el principio con los nuevos criterios — incluyendo propiedades que fueron descartadas con criterios anteriores

8. **And** la UI del modal de filtros usa `GlassPanel` level medium con el design system existente (tokens, tipografía Clash Display/Space Grotesk)

## Tasks / Subtasks

- [ ] **Task 1 — Añadir `search_preferences` al tipo `UserProfile` en shared** (AC: 2)
  - [ ] En `packages/shared/src/types/index.ts`, añadir:
    ```typescript
    export interface SearchPreferences {
      zones: string[];          // e.g. ['Malasaña', 'Chamberí']
      maxPrice?: number;        // en euros
      minRooms?: number;        // mínimo número de habitaciones
      minSqm?: number;          // mínimo m²
    }
    ```
  - [ ] Añadir `searchPreferences?: SearchPreferences` a `UserProfile`

- [ ] **Task 2 — Migración de Supabase: columna `search_preferences` en `user_profiles`** (AC: 2)
  - [ ] Crear migration SQL: `ALTER TABLE user_profiles ADD COLUMN search_preferences jsonb DEFAULT NULL;`
  - [ ] Añadir al schema de Drizzle en `apps/web/src/lib/db/schema.ts`: columna `searchPreferences` de tipo `jsonb`
  - [ ] Aplicar migración en local y documentar en comentario del schema

- [ ] **Task 3 — API: endpoint para guardar/actualizar preferencias** (AC: 2)
  - [ ] Crear `PATCH /api/v1/buyer/preferences` en `apps/web/src/app/api/v1/buyer/preferences/route.ts`
  - [ ] Body: `{ zone?: string[], maxPrice?: number, minRooms?: number, minSqm?: number }`
  - [ ] Actualiza `user_profiles.search_preferences` para el `buyer_id` extraído del JWT
  - [ ] Response: `{ data: SearchPreferences, error: null }` o error tipado

- [ ] **Task 4 — API: filtrado en `GET /api/v1/listings`** (AC: 3)
  - [ ] Modificar `apps/web/src/app/api/v1/listings/route.ts` para aceptar query params: `zone`, `max_price`, `min_rooms`, `min_sqm`
  - [ ] Aplicar filtros en la query de Drizzle/Supabase antes del cursor
  - [ ] Si no hay params, devolver todos los listings activos (backward compatible)

- [ ] **Task 5 — Cliente API mobile: `saveSearchPreferences` y actualizar `fetchListings`** (AC: 2, 3)
  - [ ] En `apps/mobile/src/lib/api/listings.ts`:
    - [ ] Añadir función `saveSearchPreferences(prefs: SearchPreferences, token: string): Promise<ApiResponse<SearchPreferences>>`
    - [ ] Actualizar `fetchListings` para aceptar `filters?: SearchPreferences` como parámetro y pasarlos como query params
  - [ ] Tests en `listings.test.ts`: verificar que los params se añaden correctamente a la URL

- [ ] **Task 6 — Store: `useSearchStore` para gestión de preferencias** (AC: 2, 4, 6, 7)
  - [ ] Crear `apps/mobile/src/stores/use-search-store.ts` con Zustand + `persist` (AsyncStorage)
  - [ ] Estado:
    ```typescript
    interface SearchStore {
      preferences: SearchPreferences | null;
      hasCompletedOnboarding: boolean;
      setPreferences: (prefs: SearchPreferences, token: string) => Promise<void>;
      clearPreferences: () => void;
      markOnboardingDone: () => void;
    }
    ```
  - [ ] `setPreferences`: llama a `saveSearchPreferences` + persiste localmente + resetea el feed (llama a `useSwipeStore.resetFeed`)
  - [ ] `persist` con AsyncStorage key `'reinder-search-prefs'`
  - [ ] Tests: set preferences, clear, persist entre renders

- [ ] **Task 7 — Añadir `resetFeed` a `useSwipeStore`** (AC: 7)
  - [ ] Añadir acción `resetFeed(): void` en `use-swipe-store.ts` que limpia `prefetchQueue`, `currentCard`, `cursor` y re-llama `fetchNextBatch` con las nuevas preferencias
  - [ ] Tests: verificar que el estado vuelve a su estado inicial tras reset

- [ ] **Task 8 — UI: Modal de onboarding de búsqueda `SearchOnboardingModal`** (AC: 1, 5, 8)
  - [ ] Crear `apps/mobile/src/features/search/components/search-onboarding-modal.tsx`
  - [ ] Campos:
    - `ZoneSelector`: input de texto con chips (permite múltiples zonas, máx 5)
    - `PriceSlider`: slider de precio máximo (0–2M€, step 25k)
    - `RoomsSelector`: botones 1+ / 2+ / 3+ / 4+
    - `SqmSelector`: botones 40+ / 60+ / 80+ / 100+
  - [ ] Botones: "Empezar a swipear" (Primary naranja) y "Saltar" (Ghost)
  - [ ] Usa `GlassPanel` level `heavy`, aparece como modal fullscreen con animación `--ease-spring`
  - [ ] No se puede cerrar con back gesture ni tap fuera (forzar decisión: guardar o saltar)
  - [ ] Tests: render, interacción campos, submit, skip

- [ ] **Task 9 — UI: Botón de filtros en SwipeScreen + modal de edición** (AC: 4)
  - [ ] Añadir icono ⚙️ en header de `swipe-screen.tsx` (esquina superior derecha)
  - [ ] Al pulsarlo: abrir `SearchFiltersModal` (versión compacta del onboarding, mismos campos pero en bottom sheet)
  - [ ] Crear `apps/mobile/src/features/search/components/search-filters-modal.tsx`
  - [ ] Al guardar: llama `useSearchStore.setPreferences` → reset del feed → cierra el sheet
  - [ ] Tests: abrir modal, editar filtro, confirmar reset del feed

- [ ] **Task 10 — Integrar onboarding en el flujo de navegación** (AC: 1, 6)
  - [ ] En `swipe-screen.tsx`: al montar, comprobar `useSearchStore.hasCompletedOnboarding`
  - [ ] Si `false`: mostrar `SearchOnboardingModal` por encima del feed (blocking)
  - [ ] Si `true`: cargar feed directamente con `preferences` del store
  - [ ] Tests: verificar que el modal se muestra solo la primera vez

- [ ] **Task 11 — Verificación typecheck y tests** (AC: todos)
  - [ ] `pnpm --filter @reinder/shared typecheck` → 0 errores
  - [ ] `pnpm --filter @reinder/mobile typecheck` → 0 errores
  - [ ] `pnpm --filter @reinder/mobile test` → todos los tests pasan

## Dev Notes

### 🗂️ Nueva Feature Folder

```
apps/mobile/src/features/search/
  components/
    search-onboarding-modal.tsx     ← modal fullscreen primera vez
    search-onboarding-modal.test.tsx
    search-filters-modal.tsx        ← bottom sheet edición posterior
    search-filters-modal.test.tsx
```

---

### 📦 Archivos a crear/modificar

```
CREAR:
  packages/shared/src/types/search-preferences.ts      ← tipo SearchPreferences
  apps/mobile/src/stores/use-search-store.ts            ← Zustand store con persist
  apps/mobile/src/stores/use-search-store.test.ts
  apps/mobile/src/features/search/components/search-onboarding-modal.tsx
  apps/mobile/src/features/search/components/search-onboarding-modal.test.tsx
  apps/mobile/src/features/search/components/search-filters-modal.tsx
  apps/mobile/src/features/search/components/search-filters-modal.test.tsx
  apps/web/src/app/api/v1/buyer/preferences/route.ts    ← PATCH endpoint

MODIFICAR:
  packages/shared/src/types/index.ts                    ← añadir SearchPreferences + UserProfile.searchPreferences
  apps/mobile/src/lib/api/listings.ts                   ← saveSearchPreferences + filtros en fetchListings
  apps/web/src/app/api/v1/listings/route.ts             ← query params de filtrado
  apps/web/src/lib/db/schema.ts                         ← columna search_preferences
  apps/mobile/src/stores/use-swipe-store.ts             ← añadir resetFeed()
  apps/mobile/src/features/swipe/screens/swipe-screen.tsx ← integrar onboarding check + filtros button
```

---

### 🗄️ Schema de Supabase

```sql
-- Migration: add search_preferences to user_profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS search_preferences jsonb DEFAULT NULL;

COMMENT ON COLUMN user_profiles.search_preferences IS
  'SearchPreferences JSON: { zones: string[], maxPrice?: number, minRooms?: number, minSqm?: number }';
```

---

### 🔗 API: Filtros en GET /api/v1/listings

```typescript
// Query params aceptados:
// ?zone=Malasaña&zone=Chamberí  (array, repeat param)
// ?max_price=400000
// ?min_rooms=2
// ?min_sqm=60

// Drizzle query añadida (encima del cursor):
if (zones?.length) {
  query = query.where(inArray(listings.location, zones));
}
if (maxPrice) {
  query = query.where(lte(listings.price, maxPrice));
}
if (minRooms) {
  query = query.where(gte(listings.rooms, minRooms));
}
if (minSqm) {
  query = query.where(gte(listings.squareMeters, minSqm));
}
```

---

### 🎨 UX del Onboarding Modal

El modal NO debe sentirse como un formulario burocrático. Inspiración: **Tinder onboarding** — selección visual rápida, no inputs de texto donde sea posible.

- **Zonas:** input de texto + "chips" removibles — es el único campo de texto libre porque la lista de zonas es abierta (ciudad libre)
- **Precio:** slider visual con valor activo `€XXXk`
- **Habitaciones / m²:** botones grandes tipo pill, selección única con highlight naranja
- El botón "Saltar" debe ser visible pero secundario (Ghost, gris) — queremos que la mayoría configure filtros

**Textos UI:**
- Header: `"¿Qué estás buscando?"`
- Subtitle: `"Personalizamos tu feed para que swipees solo lo que importa"`
- CTA primario: `"Empezar a swipear"` (habilitado aunque solo haya 1 zona)
- CTA secundario: `"Ver todo el catálogo"` (equivalente a Saltar)

---

### 🔄 Flujo de Reset del Feed

```
useSearchStore.setPreferences(newPrefs)
  → PATCH /api/v1/buyer/preferences (persiste en DB)
  → useSwipeStore.resetFeed()         (limpia queue + cursor)
    → fetchListings(token, { filters: newPrefs }) (fetch fresco con filtros)
```

> **Importante:** El reset del feed NO limpia `swipe_events`. Las propiedades previamente descartadas con filtros anteriores sí reaparecen si los nuevos filtros las incluyen. Esto es correcto — los filtros cambian el dominio de búsqueda, no la historia de swipes.

---

### 🏷️ Convenciones de Naming

| Elemento | Convención | Ejemplo |
|---|---|---
| Store | `use-search-store.ts` | `useSearchStore` |
| Preferencias | camelCase | `maxPrice`, `minRooms` |
| API params | snake_case | `max_price`, `min_rooms` |
| Columna DB | snake_case | `search_preferences` |

---

### 🔗 Dependencias Cruzadas

- **Story 2.2 / 2.3 / 2.4 (done):** `fetchListings` ya existe — esta story la extiende con params de filtrado, backward compatible
- **Story 2.7 (backlog):** Historial de matches no es afectado por filtros — los matches se muestran todos independientemente
- **Story 2.8 (backlog):** El TabBar ya tendrá tab de Swipe donde vivirá el botón ⚙️ de filtros
- **Epic 3 (backlog):** El agente representante futuro puede ver las `search_preferences` del comprador para curar propiedades manualmente

---

### Referencias

- [epics.md: Story 2.2 — Feed de propiedades] `_bmad-output/planning-artifacts/epics.md`
- [architecture.md: GET /api/v1/listings] `_bmad-output/planning-artifacts/architecture.md`
- [architecture.md: useSwipeStore] `_bmad-output/planning-artifacts/architecture.md#Communication-Patterns`
- [listings.ts (API client)] `apps/mobile/src/lib/api/listings.ts`
- [use-swipe-store.ts] `apps/mobile/src/stores/use-swipe-store.ts`
- [swipe-screen.tsx] `apps/mobile/src/features/swipe/screens/swipe-screen.tsx`
- [tokens.ts] `apps/mobile/src/lib/tokens.ts`
- [GlassPanel] `apps/mobile/src/features/swipe/components/glass-panel.tsx`

## Dev Agent Record

### Agent Model Used

Gemini — Antigravity (2026-03-23)

### Completion Notes List

_Pendiente de implementación_

### File List

_Pendiente de implementación_

## Change Log

- **2026-03-23 (story creation):** Story 2.9 recreada desde contexto de conversación perdida. Status: ready-for-dev.
