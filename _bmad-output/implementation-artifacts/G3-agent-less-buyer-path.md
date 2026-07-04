# Story G3: Agent-less Buyer Path — Próximos Pasos para Compradores sin Agente

Status: ready-for-dev

## Story

Como comprador sin agente representante vinculado,
quiero recibir orientación clara sobre los próximos pasos después de hacer match con una propiedad,
para que pueda tomar acciones significativas (vincular agente, coordinar visitas) sin sentir que el producto termina en el swipe.

## Acceptance Criteria

1. **Given** un comprador sin agente vinculado (sin bond activo) **When** aparece el `MatchRecapScreen` tras acumular 3-5 matches consecutivos **Then** se muestra un CTA contextual debajo de la lista de recap cards: "¿Quieres visitar estas propiedades? Vincula a tu agente" — con ícono 🤝 y estilo `GlassPanel level="light"`, enlazando a información sobre cómo obtener un link de agente

2. **Given** un comprador sin agente vinculado **When** accede al historial de matches (mobile: `MatchHistoryScreen`, web: `/matches`) **Then** se muestra un banner informativo fijo en la parte superior de la lista: "Para coordinar visitas y recibir asesoría personalizada, vincula a un agente de confianza" — con CTA "Saber más" que muestra un bottom sheet (mobile) o modal (web) explicando el proceso

3. **Given** un comprador sin agente vinculado **When** accede al home del comprador (mobile: tab Home si existe, web: `/home`) **Then** se muestra una tarjeta prominente en el dashboard: "Paso siguiente: pide a tu agente que te envíe su link de Reinder" — con explicación del valor: "Tu agente coordinará visitas, negociará por ti y tendrá acceso a tus matches para actuar rápido" — ubicada justo debajo del welcome header, antes de los matches recientes

4. **Given** un comprador sin agente vinculado que ve cualquier CTA de "vincular agente" **When** pulsa en el CTA **Then** ve un panel explicativo (bottom sheet en mobile, modal en web) con: (a) "¿Ya tienes agente? Pídele que te envíe su link de Reinder" con instrucciones paso a paso, (b) "¿Eres agente? Regístrate aquí" como CTA secundario para que agentes que llegan vía boca a boca del comprador puedan registrarse, (c) Valor del agente en 3 bullets: visitas coordinadas, acceso a tus matches, negociación profesional

5. **Given** un comprador sin agente vinculado **When** accede a su perfil (mobile: `ProfileScreen`, web: `/profile`) **Then** se muestra en la sección de información: estado de vínculo "Sin agente vinculado" con badge `textMuted`, acompañado de un CTA "¿Cómo vincular a mi agente?" que abre el panel explicativo del AC4

6. **Given** un comprador sin agente vinculado **When** interactúa con todos los CTAs de esta story **Then** NUNCA se bloquea la funcionalidad core de swipe, feed o historial de matches — todos los elementos son **additive UX nudges** (banners, cards, CTAs inline) que se superponen al flujo existente sin eliminarlo

7. **Given** un comprador que SÍ tiene agente vinculado (bond activo) **When** navega por cualquier pantalla de la app **Then** NINGUNO de los elementos de esta story se muestra — los banners, CTAs y tarjetas de "vincular agente" están condicionados a `bond === null`

## Tasks / Subtasks

- [ ] **Task 1 — Mobile: componente compartido `AgentLinkExplainerSheet`** (AC: 4)
  - [ ] Crear `apps/mobile/src/features/agent-link/components/agent-link-explainer-sheet.tsx`
  - [ ] Bottom sheet con `GlassPanel level="medium"` conteniendo:
    - Header: "Vincula a tu agente" con ícono 🤝
    - Sección 1: "¿Ya tienes agente?" — texto explicativo + pasos: "1. Pide a tu agente su link de Reinder → 2. Abre el link → 3. ¡Vinculados!"
    - Sección 2: "¿Por qué un agente?" — 3 bullets con íconos: 🗓️ "Coordina visitas directamente", 💜 "Ve tus matches y actúa rápido", 💼 "Negocia profesionalmente por ti"
    - CTA secundario: "¿Eres agente? Regístrate aquí" — `Button variant="ghost"` que abre URL de registro de agente (deep link o web URL)
  - [ ] Props: `visible: boolean`, `onClose: () => void`
  - [ ] Tests: render, secciones visibles, tap en CTAs

- [ ] **Task 2 — Mobile: CTA en `MatchRecapScreen`** (AC: 1, 6)
  - [ ] Modificar `apps/mobile/src/features/swipe/screens/match-recap-screen.tsx`
  - [ ] Importar hook `useAgentBond` (o equivalente mobile) para detectar estado de bond
  - [ ] Si `bond === null`: renderizar un `GlassPanel level="light"` debajo del `FlatList` (en `ListFooterComponent`), antes del botón "Gestionar después"
  - [ ] Contenido: ícono 🤝 + texto "¿Quieres visitar estas propiedades?" + CTA "Vincula a tu agente" que abre `AgentLinkExplainerSheet`
  - [ ] Si `bond !== null`: no renderizar nada adicional (comportamiento actual)
  - [ ] Tests: CTA visible sin bond, oculto con bond, tap abre sheet

- [ ] **Task 3 — Mobile: banner en `MatchHistoryScreen`** (AC: 2, 6)
  - [ ] Modificar `apps/mobile/src/features/matches/screens/match-history-screen.tsx`
  - [ ] Si `bond === null`: renderizar banner fijo en `ListHeaderComponent` del FlatList de matches
  - [ ] Banner: fondo `accentPrimary + '12'` (naranja traslúcido), border `accentPrimary + '30'`, ícono 🤝 + texto + CTA "Saber más" que abre `AgentLinkExplainerSheet`
  - [ ] Banner dismissible: tap en ✕ oculta el banner para la sesión (state local, reaparece al reabrir)
  - [ ] Tests: banner visible sin bond, oculto con bond, dismiss funciona

- [ ] **Task 4 — Mobile: tarjeta "Próximo paso" en home/swipe** (AC: 3)
  - [ ] Evaluar dónde vive el "home" en mobile — si no hay tab Home dedicada, la tarjeta se muestra como componente insertado en el header de `SwipeScreen` cuando `bond === null`
  - [ ] Crear `apps/mobile/src/features/agent-link/components/next-step-card.tsx`
  - [ ] Tarjeta con `GlassPanel level="medium"`: título "Paso siguiente", subtítulo "Pide a tu agente que te envíe su link de Reinder", valor prop en 1 línea, CTA que abre `AgentLinkExplainerSheet`
  - [ ] Debe ser compacta y no ocupar más de ~120px de alto para no robar espacio al feed
  - [ ] Tests: render, tap CTA, no aparece con bond

- [ ] **Task 5 — Mobile: estado de vínculo en `ProfileScreen`** (AC: 5)
  - [ ] Modificar `apps/mobile/src/features/profile/screens/profile-screen.tsx`
  - [ ] Añadir sección "Agente representante" en el perfil
  - [ ] Si `bond !== null`: mostrar nombre del agente + badge "✓ Activo" (verde) + fecha de vinculación
  - [ ] Si `bond === null`: mostrar "Sin agente vinculado" con badge `textMuted` + CTA "¿Cómo vincular a mi agente?" que abre `AgentLinkExplainerSheet`
  - [ ] Tests: render ambos estados, tap CTA

- [ ] **Task 6 — Web: componente `AgentLinkExplainerModal`** (AC: 4)
  - [ ] Crear `apps/web/src/features/agent-link/components/AgentLinkExplainerModal.tsx` (client component)
  - [ ] Modal overlay centrado con las mismas 3 secciones que la versión mobile
  - [ ] Reutilizar estilos del design system web (`.card`, `var(--accent-primary)`, `var(--text-muted)`)
  - [ ] CTA "¿Eres agente? Regístrate aquí" → link a `/register?role=agent` o URL equivalente
  - [ ] Tests: render, secciones visibles, cerrar modal

- [ ] **Task 7 — Web: actualizar home page `/home` para estado sin agente** (AC: 3, 7)
  - [ ] Modificar `apps/web/src/app/(protected)/home/page.tsx`
  - [ ] La sección "Tu agente representante" (`bond` null state, líneas 337-347) ya muestra un texto pasivo — **reemplazar** con una tarjeta más proactiva:
    - Título: "Paso siguiente: vincula a tu agente"
    - Subtítulo con valor prop: "Tu agente coordinará visitas, verá tus matches y negociará por ti"
    - CTA: "¿Cómo vincular?" que abre `AgentLinkExplainerModal`
  - [ ] Añadir una tarjeta nueva en posición prominente (antes de los matches recientes, `gridColumn: 1 / -1`) cuando `bond === null`:
    - Fondo con gradiente naranja sutil: `linear-gradient(135deg, rgba(255,107,0,0.06) 0%, var(--bg-surface) 100%)`
    - Ícono 🤝 + texto "Pide a tu agente de confianza que te envíe su link de Reinder"
    - CTA botón secondary
  - [ ] Tests: tarjeta visible sin bond, oculta con bond

- [ ] **Task 8 — Web: banner en `/matches`** (AC: 2)
  - [ ] Modificar `apps/web/src/app/(protected)/matches/page.tsx`
  - [ ] Si `bond === null`: renderizar banner informativo en la parte superior de la galería de matches
  - [ ] Misma copy que mobile: "Para coordinar visitas y recibir asesoría personalizada, vincula a un agente de confianza"
  - [ ] CTA: "Saber más" abre `AgentLinkExplainerModal`
  - [ ] Tests: banner visible sin bond, oculto con bond

- [ ] **Task 9 — Web: estado de vínculo en `/profile`** (AC: 5)
  - [ ] Modificar `apps/web/src/app/(protected)/profile/page.tsx`
  - [ ] Añadir sección "Agente representante" con los mismos dos estados (con agente / sin agente) que la versión mobile
  - [ ] Sin agente: badge "Sin agente vinculado" + CTA que abre `AgentLinkExplainerModal`
  - [ ] Tests: render ambos estados

- [ ] **Task 10 — Hook mobile: `useAgentBond` (o reutilizar existente)** (AC: 1, 2, 3, 5, 6, 7)
  - [ ] Verificar si existe un hook mobile equivalente a `useBuyerBond` de web
  - [ ] Si no existe: crear `apps/mobile/src/hooks/use-agent-bond.ts` que fetch el estado del bond del buyer actual via API
  - [ ] Return type: `{ bond: AgentBond | null, isLoading: boolean }`
  - [ ] Si ya existe lógica de bond en mobile (ej. en stores o context), reutilizarla
  - [ ] Tests: hook con bond, hook sin bond, loading state

- [ ] **Task 11 — Verificación typecheck y tests** (AC: todos)
  - [ ] `pnpm --filter @reinder/shared typecheck` → 0 errores
  - [ ] `pnpm --filter @reinder/mobile typecheck` → 0 errores
  - [ ] `pnpm --filter @reinder/mobile test` → todos los tests pasan
  - [ ] `pnpm --filter @reinder/web typecheck` → 0 errores
  - [ ] `pnpm --filter @reinder/web test` → todos los tests pasan

## Dev Notes

### 🗂️ Nuevos Componentes

```
apps/mobile/src/features/agent-link/
  components/
    agent-link-explainer-sheet.tsx        ← Bottom sheet explicativo compartido
    agent-link-explainer-sheet.test.tsx
    next-step-card.tsx                   ← Tarjeta "Próximo paso" compacta
    next-step-card.test.tsx

apps/web/src/features/agent-link/
  components/
    AgentLinkExplainerModal.tsx          ← Modal explicativo para web
    AgentLinkExplainerModal.test.tsx
```

---

### 📦 Archivos a crear/modificar

```
CREAR:
  apps/mobile/src/features/agent-link/components/agent-link-explainer-sheet.tsx
  apps/mobile/src/features/agent-link/components/agent-link-explainer-sheet.test.tsx
  apps/mobile/src/features/agent-link/components/next-step-card.tsx
  apps/mobile/src/features/agent-link/components/next-step-card.test.tsx
  apps/mobile/src/hooks/use-agent-bond.ts                    ← solo si no existe
  apps/mobile/src/hooks/use-agent-bond.test.ts
  apps/web/src/features/agent-link/components/AgentLinkExplainerModal.tsx
  apps/web/src/features/agent-link/components/AgentLinkExplainerModal.test.tsx

MODIFICAR:
  apps/mobile/src/features/swipe/screens/match-recap-screen.tsx   ← CTA "vincular agente"
  apps/mobile/src/features/matches/screens/match-history-screen.tsx ← banner sin agente
  apps/mobile/src/features/profile/screens/profile-screen.tsx     ← sección estado vínculo
  apps/web/src/app/(protected)/home/page.tsx                      ← tarjeta proactiva sin bond
  apps/web/src/app/(protected)/matches/page.tsx                   ← banner sin agente
  apps/web/src/app/(protected)/profile/page.tsx                   ← sección estado vínculo
```

---

### 🧠 Filosofía de Diseño: Nudges, No Bloqueos

**El insight clave de esta story:** los compradores sin agente NO son ciudadanos de segunda clase. Pueden hacer swipe, hacer match, revisar su historial — toda la funcionalidad core sigue funcionando. Lo que falta son los **próximos pasos**.

Esta story NO:
- ❌ Bloquea el swipe feed
- ❌ Muestra un "paywall" de agente
- ❌ Degrada la experiencia de matching
- ❌ Fuerza la vinculación de agente

Esta story SÍ:
- ✅ Orienta al buyer sobre qué hacer después del match
- ✅ Explica el valor de tener un agente representante
- ✅ Facilita el descubrimiento del flujo de referral link
- ✅ Ofrece un path para agentes que llegan vía boca a boca

---

### 🎨 Copy y Textos UI

| Ubicación | Texto principal | CTA |
|---|---|---|
| MatchRecapScreen | "¿Quieres visitar estas propiedades?" | "Vincula a tu agente" |
| Match History banner | "Para coordinar visitas, vincula a un agente de confianza" | "Saber más" |
| Home card | "Paso siguiente: pide a tu agente que te envíe su link de Reinder" | "¿Cómo vincular?" |
| Profile section | "Sin agente vinculado" | "¿Cómo vincular a mi agente?" |
| Explainer panel — título | "Vincula a tu agente" | — |
| Explainer — paso 1 | "Pide a tu agente su link de Reinder" | — |
| Explainer — paso 2 | "Abre el link desde tu móvil" | — |
| Explainer — paso 3 | "¡Vinculados! Tu agente verá tus matches" | — |
| Explainer — bullets valor | "🗓️ Coordina visitas · 💜 Ve tus matches · 💼 Negocia por ti" | — |
| Explainer — CTA agente | "¿Eres agente?" | "Regístrate aquí" |

---

### 🎨 Estilo Visual de los Nudges

- **MatchRecapScreen CTA:** `GlassPanel level="light"` con borde `accentPrimary + '20'` — sutil, no compite con las recap cards
- **Match History banner:** fondo `accentPrimary + '08'`, borde `accentPrimary + '20'`, `borderRadius: 12px`, ícono 🤝 a la izquierda, ✕ para dismiss a la derecha
- **Home card:** tratamiento similar a la tarjeta de "App CTA" existente en la home page web — gradiente naranja sutil, full-width
- **Profile badge:** pill con borde `textMuted`, fontSize `sizeSmall`, estilo discreto

---

### 🔗 Componentes Existentes Reutilizados

- **`NoAgentBanner`** (`apps/web/src/features/agent-link/components/listing-agent-overlay.tsx`): Banner existente en web para listing detail page. Su copy actual es "¿Tienes un agente? Pídele tu link de Reinder" — usar como inspiración pero NO reutilizar directamente (es demasiado compacto para los CTAs de esta story)
- **`useBuyerBond`** (`apps/web/src/features/agent-link/hooks/use-buyer-bond.ts`): Hook web existente que devuelve `{ bond, isLoading }` — el patrón a replicar en mobile
- **`BuyerBondOverlay`** (`apps/web/src/components/layout/BuyerBondOverlay.tsx`): Componente web que ya usa `useBuyerBond` — referencia para el patrón de integración
- **`GlassPanel`** (`apps/mobile/src/components/ui/glass-panel.tsx`): Contenedor glassmorphism del design system mobile
- **`Button`** (`apps/mobile/src/components/ui/button.tsx`): Botones del design system con variantes `primary`, `ghost`, `destructive`

---

### 🔗 Dependencias Cruzadas

- **Story 3.1/3.2 (done):** Referral tokens + agent-buyer bonds — la infraestructura de vinculación ya existe. G3 solo orienta al buyer hacia ella
- **Story 3.4 (done):** Sobreescritura de listing agent — la UI de "agente representante" ya funciona cuando hay bond
- **Story 2.6 (done):** MatchRecapScreen — se modifica para añadir CTA contextual
- **Story 2.7 (done):** Match history — se modifica para añadir banner
- **Gap G1:** El onboarding (G1) es complementario — un buyer puede pasar por G1 (configurar preferencias) y aún así necesitar G3 (orientación post-match). Son independientes
- **Web home page (11.3, done):** Ya tiene sección "Tu agente representante" con estado vacío pasivo — G3 la hace proactiva

---

### ⚠️ Edge Cases

1. **Bond expira durante la sesión:** Si un bond existente expira mientras el buyer navega, los nudges deberían aparecer. Considerar un refresh periódico del estado del bond (o websocket si disponible)
2. **Agente registrado pero sin buyers:** El CTA "¿Eres agente?" lleva a un flujo de registro de agente — asegurarse de que existe una ruta funcional (puede ser tan simple como link a la web de registro con `?role=agent`)
3. **Dismiss del banner de history:** El dismiss es por sesión (state local), no persistente — el banner reaparece si el buyer cierra y reabre la app. Esto es intencional: el nudge es valioso hasta que se vincule un agente
4. **Buyer con bond revocado/expirado:** Un bond con `status !== 'active'` debe tratarse igual que `null` para efectos de los nudges

---

### Referencias

- [roadmap.md: Gap G3](../../_bmad-output/planning-artifacts/roadmap.md) — Consolidación línea 136
- [NoAgentBanner](../../apps/web/src/features/agent-link/components/listing-agent-overlay.tsx) — Banner existente en web (L152-175)
- [useBuyerBond](../../apps/web/src/features/agent-link/hooks/use-buyer-bond.ts) — Hook web de bond status
- [MatchRecapScreen](../../apps/mobile/src/features/swipe/screens/match-recap-screen.tsx) — Pantalla a modificar (AC1)
- [match-history-screen.tsx](../../apps/mobile/src/features/matches/screens/match-history-screen.tsx) — Historial de matches mobile (AC2)
- [home/page.tsx](../../apps/web/src/app/(protected)/home/page.tsx) — Home web a modificar (AC3, L337-347)
- [profile-screen.tsx](../../apps/mobile/src/features/profile/screens/profile-screen.tsx) — Perfil mobile a modificar (AC5)
- [schema.ts: agent_buyer_bonds](../../packages/shared/src/db/schema.ts) — Schema de bonds (L256-284)
- [prd.md: Agent model](../../_bmad-output/planning-artifacts/prd.md) — Modelo agente-comprador
- [Story 2.6: MatchRecapScreen](./2-6-match-recap-screen.md) — Story original del recap screen

## Change Log

- **2026-06-19 (story creation):** Story G3 creada como parte de la fase de Consolidación post-Epic 11. Gap identificado en sesión de party-mode multi-agente (2026-05-22). Impacto: 70% de buyers afectados. Status: ready-for-dev.
