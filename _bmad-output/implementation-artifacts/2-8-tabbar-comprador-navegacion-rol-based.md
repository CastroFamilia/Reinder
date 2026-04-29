# Story 2.8: TabBar de Comprador con Navegación Rol-Based

Status: review

## Story

Como comprador,
quiero tener una navegación clara en la parte inferior de la app,
para que pueda acceder a Swipe, Matches y Perfil con un solo tap.

## Acceptance Criteria

1. **Given** un comprador autenticado en la app mobile **When** ve la navegación inferior **Then** el `TabBar` muestra 3 tabs: "Swipe", "Matches" y "Perfil" (UX-DR8)

2. **And** el tab activo se muestra en naranja `#FF6B00`

3. **And** el TabBar tiene 60px de alto y usa `GlassPanel` como fondo (nivel `light` — backdrop-filter blur(8px))

4. **And** si hay nuevos matches sin revisar, aparece un badge numérico sobre la tab "Matches"

5. **And** un usuario con rol `agent` ve un `TabBar` diferente (Clientes / Notificaciones — ver Epic 4) — **FUERA DEL SCOPE DE ESTA STORY**: solo implementar buyer TabBar; la lógica de branch por rol se prepara pero la UI de agente queda pendiente para Epic 4

## Tasks / Subtasks

- [x] **Task 1 — Crear ProfileScreen placeholder** (AC: 1)
  - [x] Crear `apps/mobile/src/features/profile/screens/profile-screen.tsx` con placeholder mínimo
  - [x] Debe mostrar: texto "Perfil" centrado, con `ScreenBackground` aplicado
  - [x] Tests: `profile-screen.test.tsx` — render básico (3/3 PASS)

- [x] **Task 2 — Crear componente `BuyerTabBar`** (AC: 2, 3)
  - [x] Crear `apps/mobile/src/components/navigation/buyer-tab-bar.tsx`
  - [x] Implementar `tabBarStyle` personalizado con height: 60
  - [x] Usar `tabBarBackground` prop del Navigator para renderizar `GlassPanel` level `light`
  - [x] Tab activo: `tabBarActiveTintColor: Colors.accentPrimary` (`#FF6B00`)
  - [x] Tab inactivo: `tabBarInactiveTintColor: Colors.textMuted`
  - [x] Iconos: usar `@expo/vector-icons` Ionicons (home/heart/person)
  - [x] Tests: `buyer-tab-bar.test.tsx` — render, tab activo, colores (11/11 PASS)

- [x] **Task 3 — Badge de nuevos matches** (AC: 4)
  - [x] Leer `useMatchHistoryStore` para obtener `newMatchesSinceLastVisit` via `useMatchStore` wrapper
  - [x] Usar `tabBarBadge` prop en la tab Matches
  - [x] Badge aparece cuando `unreadMatchCount > 0`, no aparece cuando es 0
  - [x] `markVisited()` se llama en el listener `tabPress` de la tab Matches

- [x] **Task 4 — Actualizar BuyerTabParamList en App.tsx** (AC: 1, 5)
  - [x] Añadir tab `Profile` al tipo `BuyerTabParamList`
  - [x] Integrar `ProfileScreen` en el navigator
  - [x] Reemplazar `tabBarStyle` inline por el nuevo `BuyerTabBar` (via `screenOptions`)
  - [x] Añadir comentario: "Rol-based: agente usará AgentTabNavigator — Epic 4"
  - [x] Preservado el `NavigationContainer` existente

- [x] **Task 5 — Preparar hook de rol para tab routing** (AC: 5)
  - [x] Crear `apps/mobile/src/hooks/useUserRole.ts`
  - [x] Devuelve el rol desde `session.user.user_metadata.role` con fallback 'buyer'
  - [x] En `App.tsx`, usar el hook para decidir qué navigator renderizar (buyer/agent branch)
  - [x] Tests: `useUserRole.test.ts` (4/4 PASS)

- [x] **Task 6 — Crear `use-match-store.ts` para badge** (AC: 4)
  - [x] Wrapper sobre `useMatchHistoryStore` con interfaz `{ unreadMatchCount, markAllAsRead }`
  - [x] `unreadMatchCount` = `newMatchesSinceLastVisit` del store existente (Story 2.7)
  - [x] `markAllAsRead()` = `markVisited()` del store existente
  - [x] Tests: `use-match-store.test.ts` (3/3 PASS)

- [x] **Task 7 — Typecheck y tests**
  - [x] Tests completos: 132/132 PASS (18 suites, 0 regresiones)

## Dev Notes

### 🏗️ Arquitectura de Navegación Actual

El proyecto NO usa Expo Router. Usa `@react-navigation/bottom-tabs` + `@react-navigation/native` con `App.tsx` como entry point manual.

```
App.tsx (entry point)
├── GestureHandlerRootView
├── StatusBar
└── [loading? session?]
    ├── LoadingScreen
    ├── LoginScreen (no session)
    └── NavigationContainer (con session)
        └── BuyerTabNavigator ← MODIFICAR AQUÍ
```

**Estado actual de App.tsx (pre Story 2.8):**
- `BuyerTabParamList`: { Swipe, Matches } — 2 tabs
- `BuyerTabNavigator`: Tab bar mínima funcional, comentario explícito "diseño definitivo en Story 2.8"
- Tabs existentes: "Descubrir" (SwipeScreen) + "Matches" (MatchHistoryScreen)
- TabBar style: bgSurface color, border top, accentPrimary/textMuted

**Target Story 2.8:**
- `BuyerTabParamList`: { Swipe, Matches, Profile } — 3 tabs
- TabBar 60px alto con `GlassPanel` como fondo
- Iconos Ionicons en cada tab
- Badge numérico en Matches cuando hay no leídos
- Hook `useUserRole` para preparar routing por rol

---

### 📦 Archivos a crear/modificar

```
CREAR:
  apps/mobile/src/features/profile/screens/profile-screen.tsx
  apps/mobile/src/features/profile/screens/profile-screen.test.tsx
  apps/mobile/src/components/navigation/buyer-tab-bar.tsx
  apps/mobile/src/components/navigation/buyer-tab-bar.test.tsx
  apps/mobile/src/hooks/useUserRole.ts
  apps/mobile/src/hooks/useUserRole.test.ts

MODIFICAR:
  apps/mobile/App.tsx                              ← añadir Profile tab, BuyerTabBar, useUserRole
  apps/mobile/src/stores/use-match-store.ts        ← añadir unreadMatchCount + markAllAsRead
  (o crear si no existe)
```

---

### 🎨 GlassPanel en TabBar

`GlassPanel` ya existe en `apps/mobile/src/components/ui/glass-panel.tsx`. Tiene tres niveles de blur:
- `light`: `backdrop-filter: blur(8px)` — usar este para el TabBar
- `medium`: `backdrop-filter: blur(16px)`
- `heavy`: `backdrop-filter: blur(24px)`

Para usarlo como fondo del TabBar via React Navigation:
```typescript
<Tab.Navigator
  screenOptions={{
    tabBarBackground: () => (
      <GlassPanel level="light" style={StyleSheet.absoluteFill} />
    ),
    tabBarStyle: {
      height: 60,
      backgroundColor: 'transparent', // importante: transparent para que GlassPanel se vea
      ...
    },
  }}
>
```

---

### 🎯 Tokens relevantes

```typescript
// apps/mobile/src/lib/tokens.ts
Colors.accentPrimary   // '#FF6B00' — tab activo
Colors.textMuted       // tab inactivo
Colors.bgSurface       // fondo fallback
Colors.border          // border top TabBar
Typography.sizeSmall   // label font size
Typography.weightMedium// label font weight
```

---

### 🔗 Dependencias previas (Story 2.7)

- `NewPropertiesBadge` ya existe en `apps/mobile/src/features/swipe/components/new-properties-badge.tsx` — inspiración visual para el badge de Matches
- `MatchHistoryScreen` ya recibe `token` como prop — mantener esa prop en la integración
- El comentario en App.tsx en Story 2.7 dice explícitamente: "Tab bar mínima funcional — diseño definitivo en Story 2.8" → esta story cierra esa deuda técnica

---

### ⚠️ Puntos de atención para el dev

1. **GlassPanel + TabBar height iOS**: En iOS, el TabBar tiene un safe area bottom automático. Asegurarse de que `height: 60` sea la altura visible SIN el safe area — React Navigation gestiona el safe area automáticamente cuando se usa `tabBarStyle.height`.

2. **NavigationContainer**: Preservar `NavigationContainer` en App.tsx — no moverlo ni eliminarlo.

3. **Token prop de MatchHistoryScreen**: La tab Matches actualmente pasa `token` via closure del BuyerTabNavigator. Al refactorizar, asegurarse de que `MatchHistoryScreen` sigue recibiendo el token.

4. **Tests con NavigationContainer**: Los tests de screens que usan hooks de navegación necesitan estar wrapeados en `NavigationContainer` (o usar un mock). Ver tests de `match-history-screen.test.tsx` como referencia.

5. **@expo/vector-icons**: Ya instalado en el proyecto (dependencia de Expo SDK). No necesita instalación adicional.

---

### 🏷️ Convenciones de naming

| Elemento | Convención | Ejemplo |
|---|---|---|
| Component | PascalCase | `BuyerTabBar`, `ProfileScreen` |
| File | kebab-case | `buyer-tab-bar.tsx`, `profile-screen.tsx` |
| Hook | camelCase con `use` prefix | `useUserRole`, `useMatchStore` |
| Store | `use-{domain}-store.ts` | `use-match-store.ts` |
| Test | co-located | `buyer-tab-bar.test.tsx` |

---

### Referencias

- [App.tsx actual] `apps/mobile/App.tsx` — ver comentarios "Story 2.7" y "Story 2.8"
- [GlassPanel] `apps/mobile/src/components/ui/glass-panel.tsx`
- [useAuthSession] `apps/mobile/src/hooks/useAuthSession.ts`
- [tokens.ts] `apps/mobile/src/lib/tokens.ts`
- [MatchHistoryScreen] `apps/mobile/src/features/matches/screens/match-history-screen.tsx`
- [SwipeScreen] `apps/mobile/src/features/swipe/screens/swipe-screen.tsx`
- [epics.md: Story 2.8] `_bmad-output/planning-artifacts/epics.md#story-28`
- [UX-DR8] `_bmad-output/planning-artifacts/ux-design-specification.md` — TabBar spec

## Dev Agent Record

### Agent Model Used

Antigravity — BAD Pipeline (Steps 1–3) — 2026-04-26

### Completion Notes List

- ✅ Task 1: ProfileScreen placeholder implementado con `ScreenBackground` y `testID` (3/3 tests PASS)
- ✅ Task 2: `BuyerTabBar` — `getBuyerTabBarScreenOptions()` exporta config completa con GlassPanel `light`, height 60, Ionicons (11/11 tests PASS)
- ✅ Task 3: Badge `tabBarBadge` en tab Matches con `newMatchesSinceLastVisit`; `markVisited()` en `tabPress` listener
- ✅ Task 4: App.tsx actualizado — 3 tabs (Swipe/Matches/Profile), GlassPanel TabBar, `BuyerTabParamList` extendido
- ✅ Task 5: `useUserRole` hook — lee `user_metadata.role`, fallback 'buyer' (4/4 tests PASS)
- ✅ Task 6: `use-match-store.ts` — wrapper sobre `useMatchHistoryStore` (3/3 tests PASS)
- ✅ Task 7: Regresión completa 132/132 PASS (18 suites, 0 fallos)

**Nota de implementación**: El `use-match-store.ts` es un wrapper sobre el `useMatchHistoryStore` existente (Story 2.7) en lugar de un store independiente. Esto evita duplicar estado y mantiene `newMatchesSinceLastVisit` como fuente única de verdad para el badge.

### File List

```
CREADOS:
  apps/mobile/src/features/profile/screens/profile-screen.tsx
  apps/mobile/src/features/profile/screens/profile-screen.test.tsx
  apps/mobile/src/components/navigation/buyer-tab-bar.tsx
  apps/mobile/src/components/navigation/buyer-tab-bar.test.tsx
  apps/mobile/src/hooks/useUserRole.ts
  apps/mobile/src/hooks/useUserRole.test.ts
  apps/mobile/src/stores/use-match-store.ts
  apps/mobile/src/stores/use-match-store.test.ts

MODIFICADOS:
  apps/mobile/App.tsx

ATDD TESTS (en worktree):
  apps/mobile/src/components/navigation/buyer-tab-bar.test.tsx (también ATDD)
  apps/mobile/src/hooks/useUserRole.test.ts (también ATDD)
```

## Change Log

- **2026-04-26 (BAD Step 1 — story creation):** Story 2.8 creada por el pipeline BAD. Status: ready-for-dev.
- **2026-04-26 (BAD Step 2 — ATDD):** Tests de aceptación generados (TDD red phase). Commit: `af5febe`.
- **2026-04-26 (BAD Step 3 — dev):** Implementación completa. 132/132 tests PASS. Status: review.
