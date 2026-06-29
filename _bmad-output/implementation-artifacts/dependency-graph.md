# Story Dependency Graph
_Last updated: 2026-06-22T17:09:00+02:00_

## Stories

| Story | Epic | Title | Sprint Status | Issue | PR | PR Status | Dependencies | Ready to Work |
|-------|------|-------|--------------|-------|----|-----------|--------------|---------------|
| 1.1 | 1 | Inicialización del Monorepo y Sistema de Diseño Base | done | — | — | — | none | ✅ Yes (done) |
| 1.2 | 1 | Configuración de Supabase y Schema de Base de Datos Inicial | done | — | — | — | 1.1 | ✅ Yes (done) |
| 1.3 | 1 | Registro de Comprador con Email y Aceptación de T&C | done | — | — | — | 1.2 | ✅ Yes (done) |
| 1.4 | 1 | Registro y Login con Google OAuth | done | — | — | — | 1.2 | ✅ Yes (done) |
| 1.5 | 1 | Login de Agente y Administrador de Agencia | done | — | — | — | 1.2 | ✅ Yes (done) |
| 1.6 | 1 | Protección de Rutas y Redirección de Usuarios No Autenticados | done | — | — | — | 1.3, 1.4, 1.5 | ✅ Yes (done) |
| 2.1 | 2 | Componentes Base — GlassPanel, PropertyBadge y Design Foundation | done | — | — | — | none | ✅ Yes (done) |
| 2.2 | 2 | Feed de Propiedades — PropertyCard y SwipeActions | done | — | — | — | 2.1 | ✅ Yes (done) |
| 2.3 | 2 | Gesto de Swipe con Match y MatchPayoff Animation | done | — | — | — | 2.2 | ✅ Yes (done) |
| 2.4 | 2 | Gesto de Descarte | done | — | — | — | 2.2 | ✅ Yes (done) |
| 2.5 | 2 | Vista de Detalle de Propiedad (Bottom Sheet) | done | — | — | — | 2.2 | ✅ Yes (done) |
| 2.6 | 2 | Match Recap Screen | done | — | — | — | 2.3 | ✅ Yes (done) |
| 2.7 | 2 | Historial de Matches y Badge "Nuevas Propiedades" | done | — | — | — | 2.3, 2.6 | ✅ Yes (done) |
| 2.8 | 2 | TabBar de Comprador con Navegación Rol-Based | done | — | — | — | 2.7 | ✅ Yes (done) |
| 2.9 | 2 | Filtros de Búsqueda — Buyer Onboarding y Edición en Sesión | done | — | — | — | 2.2 | ✅ Yes (done) |
| 3.1 | 3 | Generación de Link de Referral por el Agente | done | — | — | — | none (Epic 2 complete ✅) | ✅ Yes (done) |
| 3.2 | 3 | Aceptación del Vínculo por el Comprador vía Referral Link | done | — | — | — | 3.1 | ✅ Yes (done) |
| 3.3 | 3 | Reconfirmación Periódica y Desvinculación Voluntaria | done | — | — | — | 3.2 | ✅ Yes (done) |
| 3.4 | 3 | Sobreescritura del Listing Agent en la UI | done | — | — | — | 3.2 | ✅ Yes (done) |
| 4.1 | 4 | Lista de Clientes Vinculados — Panel del Agente | done | #1 | — | — | 3.2 | ✅ Yes (done) |
| 4.2 | 4 | Notificación en Tiempo Real de Match de Cliente | done | #2 | — | — | 4.1 | ✅ Yes (done) |
| 4.3 | 4 | Historial de Matches y Rechazos por Cliente | done | #3 | — | — | 4.1 | ✅ Yes (done) |
| 4.4 | 4 | Deep Link — Notificación → Detalle del Match | done | #4 | — | — | 4.2 | ✅ Yes (done) |
| 5.1 | 5 | Conexión de CRM Agencia — Inmovilla | done | — | — | — | Epic 2 complete | ✅ Yes (done) |
| 5.2 | 5 | Sincronización de Listings — Webhook + Batch Desacoplados | done | #5 | #8 | merged | 5.1 | ✅ Yes (done) |
| 5.3 | 5 | Validación de Exclusividad y Detección de Duplicados | done | #6 | #9 | merged | 5.2 | ✅ Yes (done) |
| 5.4 | 5 | Ciclo de Vida del Listing — Retirada y Vendida | done | #7 | #10 | merged | 5.2 | ✅ Yes (done) |
| 6.1 | 6 | Páginas de Listing SSR Indexables por Google | done | — | — | — | 5.2 | ✅ Yes (done) |
| 6.2 | 6 | Datos Estructurados schema.org en Páginas de Listing | done | — | — | — | 6.1 | ✅ Yes (done) |
| 6.3 | 6 | Gated Content — Preview para Usuarios No Autenticados | done | — | — | — | 6.1 | ✅ Yes (done) |
| 7.1 | 7 | CI/CD Pipeline y Observabilidad — Sentry + Analytics | done | — | — | — | Epic 2 complete | ✅ Yes (done) |
| 7.2 | 7 | Panel de Activación de Agencias | done | — | — | — | 7.1 | ✅ Yes (done) |
| 7.3 | 7 | Resolución de Listings Duplicados | done | — | — | — | 7.1, 5.3 | ✅ Yes (done) |
| 7.4 | 7 | Dashboard de Métricas Globales de Plataforma | done | — | — | — | 7.1 | ✅ Yes (done) |
| 8.1 | 8 | Schema de Engagement Events e Instrumentación Base | done | — | #18 | merged | Epic 2 complete | ✅ Yes (done) |
| 8.2 | 8 | Instrumentación de PropertyCard — Tiempo por Foto | done | — | #19 | merged | 8.1 | ✅ Yes (done) |
| 8.3 | 8 | Instrumentación de PropertyDetailSheet — Scroll Depth | done | — | #20 | merged | 8.1 | ✅ Yes (done) |
| 8.4 | 8 | Tracking de Match Reaffirm desde Match Recap Screen | done | — | #21 | merged | 8.1, 2.6 | ✅ Yes (done) |
| 8.5 | 8 | Dashboard de Analytics por Listing para Agencias | done | — | #22 | merged | 8.7 | ✅ Yes (done) |
| 8.6 | 8 | Buyer Intent Score en Panel del Agente | done | — | #23 | merged | 8.7 | ✅ Yes (done) |
| 8.7 | 8 | Aggregation Jobs para Read Models de Analytics | done | — | #24 | merged | 8.1 | ✅ Yes (done) |
| 9.1 | 9 | Schema de Experimentos y Motor de Asignación de Variantes | ready-for-dev | #25 | — | — | Epic 8 complete ✅ | ✅ Yes |
| 9.2 | 9 | UI de Creación de Experimento para Agencias (Portada A/B) | ready-for-dev | #26 | — | — | 9.1 | ❌ No (9.1 not merged) |
| 9.3 | 9 | Medición de Impacto y Dashboard de Resultados del Experimento | ready-for-dev | #27 | — | — | 9.1 | ❌ No (9.1 not merged) |
| 9.4 | 9 | Auto-promoción de Variante Ganadora al Alcanzar Significancia | ready-for-dev | #28 | — | — | 9.3 | ❌ No (9.3 not merged) |
| 9.5 | 9 | Recomendaciones Proactivas de Experimentos para Listings Underperforming | ready-for-dev | #29 | — | — | 9.3 | ❌ No (9.3 not merged) |
| 9.6 | 9 | Generación de Variantes de Título y Descripción con IA (Human-in-the-loop) | ready-for-dev | #30 | — | — | 9.2 | ❌ No (9.2 not merged) |
| 10.1 | 10 | Buyer Preference Vector — Generación y Persistencia | backlog | — | — | — | Epic 9 complete | ❌ No (epic 9 not complete) |
| 10.2 | 10 | Listing Fit Score — Cálculo de Afinidad | backlog | — | — | — | 10.1 | ❌ No (epic 9 not complete) |
| 10.3 | 10 | Personalización de Foto de Portada en Swipe Feed | backlog | — | — | — | 10.2 | ❌ No (epic 9 not complete) |
| 10.4 | 10 | Adaptación de Highlights de Descripción por Perfil | backlog | — | — | — | 10.2 | ❌ No (epic 9 not complete) |
| 10.5 | 10 | Control de Privacidad — Desactivación de Personalización | backlog | — | — | — | 10.1 | ❌ No (epic 9 not complete) |
| 11.1 | 11 | Landing Page Pública — Primera Impresión de Marca | done | — | — | — | none | ✅ Yes (done) |
| 11.2 | 11 | Auth Pages — Rediseño Registro/Login Premium | done | — | — | — | none | ✅ Yes (done) |
| 11.3 | 11 | Home Comprador — Dashboard Personalizado | done | — | — | — | none | ✅ Yes (done) |
| 11.4 | 11 | Galería de Matches — Comprador Web | done | — | — | — | none | ✅ Yes (done) |
| 11.5 | 11 | Perfil Comprador Web | done | — | — | — | none | ✅ Yes (done) |
| 11.6 | 11 | Navegación Web Comprador — Header/Layout | done | — | — | — | none | ✅ Yes (done) |
| 11.7 | 11 | Página Detalle Listing Enriquecida | done | — | — | — | none | ✅ Yes (done) |

## Dependency Chains

- **1.2** depends on: 1.1
- **1.3** depends on: 1.2
- **1.4** depends on: 1.2
- **1.5** depends on: 1.2
- **1.6** depends on: 1.3, 1.4, 1.5
- **2.2** depends on: 2.1
- **2.3** depends on: 2.2
- **2.4** depends on: 2.2
- **2.5** depends on: 2.2
- **2.6** depends on: 2.3
- **2.7** depends on: 2.3, 2.6
- **2.8** depends on: 2.7
- **2.9** depends on: 2.2
- **3.x** depends on: Epic 2 complete ✅
- **3.2** depends on: 3.1
- **3.3** depends on: 3.2
- **3.4** depends on: 3.2
- **4.1** depends on: 3.2
- **4.2** depends on: 4.1
- **4.3** depends on: 4.1
- **4.4** depends on: 4.2
- **5.2** depends on: 5.1
- **5.3** depends on: 5.2
- **5.4** depends on: 5.2
- **6.1** depends on: 5.2
- **6.2** depends on: 6.1
- **6.3** depends on: 6.1
- **7.2** depends on: 7.1
- **7.3** depends on: 7.1, 5.3
- **7.4** depends on: 7.1
- **8.2** depends on: 8.1
- **8.3** depends on: 8.1
- **8.4** depends on: 8.1, 2.6
- **8.7** depends on: 8.1
- **8.5** depends on: 8.7
- **8.6** depends on: 8.7
- **9.x** depends on: Epic 8 complete ✅
- **9.2** depends on: 9.1 (needs schema + POST /api/v1/experiments endpoint)
- **9.3** depends on: 9.1 (needs experiment tables + assignment data)
- **9.4** depends on: 9.3 (needs measurement/aggregation pipeline)
- **9.5** depends on: 9.3 (needs measurement data for underperformance detection)
- **9.6** depends on: 9.2 (needs experiment creation UI to integrate with)
- **10.x** depends on: Epic 9 complete
- **10.2** depends on: 10.1
- **10.3** depends on: 10.2
- **10.4** depends on: 10.2
- **10.5** depends on: 10.1

## Notes

**Current epic:** Epic 9 — Content Optimization & A/B Testing (in-progress)
**All previous epics done:** Epics 1–8 and 11 are fully complete.
**GitHub Issues created:** #25 (9.1), #26 (9.2), #27 (9.3), #28 (9.4), #29 (9.5), #30 (9.6)
**Pending PRs:** None (no PRs created yet for Epic 9)
**Worktree cleanup:** Removed 17 worktrees from Epics 5–8 and deleted corresponding remote branches.

### Parallelization Opportunities (Epic 9)

```
                 ┌──→ 9.2 ──→ 9.6
                 │
    9.1 ────────┤
                 │
                 └──→ 9.3 ──┬──→ 9.4
                             └──→ 9.5
```

- **Wave 1:** 9.1 (sole entry point — no parallelism possible at start)
- **Wave 2:** 9.2 + 9.3 (can run in parallel after 9.1 merges)
- **Wave 3:** 9.4 + 9.5 + 9.6 (9.4 and 9.5 depend on 9.3; 9.6 depends on 9.2 — all three can run in parallel once both 9.2 and 9.3 are merged)

### Bottleneck
Story 9.1 is the sole critical path entry point. Until it is implemented and merged, no other Epic 9 story can start.
