# 🦌 Reinder — Swipe. Match. Move.

> Plataforma B2B2C de descubrimiento inmobiliario basada en swipe.

---

## 📋 BMAD Method — Estado del Proyecto

Este documento muestra el progreso del proyecto Reinder a través del **BMAD Method** (BMM Module v6.1.0).  
Cada paso se ejecuta en un **contexto nuevo** (nueva conversación). Los pasos de validación se recomienda ejecutarlos con un LLM diferente al que generó el artefacto.

> **Idioma de comunicación:** Español  
> **Usuario:** SantiCas  
> **Nivel:** Intermedio

---

### Fase 1 — Análisis ✅

Fase opcional de investigación y descubrimiento del producto.

| # | Paso | Agente | Comando | Requerido | Estado |
|---|------|--------|---------|-----------|--------|
| 1 | 🧠 Brainstorm Project | 📊 Mary (Business Analyst) | `bmad-brainstorming` | ❌ Opcional | ✅ Completado |
| 2 | 📈 Market Research | 📊 Mary (Business Analyst) | `bmad-bmm-market-research` | ❌ Opcional | ⬜ No ejecutado |
| 3 | 🔍 Domain Research | 📊 Mary (Business Analyst) | `bmad-bmm-domain-research` | ❌ Opcional | ⬜ No ejecutado |
| 4 | 🛠️ Technical Research | 📊 Mary (Business Analyst) | `bmad-bmm-technical-research` | ❌ Opcional | ⬜ No ejecutado |
| 5 | 📝 Create Brief | 📊 Mary (Business Analyst) | `bmad-bmm-create-product-brief` | ❌ Opcional | ✅ Completado |

---

### Fase 2 — Planning ✅

Definición del producto: PRD, diseño UX y especificaciones.

| # | Paso | Agente | Comando | Requerido | Estado |
|---|------|--------|---------|-----------|--------|
| 6 | 📋 Create PRD | 📋 John (Product Manager) | `bmad-bmm-create-prd` | ✅ **Requerido** | ✅ Completado |
| 7 | ✔️ Validate PRD | 📋 John (Product Manager) | `bmad-bmm-validate-prd` | ❌ Opcional | ✅ Completado |
| 8 | ✏️ Edit PRD | 📋 John (Product Manager) | `bmad-bmm-edit-prd` | ❌ Opcional | ✅ Completado |
| 9 | 🎨 Create UX Design | 🎨 Sally (UX Designer) | `bmad-bmm-create-ux-design` | ❌ Opcional | ✅ Completado |

**Artefactos generados:**
- [`prd.md`](_bmad-output/planning-artifacts/prd.md) — Documento de Requisitos del Producto
- [`ux-design-specification.md`](_bmad-output/planning-artifacts/ux-design-specification.md) — Especificación UX
- [`ux-design-directions.html`](_bmad-output/planning-artifacts/ux-design-directions.html) — Direcciones de diseño visual

---

### Fase 3 — Solutioning ✅

Arquitectura técnica, épicas y validación de preparación para implementación.

| # | Paso | Agente | Comando | Requerido | Estado |
|---|------|--------|---------|-----------|--------|
| 10 | 🏗️ Create Architecture | 🏗️ Winston (Architect) | `bmad-bmm-create-architecture` | ✅ **Requerido** | ✅ Completado |
| 11 | 📦 Create Epics & Stories | 📋 John (Product Manager) | `bmad-bmm-create-epics-and-stories` | ✅ **Requerido** | ✅ Completado |
| 12 | 🔍 Check Implementation Readiness | 🏗️ Winston (Architect) | `bmad-bmm-check-implementation-readiness` | ✅ **Requerido** | ⬜ No ejecutado |

**Artefactos generados:**
- [`architecture.md`](_bmad-output/planning-artifacts/architecture.md) — Documento de Arquitectura
- [`epics.md`](_bmad-output/planning-artifacts/epics.md) — Épicas y Historias de Usuario

> [!WARNING]
> El paso **Check Implementation Readiness** (`bmad-bmm-check-implementation-readiness`) es requerido pero no fue ejecutado formalmente. La implementación procedió sin validación explícita de preparación.

---

### Fase 4 — Implementation 🚧 En Progreso

Ciclo de desarrollo: sprint planning → crear story → desarrollar → code review → retrospectiva.

| # | Paso | Agente | Comando | Requerido | Estado |
|---|------|--------|---------|-----------|--------|
| 13 | 🏃 Sprint Planning | 🏃 Bob (Scrum Master) | `bmad-bmm-sprint-planning` | ✅ **Requerido** | ✅ Completado |
| 14 | 📊 Sprint Status | 🏃 Bob (Scrum Master) | `bmad-bmm-sprint-status` | ❌ Opcional | ♻️ Usar cuando sea necesario |
| 15 | 📝 Create Story | 🏃 Bob (Scrum Master) | `bmad-bmm-create-story` | ✅ **Requerido** | 🔄 Por cada story |
| 16 | ✔️ Validate Story | 🏃 Bob (Scrum Master) | `bmad-bmm-create-story` (Validate Mode) | ❌ Opcional | 🔄 Por cada story |
| 17 | 💻 Dev Story | 💻 Amelia (Developer) | `bmad-bmm-dev-story` | ✅ **Requerido** | 🔄 Por cada story |
| 18 | 🧪 QA Automation Test | 🧪 Quinn (QA Engineer) | `bmad-bmm-qa-automate` | ❌ Opcional | 🔄 Por cada story |
| 19 | 🔍 Code Review | 💻 Amelia (Developer) | `bmad-bmm-code-review` | ❌ Opcional | 🔄 Por cada story |
| 20 | 📝 Retrospective | 🏃 Bob (Scrum Master) | `bmad-bmm-retrospective` | ❌ Opcional | 🔄 Por cada epic |

#### Ciclo de Story (repetir para cada story):
```
Create Story → [Validate Story] → Dev Story → [QA Automation] → [Code Review] → ↩ (siguiente story)
```

#### Progreso de Épicas

| Epic | Nombre | Stories | Estado |
|------|--------|---------|--------|
| **Epic 1** | Identidad y Acceso | 6/6 done | ✅ **Completado** |
| **Epic 2** | Swipe Loop | 5/9 done, 1 ready-for-dev, 3 backlog | 🚧 **En Progreso** |
| **Epic 3** | Vínculo Comprador–Agente | 0/4 | ⬜ Backlog |
| **Epic 4** | Panel del Agente Representante | 0/4 | ⬜ Backlog |
| **Epic 5** | Gestión de Listings e Integración CRM | 0/4 | ⬜ Backlog |
| **Epic 6** | Descubrimiento Orgánico y SEO | 0/3 | ⬜ Backlog |
| **Epic 7** | Administración de Plataforma | 0/4 | ⬜ Backlog |

**Siguiente Story:** `2-9-filtros-busqueda-buyer-onboarding` (ready-for-dev)

---

### Herramientas "Anytime" 🔧

Estas herramientas se pueden usar en cualquier momento, en cualquier fase.

| Paso | Agente | Comando | Descripción |
|------|--------|---------|-------------|
| 📄 Document Project | 📊 Mary (Business Analyst) | `bmad-bmm-document-project` | Analizar proyecto existente y producir documentación |
| 🤖 Generate Project Context | 📊 Mary (Business Analyst) | `bmad-bmm-generate-project-context` | Generar `project-context.md` optimizado para LLMs |
| ⚡ Quick Spec | 🚀 Barry (Quick Flow Solo Dev) | `bmad-bmm-quick-spec` | Spec rápido para cambios pequeños |
| ⚡ Quick Dev | 🚀 Barry (Quick Flow Solo Dev) | `bmad-bmm-quick-dev` | Dev rápido sin planificación extensiva |
| ⚡ Quick Dev (Unified) | 🚀 Barry (Quick Flow Solo Dev) | `bmad-bmm-quick-dev-new-preview` | Quick flow unificado (experimental) |
| 🔄 Correct Course | 🏃 Bob (Scrum Master) | `bmad-bmm-correct-course` | Navegar cambios significativos en el plan |
| 📚 Write Document | 📚 Paige (Technical Writer) | Cargar agente `bmad-tech-writer`, luego pedir "WD" | Redacción técnica con best practices |
| 📏 Update Standards | 📚 Paige (Technical Writer) | Cargar agente `bmad-tech-writer`, luego pedir "US" | Actualizar estándares de documentación |
| 📊 Mermaid Generate | 📚 Paige (Technical Writer) | Cargar agente `bmad-tech-writer`, luego pedir "MG" | Generar diagramas Mermaid |
| ✔️ Validate Document | 📚 Paige (Technical Writer) | Cargar agente `bmad-tech-writer`, luego pedir "VD" | Validar documento contra estándares |
| 🎓 Explain Concept | 📚 Paige (Technical Writer) | Cargar agente `bmad-tech-writer`, luego pedir "EC" | Explicar conceptos técnicos complejos |
| 🧠 Brainstorming | 📊 Mary (Business Analyst) | `bmad-brainstorming` | Sesiones de brainstorming interactivas |
| 🎉 Party Mode | — | `bmad-party-mode` | Discusiones multi-agente orquestadas |
| ❓ BMAD Help | — | `bmad-help` | Ver siguiente paso recomendado |
| 📇 Index Docs | — | `bmad-index-docs` | Crear índice ligero para documentos |
| ✂️ Shard Document | — | `bmad-shard-doc` | Dividir documentos grandes en archivos menores |
| 📝 Editorial Review (Prose) | — | `bmad-editorial-review-prose` | Revisar prosa: claridad, tono, comunicación |
| 📐 Editorial Review (Structure) | — | `bmad-editorial-review-structure` | Revisar estructura: cortes, reorganización |
| ⚔️ Adversarial Review | — | `bmad-review-adversarial-general` | Revisión crítica para encontrar debilidades |
| 🔎 Edge Case Hunter | — | `bmad-review-edge-case-hunter` | Encontrar edge cases no manejados |

---

### Módulos Adicionales Instalados

#### CIS — Creative Intelligence Suite (v0.1.8)

| Paso | Agente | Comando | Descripción |
|------|--------|---------|-------------|
| ⚡ Innovation Strategy | ⚡ Victor (Innovation Oracle) | `bmad-cis-innovation-strategy` | Identificar oportunidades de disrupción |
| 🔬 Problem Solving | 🔬 Dr. Quinn (Problem Solver) | `bmad-cis-problem-solving` | Metodologías de resolución de problemas |
| 🎨 Design Thinking | 🎨 Maya (Design Thinking Maestro) | `bmad-cis-design-thinking` | Procesos de diseño centrados en el humano |
| 🧠 Brainstorming | 🧠 Carson (Brainstorming Specialist) | `bmad-cis-brainstorming` | Sesiones de brainstorming con técnicas creativas |
| 📖 Storytelling | 📖 Sophia (Master Storyteller) | `bmad-cis-storytelling` | Narrativas con frameworks de storytelling |

#### TEA — Test Architecture Enterprise (v1.7.0)

| Fase | Paso | Agente | Comando | Descripción |
|------|------|--------|---------|-------------|
| Learning | 🎓 Teach Me Testing | 🧪 Murat (Test Architect) | `bmad-tea-teach-me-testing` | Academia de testing (7 sesiones) |
| Solutioning | 📋 Test Design | 🧪 Murat (Test Architect) | `bmad-tea-testarch-test-design` | Planificación de tests basada en riesgo |
| Solutioning | 🔧 Test Framework | 🧪 Murat (Test Architect) | `bmad-tea-testarch-framework` | Inicializar framework de testing |
| Solutioning | ⚙️ CI Setup | 🧪 Murat (Test Architect) | `bmad-tea-testarch-ci` | Configurar pipeline CI/CD de calidad |
| Implementation | 🔴 ATDD | 🧪 Murat (Test Architect) | `bmad-tea-testarch-atdd` | Generar tests que fallen (TDD red phase) |
| Implementation | 🧪 Test Automation | 🧪 Murat (Test Architect) | `bmad-tea-testarch-automate` | Expandir cobertura de tests |
| Implementation | ✔️ Test Review | 🧪 Murat (Test Architect) | `bmad-tea-testarch-test-review` | Auditoría de calidad (scoring 0-100) |
| Implementation | 📊 NFR Assessment | 🧪 Murat (Test Architect) | `bmad-tea-testarch-nfr` | Evaluar requisitos no funcionales |
| Implementation | 🔗 Traceability | 🧪 Murat (Test Architect) | `bmad-tea-testarch-trace` | Matriz de trazabilidad y gate de calidad |

#### WDS — Web Design System (v0.3.0)

| Fase | Paso | Agente | Comando | Descripción |
|------|------|--------|---------|-------------|
| Agents | 📚 Wake Saga | 📚 Saga (WDS Analyst) | `bmad-wds-saga` | Despertar agente de estrategia (Fases 1-2) |
| Agents | 🎨 Wake Freya | 🎨 Freya (WDS Designer) | `bmad-wds-freya` | Despertar agente de diseño (Fases 3-4) |
| Pitch | 🤝 Alignment & Signoff | 📚 Saga (WDS Analyst) | `bmad-wds-alignment` | Alineación con stakeholders (opcional) |
| Strategy | 📝 Project Brief | 📚 Saga (WDS Analyst) | `bmad-wds-project-brief` | **Requerido.** Visión del producto |
| Strategy | 🗺️ Trigger Mapping | 📚 Saga (WDS Analyst) | `bmad-wds-trigger-mapping` | **Requerido.** Mapeo de triggers psicológicos |
| Strategy | 🖥️ Platform Requirements | 📚 Saga (WDS Analyst) | `bmad-wds-platform-requirements` | Requisitos de plataforma (opcional) |
| Design | 📋 Outline Scenarios | 🎨 Freya (WDS Designer) | `bmad-wds-outline-scenarios` | **Requerido.** Definir journeys de usuario |
| Design | ✏️ Conceptual Sketching | 🎨 Freya (WDS Designer) | `bmad-wds-conceptual-sketching` | Exploración visual rápida (opcional) |
| Design | 🎬 Storyboarding | 🎨 Freya (WDS Designer) | `bmad-wds-storyboarding` | Secuencia del journey (opcional) |
| Design | 📄 Conceptual Specifications | 🎨 Freya (WDS Designer) | `bmad-wds-conceptual-specs` | **Requerido.** Specs detalladas de cada página |
| Design | 🧩 Functional Components | 🎨 Freya (WDS Designer) | `bmad-wds-functional-components` | Identificar componentes reutilizables |
| Design | 🎨 Visual Design | 🎨 Freya (WDS Designer) | `bmad-wds-visual-design` | Prototipos visuales estilizados |
| Design | 🎛️ Design System | 🎨 Freya (WDS Designer) | `bmad-wds-design-system` | Gestionar librería de componentes |
| Design | 📦 Design Delivery | 🎨 Freya (WDS Designer) | `bmad-wds-design-delivery` | **Requerido.** Validar y empaquetar para desarrollo |
| Build | 🤖 Agentic Development | 📋 John (Product Manager) | `bmad-wds-agentic-development` | Desarrollo iterativo con tracking |
| Build | 🧪 Acceptance Testing | 🎨 Freya (WDS Designer) | `bmad-wds-usability-testing` | Test con usuarios reales |
| Build | 🔄 Product Evolution | 🎨 Freya (WDS Designer) | `bmad-wds-product-evolution` | Mejora continua de productos existentes |

---

## 🗂️ Artefactos del Proyecto

| Artefacto | Ruta |
|-----------|------|
| PRD | [`_bmad-output/planning-artifacts/prd.md`](_bmad-output/planning-artifacts/prd.md) |
| UX Design Specification | [`_bmad-output/planning-artifacts/ux-design-specification.md`](_bmad-output/planning-artifacts/ux-design-specification.md) |
| UX Design Directions | [`_bmad-output/planning-artifacts/ux-design-directions.html`](_bmad-output/planning-artifacts/ux-design-directions.html) |
| Architecture | [`_bmad-output/planning-artifacts/architecture.md`](_bmad-output/planning-artifacts/architecture.md) |
| Epics & Stories | [`_bmad-output/planning-artifacts/epics.md`](_bmad-output/planning-artifacts/epics.md) |
| Sprint Status | [`_bmad-output/implementation-artifacts/sprint-status.yaml`](_bmad-output/implementation-artifacts/sprint-status.yaml) |
| Future Ideas | [`_bmad-output/planning-artifacts/future-ideas.md`](_bmad-output/planning-artifacts/future-ideas.md) |
| Roadmap | [`_bmad-output/planning-artifacts/roadmap.md`](_bmad-output/planning-artifacts/roadmap.md) |

---

## 🏗️ Tech Stack

| Área | Tecnología |
|------|-----------|
| Monorepo | Turborepo + pnpm workspaces |
| Web | Next.js 15 (App Router) → Vercel |
| Mobile | Expo (React Native) → EAS |
| Shared | `packages/shared` — tipos, schema Drizzle, constantes |
| Backend | Supabase (PostgreSQL + Auth + Realtime + Storage) |
| ORM | Drizzle ORM |
| Auth | Supabase Auth — email/password + Google OAuth |
| Animaciones | React Native Reanimated 3 |
| Estado | Zustand |
| Design System | Clash Display + Inter, base 8px, glassmorphism |

---

## 🚀 Quick Start

```bash
# Instalar dependencias
pnpm install

# Desarrollo (todos los apps)
pnpm dev

# Solo web
pnpm --filter web dev

# Solo mobile
pnpm --filter mobile start
```

---

## 📄 Licencia

Proyecto privado — Todos los derechos reservados.
