# Reinder — Ideas Futuras y Backlog Estratégico

> **Archivo vivo.** Toda idea que surja durante cualquier sesión de trabajo y quede fuera del MVP debe añadirse aquí, además de donde surgió originalmente.

---

## 🟠 Phase 2 — Growth Features

### Búsquedas Múltiples por Comprador ("Nueva Búsqueda")

**Concepto:** Cada comprador puede tener varias búsquedas activas, cada una con sus propios filtros y su propio feed de swipe. Al registro se crea la primera búsqueda con un wizard de preferencias. Desde el tab Swipe puede cambiar entre búsquedas o crear una nueva.

**Ejemplo de uso:**
- Búsqueda 1: Madrid Centro · hasta 400k · piso
- Búsqueda 2: Chamberí o Malasaña · hasta 600k · cualquier tipo

**Filtros propuestos:** zona/barrio, precio máximo, tipo de propiedad, habitaciones mínimas, características (terraza, garaje…)

**Implicaciones de schema:**
```sql
buyer_searches (id, buyer_id FK, name, filters jsonb, is_active, created_at)
```
El feed API recibe `search_id` y filtra listings por JSONB. Los `swipe_events` necesitan `search_id` FK para atribuir el match a la búsqueda correcta.

**Encaje en Epic 2 — Story 2.9 propuesta:**
> Wizard de preferencias al completar el registro + selector de búsqueda en el tab Swipe + acción "Nueva Búsqueda".

**Donde surgió:** Sesión 2026-03-22

**Estado:** Fase 2. Priorizar después de Epic 5 (CRM), cuando el volumen de listings justifique el filtrado.

---

### Landing Page de Entrada — Swipe para Entrar

**Concepto:** Al entrar a `reinder.com` (no autenticado), en lugar de una pantalla de login estándar, el usuario ve una pantalla limpia de pantalla completa con un mensaje de impacto y una instrucción gestual que enseña la mecánica del producto antes de usarlo.

**Mensaje de portada (opciones a validar):**
- _"Los compradores son infieles. ¿o no?"_ — provocador y directo
- _"Swipe. Match. Move."_ — el tagline como único mensaje, elegante y suficiente

**Mecánica instructiva:**
> **Swipe right to log in. Swipe left to register.**

El propio gesto de entrada enseña el vocabulario del producto. Los dos gestos de login/registro introducen la bifurcación del usuario (¿nuevo o existente?) de forma memorable y coherente con la experiencia core.

**Valor:** El primer contacto con Reinder ya **es** Reinder. No hay pantalla de login genérica — hay una promesa de marca y una instrucción de uso embebida.

**Consideraciones de implementación:**
- Solo para web (reinder.com desde navegador) — en mobile el deep link o app store bypasean este flujo
- Requiere gestión del caso `no JS` / crawler SEO — el gesto puede tener botones fallback visibles (accesibilidad)
- La pantalla debe ser visualmente premium: gradiente radial de fondo, tipografía Clash Display, sin UI visible salvo el mensaje y los indicadores de swipe

**Dónde surgió:** Sesión de trabajo 2026-03-20

**Estado:** Fase 2 / post-MVP. El MVP tiene un flujo de auth convencional (formulario) pero esta landing puede implementarse como capa de entrada sin romper el flujo interno.

---



### Búsqueda Conversacional en Lenguaje Natural

**Concepto:** En lugar de filtros tradicionales, el comprador escribe qué está buscando ("piso en Madrid de 3 habitaciones con terraza, menos de 400k") y una IA interpreta la intención y configura su feed de swipe automáticamente.

**Valor:** Elimina la barrera de los filtros (el problema central de Idealista) y convierte el onboarding en una experiencia de alta personalización desde el primer momento.

**Dónde surgió:** UX Design Specification — decisión de scope (Phase 2 por complejidad técnica)

**Estado:** Fase 2. Para el MVP, el feed actúa como "búsqueda sin palabras" — el swipe reemplaza funcionalmente a los filtros.

**Requisitos técnicos estimados:** LLM para parsing de intención, mapeo de texto a campos de DB (zona, precio, habitaciones, características), posiblemente embeddings para matching semántico.

---

### Notificaciones Push Personalizadas

**Concepto:** Notificaciones basadas en el patrón de matcheos del usuario — alertas cuando aparece una propiedad que se ajusta a su perfil de interés inferido.

**Dónde surgió:** PRD — Growth Features

**Estado:** Fase 2. En MVP las notificaciones son solo de match al agente representante.

---

### Analytics para Agencias

**Concepto:** Panel de métricas de comportamiento del comprador por listing, accesible para las agencias.

**Métricas clave:**
- Tiempo medio de visualización por listing antes de Match / Reject
- Ratio Match/Reject por listing vs. promedio del mercado
- Comparativa de rendimiento entre listings de la misma agencia
- Insights accionables: "Tu portada está un 40% por debajo del tiempo medio de visualización"

**Valor de negocio:** Permite a las agencias tomar decisiones basadas en datos. Modelo de diferenciación B2B y potencial línea de monetización premium.

**Dónde surgió:** PRD — Growth Features + future-ideas.md (sesión PRD)

**Estado:** ✅ **Implementado en Epic 8** (Stories 8.1–8.7). Dashboard de analytics, engagement events, buyer intent score, y aggregation jobs están en producción. Falta el gate de paywall (ver sección Monetización).

---

### Integración con Múltiples CRMs

**Concepto:** Ampliar el conector más allá de Inmovilla para cubrir Witei, Idealista CRM, Salesforce RE, y CRMs europeos.

**Dónde surgió:** PRD — Growth Features

**Estado:** Fase 2. MVP arranca con Inmovilla como único CRM.

---

### Agente Vinculado por Búsqueda

**Concepto:** Capa de agente especialista sobre el modelo base — el comprador puede vincular distintos agentes según el tipo de búsqueda (zona, tipo de propiedad).

**Dónde surgió:** PRD — Growth Features

**Estado:** Fase 2. MVP tiene un solo agente representante por comprador.

---

### Búsqueda de Agentes Representantes Dentro de la App

**Concepto:** Directorio de agentes en Reinder para que compradores sin referral puedan encontrar y vincularse con un agente de su zona.

**Dónde surgió:** PRD — Growth Features

**Estado:** Fase 2. En MVP el único canal de vínculo es el referral link del agente.

---

### Widget Embebible de Reinder para Páginas Web de Agencias

**Concepto:** Desarrollar un plugin / widget embebible (o una API pública de agencia) que permita a cualquier inmobiliaria integrar la experiencia de swipe de Reinder directamente en su propia página web, mostrando exclusivamente sus propiedades activas en el sistema — sin el filtro de exclusividad de la plataforma principal.

**Propuesta de valor para las agencias:**

1. 🚀 **Diferenciación inmediata** — La agencia ofrece en su web una experiencia de búsqueda de propiedades que ningún portal tradicional puede igualar. Pasan de tener un listado de pisos a tener un producto digital propio.
2. ✨ **Innovación de marca** — El swipe es reconocible, moderno y memorable. Transmite que la agencia está a la vanguardia tecnológica, lo que refuerza su percepción de marca premium.
3. 📊 **Métricas de comportamiento** — Cada interacción del visitante (swipe, tiempo de visualización, match, rebote) genera datos en el sistema de analytics de Reinder. La agencia accede a estos insights desde su panel de agente — cuáles de sus propiedades generan más interés en su propia audiencia.
4. 🎁 **Valor añadido en el contrato** — El widget se convierte en un argumento de venta diferencial para que más agencias se suscriban a Reinder: no solo distribuyen sus propiedades en la plataforma, sino que se llevan una feature premium para su sitio propio.

**Modelo de integración propuesto:**

```html
<!-- Integración mínima — 2 líneas en cualquier web -->
<script src="https://cdn.reinder.com/widget.js" data-agency="agencia-id" data-key="API_KEY"></script>
<div id="reinder-swipe-feed"></div>
```

El widget renderiza el feed de swipe como un iframe aislado o como un componente Web Component autónomo, sin dependencias del stack de la agencia (funciona en WordPress, Webflow, custom HTML, etc.).

**Comportamiento del feed en el widget:**
- Solo muestra propiedades activas de esa agencia en Reinder — **sin filtro de exclusividad** (a diferencia del feed principal de Reinder, aquí la agencia ve todo su inventario activo).
- El orden puede ser por fecha de alta, precio, o scoring de engagement (las propiedades que mejor convierten van primero).
- Si el visitante hace match → se le invita a registrarse en Reinder para contactar con la agencia (doble función: captación de leads + onboarding de compradores a la plataforma).
- Soporte de parámetros de filtrado opcionales: zona, precio máximo, tipo (`?zona=salamanca&precio_max=500000`).

**Modelo de autenticación / API Key:**
- Cada agencia suscrita recibe una API key desde su panel de agente.
- La key está scoped a su propio inventario — imposible acceder a datos de otra agencia.
- Rate limiting por key para proteger la infraestructura.
- Endpoints REST públicos (lectura): `GET /v1/agency/{id}/listings`, `POST /v1/agency/{id}/events` (para registrar swipes y tiempo de visualización desde el widget externo).

**Modos de integración posibles:**

| Modo | Descripción | Esfuerzo de integración |
|---|---|:---:|
| **Widget JS** | Script + div en cualquier web. Self-contained. | Mínimo — copy-paste |
| **iFrame embed** | URL embebible con parámetros. Sin JS en la página host. | Mínimo — 1 línea |
| **API REST** | Endpoints públicos para que la agencia construya su propia UI | Alto — requiere dev |
| **Web Component** | `<reinder-feed agency="x" />` — compatible con cualquier framework | Bajo — 1 tag |

**Implicaciones estratégicas:**
- El widget convierte la web de cada agencia en un **punto de captación de compradores para Reinder** — cada persona que hace swipe en la web de la agencia es un lead potencial para la plataforma.
- Crea un **efecto de red inverso**: más agencias con widget → más visitantes expuestos a Reinder → más compradores registrados → más valor para las agencias.
- El sistema de analytics ya planeado en **Epic 8** (engagement events) es la base técnica ideal para capturar los eventos del widget externo con el mismo schema.

**Monetización sugerida:**
- El widget es un **feature de plan** (incluido en planes Pro o Enterprise de agencia, no en el plan básico).
- Límite de vistas/mes por plan → upgrade natural cuando la agencia ve tracción.

**Implicaciones de implementación:**
- Requiere definir una API pública versionada (`/v1/`) con documentación para desarrolladores.
- El widget debe funcionar en modo CORS seguro — la API Key valida el dominio origen registrado.
- GDPR: el widget en web de terceros necesita gestión de consentimiento de cookies si se trackean eventos de visitantes anónimos. Posible solución: el widget muestra un consent banner mínimo propio, o se registran solo eventos agregados sin identificar al visitante hasta que se registra.
- La UI del widget puede ofrecerse en modo **white-label light** (el logo de Reinder aparece discretamente, con opción premium de eliminarlo en plan Enterprise).

**Dónde surgió:** Sesión de trabajo 2026-04-30.

**Estado:** 🔵 Backlog estratégico — alta prioridad de negocio post-MVP. Evaluar tras Epic 5 (CRM) cuando haya volumen de agencias suficiente para validar el modelo.

---

## 🔵 Visión a Largo Plazo

### Descripciones de Listings con IA Personalizada

**Concepto:** Generación automática de descripciones de propiedades adaptadas al perfil del comprador, basadas en sus preferencias inferidas (historial de swipes, matcheos, tiempo de visualización).

**Ejemplo:** Un comprador que siempre hace match con jardín ve "amplio jardín de 80m²". Otro centrado en transportes ve "a 3 minutos del metro".

**Dónde surgió:** PRD — Vision (Futuro) + future-ideas.md (sesión PRD)

**Estado:** Visión a largo plazo. Requiere motor de inferencia de preferencias, pipeline LLM, consentimiento GDPR explícito.

---

### Reinder como Estándar de Facto

**Concepto:** El "feature de swipe" que todos los portales quieren replicar — Reinder como referencia de la categoría a nivel europeo.

**Dónde surgió:** PRD — Vision

**Estado:** Visión estratégica de largo plazo.

---

### Expansión a Mercados Europeos

**Concepto:** Adaptar el producto a CRMs locales de Francia, Italia, Portugal, Alemania.

**Dónde surgió:** PRD — Vision

**Estado:** Post-validación en mercado español.

---

---

## 🟡 UX Feedback — Pendiente de Evaluar

### Modos de Vista de Tarjeta — Cover vs. Detail

**Concepto:** Permitir al usuario elegir cómo quiere ver las tarjetas de propiedades en su feed de swipe, entre dos modos de visualización claramente diferenciados.

**Modos propuestos:**

#### Modo Portada (Default actual)
La fotografía de portada ocupa el 100% de la tarjeta en vertical. La información clave (precio, m², habitaciones) aparece superpuesta al fondo mediante un overlay degradado semitransparente en la parte inferior. El botón circular `ⓘ` en la esquina inferior derecha despliega el `PropertyDetailSheet` con toda la información de la propiedad.

> **Filosofía:** La propiedad primero. El impacto visual es el protagonista — el comprador decide con los ojos antes que con los datos.

#### Modo Detalle (Nueva opción)
La parte superior de la tarjeta (~55%) muestra la foto de portada en formato horizontal (landscape). La parte inferior es un panel claro con los datos clave de la propiedad sin necesidad de interacción: título, precio destacado, grid de características (habitaciones, baños, m², planta) e inicio de descripción en texto. No requiere pulsar `ⓘ` para acceder a información básica.

> **Filosofía:** Datos al frente. Ideal para usuarios analíticos que priorizan comparar detalles rápidamente antes de hacer swipe.

**Wireframe de referencia:**
> Aprobado el 2026-04-30. Ver archivo de diseño.

**UX del toggle:**
- Toggle de dos posiciones (icono foto / icono lista) persistido en el perfil del usuario.
- Accesible desde el tab Swipe (esquina superior derecha) o desde Perfil en ajustes de visualización.
- El cambio de modo se aplica inmediatamente al feed activo sin resetear la posición ni los swipes previos.

**Implicaciones de implementación:**
- `PropertyCard` componente necesita aceptar una prop `viewMode: 'cover' | 'detail'`.
- El modo se guarda en `user_profiles.preferences` (campo JSONB ya existente) para persistencia entre sesiones.
- Las animaciones de swipe (like/dislike) deben funcionar idénticamente en ambos modos.
- En modo Detalle la foto puede ser `horizontal` — considerar crops inteligentes del mismo asset (usar `object-position: center` + ratio fijo ~16:9 o 4:3).
- No rompe el schema — es puramente una decisión de UI renderizada en cliente.

**Dónde surgió:** Sesión de trabajo 2026-04-30.

**Estado:** 🟡 UX Feedback — idea aprobada pendiente de especificación y story.

---

### Umbral del Match Recap Screen (Historia 2.6)

**Feedback (test humano 2026-03-26):** El resumen de recap aparece "demasiado rápido" tras solo 3 matches consecutivos (`MATCH_RECAP_MIN_COUNT = 3` en `packages/shared/src/constants/index.ts`).

**Decisión pendiente:** Evaluar si subir el umbral a 5 o ajustar dinámicamente según el ritmo de swipe del usuario. Requiere datos de sesiones reales para decidir.

**Dónde surgió:** Test de la sesión 2026-03-26.

---

## 🟣 Estrategia de Monetización — Analytics Freemium

### Modelo: Data-as-a-Service con Network Effects

**Flywheel:**
```
Compradores swipean (gratis)
  → generan engagement data (tiempo por foto, scroll, matches)
    → agencias ven métricas básicas (gratis)
      → agencias quieren insights accionables
        → pagan por plan Pro (paywall)
          → usan insights para mejorar listings
            → mejores listings → más engagement
              → más datos → más valor Pro → FLYWHEEL
```

### Propuesta de Valor vs. Competencia

| | Idealista | Reinder |
|---|---|---|
| **Qué dice** | 150 personas vieron tu anuncio, 8 contactaron | La gente hace swipe-out en la foto de la cocina |
| **Tipo de dato** | Métrica de **resultado** | Métrica de **causa** |
| **Acción de la agencia** | Bajar el precio para generar más contactos | Mejorar/cambiar esa foto para aumentar la conversión |
| **Impacto económico** | La agencia pierde margen (baja precio 5-10%) | La agencia mantiene el precio original |
| **Conclusión** | Te dice **cuántas** personas vieron tu piso | Te dice **por qué** no lo compraron |

> 🎯 **Pitch line:** *"Idealista te dice cuántas personas vieron tu piso. Reinder te dice por qué no lo compraron."*

### Modelo Freemium: Datos Gratis, Inteligencia de Pago

| Lo que la agencia ve gratis | Lo que ve en plan Pro |
|---|---|
| Nº total de swipes en su listing | Desglose por foto (tiempo por foto) |
| Ratio match/reject global | Comparativa vs. media del mercado |
| Nº de matches este mes | Buyer Intent Score por listing |
| — | Recomendaciones de mejora ("Cambia la portada") |
| — | A/B testing de portadas (Epic 9) |
| — | Exportación de datos |

### Estado de Implementación

| Componente | Estado |
|---|---|
| Motor de datos (Epic 8: engagement events, tiempo por foto, scroll depth) | ✅ Implementado |
| Dashboard de analytics para agencias (Story 8.5) | ✅ Implementado |
| Buyer Intent Score (Story 8.6) | ✅ Implementado |
| Aggregation jobs (Story 8.7) | ✅ Implementado |
| Campo `plan` en schema de `agencies` | ❌ Pendiente (Gap G6) |
| Middleware de gate en API de analytics | ❌ Pendiente |
| UI de "upgrade" en dashboard de agencia | ❌ Pendiente |
| Integración Stripe para pagos | ❌ Pendiente |
| A/B testing de portadas (Epic 9) — feature exclusiva Pro | ⬜ Backlog |

### Roadmap de Monetización

1. **Consolidación (G6):** Añadir `agencies.plan` + `plan_limits` JSONB al schema
2. **Gate middleware:** Filtrar datos de analytics según plan en las APIs existentes
3. **Stripe Checkout:** Integrar flujo de upgrade antes de Epic 9
4. **Lanzar freemium:** Datos crudos gratis, insights Pro — cuando haya tracción de agencias

**Dónde surgió:** Party mode session 2026-05-22

---

## 🟢 Web Experience — Ideas Validadas en Party Mode (2026-05-22)

### Daily Drop: Selección Diaria Personalizada

**Concepto:** En lugar de browse libre (que canibaliza la app), la web muestra 5-8 propiedades seleccionadas para el comprador cada día en su dashboard `/home`. Sin scroll infinito. Sin filtros. Rotación cada 24h. Si quiere más, abre la app.

**Valor:** Preserva la escasez artificial (principio de scarcity) que genera engagement en la app, mientras da al usuario web una razón para volver cada día.

**Decisión de party mode:** El browse libre de listings va contra el core de Reinder. La web es un canal de gestión y consideración, no de descubrimiento. El Daily Drop resuelve el cold-start sin canibalizar.

**Requiere:** Motor de selección (puede basarse en Buyer Intent Score del Epic 8 + filtros de búsqueda del comprador).

**Estado:** 🔵 Backlog — priorizar tras consolidación.

### Escaparate SEO en Landing

**Concepto:** 6-8 propiedades destacadas/recientes visibles en la landing page sin login, con CTA de registro. Complementa el Daily Drop.

**Estado:** 🔵 Backlog — implementable como iteración de LandingCTA.

---

## 🟢 Web Experience — Ideas Validadas en Party Mode (2026-06-30)

### Buyer FOMO & Web Decision Hub (Propuesta de Nueva Épica)

**Concepto:** Transformar la web privada del comprador de un simple "login vacío" a un **Centro de Decisión** impulsado por datos de mercado, FOMO (Fear Of Missing Out) y prueba social. 

**El problema a resolver (Cold Start):** Actualmente, cuando un comprador nuevo se registra en la web y aún no tiene matches desde la app móvil, encuentra un panel vacío que solo le pide descargar la app, lo cual rompe la retención.

**La Solución Estructural:**
1. **El "Empty State" Educacional:** Si el usuario tiene 0 matches, se le muestra un mensaje empático que educa sobre el modelo de uso: *"Tu centro de evaluación está esperando. Aún no tienes matches. Descarga la app, haz unos cuantos swipes y vuelve aquí para analizarlos a fondo. Mientras tanto, mira lo que se están llevando los demás..."*
2. **El "Pulso del Mercado" (FOMO Dashboard):** En lugar de ver un panel vacío, el usuario ve una galería premium de propiedades basada en 5 categorías de datos dinámicos que generan urgencia extrema:
   - **Propiedades con más matches:** Prueba social (lo que todos quieren).
   - **Propiedades con mejor ratio de match:** La joya oculta (alta conversión).
   - **Propiedades recientes:** Novedad absoluta para usuarios recurrentes.
   - **Propiedades vendidas recientemente:** Máximo generador de urgencia (demuestra que el mercado es real y rápido).
   - **Propiedades que se van en X días:** Escasez temporal.

**Valor Estratégico:**
- **Para el Comprador (B2C):** Recibe valor inmediato al entrar a la web, descubre la dinámica del mercado y entiende que la App es para "Descubrir" y la Web para "Evaluar".
- **Para la Agencia (B2B):** Es el argumento de ventas definitivo. Si les mostramos que sus propiedades se exponen de esta manera y generan esta urgencia en los compradores, querrán darnos todas sus exclusivas.
- **Para SEO:** El contenido puede volverse público/semi-público como "Las más deseadas de Madrid".

**Dónde surgió:** Sesión Party Mode 2026-06-30.

**Estado:** 🔵 Propuesta documentada para futura Épica (posible Epic 12), para desarrollo post-Epic 9.

---

### Galería de Fotos por Listing (Multi-foto Swipe)

**Qué es:** Actualmente cada listing solo muestra una foto. Los usuarios necesitan ver múltiples fotos de la propiedad antes de tomar una decisión. La DB ya almacena un array `images` (jsonb) por listing y el tipo `Listing` tiene `imageUrls?: string[]`.

**Implementación sugerida:**
- **Opción A — Carrusel horizontal en la card:** Dots indicadores + swipe horizontal para navegar fotos sin salir de la card. Conflicto potencial con el swipe vertical/horizontal del feed.
- **Opción B — Galería en el Detail Sheet:** Al abrir el bottom sheet de detalle (Story 2.5), mostrar un carrusel horizontal o grid de fotos. Más limpio, sin conflictos de gestos.
- **Opción C — Tap en la foto abre galería fullscreen:** Al hacer tap en la imagen, se abre un lightbox fullscreen con swipe entre fotos y zoom pinch.

**Datos disponibles:** El campo `imageUrls` del tipo `Listing` ya contiene las URLs. El seed de RE/MAX importa todas las fotos disponibles (pipe-delimited en la API → JSON array en DB). Los listings reales tienen entre 5-30 fotos.

**Dónde surgió:** Testing manual del feed con listings reales de RE/MAX — 2026-06-30.

**Estado:** 🔵 Propuesta para futura mejora del feed. Requisito previo: ninguno (los datos ya están en la DB).

---

### Light Mode / Theme Switching

**Qué es:** Actualmente toda la app usa un tema oscuro (dark mode) con fondos negros/grises y glassmorphism. Muchos usuarios prefieren interfaces claras, especialmente al aire libre o en ambientes con mucha luz. Se debería ofrecer un Light Mode como alternativa y respetar la preferencia del sistema (Appearance API).

**Implementación sugerida:**
- **Tokens duales:** Extender el sistema de design tokens (`lib/tokens.ts`) para exportar dos paletas (`darkTheme` / `lightTheme`). Colores de superficie, texto, bordes y acentos tendrían variantes claras.
- **ThemeProvider con Context:** Un `ThemeContext` que provea los tokens activos a toda la app. Los componentes usarían `useTheme()` en vez de importar tokens directamente.
- **Preferencia del sistema:** Usar `useColorScheme()` de React Native para detectar la preferencia del OS. Añadir un toggle manual en Settings con 3 opciones: Auto / Claro / Oscuro.
- **GlassPanel adaptativo:** El efecto de glassmorphism necesitaría variantes claras (blur sobre fondos blancos con opacidades invertidas).
- **Persistencia:** Guardar la preferencia del usuario en AsyncStorage (igual que otros settings del store).

**Impacto estimado:** Medio-alto. Requiere refactorizar todos los componentes que importan `Colors`/`SurfaceColors` directamente para usar el ThemeContext. El `GlassPanel`, `PropertyCard`, `ScreenBackground` y todas las pantallas necesitarían adaptarse.

**Dónde surgió:** Feedback durante testing manual del feed — 2026-07-04.

**Estado:** 🔵 Propuesta para futura mejora de UX. Sin dependencias bloqueantes.

---

*Última actualización: 2026-07-04 — Light mode / theme switching.*
