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

**Estado:** Fase 2. Requiere capa de analytics y dashboard B2B.

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

*Última actualización: 2026-04-30 — Añadidas dos ideas: Modos de Vista de Tarjeta (Cover vs. Detail) y Widget Embebible de Reinder para páginas web de agencias.*
