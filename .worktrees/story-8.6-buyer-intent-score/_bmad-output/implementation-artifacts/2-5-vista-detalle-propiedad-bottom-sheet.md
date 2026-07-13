# Story 2.5: Vista de Detalle de Propiedad (Bottom Sheet)

Status: done

## Story

Como comprador,
quiero ver el detalle completo de una propiedad antes de decidir si hacer match o descarte,
para que pueda tomar una decisión informada sin salir del flujo de swipe.

## Acceptance Criteria

1. **Given** un comprador con una tarjeta de propiedad activa **When** pulsa el botón de info ⓘ o hace tap en la tarjeta **Then** aparece un bottom sheet animado que se desliza desde abajo con el detalle completo: hero image (galería si hay varias), precio, dirección, habitaciones, m², descripción, planta (si existe), garaje y datos del agente representante (si vinculado)

2. **And** el bottom sheet usa `GlassPanel` level `medium` y se presenta como modal sobre la pantalla de swipe (no reemplaza la pantalla actual)

3. **And** dentro del detalle hay botón "Me interesa" (Primary naranja) y "No me interesa" (Destructive rojo apagado) que ejecutan match/descarte respectivamente y cierran el sheet

4. **And** el botón "Volver" (Ghost — solo texto naranja) cierra el sheet sin registrar ninguna acción sobre la propiedad

5. **And** el gesto de swipe desde el borde inferior (swipe down) cierra el sheet y regresa a la tarjeta activa (UX-DR10)

## Tasks / Subtasks

- [x] **Task 1 — Extender tipo `Listing` con campos opcionales para el detalle** (AC: 1)
  - [x] En `packages/shared/src/types/listing.ts`, añadir campos opcionales: `description?: string`, `garage?: boolean`, `imageUrls?: string[]` (galería de fotos)
  - [x] No modificar campos existentes — compatibilidad total con componentes existentes (PropertyCard, SwipableCard, etc.)

- [x] **Task 2 — Crear componente `PropertyDetailSheet`** (AC: 1, 2, 3, 4, 5)
  - [x] Crear `apps/mobile/src/features/swipe/components/property-detail-sheet.tsx`
  - [x] Usar `Modal` de React Native (animationType="slide") para el efecto bottom-up
  - [x] Interior del modal: container scrollable (`ScrollView`) con: `GlassPanel` medium como fondo, hero image en la parte superior, galería de fotos si `imageUrls` disponible, precio (Clash Display / `Typography.sizeDisplay`, naranja), nombre, dirección con formato completo, metadatos (habitaciones, m², planta, garaje), bloque descripción (`listing.description ?? 'Sin descripción disponible'`), bloque agente (hardcoded "Agente representante no vinculado" en MVP — ver Dev Notes)
  - [x] Botón "Me interesa" (Primary naranja, `button.tsx`) → llama `onMatch` y cierra el modal
  - [x] Botón "No me interesa" (Destructive — glass + borde `Colors.accentReject`) → llama `onReject` y cierra el modal
  - [x] Botón "Volver" (Ghost — solo texto `Colors.accentPrimary`) → sólo cierra el modal sin llamar a nada
  - [x] Prop: `visible: boolean`, `listing: Listing | null`, `onClose: () => void`, `onMatch: () => void`, `onReject: () => void`, `testID?: string`
  - [x] Crear `property-detail-sheet.test.tsx` co-located — tests: renderiza correctamente, botones llaman los callbacks, Volver no llama match/reject

- [x] **Task 3 — Añadir handler `handleInfo` en `SwipeScreen`** (AC: 1, 2)
  - [x] Reemplazar stub `handleInfo` (línea 154 de `swipe-screen.tsx`) con estado local: `const [isDetailSheetVisible, setIsDetailSheetVisible] = useState(false)`
  - [x] `handleInfo` → `setIsDetailSheetVisible(true)` (cierra al descartar el badge como behavior de UX)
  - [x] `handleDetailClose` → `setIsDetailSheetVisible(false)`
  - [x] `handleDetailMatch` → llama `handleMatch()` + `setIsDetailSheetVisible(false)` (reutiliza el handler existente)
  - [x] `handleDetailReject` → llama `handleReject()` + `setIsDetailSheetVisible(false)` (reutiliza el handler existente)
  - [x] Renderizar `<PropertyDetailSheet>` dentro de `<ScreenBackground>` al final del JSX (junto a MatchPayoff y el Modal de recap)

- [x] **Task 4 — Añadir tap en `SwipableCard` para abrir detalle** (AC: 1)
  - [x] Añadir prop `onInfo?: () => void` a `SwipableCard`
  - [x] En `swipable-card.tsx`, añadir `Gesture.Tap().maxDistance(5).onEnd(() => runOnJS(onInfo)())` y combinarlo con el PanGesture via `Gesture.Race()`
  - [x] Pasar `onInfo={handleInfo}` desde `SwipeScreen`
  - [x] Añadir tests en `swipable-card.test.tsx`: backward compat sin onInfo, acepta prop, tap no llama match/reject

- [x] **Task 5 — Verificación typecheck y tests** (AC: todos)
  - [x] `pnpm --filter @reinder/shared typecheck` → pre-existing errors en db/ (drizzle-orm no instalado) — sin errores nuevos
  - [x] `pnpm --filter @reinder/mobile typecheck` → 0 errores en código mobile (7 errores pre-existentes en shared/db — fuera del scope)
  - [x] `pnpm --filter @reinder/mobile test` → **132 tests / 18 suites ✅** (baseline era 63+; 13 tests nuevos añadidos)

## Dev Notes

### 🔴 Estado del Codebase — Lo que ya existe

**`SwipeScreen` ya tiene un stub listo para esta story:**
```typescript
// swipe-screen.tsx línea 154-156 — REEMPLAZAR con estado real
const handleInfo = () => {
  // Story 2.5: abrirá el bottom sheet de detalle
};
```
**`SwipeActions` ya tiene el botón ⓘ conectado a `onInfo`** — no tocar `swipe-actions.tsx`.

**`SwipableCard` NO tiene `onInfo` ni tap gesture** — hay que añadir ambas cosas (Task 4).

**NO existe `PropertyDetailSheet`** — hay que crearlo desde cero (Task 2).

---

### 📦 Archivos a crear/modificar

```
CREAR:
  apps/mobile/src/features/swipe/components/property-detail-sheet.tsx  ← nuevo componente
  apps/mobile/src/features/swipe/components/property-detail-sheet.test.tsx

MODIFICAR:
  packages/shared/src/types/listing.ts              ← añadir campos opcionales
  apps/mobile/src/features/swipe/screens/swipe-screen.tsx   ← replaced stub + render sheet
  apps/mobile/src/features/swipe/components/swipable-card.tsx  ← añadir tap gesture + onInfo prop
  apps/mobile/src/features/swipe/components/swipable-card.test.tsx  ← tests tap

NO MODIFICAR:
  apps/mobile/src/features/swipe/components/swipe-actions.tsx  ← ya tiene onInfo prop
  apps/mobile/src/features/swipe/components/property-card.tsx  ← no cambia
  apps/mobile/src/stores/use-swipe-store.ts         ← handleMatch/handleReject ya existen
  apps/mobile/src/lib/api/swipe-events.ts           ← ya funciona para match/reject
```

---

### 🏗️ Arquitectura del Bottom Sheet — Patrón a usar

**Usar `Modal` nativo de React Native, NO crear un componente custom:**
```typescript
import { Modal, ScrollView } from 'react-native';

<Modal
  visible={visible}
  animationType="slide"      // ← deslizamiento bottom-up (AC1, AC5)
  transparent={true}          // ← permite ver la tarjeta detrás
  onRequestClose={onClose}    // ← Android back button cierra el sheet (AC4)
  testID={testID}
>
  {/* Sheet container con GlassPanel medium */}
  <View style={styles.backdrop}>
    <GlassPanel intensity="medium" style={styles.sheet}>
      <ScrollView>
        {/* Contenido */}
      </ScrollView>
      {/* Botones fijos en el fondo */}
    </GlassPanel>
  </View>
</Modal>
```

**No uses librerías de terceros** (no `react-native-bottom-sheet`, no `@gorhom/bottom-sheet`) — el proyecto no las tiene instaladas y el Modal nativo es suficiente para el MVP.

---

### 🎯 Gesture Tap en SwipableCard — Patrón crítico

```typescript
// swipable-card.tsx — añadir TapGesture tras PanGesture
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

// En el componente:
const tapGesture = Gesture.Tap()
  .maxDistance(5)   // ← tap sólo si movimiento < 5px (no interfiere con swipe)
  .onEnd(() => {
    'worklet';
    if (onInfo) {
      runOnJS(onInfo)();  // ← runOnJS porque onInfo es función JS normal
    }
  });

const composed = Gesture.Race(panGesture, tapGesture);
// Race: si el pan se activa primero (movimiento > umbral), el tap no se dispara

// En el return:
<GestureDetector gesture={composed}>
  <Animated.View ...>
```

**Importante:** `ReactNativeGestureHandler` ya está en el proyecto (usado por `useSwipeGesture`). No hay que instalar nada nuevo.

---

### 🔗 Reutilización de `handleMatch` y `handleReject`

Los handlers de match y reject en `SwipeScreen` ya tienen toda la lógica (guards, badge dismiss, offline queue, checkRecap). El `PropertyDetailSheet` los hereda vía props:

```typescript
// swipe-screen.tsx — dentro del render
<PropertyDetailSheet
  visible={isDetailSheetVisible}
  listing={currentCard}           // ← la tarjeta activa actual
  onClose={handleDetailClose}
  onMatch={handleDetailMatch}     // → llama handleMatch() + cierra sheet
  onReject={handleDetailReject}   // → llama handleReject() + cierra sheet
  testID="property-detail-sheet"
/>
```

**NO duplicar la lógica de recordMatchEvent/recordRejectEvent** — reutilizar los handlers del parent.

---

### 👤 Bloque de Agente Representante — MVP

El campo `agent_link` del comprador no está expuesto en el tipo `Listing` (Story 3.4 lo implementa). Para el MVP de esta story, mostrar un placeholder:

```typescript
// En property-detail-sheet.tsx:
<Text style={styles.agentLabel}>Tu agente representante</Text>
<Text style={styles.agentPlaceholder}>
  ¿Tienes un agente? Pídele tu link de Reinder
</Text>
```

**No intentar llamar a ningún endpoint de agente** — deja el bloque hardcoded para esta story. Story 3.4 lo completará.

---

### 🏷️ Campos del `Listing` para el detalle

El tipo actual tiene:
```typescript
// packages/shared/src/types/listing.ts — CAMPOS EXISTENTES (no tocar)
id, title, price, location, rooms, squareMeters, floor?, imageUrl,
imageAlt?, status, badge?, agencyId, createdAt
```

Añadir solo:
```typescript
description?: string;    // Descripción larga del listing (viene del CRM)
garage?: boolean;        // ¿Tiene garaje incluido?
imageUrls?: string[];    // Galería de fotos alternativas (primera es hero)
```

**Si `imageUrls` no está definido o está vacío**, usar `imageUrl` como única imagen. El detalle NO debe fallar si estos campos faltan — son todos opcionales.

---

### 🎨 Estilos del PropertyDetailSheet

```typescript
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',       // Sheet anclado abajo
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    borderTopLeftRadius: Radius.card,   // 24
    borderTopRightRadius: Radius.card,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    maxHeight: '85%',                  // Máximo 85% de la pantalla
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: 220,
    borderRadius: 0,
  },
  price: {
    color: Colors.accentPrimary,
    fontSize: Typography.sizeDisplay,  // 32
    fontWeight: '700',
    marginBottom: Spacing.xs,
    letterSpacing: -0.5,
  },
  section: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  // ... botones usando jerarquía UX-DR11
});
```

---

### 🧪 Tests clave a implementar

**`property-detail-sheet.test.tsx`:**
```typescript
it('renderiza el precio y título del listing', () => { ... });
it('botón "Me interesa" llama onMatch y cierra el sheet', () => { ... });
it('botón "No me interesa" llama onReject y cierra el sheet', () => { ... });
it('botón "Volver" llama onClose pero no onMatch ni onReject', () => { ... });
it('no renderiza nada si visible=false', () => { ... });
```

**`swipable-card.test.tsx` (tests adicionales):**
```typescript
it('tap en la tarjeta llama onInfo', () => {
  // Simular tap con fireEvent.press — GestureDetector en test env
});
it('swipe derecho llama onMatch pero no onInfo', () => { ... });
```

**Patrón de mock para Modal en tests:**
El `Modal` de React Native se renderiza correctamente en Jest. Verificar que los children son accesibles cuando `visible={true}`.

---

### ⚠️ Convenciones del Proyecto (obligatorio)

| Elemento | Convención | Ejemplo |
|---|---|---| 
| Nombre archivo | kebab-case | `property-detail-sheet.tsx` |
| Nombre componente | PascalCase | `PropertyDetailSheet` |
| Estado local | `is` prefix | `isDetailSheetVisible` |
| Props callback | `on` + evento | `onClose`, `onMatch`, `onReject` |
| Tests co-locados | junto al fuente | `property-detail-sheet.test.tsx` |
| Import tipos | desde `@reinder/shared` | `import type { Listing } from '@reinder/shared'` |
| NUNCA hardcodear colores | usar tokens | `Colors.accentPrimary`, nunca `'#FF6B00'` |

---

### 🔗 Dependencias Cruzadas

- **Story 2.3 (done):** `handleMatch` en SwipeScreen con guard `isMatchInFlight` — reutilizar tal cual
- **Story 2.4 (done):** `handleReject` en SwipeScreen con guard `isRejectInFlight` — reutilizar tal cual
- **Story 2.6 (done):** MatchRecapScreen Modal — el nuevo `PropertyDetailSheet` Modal debe coexistir sin conflicto. No mostrar la hoja de detalle si `isMatchPayoffVisible` o `isRecapVisible` (para consistency con el patrón de Story 2.6)
- **Story 2.7 (done):** MatchHistoryScreen también debería abrir el detalle al pulsar un match — **fuera del scope de esta story**, pero diseñar `PropertyDetailSheet` para ser reutilizable desde otras pantallas (listado de matches)
- **Story 3.4 (backlog):** El bloque de agente en el detalle se completará allí — dejar el placeholder de MVP

### Referencias

- [epics.md: Story 2.5 AC] `_bmad-output/planning-artifacts/epics.md#Story-2.5`
- [UX-DR10: Swipe loop + bottom sheet tap] `_bmad-output/planning-artifacts/ux-design-specification.md`
- [UX-DR11: Jerarquía de botones] `_bmad-output/planning-artifacts/ux-design-specification.md`
- [UX-DR7: GlassPanel niveles] `_bmad-output/planning-artifacts/ux-design-specification.md`
- [Architecture: Frontend Mobile / Reanimated 3 + Gesture Handler] `_bmad-output/planning-artifacts/architecture.md#Frontend-Architecture`
- [Architecture: Structure Patterns / feature-based] `_bmad-output/planning-artifacts/architecture.md#Structure-Patterns`
- [Story 2.3 dev notes: useSwipeGesture, panGesture pattern] `_bmad-output/implementation-artifacts/2-3-gesto-swipe-match-matchpayoff-animation.md`
- [Story 2.4 dev notes: handleReject, isRejectInFlight guard] `_bmad-output/implementation-artifacts/2-4-gesto-descarte.md`
- [swipe-screen.tsx — stub handleInfo línea 154] `apps/mobile/src/features/swipe/screens/swipe-screen.tsx`
- [swipable-card.tsx] `apps/mobile/src/features/swipe/components/swipable-card.tsx`
- [swipe-actions.tsx] `apps/mobile/src/features/swipe/components/swipe-actions.tsx`
- [glass-panel.tsx] `apps/mobile/src/components/ui/glass-panel.tsx`
- [tokens.ts] `apps/mobile/src/lib/tokens.ts`
- [listing.ts — tipo base] `packages/shared/src/types/listing.ts`

## Dev Agent Record

### Agent Model Used

Gemini — Antigravity (2026-03-27)

### Debug Log References

- Intl.NumberFormat en JSDOM usa narrow no-break space (U+202F) entre número y «€» — test corregido con regex `toMatch(/485\.000\s*€/)` en lugar de `toBe()`.
- Pre-existing type errors en `packages/shared/src/db` (drizzle-orm no instalado en el paquete shared) — irrelevantes para mobile, confirmado con grep.

### Completion Notes List

- ✅ Task 1: `packages/shared/src/types/listing.ts` extendido con `description?`, `garage?`, `imageUrls?` — totalmente retrocompatible.
- ✅ Task 2: `PropertyDetailSheet` creado con Modal nativo (slide), GlassPanel medium, ScrollView, 3 botones (Me interesa / No me interesa / Volver), bloque agente MVP. 11 tests.
- ✅ Task 3: `SwipeScreen` actualizado — stub `handleInfo` reemplazado, handlers, sheet render.
- ✅ Task 4: `SwipableCard` actualizado con `Gesture.Race(panGesture, tapGesture)`. 3 tests nuevos.
- ✅ Task 5: 132 tests / 18 suites — todos pasan. 0 errores de tipo en código mobile.
- ✅ CR H1: Eliminado doble `onClose()` de handlers internos de `PropertyDetailSheet` — el padre es dueño del ciclo de vida del sheet.
- ✅ CR M1: Añadido `useEffect` en `SwipeScreen` que cierra el sheet cuando `currentCard` pasa a undefined.
- ✅ CR M2: `handleInfo` ahora hace guard `if (isMatchPayoffVisible) return` — evita abrir el sheet sobre la animación de MatchPayoff.
- ✅ CR L1: `Pressable role=text` reemplazado por `View` en bloque agente — semánticamente correcto.
- ✅ CR L2: JSDoc de `swipe-screen.tsx` actualizado para documentar Story 2.5 y `PropertyDetailSheet`.

### File List

- `packages/shared/src/types/listing.ts` — MODIFIED
- `apps/mobile/src/features/swipe/components/property-detail-sheet.tsx` — NEW
- `apps/mobile/src/features/swipe/components/property-detail-sheet.test.tsx` — NEW
- `apps/mobile/src/features/swipe/screens/swipe-screen.tsx` — MODIFIED
- `apps/mobile/src/features/swipe/components/swipable-card.tsx` — MODIFIED
- `apps/mobile/src/features/swipe/components/swipable-card.test.tsx` — MODIFIED
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — MODIFIED

## Senior Developer Review (AI)

**Review Date:** 2026-03-27  
**Outcome:** Changes Requested — All fixed

### Action Items

- [x] **[HIGH] Double `onClose()` call** en handlers internos de `PropertyDetailSheet` — `handleDetailMatch` en SwipeScreen ya cierra el sheet, `onClose()` era redundante y de orden incorrecto. [`property-detail-sheet.tsx:86-94`]
- [x] **[MEDIUM] Sheet visible con `currentCard = undefined`** — Añadido `useEffect` que cierra el sheet cuando `currentCard` pasa a falsy. [`swipe-screen.tsx`]
- [x] **[MEDIUM] Sheet abre sobre MatchPayoff animation** — `handleInfo` ahora hace guard `if (isMatchPayoffVisible) return`. [`swipe-screen.tsx:155`]
- [x] **[LOW] `Pressable role=text` en agentBlock** — Reemplazado por `View` semánticamente correcto. [`property-detail-sheet.tsx:188`]
- [x] **[LOW] JSDoc header no documentaba Story 2.5** — Añadida entrada en `swipe-screen.tsx`. [`swipe-screen.tsx:3-18`]
