# Story 2.3: Gesto de Swipe con Match y MatchPayoff Animation

Status: ready-for-dev

## Story

Como comprador,
quiero hacer swipe derecho o pulsar el botón de match y ver una animación de celebración,
para que el match se sienta gratificante desde el primer gesto.

## Acceptance Criteria

1. **Given** un comprador con una tarjeta de propiedad activa en pantalla **When** hace swipe derecho o pulsa el botón de match **Then** la tarjeta se anima hacia la derecha con overlay naranja creciente usando Reanimated 3 worklets en el UI thread (≥60fps, NFR2)

2. **And** aparece el overlay `MatchPayoff` con animación naranja expansiva y SFX de "found it", con curva `--ease-spring` (`cubic-bezier(0.34, 1.56, 0.64, 1)`) y `--duration-payoff: 600ms`

3. **And** el overlay se cierra automáticamente tras 1.5s y muestra la siguiente tarjeta (llamando a `advanceCard(token)`)

4. **And** el evento de match se registra via `POST /api/v1/swipe-events` con body `{ action: 'match', listingId: string, buyerId: string }` en formato `ApiResponse<SwipeEvent>` — si no hay conexión, el evento se encola localmente y se sincroniza cuando vuelva la conexión

5. **And** todo el procesamiento de animación ocurre en el UI thread sin pasar por el JS bridge (worklets Reanimated 3 — NFR2: ≥60fps)

6. **And** el gesto de swipe derecho de más de 50px activa el match (threshold configurable con constante `SWIPE_THRESHOLD = 50` en `packages/shared/src/constants/index.ts`)

7. **And** durante la animación de salida de la tarjeta, la siguiente tarjeta en el buffer es visible detrás (efecto stack)

## Tasks / Subtasks

- [ ] **Task 1 — Crear hook `use-swipe-gesture.ts`** (AC: 1, 5, 6, 7)
  - [ ] Crear `apps/mobile/src/features/swipe/hooks/use-swipe-gesture.ts`
  - [ ] Usar `Gesture.Pan()` de `react-native-gesture-handler` con `runOnJS` para callbacks
  - [ ] Valores animados: `translateX`, `translateY`, `rotation`, `cardOpacity`, `overlayOpacity` (todos `useSharedValue`)
  - [ ] `onBegin`: inicializar posición a 0
  - [ ] `onUpdate`: actualizar `translateX`/`translateY`; calcular `rotation` proporcional a `translateX`
  - [ ] `onEnd`: si `translateX > SWIPE_THRESHOLD` → animar salida derecha + llamar `onMatch()`; si `translateX < -SWIPE_THRESHOLD` → animar salida izquierda + llamar `onReject()`; si no → volver a posición inicial con spring
  - [ ] `useAnimatedStyle` para el estilo animado de la tarjeta
  - [ ] Exportar tipos: `SwipeGestureHandlers` con callbacks `onMatch`, `onReject`
  - [ ] Test: `use-swipe-gesture.test.ts` — verificar que se inicializa correctamente

- [ ] **Task 2 — Crear componente `SwipableCard`** (AC: 1, 7)
  - [ ] Crear `apps/mobile/src/features/swipe/components/swipable-card.tsx`
  - [ ] Wrapper que combina `GestureDetector` + `Animated.View` + `PropertyCard`
  - [ ] Props: `{ listing: Listing; onMatch: () => void; onReject: () => void; testID?: string }`
  - [ ] Usa internamente `use-swipe-gesture.ts`
  - [ ] Overlay naranja (`Colors.accentPrimary`) con opacidad proporcional a `translateX` — crece mientras se arrastra
  - [ ] Test: `swipable-card.test.tsx` — render básico sin crash

- [ ] **Task 3 — Crear componente `MatchPayoff`** (AC: 2, 3)
  - [ ] Crear `apps/mobile/src/features/swipe/components/match-payoff.tsx`
  - [ ] Props: `{ visible: boolean; onDismiss: () => void; testID?: string }`
  - [ ] Overlay full-screen sobre la app (posición absolute, zIndex alto)
  - [ ] Animación: `useSharedValue` para escala (0 → 1.2 → 1) y opacidad (0 → 1 → 0) en worklet
  - [ ] Curva: `withSpring` con config `{ damping: 8, stiffness: 120 }` (equivalente al `--ease-spring` UX-DR4)
  - [ ] Duración payoff: 600ms (constante `PAYOFF_DURATION_MS = 600`)
  - [ ] SFX: usar `expo-av` o `expo-audio` para reproducir sonido de "found it" (archivo `match.mp3` en `assets/sounds/`)
  - [ ] Auto-cierre: `setTimeout(onDismiss, 1500)` dentro del `useEffect` cuando `visible === true`
  - [ ] Respetar `prefers-reduced-motion` (accesibilidad): si el dispositivo tiene reducción de movimiento activada, omitir animación de escala
  - [ ] Estados: `appear`, `celebrating`, `dismiss` (UX-DR4)
  - [ ] Test: `match-payoff.test.tsx` — render con visible=true/false, callback onDismiss

- [ ] **Task 4 — Crear stub de endpoint `POST /api/v1/swipe-events`** (AC: 4)
  - [ ] Verificar si `apps/web/src/app/api/v1/swipe-events/route.ts` ya existe
  - [ ] Si NO existe: crear stub que acepta `{ action, listingId, buyerId }` y devuelve `ApiResponse<SwipeEvent>`
  - [ ] Definir tipo `SwipeEvent` en `packages/shared/src/types/` si no existe: `{ id: string; action: 'match' | 'reject'; listingId: string; buyerId: string; createdAt: string }`
  - [ ] Exportar desde `packages/shared/src/index.ts`

- [ ] **Task 5 — Añadir `recordMatchEvent` al `useSwipeStore`** (AC: 4)
  - [ ] Añadir función `recordMatchEvent(listingId: string, token: string): Promise<void>` al store
  - [ ] Llama a `POST /api/v1/swipe-events` con `action: 'match'`
  - [ ] Si falla (offline): guardar en `pendingEvents: SwipeEvent[]` del estado del store para retry posterior
  - [ ] Añadir constante `SWIPE_THRESHOLD = 50` a `packages/shared/src/constants/index.ts`

- [ ] **Task 6 — Actualizar `SwipeScreen` para integrar SwipableCard + MatchPayoff** (AC: 1, 2, 3, 7)
  - [ ] Modificar `apps/mobile/src/features/swipe/screens/swipe-screen.tsx`
  - [ ] Reemplazar `PropertyCard` estática por `SwipableCard`
  - [ ] Añadir estado local `isMatchPayoffVisible: boolean`
  - [ ] `onMatch` callback: llama `recordMatchEvent` → muestra `MatchPayoff`
  - [ ] `MatchPayoff.onDismiss`: llama `advanceCard(token)` + oculta overlay
  - [ ] `onReject` callback: llama `advanceCard(token)` directamente (sin MatchPayoff — ver Story 2.4)
  - [ ] `SwipeActions.onMatch` también dispara el mismo `onMatch` handler (botón como alternativa al gesto)
  - [ ] Mostrar tarjeta siguiente del `prefetchQueue[0]` detrás de la tarjeta activa (efecto stack visual)

- [ ] **Task 7 — Tests de integración en `SwipeScreen`** (AC: todos)
  - [ ] Actualizar/crear `swipe-screen.test.tsx` si no existe
  - [ ] Test: render con currentCard → SwipableCard visible
  - [ ] Test: onMatch callback → isMatchPayoffVisible = true
  - [ ] Test: MatchPayoff.onDismiss → advanceCard llamado

- [ ] **Task 8 — Verificación typecheck y tests** (AC: todos)
  - [ ] `pnpm --filter @reinder/mobile typecheck` → 0 errores
  - [ ] `pnpm --filter @reinder/mobile test` → todos los tests pasan
  - [ ] `pnpm --filter @reinder/web typecheck` → 0 errores (si se modifica la web)

## Dev Notes

### 🔴 Estado Actual del Codebase (Post-Story 2.2)

**Archivos existentes que DEBES usar (NO duplicar ni reescribir):**
```
apps/mobile/
├── App.tsx                    ← GestureHandlerRootView ya envuelta — NO cambiar
├── babel.config.js            ← react-native-reanimated/plugin ya añadido — NO cambiar
└── src/
    ├── lib/
    │   └── tokens.ts          ← Colors.accentPrimary = '#FF6B00' — USAR SIEMPRE
    ├── stores/
    │   └── use-swipe-store.ts ← advanceCard(token), loadFeed(token) — MODIFICAR aquí
    ├── components/ui/
    │   ├── glass-panel.tsx    ← USAR para MatchPayoff overlay
    │   └── button.tsx
    └── features/swipe/
        ├── components/
        │   ├── property-card.tsx           ← USAR dentro de SwipableCard
        │   ├── property-card-skeleton.tsx  ← NO mover
        │   └── swipe-actions.tsx           ← onMatch callback actualizado en Task 6
        └── screens/
            └── swipe-screen.tsx            ← MODIFICAR en Task 6
```

**Librerías ya instaladas (NO reinstalar):**
- `react-native-reanimated` — ya en `package.json` y `babel.config.js`
- `react-native-gesture-handler` — ya instalado; `GestureHandlerRootView` ya en `App.tsx`
- `zustand` — ya en el store

**Librerías nuevas a instalar en Task 3:**
- `expo-av` o `expo-audio` para SFX del match — verificar cuál es la versión correcta para el SDK de Expo del proyecto. Si expo-av no está instalado: `pnpm --filter @reinder/mobile add expo-av`

### 📦 Nuevos archivos a crear

```
apps/mobile/src/
└── features/swipe/
    ├── hooks/
    │   ├── use-swipe-gesture.ts       [NUEVO]
    │   └── use-swipe-gesture.test.ts  [NUEVO]
    └── components/
        ├── swipable-card.tsx          [NUEVO]
        ├── swipable-card.test.tsx     [NUEVO]
        ├── match-payoff.tsx           [NUEVO]
        └── match-payoff.test.tsx      [NUEVO]

packages/shared/src/
└── types/
    └── swipe-event.ts                 [NUEVO si no existe]

apps/web/src/app/api/v1/
└── swipe-events/
    └── route.ts                       [NUEVO stub]

assets/sounds/
└── match.mp3                          [NUEVO — archivo de audio]
```

### 🏗️ Arquitectura: Reanimated 3 Worklets — Patrón Obligatorio

El worklet de swipe DEBE ejecutarse en el UI thread. El patrón correcto es:

```tsx
// apps/mobile/src/features/swipe/hooks/use-swipe-gesture.ts
import { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS } from 'react-native-reanimated';
import { Gesture } from 'react-native-gesture-handler';

const SWIPE_THRESHOLD = 50; // importar de @reinder/shared/constants

export function useSwipeGesture({ onMatch, onReject }: SwipeGestureHandlers) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(0);
  const overlayOpacity = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      // worklet — NO referencia a JS fuera del worklet
    })
    .onUpdate((event) => {
      'worklet';
      translateX.value = event.translationX;
      translateY.value = event.translationY;
      rotation.value = translateX.value / 10; // grados de rotación suave
      // Naranja crece hacia la derecha, rojo hacia la izquierda
      overlayOpacity.value = Math.min(Math.abs(translateX.value) / 150, 0.8);
    })
    .onEnd((event) => {
      'worklet';
      if (event.translationX > SWIPE_THRESHOLD) {
        // Match — animar fuera a la derecha
        translateX.value = withTiming(500, { duration: 300 });
        runOnJS(onMatch)();
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        // Reject — animar fuera a la izquierda
        translateX.value = withTiming(-500, { duration: 300 });
        runOnJS(onReject)();
      } else {
        // Volver al centro con spring
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        rotation.value = withSpring(0);
        overlayOpacity.value = withTiming(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  return { panGesture, animatedStyle, overlayOpacity };
}
```

> ⚠️ **CRÍTICO:** La directiva `'worklet'` es obligatoria en `onUpdate` y `onEnd`. Sin ella, el código corre en el JS thread y rompe el NFR2 (60fps). El plugin Reanimated en `babel.config.js` ya está configurado para transformar estos worklets.

> ⚠️ **`runOnJS`:** cualquier callback de JS (como `onMatch`) que se llame desde un worklet DEBE estar envuelto en `runOnJS()`. De lo contrario, Reanimated lanzará un error en runtime.

### 🎆 MatchPayoff — Diseño del Componente

```tsx
// apps/mobile/src/features/swipe/components/match-payoff.tsx
//
// Visual:
// ┌─────────────────────────────────┐
// │                                 │
// │      ╔═══════════════╗          │
// │      ║   ❤  MATCH!   ║          │  ← GlassPanel medium + border naranja
// │      ╚═══════════════╝          │
// │                                 │
// └─────────────────────────────────┘
// Fondo: rgba(255,107,0,0.15) full-screen expandiendo desde el centro
//
// Animación (worklet, 600ms):
// opacity: 0 → 1 (primeros 150ms)
// scale: 0.3 → 1.2 → 1.0 (withSpring damping:8 stiffness:120)
// Auto-dismiss a los 1500ms: opacity → 0 (300ms), luego onDismiss()

const PAYOFF_DURATION_MS = 600; // UX animation token
const PAYOFF_AUTOHIDE_MS = 1500;

// Los estados son: 'appear' | 'celebrating' | 'dismiss'
// Se gestionan con el hook interno de animación
```

**SFX de "found it":**
```tsx
import { Audio } from 'expo-av';

// En useEffect cuando visible cambia a true:
async function playMatchSound() {
  const { sound } = await Audio.Sound.createAsync(
    require('../../../../../assets/sounds/match.mp3')
  );
  await sound.playAsync();
}
```

> **Nota sobre audio:** si el archivo `match.mp3` no existe aún, el dev debe crear un placeholder o buscar un sonido libre de derechos. El módulo debe ser preparado para el archivo y simplemente no crashear si no está disponible (try/catch alrededor del load).

### 📡 API Endpoint `POST /api/v1/swipe-events`

Stub mínimo para esta story — la persistencia real en Supabase es Epic 3+:

```typescript
// apps/web/src/app/api/v1/swipe-events/route.ts
import { NextResponse } from 'next/server';
import type { ApiResponse } from '@reinder/shared';
import type { SwipeEvent } from '@reinder/shared';

export async function POST(request: Request): Promise<NextResponse<ApiResponse<SwipeEvent>>> {
  const body = await request.json();
  const { action, listingId, buyerId } = body;

  // TODO (Epic 3): insertar en tabla swipe_events/match_events con Supabase + Auth
  const mockEvent: SwipeEvent = {
    id: `evt-${Date.now()}`,
    action,
    listingId,
    buyerId: buyerId ?? 'anon',
    createdAt: new Date().toISOString(),
  };

  return NextResponse.json({ data: mockEvent, error: null });
}
```

### 🗃️ Tipo `SwipeEvent` en `packages/shared`

```typescript
// packages/shared/src/types/swipe-event.ts
export type SwipeAction = 'match' | 'reject';

export interface SwipeEvent {
  id: string;
  action: SwipeAction;
  listingId: string;
  buyerId: string;
  createdAt: string; // ISO 8601
}
```

> **Nota:** `SwipeAction` puede ya existir en `listing.ts` (fue definido en Story 2.2). Verificar antes de crearlo de nuevo. Si existe, reutilizarlo e importarlo.

### 🌐 Constantes a añadir en `packages/shared`

```typescript
// packages/shared/src/constants/index.ts — AÑADIR (no reemplazar):
export const SWIPE_THRESHOLD = 50;      // px mínimos para activar swipe (Story 2.3)
export const PAYOFF_DURATION_MS = 600;  // duración animación MatchPayoff (UX-DR4)
export const PAYOFF_AUTOHIDE_MS = 1500; // tiempo antes de auto-dismiss del MatchPayoff
```

### 🔘 Integración de Botón Match como Alternativa al Gesto

El botón ♥ de `SwipeActions` ya existe y tiene `onMatch` prop. En `SwipeScreen` (Task 6), el handler debe ser el mismo para botón Y gesto:

```tsx
const handleMatch = useCallback(() => {
  const token = session?.access_token ?? '';
  recordMatchEvent(currentCard!.id, token); // fire-and-forget
  setIsMatchPayoffVisible(true);
}, [currentCard, session?.access_token, recordMatchEvent]);

// Pasar a SwipeActions:
<SwipeActions onMatch={handleMatch} onReject={handleReject} onInfo={handleInfo} />

// Pasar a SwipableCard:
<SwipableCard listing={currentCard} onMatch={handleMatch} onReject={handleReject} />
```

### 🃏 Efecto Stack de Tarjetas

Para mostrar la tarjeta siguiente detrás de la activa (AC7), renderizar dos capas:

```tsx
// SwipeScreen — cuando hay currentCard Y prefetchQueue[0]:
<View style={styles.deckContainer}>
  {/* Tarjeta siguiente — fija, detrás, ligeramente más pequeña */}
  {prefetchQueue[0] && (
    <View style={styles.backCard}>
      <PropertyCard listing={prefetchQueue[0]} />
    </View>
  )}
  {/* Tarjeta activa — encima, gesturable */}
  <SwipableCard
    listing={currentCard}
    onMatch={handleMatch}
    onReject={handleReject}
  />
</View>

// Estilos sugeridos:
deckContainer: { flex: 1, position: 'relative' },
backCard: {
  position: 'absolute', inset: 0,
  transform: [{ scale: 0.95 }],
  opacity: 0.7,
},
```

### 🧪 Datos Mock para Tests

Reutilizar el `mockListing` que ya existe en los tests de Story 2.2:
```typescript
// Si se necesita en tests nuevos, importar de un fixture centralizado o definir inline:
const mockListing = {
  id: 'listing-1',
  title: 'Piso en Chamberí',
  price: 350000,
  location: 'Chamberí, Madrid',
  rooms: 2,
  squareMeters: 75,
  imageUrl: 'https://example.com/photo.jpg',
  imageAlt: 'Piso luminoso en Chamberí',
  status: 'active' as const,
  badge: 'NUEVA' as const,
  agencyId: 'agency-1',
  createdAt: '2026-03-20T10:00:00Z',
};
```

> **Nota sobre mocking de Reanimated en tests:** los tests de Jest para componentes con Reanimated requieren mocks. Reanimated provee el mock automáticamente con `@testing-library/react-native` si `'react-native-reanimated'` está en `moduleNameMapper` o como `jest-expo` preset. Verificar que el `jest.config.js` existente (que ya funciona para Story 2.2) soporta Reanimated — si no, añadir:
> ```js
> // En jest.config.js transformIgnorePatterns (si no está ya):
> 'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(-.*)?|react-native-reanimated|react-native-gesture-handler)/)'
> ```

### 🏷️ Naming Conventions (Crítico — de architecture.md)

| Elemento | Convención | Ejemplo |
|---|---|---| 
| Componentes React | PascalCase | `SwipableCard`, `MatchPayoff` |
| Archivos | kebab-case | `swipable-card.tsx`, `match-payoff.tsx` |
| Hook | camelCase con use | `useSwipeGesture` |
| Constantes | SCREAMING_SNAKE | `SWIPE_THRESHOLD`, `PAYOFF_DURATION_MS` |
| Booleanos de estado | `is` prefix | `isMatchPayoffVisible`, `isFetching` |
| Callbacks | `on` + Evento | `onMatch`, `onReject`, `onDismiss` |

### 🔗 Dependencias Cruzadas de Stories

Esta story sienta las bases para:
- **Story 2.4** — usa el mismo `use-swipe-gesture.ts` para el gesto de descarte (swipe izquierdo)
- **Story 2.5** — el `onInfo` handler abre el BottomSheet; `SwipableCard` queda intacto
- **Story 2.6** — el contador de matches (¿cuántos hasta MatchRecap?) se alimenta de los `recordMatchEvent` de esta story

**Handlers que quedan como stub en esta story:**
- `onInfo` → stub vacío en `SwipeActions` (Story 2.5)
- `onReject` gesture → llama `advanceCard(token)` sin animación especial (Story 2.4 añadirá la animación y el overlay rojo)

### Learnings de Story 2.2 a Aplicar

1. **Babel config es frágil:** NO modificar `babel.config.js` — el plugin de Reanimated ya está en la posición correcta (al final del array `plugins`). Modificarlo podría romper todos los tests.
2. **BlurView intensity:** usar `intensity={50}` para el overlay de MatchPayoff (level medium), como ya resuelto en Story 2.1.
3. **SurfaceColors:** para el fondo del overlay usar `SurfaceColors.bgSurfaceAlpha` o `SurfaceColors.accentSoft` desde `tokens.ts` — no hardcodear rgba.
4. **Typecheck gate:** ejecutar `pnpm --filter @reinder/mobile typecheck` antes de marcar tasks como completadas.
5. **Jest config ya funciona:** el `jest.config.js` actual con `babel.config.js` condicional ya soporta tests. No cambiar la configuración general — solo verificar que `react-native-reanimated` está en `transformIgnorePatterns`.
6. **`advanceCard` recibe token:** la firma actual es `advanceCard(token: string)` — respetar esta firma.
7. **Importar de `@reinder/shared`:** nunca duplicar tipos en mobile. `SwipeEvent`, `SwipeAction` y constantes deben definirse en `packages/shared`.

### Referencias

- [epics.md: Story 2.3 AC] `_bmad-output/planning-artifacts/epics.md#Story-2.3`
- [UX-DR4: MatchPayoff spec] `_bmad-output/planning-artifacts/ux-design-specification.md#Component-Strategy`
- [UX-DR10: swipe loop completo + gesto] `_bmad-output/planning-artifacts/ux-design-specification.md#Defining-Core-Experience`
- [UX animation tokens: ease-spring, duration-payoff] `_bmad-output/planning-artifacts/ux-design-specification.md#UX-Consistency-Patterns`
- [Architecture: Reanimated 3 worklets 60fps] `_bmad-output/planning-artifacts/architecture.md#Frontend-Architecture`
- [Architecture: POST /api/v1/swipe-events] `_bmad-output/planning-artifacts/architecture.md#Naming-Patterns`
- [Architecture: features/swipe/] `_bmad-output/planning-artifacts/architecture.md#Complete-Project-Directory-Structure`
- [Architecture: useSwipeStore] `_bmad-output/planning-artifacts/architecture.md#Communication-Patterns`
- [Architecture: ApiResponse<T> wrapper] `_bmad-output/planning-artifacts/architecture.md#Format-Patterns`
- [Story 2.2 dev notes — instalaciones y patrones] `_bmad-output/implementation-artifacts/2-2-feed-propiedades-propertycard-swipeactions.md`
- [use-swipe-store.ts] `apps/mobile/src/stores/use-swipe-store.ts`
- [swipe-screen.tsx] `apps/mobile/src/features/swipe/screens/swipe-screen.tsx`
- [property-card.tsx] `apps/mobile/src/features/swipe/components/property-card.tsx`
- [swipe-actions.tsx] `apps/mobile/src/features/swipe/components/swipe-actions.tsx`
- [tokens.ts] `apps/mobile/src/lib/tokens.ts`
- [glass-panel.tsx] `apps/mobile/src/components/ui/glass-panel.tsx`

## Dev Agent Record

### Agent Model Used

Gemini — Antigravity (2026-03-20)

### Debug Log References

### Completion Notes List

### File List

## Change Log

- **2026-03-20 (story creation):** Story 2.3 creada con contexto completo de Story 2.2, architecture.md, ux-design-specification.md y epics.md. Codebase analizado: GestureHandlerRootView instalado, react-native-reanimated/plugin configurado. Status: ready-for-dev.
