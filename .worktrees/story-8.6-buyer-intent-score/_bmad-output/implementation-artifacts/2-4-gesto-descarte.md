# Story 2.4: Gesto de Descarte

Status: done

## Story

Como comprador,
quiero hacer swipe izquierdo o usar el botón de descarte para descartar una propiedad,
para que la app no vuelva a mostrarla.

## Acceptance Criteria

1. **Given** un comprador con una tarjeta de propiedad activa en pantalla **When** hace swipe izquierdo o pulsa el botón de descarte **Then** la tarjeta se anima hacia la izquierda con overlay `--accent-reject: #8B3A3A` sutil — sin SFX negativo

2. **And** la siguiente tarjeta aparece inmediatamente sin delay perceptible tras completarse la animación de salida

3. **And** el evento de descarte se registra via `POST /api/v1/swipe-events` con `action: 'reject'` en `swipe_events` — si no hay conexión, el evento se encola en `pendingEvents` y se sincroniza cuando vuelva la conexión

4. **And** la propiedad descartada no vuelve a aparecer en el feed de ese comprador (el feed no la re-inserta)

5. **And** el gesto de back desde el borde izquierdo (< 20px desde el borde de la pantalla) NO activa el descarte — está reservado para la navegación del sistema

## Tasks / Subtasks

- [x] **Task 1 — Añadir `recordRejectEvent` al `useSwipeStore`** (AC: 3)
  - [x] Añadir función `recordRejectEvent(listingId: string, token: string): Promise<void>` en `apps/mobile/src/stores/use-swipe-store.ts`
  - [x] Llamar a `postSwipeEvent({ action: 'reject', listingId }, token)`
  - [x] Si falla (offline): añadir a `pendingEvents` con `action: 'reject'`
  - [x] Añadir la declaración de `recordRejectEvent` a la interfaz `SwipeStore`
  - [x] Test: `use-swipe-store.test.ts` — 3 tests nuevos (success, offline, múltiples offline)

- [x] **Task 2 — Actualizar `SwipableCard` para el overlay rojo de descarte** (AC: 1)
  - [x] Cambiar `backgroundColor: '#EF4444'` por `Colors.accentReject` (`#8B3A3A`) en overlay y etiqueta
  - [x] Confirmado: NO hay SFX en el path de reject
  - [x] Confirmado: animación sale a -600px con 280ms (ya estaba en `use-swipe-gesture.ts`)
  - [x] Test: `swipable-card.test.tsx` sigue pasando, color correcto en estilos

- [x] **Task 3 — Actualizar `SwipeScreen` para registrar el reject** (AC: 1, 2, 3, 4)
  - [x] Añadir `recordRejectEvent` a la desestructuración del store
  - [x] Añadir `isRejectInFlight` ref guard contra double-advance
  - [x] `handleReject` ahora llama `recordRejectEvent` + `advanceCard` inmediatamente (sin delay)
  - [x] `SwipeActions.onReject` ya estaba conectado al mismo `handleReject` — confirmado

- [x] **Task 4 — Guardia borde izquierdo para navegación sistema** (AC: 5)
  - [x] Añadida guardia `if (event.x < 20) return;` al `.onEnd()` del panGesture en `use-swipe-gesture.ts`
  - [x] Tests de `use-swipe-gesture.test.ts` siguen pasando (10/10)

- [x] **Task 5 — Verificación typecheck y tests** (AC: todos)
  - [x] `pnpm --filter @reinder/mobile typecheck` → 0 errores ✅
  - [x] `pnpm --filter @reinder/mobile test` → 63/63 tests pasan, 10/10 suites ✅

## Dev Notes

### 🔴 Estado del Codebase — Qué ya existe y qué hay que cambiar

**El gesto de swipe izquierdo YA ESTÁ implementado en `use-swipe-gesture.ts`:**
```typescript
// apps/mobile/src/features/swipe/hooks/use-swipe-gesture.ts (línea 77-86)
} else if (event.translationX < -SWIPE_THRESHOLD) {
  translateX.value = withTiming(-600, { duration: 280 }, (finished) => {
    'worklet';
    if (finished) {
      cardOpacity.value = 0;
      runOnJS(onReject)(); // ← YA se llama correctamente
    }
  });
}
```
**NO modificar `use-swipe-gesture.ts` para la animación** — ya funciona correctamente. Solo añadir la guardia del borde izquierdo (Task 4).

**Lo que FALTA en `SwipeScreen`** — el handler actual de reject es solo esto:
```typescript
// swipe-screen.tsx — estado ACTUAL (a modificar en Task 3)
const handleReject = useCallback(() => {
  advanceCard(token);  // ← FALTA: recordRejectEvent() ANTES de esto
}, [advanceCard, token]);
```

**Lo que FALTA en `useSwipeStore`** — `recordMatchEvent` ya existe; `recordRejectEvent` no existe aún. Copiar el patrón exactamente, cambiando `action: 'match'` por `action: 'reject'`.

---

### 📦 Archivos a crear/modificar

```
MODIFICAR:
  apps/mobile/src/stores/use-swipe-store.ts          ← añadir recordRejectEvent
  apps/mobile/src/features/swipe/screens/swipe-screen.tsx ← conectar recordRejectEvent
  apps/mobile/src/features/swipe/hooks/use-swipe-gesture.ts ← añadir guardia borde izq.
  apps/mobile/src/features/swipe/components/swipable-card.tsx ← verificar color overlay

NO MODIFICAR:
  apps/mobile/src/lib/api/swipe-events.ts            ← ya soporta action: 'reject'
  apps/mobile/__mocks__/react-native-reanimated.js   ← mock ya funciona
  apps/mobile/babel.config.js                        ← NO tocar
```

---

### 🎨 Color del Overlay de Descarte

El spec UX-DR3 y el epics.md AC1 especifican `--accent-reject: #8B3A3A`.

En `tokens.ts` (`apps/mobile/src/lib/tokens.ts`), verificar si existe `Colors.accentReject`. Si existe, usarlo. Si no existe, usar `'#8B3A3A'` directamente con un comentario `// --accent-reject UX-DR3`.

El overlay de descarte ya existe en `SwipableCard` con un color rojo — solo asegurarse de que es exactamente `#8B3A3A` y no cualquier otro rojo.

**Diferencia clave match vs reject:**
- Match → overlay naranja `#FF6B00` + MatchPayoff animation + SFX ✅ (Story 2.3)
- Reject → overlay rojo sutil `#8B3A3A` + sin SFX + sin overlay modal 🆕 (esta story)

---

### 🔗 Patrón de `recordRejectEvent` — Copiar de `recordMatchEvent`

```typescript
// apps/mobile/src/stores/use-swipe-store.ts — AÑADIR (no reemplazar nada)

// En la interfaz SwipeStore, añadir:
recordRejectEvent: (listingId: string, token: string) => Promise<void>;

// En la implementación del store, añadir junto a recordMatchEvent:
recordRejectEvent: async (listingId: string, token: string) => {
  const result = await postSwipeEvent(
    { action: 'reject', listingId },
    token,
  );

  if (result.error) {
    const pendingEvent: SwipeEvent = {
      id: `pending-${Date.now()}`,
      action: 'reject',
      listingId,
      buyerId: 'pending-sync',
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      pendingEvents: [...state.pendingEvents, pendingEvent],
    }));
  }
},
```

---

### ⚙️ `SwipeScreen` — Handler de Reject Actualizado

```typescript
// apps/mobile/src/features/swipe/screens/swipe-screen.tsx
// Añadir recordRejectEvent a la desestructuración del store:
const { currentCard, prefetchQueue, isLoading, advanceCard, recordMatchEvent, recordRejectEvent } = useSwipeStore();

// Renombrar (o añadir) ref de guardia — opcional, puede haber uno por acción:
const isRejectInFlight = useRef(false);

const handleReject = useCallback(() => {
  if (!currentCard || isRejectInFlight.current) return;
  isRejectInFlight.current = true;

  const token = session?.access_token ?? '';
  recordRejectEvent(currentCard.id, token); // fire-and-forget — no bloqueamos el advance
  advanceCard(token);

  // Resetear ref tras avanzar (el reject es inmediato, sin MatchPayoff delay)
  isRejectInFlight.current = false;
}, [currentCard, session?.access_token, recordRejectEvent, advanceCard]);
```

> **Importante:** El reject avanza la tarjeta **inmediatamente** (sin setTimeout). El match espera al auto-dismiss del MatchPayoff (1.5s). Esta es la diferencia de UX entre los dos gestos.

---

### 🛡️ Guardia del Borde Izquierdo (Task 4)

El borde izquierdo de la pantalla está reservado para el back-gesture del sistema iOS. Para prevenir que un swipe desde el borde sea interpretado como descarte:

```typescript
// apps/mobile/src/features/swipe/hooks/use-swipe-gesture.ts
// En el .onEnd():
.onEnd((event) => {
  'worklet';
  // Guardia: si el gesto empezó en los primeros 20px del borde izquierdo,
  // ignorarlo — reservado para back-gesture del sistema (UX-DR10, epics.md AC5 Story 2.4)
  if (event.x < 20) {
    // Volver al centro con spring sin activar match/reject
    translateX.value = withSpring(0, SPRING_CONFIG);
    translateY.value = withSpring(0, SPRING_CONFIG);
    rotation.value = withSpring(0, SPRING_CONFIG);
    overlayOpacity.value = withTiming(0, { duration: 200 });
    return;
  }

  if (event.translationX > SWIPE_THRESHOLD) {
    // ... match existente
  } else if (event.translationX < -SWIPE_THRESHOLD) {
    // ... reject existente
  } else {
    // ... spring back existente
  }
})
```

> **Nota:** `event.x` es la posición X absoluta del inicio del gesto (no la translación). Este valor es estable durante el gesto y no cambia en el `onEnd`.

---

### 🧪 Test del Store — Patrón a Seguir

```typescript
// use-swipe-store.test.ts — ejemplo de test para recordRejectEvent
it('recordRejectEvent encola el evento en pendingEvents si falla la red', async () => {
  // Mockear postSwipeEvent para que devuelva error
  (postSwipeEvent as jest.Mock).mockResolvedValueOnce({
    data: null,
    error: { code: 'NETWORK_ERROR', message: 'Sin conexión' },
  });

  const store = useSwipeStore.getState();
  await store.recordRejectEvent('listing-1', 'mock-token');

  const { pendingEvents } = useSwipeStore.getState();
  expect(pendingEvents).toHaveLength(1);
  expect(pendingEvents[0].action).toBe('reject');
  expect(pendingEvents[0].listingId).toBe('listing-1');
});
```

---

### 🏷️ Convenciones de Naming (Crítico — de architecture.md)

| Elemento | Convención | Ejemplo |
|---|---|---|
| Funciones del store | camelCase | `recordRejectEvent` |
| Booleanos de estado | `is` prefix | `isRejectInFlight` |
| Callbacks | `on` + Evento | `onReject` |
| Constantes | SCREAMING_SNAKE | `SWIPE_THRESHOLD` (ya existe) |

---

### 🔗 Guardia Race Condition

En Story 2.3 se descubrió (H1 del code review) que sin guardia de `isMatchInFlight`, un doble-tap podía avanzar dos tarjetas. Aplicar el mismo patrón para reject con `isRejectInFlight` ref (ver handler en Task 3 arriba).

---

### 🔗 Dependencias Cruzadas

- **Story 2.3 (done):** `use-swipe-gesture.ts` YA dispara `onReject` en swipe izquierdo. `postSwipeEvent` YA acepta `action: 'reject'`. `SwipeEvent` tipo incluye `'reject'` como `SwipeAction`.
- **Story 2.5 (backlog):** El BottomSheet de detalle también puede ejecutar match/reject — el `handleReject` centralizado en `SwipeScreen` deberá ser pasado como prop al BottomSheet.
- **Story 2.7 (backlog):** El historial de matches NO incluirá rechazos. Los `swipe_events` con `action: 'reject'` se registran pero no se muestran en la UI del comprador (solo el agente puede verlos — Epic 4).

---

### Referencias

- [epics.md: Story 2.4 AC] `_bmad-output/planning-artifacts/epics.md#Story-2.4`
- [UX-DR3: SwipeActions con ARIA] `_bmad-output/planning-artifacts/ux-design-specification.md`
- [UX-DR10: Swipe loop + back gesture] `_bmad-output/planning-artifacts/ux-design-specification.md`
- [Architecture: POST /api/v1/swipe-events] `_bmad-output/planning-artifacts/architecture.md#Naming-Patterns`
- [Architecture: useSwipeStore] `_bmad-output/planning-artifacts/architecture.md#Communication-Patterns`
- [Story 2.3 dev notes — `use-swipe-gesture.ts`, guardia race condition H1] `_bmad-output/implementation-artifacts/2-3-gesto-swipe-match-matchpayoff-animation.md`
- [use-swipe-gesture.ts] `apps/mobile/src/features/swipe/hooks/use-swipe-gesture.ts`
- [swipe-screen.tsx] `apps/mobile/src/features/swipe/screens/swipe-screen.tsx`
- [use-swipe-store.ts] `apps/mobile/src/stores/use-swipe-store.ts`
- [swipe-events.ts (API client)] `apps/mobile/src/lib/api/swipe-events.ts`
- [swipable-card.tsx] `apps/mobile/src/features/swipe/components/swipable-card.tsx`
- [tokens.ts] `apps/mobile/src/lib/tokens.ts`

## Dev Agent Record

### Agent Model Used

Gemini — Antigravity (2026-03-22)

### Debug Log References

- `recordRejectEvent` tests requerían `jest.mock('../lib/api/swipe-events')` en `use-swipe-store.test.ts`. Se añadió el mock y se descubrieron 6 tests pre-existentes rotos (match-payoff PAYOFF_DURATION_MS cambiado de 1500ms → 450ms, property-card testID de imagen, advanceCard fallback de dev). Todos corregidos.

### Completion Notes List

- ✅ `recordRejectEvent` añadido al store con mismo patrón que `recordMatchEvent`
- ✅ Overlay de descarte actualizado a `Colors.accentReject` (`#8B3A3A`, UX-DR3) — era `#EF4444`
- ✅ `SwipeScreen.handleReject` ahora registra el evento + guard `isRejectInFlight` contra double-advance
- ✅ Guardia de borde izquierdo (`event.x < 20`) en `use-swipe-gesture.ts` — AC5
- ✅ 3 nuevos tests en `use-swipe-store.test.ts` para `recordRejectEvent` (success, offline, multiple offline)
- ✅ 6 tests pre-existentes corregidos: match-payoff (2), property-card (3), use-swipe-store (1)
- ✅ TypeCheck: 0 errores
- ✅ Tests: 63/63 passing, 10/10 suites

### File List

**Modificados:**
- `apps/mobile/src/stores/use-swipe-store.ts` — añadir `recordRejectEvent`
- `apps/mobile/src/stores/use-swipe-store.test.ts` — mock de swipe-events + 3 tests nuevos + 1 test corregido
- `apps/mobile/src/features/swipe/screens/swipe-screen.tsx` — `handleReject` con `recordRejectEvent` + `isRejectInFlight` guard
- `apps/mobile/src/features/swipe/hooks/use-swipe-gesture.ts` — guardia borde izquierdo
- `apps/mobile/src/features/swipe/components/swipable-card.tsx` — overlay color `#8B3A3A`
- `apps/mobile/src/features/swipe/components/property-card.test.tsx` — correción accesibilidad tests (pre-existing)
- `apps/mobile/src/features/swipe/components/match-payoff.test.tsx` — corrección tiempos y subtitle (pre-existing)

## Change Log

- **2026-03-22 (story creation):** Story 2.4 creada con contexto completo. Status: ready-for-dev.
- **2026-03-22 (implementation):** Implementación completa. TypeCheck 0 errores, 63/63 tests pasando. Status: review.
- **2026-03-22 (code review):** 1 High, 2 Medium, 1 Low encontrados. Todos los High y Medium corregidos. Status: done.

## Senior Developer Review (AI)

**Fecha:** 2026-03-22
**Revisado por:** Gemini — Antigravity (adversarial mode)
**Resultado:** Changes Requested

### Action Items

#### 🔴 HIGH

- [x] **H1: `isRejectInFlight` guard completamente inefectivo** [`swipe-screen.tsx:96-107`]
  El guard se activa en la línea 97 (`isRejectInFlight.current = true`) y se resetea en la línea 107 (`isRejectInFlight.current = false`) en el mismo tick síncrono, dentro del mismo callback. No hay `await` ni callback asíncrono entre ambas líneas. Esto significa que el guard nunca previene una segunda invocación — dos taps rápidos SÍ pueden producir double-advance. Contraste con `isMatchInFlight` que solo se resetea en `handleMatchDismiss` (tras 450ms+): ese funciona correctamente. El reject necesita el mismo patrón: resetear el guard en `useEffect` al detectar cambio de `currentCard`, o en el siguiente render cycle.

#### 🟡 MEDIUM

- [x] **M1: `event.x ?? 999` es un workaround con comportamiento silencioso incorrecto** [`use-swipe-gesture.ts:67`]
  Si `event.x` es `undefined` (RNGH versión antigua), el valor fallback es `999`, que es `> 20`, por lo que la guardia NO se activa y el gesto procede normalmente. Esto es correcto para el match (no hay borde derecho reservado), pero significa que en la versión de RNGH sin `event.x`, el AC5 (guardia de borde) simplemente no funciona sin error ni warning. Debería añadirse al menos un `__DEV__` warning cuando `event.x === undefined` para detectarlo en desarrollo.

- [x] **M2: `recordRejectEvent` no recibe `buyerId`** [`use-swipe-store.ts:188`]
  La función crea el `pendingEvent` con `buyerId: 'pending-sync'`, pero el `postSwipeEvent` solo envía `{ action, listingId }` — no incluye `buyerId` en el payload. Esto es consistente con `recordMatchEvent` (mismo comportamiento), pero al revisar el tipo `CreateSwipeEventPayload`, si en algún momento el endpoint requiere `buyerId`, ambas funciones fallarán silenciosamente. Al menos debería documentarse como deuda técnica pendiente (el token ya incluye la identidad del usuario en el header Authorization — correcto).

#### 🟢 LOW

- [x] **L1: El docstring del hook no menciona la guardia de borde (AC5)** [`use-swipe-gesture.ts:34-42`]
  El JSDoc del hook documentó sus returns y propósito pero no menciona la nueva guardia de borde izquierdo introducida en Story 2.4. Futuro dev puede no saber que `event.x < 20` existe o por qué. Añadir una línea al `@param` o al bloque de comentarios críticos al inicio del archivo.

### Git vs Story Discrepancies

Los siguientes archivos tienen cambios en git pero NO son parte de Story 2.4 (son cambios de Story 2.3 sin commitear previos a esta story). No son un problema de esta story pero conviene hacer commit limpio:
- `apps/mobile/App.tsx`, `apps/mobile/package.json`, `apps/mobile/src/features/swipe/components/match-payoff.tsx`, `apps/mobile/src/features/swipe/components/property-card.tsx`, `packages/shared/src/constants/index.ts`, `CLAUDE.md`

