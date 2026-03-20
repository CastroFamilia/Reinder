# Reinder — Ideas Futuras y Backlog Estratégico

> **Archivo vivo.** Toda idea que surja durante cualquier sesión de trabajo y quede fuera del MVP debe añadirse aquí, además de donde surgió originalmente.

---

## 🟠 Phase 2 — Growth Features

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

*Última actualización: 2026-03-16 — Consolidación inicial desde PRD, UX Design Spec y sesiones de trabajo anteriores.*
