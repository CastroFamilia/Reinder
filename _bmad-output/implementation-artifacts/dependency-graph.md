# Story Dependency Graph
_Last updated: 2026-04-27T12:30:00+02:00_

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
| 3.1 | 3 | Generación de Link de Referral por el Agente | backlog | — | — | — | none (Epic 2 complete ✅) | ✅ Yes |
| 3.2 | 3 | Aceptación del Vínculo por el Comprador vía Referral Link | backlog | — | — | — | 3.1 | ❌ No (depends on 3.1) |
| 3.3 | 3 | Reconfirmación Periódica y Desvinculación Voluntaria | backlog | — | — | — | 3.2 | ❌ No (depends on 3.2) |
| 3.4 | 3 | Sobreescritura del Listing Agent en la UI | backlog | — | — | — | 3.2 | ❌ No (depends on 3.2) |
| 4.1 | 4 | Lista de Clientes Vinculados — Panel del Agente | backlog | — | — | — | 3.2 | ❌ No (Epic 3 not complete) |
| 4.2 | 4 | Notificación en Tiempo Real de Match de Cliente | backlog | — | — | — | 4.1 | ❌ No (Epic 3 not complete) |
| 4.3 | 4 | Historial de Matches y Rechazos por Cliente | backlog | — | — | — | 4.1 | ❌ No (Epic 3 not complete) |
| 4.4 | 4 | Deep Link — Notificación → Detalle del Match | backlog | — | — | — | 4.2 | ❌ No (Epic 3 not complete) |
| 5.1 | 5 | Conexión de CRM Agencia — Inmovilla | backlog | — | — | — | Epic 2 complete | ❌ No (ordering: Epic 3 first) |
| 5.2 | 5 | Sincronización de Listings — Webhook + Batch Desacoplados | backlog | — | — | — | 5.1 | ❌ No |
| 5.3 | 5 | Validación de Exclusividad y Detección de Duplicados | backlog | — | — | — | 5.2 | ❌ No |
| 5.4 | 5 | Ciclo de Vida del Listing — Retirada y Vendida | backlog | — | — | — | 5.2 | ❌ No |
| 6.1 | 6 | Páginas de Listing SSR Indexables por Google | backlog | — | — | — | 5.2 | ❌ No |
| 6.2 | 6 | Datos Estructurados schema.org en Páginas de Listing | backlog | — | — | — | 6.1 | ❌ No |
| 6.3 | 6 | Gated Content — Preview para Usuarios No Autenticados | backlog | — | — | — | 6.1 | ❌ No |
| 7.1 | 7 | CI/CD Pipeline y Observabilidad — Sentry + Analytics | backlog | — | — | — | Epic 2 complete | ❌ No (ordering: Epic 3 first) |
| 7.2 | 7 | Panel de Activación de Agencias | backlog | — | — | — | 7.1 | ❌ No |
| 7.3 | 7 | Resolución de Listings Duplicados | backlog | — | — | — | 7.1, 5.3 | ❌ No |
| 7.4 | 7 | Dashboard de Métricas Globales de Plataforma | backlog | — | — | — | 7.1 | ❌ No |
| 8.1 | 8 | Schema de Engagement Events e Instrumentación Base | backlog | — | — | — | Epic 2 complete | ❌ No (ordering) |
| 8.2 | 8 | Instrumentación de PropertyCard — Tiempo por Foto | backlog | — | — | — | 8.1 | ❌ No |
| 8.3 | 8 | Instrumentación de PropertyDetailSheet — Scroll Depth | backlog | — | — | — | 8.1 | ❌ No |
| 8.4 | 8 | Tracking de Match Reaffirm desde Match Recap Screen | backlog | — | — | — | 8.1, 2.6 | ❌ No |
| 8.5 | 8 | Dashboard de Analytics por Listing para Agencias | backlog | — | — | — | 8.7 | ❌ No |
| 8.6 | 8 | Buyer Intent Score en Panel del Agente | backlog | — | — | — | 8.7 | ❌ No |
| 8.7 | 8 | Aggregation Jobs para Read Models de Analytics | backlog | — | — | — | 8.1 | ❌ No |
| 9.1 | 9 | Schema de Experimentos y Motor de Asignación de Variantes | backlog | — | — | — | Epic 8 complete | ❌ No |
| 9.2 | 9 | UI de Creación de Experimento para Agencias | backlog | — | — | — | 9.1 | ❌ No |
| 9.3 | 9 | Medición de Impacto y Dashboard de Resultados | backlog | — | — | — | 9.1 | ❌ No |
| 9.4 | 9 | Auto-promoción de Variante Ganadora | backlog | — | — | — | 9.3 | ❌ No |
| 9.5 | 9 | Recomendaciones Proactivas de Experimentos | backlog | — | — | — | 9.3 | ❌ No |
| 9.6 | 9 | Generación de Variantes con IA (Human-in-the-loop) | backlog | — | — | — | 9.1 | ❌ No |
| 10.1 | 10 | Buyer Preference Vector — Generación y Persistencia | backlog | — | — | — | Epic 8 complete, Epic 9 complete | ❌ No |
| 10.2 | 10 | Listing Fit Score — Cálculo de Afinidad | backlog | — | — | — | 10.1 | ❌ No |
| 10.3 | 10 | Personalización de Foto de Portada en Swipe Feed | backlog | — | — | — | 10.2 | ❌ No |
| 10.4 | 10 | Adaptación de Highlights de Descripción por Perfil | backlog | — | — | — | 10.2 | ❌ No |
| 10.5 | 10 | Control de Privacidad — Desactivación de Personalización | backlog | — | — | — | 10.1 | ❌ No |

## Dependency Chains

- **2.2** depends on: 2.1
- **2.3** depends on: 2.2
- **2.4** depends on: 2.2
- **2.5** depends on: 2.2
- **2.6** depends on: 2.3
- **2.7** depends on: 2.3, 2.6
- **2.8** depends on: 2.7
- **2.9** depends on: 2.2
- **3.x** depends on: Epic 2 complete ✅
- **3.1** → no prior deps within epic — READY
- **3.2** depends on: 3.1
- **3.3** depends on: 3.2
- **3.4** depends on: 3.2
- **4.x** depends on: Epic 3 (at least 3.2), Epic 2 complete
- **5.x** depends on: Epic 2 complete (sequential ordering — do Epic 3 first per roadmap)
- **6.x** depends on: Epic 5 (at least 5.2)
- **7.x** depends on: Epic 2 complete (sequential ordering)
- **8.x** depends on: Epic 2 complete (sequential ordering)
- **9.x** depends on: Epic 8 complete
- **10.x** depends on: Epic 9 complete, Epic 8 complete

## Notes

**Current epic:** Epic 3 (Vínculo Comprador–Agente Representante) — starting now
**Epic 2 status:** ✅ COMPLETE — all stories 2.1–2.9 done
**Stories ready to work:** 3.1 only (3.2/3.3/3.4 sequentially dependent on 3.1)
**Epic 3 execution plan:** 3.1 first → then 3.2 → then 3.3 + 3.4 in parallel
**GitHub integration:** Local-only mode — no PRs or issues exist yet (all done stories implemented without GitHub PRs)
**Sprint status note:** All Epic 1 and Epic 2 stories marked `done` in sprint-status.yaml. epic-2 updated to `done`.
