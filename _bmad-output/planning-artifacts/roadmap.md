# Reinder — Roadmap de Implementación

> Complejidad estimada por story: escala **1–5**
> `1` = trivial · `2` = simple · `3` = moderada · `4` = compleja · `5` = muy compleja / riesgo alto

---

## Flujo de una Story: de Backlog a Done

```
🔵 backlog
   │  El SM ejecuta: "create story [id]"
   ▼
🟡 ready-for-dev     ← story file creado con contexto completo
   │  El Dev ejecuta: "dev this story [file]"
   ▼
🟠 in-progress       ← implementación activa
   │  El Dev marca la story como 'review'
   ▼
🔴 review            ← el agente hace code review adversarial
   │  Se corrigen los issues encontrados
   ▼
✅ done              ← sprint-status.yaml actualizado
```

> Si la story requiere ☝️ **acción humana**, completarla antes de ejecutar `dev this story`.

---

## Fase 1 — MVP · Compradores y Agentes

| Story | Título | Complejidad | Acción humana | Estado |
|---|---|:---:|---|---|
| **1.1** | Inicialización del Monorepo y Sistema de Diseño Base | 2 | — | ✅ done |
| **1.2** | Configuración de Supabase y Schema de Base de Datos Inicial | 3 | ☝️ Crear proyecto Supabase EU-West, activar Auth + RLS + encryption | ✅ done |
| **1.3** | Registro de Comprador con Email y Aceptación de T&C | 2 | — | ✅ done |
| **1.4** | Registro y Login con Google OAuth | 3 | ☝️ Configurar Google OAuth en Supabase Dashboard (Client ID + Secret) | ✅ done |
| **1.5** | Login de Agente y Administrador de Agencia | 2 | ☝️ Crear cuentas agente/admin en Supabase Auth | ✅ done |
| **1.6** | Protección de Rutas y Redirección de Usuarios No Autenticados | 2 | — | ✅ done |
| **2.1** | Componentes Base — GlassPanel, PropertyBadge y Design Foundation | 2 | — | ✅ done |
| **2.2** | Feed de Propiedades — PropertyCard y SwipeActions | 3 | — | ✅ done |
| **2.3** | Gesto de Swipe con Match y MatchPayoff Animation | 4 | — | ✅ done |
| **2.4** | Gesto de Descarte | 2 | — | ✅ done |
| **2.5** | Vista de Detalle de Propiedad (Bottom Sheet) | 3 | — | ✅ done |
| **2.6** | Match Recap Screen | 3 | — | ✅ done *(pendiente test humano)* |
| **2.7** | Historial de Matches y Badge "Nuevas Propiedades" | 3 | — | ✅ done |
| **2.8** | TabBar de Comprador con Navegación Rol-Based | 2 | — | 🤖 bad-to-check |
| **2.9** | Filtros de Búsqueda del Comprador — Onboarding y Edición | 4 | ☝️ Migración SQL en Supabase: columna `search_preferences` | 🤖 bad-to-check |
| **3.1** | Generación de Link de Referral por el Agente | 2 | — | 🤖 bad-to-check |
| **3.2** | Aceptación del Vínculo por el Comprador vía Referral Link | 3 | — | 🤖 bad-to-check |
| **3.3** | Reconfirmación Periódica y Desvinculación Voluntaria | 3 | — | 🤖 bad-to-check |
| **3.4** | Sobreescritura del Listing Agent en la UI | 2 | — | 🤖 bad-to-check |
| **4.1** | Lista de Clientes Vinculados en el Panel del Agente | 2 | — | 🔵 backlog |
| **4.2** | Notificación en Tiempo Real de Match de Cliente | 4 | ☝️ Configurar Expo Push Notifications (APNS cert iOS + FCM key Android) | 🔵 backlog |
| **4.3** | Historial de Matches y Rechazos por Cliente | 2 | — | 🔵 backlog |
| **4.4** | Deep Link Notificación → Detalle del Match | 3 | — | 🔵 backlog |

---

## Fase 2 — Inventario e Integración CRM

| Story | Título | Complejidad | Acción humana | Estado |
|---|---|:---:|---|---|
| **5.1** | Conexión de CRM de Agencia (Inmovilla) | 4 | ☝️ Cuenta Inmovilla de prueba + API key para desarrollo | 🔵 backlog |
| **5.2** | Sincronización de Listings via Webhook y Batch Desacoplados | 5 | ☝️ Activar `pg_cron` en Supabase + deploy Edge Function `crm-webhook` | 🔵 backlog |
| **5.3** | Validación de Exclusividad y Detección de Duplicados | 4 | — | 🔵 backlog |
| **5.4** | Ciclo de Vida del Listing — Retirada y Vendida | 3 | — | 🔵 backlog |

---

## Fase 3 — SEO y Administración

| Story | Título | Complejidad | Acción humana | Estado |
|---|---|:---:|---|---|
| **6.1** | Páginas de Listing SSR Indexables por Google | 3 | ☝️ Configurar dominio en Vercel + env vars de producción | 🔵 backlog |
| **6.2** | Datos Estructurados Schema.org en Páginas de Listing | 2 | — | 🔵 backlog |
| **6.3** | Gated Content — Preview para Usuarios No Autenticados | 3 | — | 🔵 backlog |
| **7.1** | CI/CD Pipeline y Observabilidad (Sentry + Analytics) | 3 | ☝️ Crear proyectos Sentry + PostHog + conectar GitHub Actions con EAS | 🔵 backlog |
| **7.2** | Panel de Activación de Agencias | 2 | — | 🔵 backlog |
| **7.3** | Resolución de Listings Duplicados | 3 | — | 🔵 backlog |
| **7.4** | Dashboard de Métricas Globales de Plataforma | 3 | — | 🔵 backlog |

---

## Fase 4 — Intelligence Platform · Buyer Analytics y Optimización de Contenido

> Épicas derivadas del brainstorm estratégico 2026-04-24. Secuencia obligatoria: Epic 8 → Epic 9 → Epic 10.

| Story | Título | Complejidad | Acción humana | Estado |
|---|---|:---:|---|---|
| **8.1** | Schema de Engagement Events e Instrumentación Base | 3 | ☝️ Migración SQL en Supabase: tabla `listing_engagement_events` | 🔵 backlog |
| **8.2** | Instrumentación de PropertyCard — Tiempo por Foto | 3 | — | 🔵 backlog |
| **8.3** | Instrumentación de PropertyDetailSheet — Scroll Depth | 2 | — | 🔵 backlog |
| **8.4** | Tracking de Match Reaffirm desde Match Recap Screen | 3 | — | 🔵 backlog |
| **8.5** | Dashboard de Analytics por Listing para Agencias | 4 | ☝️ Activar `pg_cron` jobs de aggregation en Supabase | 🔵 backlog |
| **8.6** | Buyer Intent Score en Panel del Agente | 3 | — | 🔵 backlog |
| **8.7** | Aggregation Jobs para Read Models de Analytics | 3 | — | 🔵 backlog |
| **9.1** | Schema de Experimentos y Motor de Asignación de Variantes | 4 | ☝️ Migración SQL: tablas `listing_experiments`, `experiment_assignments` | 🔵 backlog |
| **9.2** | UI de Creación de Experimento para Agencias (Portada A/B) | 3 | — | 🔵 backlog |
| **9.3** | Medición de Impacto y Dashboard de Resultados del Experimento | 3 | — | 🔵 backlog |
| **9.4** | Auto-promoción de Variante Ganadora al Alcanzar Significancia | 4 | — | 🔵 backlog |
| **9.5** | Recomendaciones Proactivas de Experimentos para Listings Underperforming | 2 | — | 🔵 backlog |
| **9.6** | Generación de Variantes de Título y Descripción con IA (Human-in-the-loop) | 5 | ☝️ Integración OpenAI GPT-4o: API key + prompt engineering + UI de aprobación | 🔵 backlog |
| **10.1** | Buyer Preference Vector — Generación y Persistencia | 5 | ☝️ Migración SQL: tabla `buyer_preference_vectors` + evaluación legal GDPR | 🔵 backlog |
| **10.2** | Listing Fit Score — Cálculo de Afinidad Listing × Comprador | 4 | — | 🔵 backlog |
| **10.3** | Personalización de Foto de Portada en Swipe Feed | 4 | — | 🔵 backlog |
| **10.4** | Adaptación de Highlights de Descripción por Perfil | 3 | — | 🔵 backlog |
| **10.5** | Control de Privacidad — Desactivación de Personalización desde Perfil | 2 | ☝️ Revisión legal GDPR del modelo de personalización completada | 🔵 backlog |

---

## Resumen por Fase

| Fase | Stories | Complejidad total | Media | Con acción humana |
|---|:---:|:---:|:---:|:---:|
| Fase 1 — MVP | 23 | 65 | 2.8 | 6 |
| Fase 2 — CRM | 4 | 16 | 4.0 | 2 |
| Fase 3 — SEO + Admin | 7 | 19 | 2.7 | 2 |
| Fase 4 — Intelligence Platform | 18 | 59 | 3.3 | 6 |
| **Total** | **52** | **159** | **3.1** | **16** |

---

## Leyenda

| Símbolo | Significado |
|---|---|
| ✅ | done — completada e integrada |
| 🤖 | bad-to-check — implementada por el pipeline BAD, pendiente verificación humana |
| 🟡 | ready-for-dev — story escrita, pendiente de implementar |
| 🔵 | backlog — definida, sin story file aún |
| ☝️ | Requiere acción humana (Supabase, Vercel, App Store, credenciales externas…) |
| — | 100% automatizable por el agente |

---

*Última actualización: 2026-04-30 — Sesión de fixes de Mobile UX completada. Añadida limpieza de Zustand stores (search, swipe, match history) en el evento SIGNED_OUT para prevenir fuga de preferencias de búsqueda entre cuentas. Implementado AbortController timeout de 5s en las requests a la API para evitar renders infinitos del PropertyCardSkeleton cuando el servidor local (Expo Go) se cuelga. Epic 4 restaurada formalmente a backlog.*
