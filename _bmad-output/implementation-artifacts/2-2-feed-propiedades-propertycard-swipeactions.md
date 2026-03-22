# Story 2.2: Feed de Propiedades — PropertyCard y SwipeActions

Status: done

## Story

Como comprador,
quiero ver propiedades en formato de tarjeta full-screen glassmorphism con botones de acción accesibles,
para que pueda visualizar claramente cada propiedad y tomar mi decisión.

## Acceptance Criteria

1. **Given** un comprador autenticado en la tab de Swipe **When** la pantalla carga **Then** ve la primera tarjeta de propiedad en pantalla completa con hero image, precio en Clash Display 32px/700, nombre, metadatos (habitaciones, m², ubicación) y badges de estado superpuestos

2. **And** la tarjeta tiene glassmorphism (`backdrop-filter: blur(20px)`) sobre el gradiente de fondo. En React Native esto se implementa con `expo-blur`'s `BlurView` (intensity 50 = medium) — equivalente al componente `GlassPanel` ya existente

3. **And** la imagen tiene alt text descriptivo (accesibilidad): `accessibilityLabel={listing.title + ' en ' + listing.location}`

4. **And** mientras carga, se muestra skeleton loading glassmorphism pulsante con naranja sutil en bordes

5. **And** los botones `SwipeActions` (✗ reject / ⓘ info / ♥ match) son visibles con el botón match con glow naranja (`shadowColor: Colors.accentPrimary`)

6. **And** los botones tienen labels ARIA "No me interesa" / "Ver detalle" / "Me interesa" y soportan navegación por teclado (UX-DR3)

7. **And** el feed pre-carga las próximas 10 tarjetas buffer para garantizar ≤1s de carga en 4G (NFR1), implementado vía `useSwipeStore` con un array `prefetchQueue`

## Tasks / Subtasks

- [x] **Task 1 — Instalar dependencias de swipe** (AC: 7, futuras stories 2.3/2.4)
  - [x] Instalar `react-native-reanimated` (ya puede estar en package.json de Story 2.1 — verificar)
  - [x] Instalar `react-native-gesture-handler` (necesario para Stories 2.3/2.4, instalar aquí para configurar)
  - [x] Instalar `zustand` en `apps/mobile` (gestor de estado para `useSwipeStore`)
  - [x] Configurar `GestureHandlerRootView` en `App.tsx` como wrapper obligatorio (documentado en arch.md)
  - [x] Añadir plugin Reanimated en `babel.config.js` si no está ya: `'react-native-reanimated/plugin'`

- [x] **Task 2 — Crear tipos de dominio de Listing** (AC: 1, 4)
  - [x] Verificar si `packages/shared/src/types/listing.ts` ya existe (ver Story 1.2 notas)
  - [x] Si NO existe, crear `packages/shared/src/types/listing.ts` con la interfaz `Listing`
  - [x] Exportar `Listing` desde `packages/shared/src/index.ts`
  - [x] En móvil, importar siempre desde `@reinder/shared` — NUNCA duplicar el tipo en mobile

- [x] **Task 3 — Crear `useSwipeStore` con prefetch buffer** (AC: 7)
  - [x] Crear `apps/mobile/src/stores/use-swipe-store.ts` (Zustand)
  - [x] Estado: `{ currentCard, prefetchQueue, isLoading, isFetching, error, cursor }`
  - [x] Acción `loadFeed()`: llama a `GET /api/v1/listings` con auth header, fallback a MOCK_LISTINGS
  - [x] Acción `advanceCard()`: mueve `currentCard` al siguiente de `prefetchQueue`, si quedan ≤5 en buffer → trigglea `loadMore()`
  - [x] Acción `loadMore()`: fetch adicional de listings para rellenar buffer (no bloquea UI)
  - [x] Test unitario: `apps/mobile/src/stores/use-swipe-store.test.ts` — verifica que `advanceCard` popula correctamente

- [x] **Task 4 — Crear cliente API para listings** (AC: 7)
  - [x] Crear `apps/mobile/src/lib/api/listings.ts`
  - [x] Función `fetchListings(token, cursor?)` con error handling y fallback
  - [x] Implementar endpoint stub en `apps/web/src/app/api/v1/listings/route.ts` con datos mock

- [x] **Task 5 — Crear componente `PropertyCardSkeleton`** (AC: 4)
  - [x] Crear `apps/mobile/src/features/swipe/components/property-card-skeleton.tsx`
  - [x] Full-screen card con `GlassPanel`, borde naranja pulsante (`Animated.loop`)
  - [x] Placeholders shimmer para: imagen, precio, nombre, metadatos
  - [x] Test: `property-card-skeleton.test.tsx` — render básico sin crash

- [x] **Task 6 — Crear componente `PropertyCard`** (AC: 1, 2, 3, 4)
  - [x] Crear `apps/mobile/src/features/swipe/components/property-card.tsx`
  - [x] Props: `{ listing: Listing; style?: ViewStyle; testID?: string }`
  - [x] Layout full-screen: hero image + overlay glass en el tercio inferior
  - [x] Hero image con `accessibilityLabel` descriptivo
  - [x] Precio con `Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })`
  - [x] Badge con `PropertyBadge`, estado sold fuerza badge VENDIDA
  - [x] Test: `property-card.test.tsx` — render con listing mock de cada estado

- [x] **Task 7 — Crear componente `SwipeActions`** (AC: 5, 6)
  - [x] Crear `apps/mobile/src/features/swipe/components/swipe-actions.tsx`
  - [x] 3 botones: reject (54px, destructive), info (46px, secondary), match (54px, primary + glow)
  - [x] Glow naranja en match: `shadowColor`, `shadowOpacity: 0.6`, `shadowRadius: 12`
  - [x] ARIA labels y `accessibilityRole="button"` en los 3 botones
  - [x] Test: `swipe-actions.test.tsx` — callbacks, labels ARIA, estado disabled

- [x] **Task 8 — Crear pantalla `SwipeScreen`** (AC: 1–7)
  - [x] Crear `apps/mobile/src/features/swipe/screens/swipe-screen.tsx`
  - [x] Integra: `useSwipeStore`, `PropertyCard`, `PropertyCardSkeleton`, `SwipeActions`
  - [x] Estados: isLoading → skeleton, currentCard → card+actions, vacío → empty state
  - [x] Handlers stubs para onReject/onInfo/onMatch (lógica de swipe en Stories 2.3/2.4/2.5)
  - [x] `useEffect` llama a `loadFeed()` con el token de sesión

- [x] **Task 9 — Conectar `SwipeScreen` en `App.tsx`** (AC: 1)
  - [x] Reemplazar `ProtectedContent` con `SwipeScreen` en `App.tsx`
  - [x] App envuelta con `GestureHandlerRootView`

- [x] **Task 10 — Verificación typecheck y tests** (AC: todos)
  - [x] `pnpm --filter @reinder/mobile typecheck` → 0 errores
  - [x] `pnpm --filter @reinder/mobile test` → 49 tests pasan, 7 suites

## Dev Notes

### 🔴 Estado Actual del Monorepo (Post-Story 2.1)

**Estructura de archivos existentes a NO romper:**
```
apps/mobile/
├── App.tsx                    [MODIFICAR] — reemplazar ProtectedContent con SwipeScreen
├── babel.config.js            [MODIFICAR] — añadir 'react-native-reanimated/plugin' si no está
├── metro.config.js            ← NO tocar
├── global.css                 ← NO tocar
├── tailwind.config.ts         ← NO tocar
├── nativewind-env.d.ts        ← NO tocar
└── src/
    ├── lib/
    │   ├── supabase.ts        ← NO tocar
    │   └── tokens.ts          ← NO tocar (usar tal cual)
    ├── hooks/
    │   └── useAuthSession.ts  ← NO tocar
    └── components/
        ├── ui/
        │   ├── glass-panel.tsx     ← USAR — ya implementado y testeado
        │   ├── property-badge.tsx  ← USAR — ya implementado y testeado
        │   └── button.tsx          ← USAR — ya implementado y testeado
        └── layout/
            └── screen-background.tsx ← USAR
```

**Nuevos archivos a crear en esta story:**
```
apps/mobile/
└── src/
    ├── stores/
    │   ├── use-swipe-store.ts          [NUEVO]
    │   └── use-swipe-store.test.ts     [NUEVO]
    ├── lib/
    │   └── api/
    │       └── listings.ts             [NUEVO]
    └── features/
        └── swipe/
            ├── components/
            │   ├── property-card.tsx           [NUEVO]
            │   ├── property-card.test.tsx       [NUEVO]
            │   ├── property-card-skeleton.tsx   [NUEVO]
            │   ├── property-card-skeleton.test.tsx [NUEVO]
            │   ├── swipe-actions.tsx            [NUEVO]
            │   └── swipe-actions.test.tsx       [NUEVO]
            └── screens/
                └── swipe-screen.tsx            [NUEVO]

packages/shared/src/types/
    └── listing.ts      [NUEVO si no existe ya]
```

### 🏗️ Arquitectura: `features/swipe/` — Patrón Obligatorio

La arquitectura define que todo el código del feed vive en `features/swipe/` dentro de `apps/mobile/src/`. **NO crear componentes de swipe en `components/ui/`** — ese directorio es solo para componentes cross-feature (GlassPanel, Button, PropertyBadge son cross-feature). PropertyCard y SwipeActions son específicos del swipe feature y van en `features/swipe/components/`.

### 📡 API Endpoint `/api/v1/listings`

El endpoint existe en la arquitectura (`apps/web/src/app/api/v1/listings/route.ts`), pero puede no estar implementado aún. Si no existe:

1. Crear un stub que devuelva datos mock en formato `ApiResponse<Listing[]>`:
```ts
// apps/web/src/app/api/v1/listings/route.ts
import { NextResponse } from 'next/server';
import type { Listing } from '@reinder/shared/types/listing';

const MOCK_LISTINGS: Listing[] = [
  {
    id: '1',
    title: 'Ático con terraza en Malasaña',
    price: 485000,
    location: 'Malasaña, Madrid',
    rooms: 3,
    squareMeters: 95,
    floor: '5ª',
    imageUrl: 'https://picsum.photos/800/600?random=1',
    imageAlt: 'Ático luminoso en Malasaña con terraza',
    status: 'active',
    badge: 'EXCLUSIVA',
    agencyId: 'agency-1',
    createdAt: '2026-03-20T10:00:00Z',
  },
  // ... más mocks
];

export async function GET() {
  return NextResponse.json({ data: MOCK_LISTINGS, error: null });
}
```

2. Usar la URL del entorno: `EXPO_PUBLIC_API_URL` o hardcodear `http://localhost:3000` en desarrollo.

> ⚠️ **Importante:** si el endpoint web no está corriendo localmente, el fetch fallará. Implementar un fallback con datos mockeados directamente en `use-swipe-store.ts` para que la UI sea testeable sin backend activo.

### 🗃️ `useSwipeStore` — Diseño del Store (Zustand)

```ts
// apps/mobile/src/stores/use-swipe-store.ts
import { create } from 'zustand';
import type { Listing } from '@reinder/shared';

const MAX_SWIPE_PREFETCH = 10; // Constante de arquitectura

interface SwipeStore {
  currentCard: Listing | null;
  prefetchQueue: Listing[];
  isLoading: boolean;   // ← 'is' prefix obligatorio (arch.md)
  isFetching: boolean;  // ← bg fetch para rellenar buffer

  loadFeed: (token: string) => Promise<void>;
  advanceCard: () => void;
}

export const useSwipeStore = create<SwipeStore>((set, get) => ({
  currentCard: null,
  prefetchQueue: [],
  isLoading: false,
  isFetching: false,

  loadFeed: async (token) => {
    set({ isLoading: true });
    try {
      // const data = await fetchListings(token);
      // set({ currentCard: data[0], prefetchQueue: data.slice(1), isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  advanceCard: () => {
    const { prefetchQueue } = get();
    const [next, ...rest] = prefetchQueue;
    set({ currentCard: next ?? null, prefetchQueue: rest });
    // Rellenar buffer si ≤5 cards
    if (rest.length <= 5) {
      // get().loadMore(); // implementar en stories posteriores
    }
  },
}));
```

**Regla:** siempre usar `isLoading` / `isFetching` — nunca `loading` o `fetching` solas (enforcement arch.md).

### 🃏 `PropertyCard` — Diseño del Componente

La tarjeta es full-screen y usa la misma lógica glassmorphism que `GlassPanel`:

```tsx
// Layout visual:
//
// ┌───────────────────────────────────┐
// │                                   │  ← Hero Image (100% altura)
// │         [hero image]              │
// │                                   │
// ├───────────────────────────────────┤
// │ EXCLUSIVA           [badge]       │  ← GlassPanel overlay
// │                                   │
// │ €485.000                          │  ← Precio: Clash Display 32/700 naranja
// │ Ático en Malasaña                 │  ← Nombre: 20/400 textPrimary
// │ 3 hab · 95 m² · Malasaña         │  ← Metadatos: 13/400 textMuted
// └───────────────────────────────────┘
```

**⚠️ Precio como número:** formatear con `Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(listing.price)` — no hardcodear el símbolo.

### 🔘 `SwipeActions` — Diseño de los Botones

```tsx
// Layout: 3 botones en fila
//
//  ┌────┐     ┌────┐     ┌────┐
//  │ ✗  │     │ ⓘ  │     │ ♥  │
//  │54px│     │46px│     │54px│
//  └────┘     └────┘     └────┘
//  destructive secondary  primary

const matchGlow = {
  shadowColor: Colors.accentPrimary,   // '#FF6B00'
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.6,
  shadowRadius: 12,
  elevation: 8, // Android
};
```

### 🧪 Datos Mock para Tests

```ts
export const mockListing: Listing = {
  id: 'listing-1',
  title: 'Piso en Chamberí',
  price: 350000,
  location: 'Chamberí, Madrid',
  rooms: 2,
  squareMeters: 75,
  imageUrl: 'https://example.com/photo.jpg',
  imageAlt: 'Piso luminoso en Chamberí',
  status: 'active',
  badge: 'NUEVA',
  agencyId: 'agency-1',
  createdAt: '2026-03-20T10:00:00Z',
};
```

### 🏷️ Naming Conventions (Crítico)

Siguiendo architecture.md estrictamente:

| Elemento | Convención | Ejemplo |
|---|---|---| 
| Componentes React | PascalCase | `PropertyCard`, `SwipeActions` |
| Archivos | kebab-case | `property-card.tsx`, `swipe-actions.tsx` |
| Store | camelCase función | `useSwipeStore` |
| Constante global | SCREAMING_SNAKE | `MAX_SWIPE_PREFETCH = 10` |
| Booleanos de estado | `is` prefix | `isLoading`, `isFetching` |

### 🔗 Dependencias Cruzadas de Stories

Esta story sienta las bases para:
- **Story 2.3** — usa `PropertyCard` + `useSwipeStore.advanceCard()` para el match
- **Story 2.4** — usa `SwipeActions` onReject handler
- **Story 2.5** — usa `SwipeActions` onInfo handler → abre `BottomSheet`
- **Story 2.8** — añade `TabBar` wrapping `SwipeScreen`

**Handlers en esta story son stubs vacíos** — no implementar lógica de swipe gesture aquí.

### Learnings de Story 2.1 a Aplicar

1. **jest.config estándar:** Story 2.1 resolvió el issue de babel config para tests. El `babel.config.js` ya tiene la solución correcta: `api.cache.invalidate(() => process.env.NODE_ENV)` + condicional `process.env.NODE_ENV === 'test'`. NO cambiar esto.
2. **BlurView intensity mapping:** ya resuelto — light=20, medium=50, heavy=80 (escala 0-100 perceptual de expo-blur).
3. **SurfaceColors:** para overlays y glass backgrounds usar `SurfaceColors.bgSurfaceAlpha` / `bgSurfaceOverlay` / `accentSoft` desde `tokens.ts` — no declarar nuevos rgba strings.
4. **Typecheck gate:** ejecutar `pnpm --filter @reinder/mobile typecheck` antes de marcar tasks como completadas.
5. **Importación de shared:** design tokens están en `packages/shared/src/design-tokens.json`. Tipos de dominio importar desde `@reinder/shared` — nunca duplicar.
6. **Fuentes custom pendientes:** Clash Display e Inter no están cargadas (se aplazaron en 2.1). En PropertyCard, usar `fontWeight: '700'` sin fontFamily por ahora para el precio — esto es una deuda técnica documentada.

### Referencias

- [epics.md: Story 2.2 AC] `_bmad-output/planning-artifacts/epics.md#Story-2.2`
- [UX-DR2: PropertyCard spec] `_bmad-output/planning-artifacts/ux-design-specification.md#Component-Strategy`
- [UX-DR3: SwipeActions ARIA] `_bmad-output/planning-artifacts/ux-design-specification.md#Component-Strategy`
- [UX-DR10: Swipe loop flow] `_bmad-output/planning-artifacts/ux-design-specification.md#Defining-Core-Experience`
- [UX-DR12: Empty states] `_bmad-output/planning-artifacts/ux-design-specification.md#UX-Consistency-Patterns`
- [Architecture: features/swipe/] `_bmad-output/planning-artifacts/architecture.md#Complete-Project-Directory-Structure`
- [Architecture: useSwipeStore] `_bmad-output/planning-artifacts/architecture.md#Communication-Patterns`
- [Architecture: API /api/v1/listings] `_bmad-output/planning-artifacts/architecture.md#Naming-Patterns`
- [Architecture: MAX_SWIPE_PREFETCH] `_bmad-output/planning-artifacts/architecture.md#Naming-Patterns`
- [Story 2.1 dev notes] `_bmad-output/implementation-artifacts/2-1-componentes-base-glasspanel-propertybadge-design-foundation.md`
- [tokens.ts] `apps/mobile/src/lib/tokens.ts`
- [glass-panel.tsx] `apps/mobile/src/components/ui/glass-panel.tsx`
- [property-badge.tsx] `apps/mobile/src/components/ui/property-badge.tsx`
- [button.tsx] `apps/mobile/src/components/ui/button.tsx`

## Dev Agent Record

### Agent Model Used

Gemini — Antigravity (2026-03-20)

### Debug Log References

- **TS fix:** `property-card-skeleton.tsx` tenía `borderOpacity` como prop de style (no es una propiedad CSS válida). Corregido a `opacity: borderOpacity` en el `Animated.View`.
- **Reanimated plugin posición:** `react-native-reanimated/plugin` debe ir al final del array `plugins` en `babel.config.js`. Comentado correctamente.
- **useSwipeStore fallback:** el store hace fallback automático a `MOCK_LISTINGS` si el fetch al API falla, así la UI funciona sin backend corriendo.

### Completion Notes List

- ✅ Task 1: Instaladas `zustand`, `react-native-reanimated`, `react-native-gesture-handler`. `babel.config.js` actualizado con el plugin de Reanimated. `App.tsx` envuelto con `GestureHandlerRootView`.
- ✅ Task 2: Creado `packages/shared/src/types/listing.ts` con `Listing`, `ListingStatus`, `ListingBadge`, `SwipeAction`. Exportados desde `packages/shared/src/index.ts`.
- ✅ Task 3: `useSwipeStore` creado con Zustand. Estado: `currentCard`, `prefetchQueue`, `isLoading`, `isFetching`, `error`, `cursor`. `advanceCard` mueve el primer item del buffer a `currentCard` y dispara `loadMore` si hay ≤5 items. 11 tests unitarios pasan.
- ✅ Task 4: `apps/mobile/src/lib/api/listings.ts` creado con `fetchListings()` y `MOCK_LISTINGS` de fallback. `apps/web/src/app/api/v1/listings/route.ts` creado como stub GET con datos mock en formato `ApiResponse<Listing[]>`.
- ✅ Task 5: `PropertyCardSkeleton` creado con animación pulsante Animated.loop, GlassPanel, placeholders para imagen/precio/nombre/metadatos. 3 tests pasan.
- ✅ Task 6: `PropertyCard` creado con hero image, overlay GlassPanel, precio formateado con `Intl.NumberFormat('es-ES')`, badge dinámico (VENDIDA forzado si `status === 'sold'`), accessibilityLabel en imagen. 18 tests pasan.
- ✅ Task 7: `SwipeActions` creado con 3 botones Pressable, glow naranja en match (`shadowColor`, `shadowRadius: 12`, `elevation: 8`), ARIA labels "No me interesa"/"Ver detalle"/"Me interesa". 17 tests pasan.
- ✅ Task 8: `SwipeScreen` creado integrando store + componentes. `useEffect` llama `loadFeed()` con el token de sesión. Handlers onMatch/onReject llaman `advanceCard()`, onInfo es stub para Story 2.5.
- ✅ Task 9: `App.tsx` actualizado — `ProtectedContent` reemplazado por `SwipeScreen`, envuelto con `GestureHandlerRootView`.
- ✅ Task 10: `typecheck` → 0 errores. Tests → **49 tests pasan, 7 suites, 0 fallos**.

### Deuda Técnica Documentada

- **Fuentes custom (Clash Display):** el precio usa `fontWeight: '700'` sin `fontFamily`. Las fuentes se cargarán en una story dedicada.
- **onInfo handler:** stub vacío — se implementará en Story 2.5 con el bottom sheet de detalle.
- **Web API auth:** el endpoint stub en `apps/web` no valida JWT. La autenticación real (Supabase RLS) se implementa en Epic 3.

## File List

### Nuevos archivos
- `packages/shared/src/types/listing.ts`
- `apps/mobile/src/lib/api/listings.ts`
- `apps/mobile/src/stores/use-swipe-store.ts`
- `apps/mobile/src/stores/use-swipe-store.test.ts`
- `apps/mobile/src/features/swipe/components/property-card-skeleton.tsx`
- `apps/mobile/src/features/swipe/components/property-card-skeleton.test.tsx`
- `apps/mobile/src/features/swipe/components/property-card.tsx`
- `apps/mobile/src/features/swipe/components/property-card.test.tsx`
- `apps/mobile/src/features/swipe/components/swipe-actions.tsx`
- `apps/mobile/src/features/swipe/components/swipe-actions.test.tsx`
- `apps/mobile/src/features/swipe/screens/swipe-screen.tsx`
- `apps/web/src/app/api/v1/listings/route.ts`

### Archivos modificados
- `packages/shared/src/index.ts` — añadidos exports de Listing types
- `apps/mobile/App.tsx` — GestureHandlerRootView + SwipeScreen
- `apps/mobile/babel.config.js` — react-native-reanimated/plugin
- `apps/mobile/package.json` — zustand, react-native-reanimated, react-native-gesture-handler
- `apps/mobile/tsconfig.json` — añadido `nativewind-env.d.ts` a array `include`

## Change Log

- **2026-03-20 (story creation):** Story 2.2 creada con contexto completo de Story 2.1, architecture.md, ux-design-specification.md y epics.md. Status: ready-for-dev.
- **2026-03-20 (implementation):** Story implementada completamente. 10 tasks completadas. 49 tests pasan. Typecheck limpio. Status: review.
- **2026-03-20 (code-review):** Code review completado. 4 hallazgos resueltos (2 Medium, 2 Low). 49 tests pasan post-fix. Typecheck limpio. Status: done.
