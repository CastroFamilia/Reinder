---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish']
inputDocuments: []
workflowType: 'prd'
classification:
  projectType: 'web_app + mobile_app'
  businessModel: 'B2B2C Marketplace'
  domain: 'Real Estate / PropTech'
  complexity: 'medium-high'
  projectContext: 'greenfield'
  agentModel: 'buyer-agent referral link (opt-in, periodic reconfirmation)'
---

# Product Requirements Document - Reinder

**Author:** SantiCas
**Date:** 2026-03-13

---

## Executive Summary

Reinder es un portal inmobiliario diseñado desde cero para el comprador. A diferencia de los portales tradicionales —centrados en monetizar listings y captar vendedores— Reinder sitúa la experiencia del comprador como eje del producto: su agente, sus preferencias y su tiempo como activos a proteger.

La propuesta central es transformar la búsqueda inmobiliaria de proceso lineal y tedioso en una experiencia de microconsumo continuo: el comprador hace match o descarta propiedades en cualquier momento libre del día, desde la interfaz de swipe. El mecanismo replica la mecánica conductual de las redes sociales —engagement habitual, sesiones cortas, gratificación inmediata— aplicada al mercado inmobiliario.

El lado de oferta se resuelve mediante integración directa con CRMs de agencias inmobiliarias, permitiendo que publiquen sus exclusivas en Reinder sin fricción operativa. Las agencias son los clientes B2B; los compradores, los usuarios B2C. El modelo de agente representante del comprador —vinculado mediante referral opt-in con reconfirmación periódica— garantiza que cada listing que el comprador ve esté contextualizado por su representante de confianza, no por el agente del vendedor.

### What Makes This Special

El primer portal inmobiliario diseñado desde cero para el comprador — no un portal de listings con un feature de swipe añadido. Tres diferenciadores estructurales:

1. **Buyer-first por diseño:** la interfaz, el modelo de agente y el algoritmo de matching están construidos alrededor del comprador, no del inventario.
2. **Búsqueda como hábito:** el swipe convierte la búsqueda inmobiliaria en un comportamiento recurrente y de bajo esfuerzo, capturando tiempo de atención que los portales tradicionales no alcanzan.
3. **Agente del comprador nativo:** el vínculo comprador-agente representante es una funcionalidad central del producto, no un servicio externo. Todos los listings se muestran con el contexto del agente del comprador, creando una relación de confianza que ningún portal existente ofrece de forma estructural.

## Project Classification

- **Tipo de proyecto:** Web App + Mobile App (B2B2C Marketplace)
- **Dominio:** Real Estate / PropTech
- **Complejidad:** Media-Alta — integraciones CRM, arquitectura dual-sided marketplace, sistema de matching, notificaciones en tiempo real
- **Contexto:** Greenfield — producto nuevo desde cero
- **Modelo de agente:** Referral opt-in con reconfirmación periódica; desvinculación voluntaria en cualquier momento

---

## Success Criteria

### User Success

El éxito del comprador se mide por la incorporación de Reinder como hábito diario de microconsumo — no como herramienta puntual de búsqueda.

- **Métrica principal:** ≥3 sesiones diarias por usuario activo. Tres o más aperturas al día indican que el usuario está aprovechando momentos muertos (transporte, descansos, espera) para swipear, validando la propuesta central del producto.
- **Engagement secundario:** el usuario vuelve sin notificaciones externas — la mecánica de swipe es suficientemente atractiva para generar apertura orgánica.
- **Retención:** el usuario sigue activo en la plataforma a los 30 días de registro.

### Business Success

- **Lado B2B (agencias):** primera validación del modelo mediante acuerdos con ≥1 CRM inmobiliario (ej. Inmovilla) para integración técnica de listings. Presencia en ≥1 conferencia o convención del sector para captación directa de agencias y agentes.
- **Lado B2C (compradores):** base de usuarios activos con frecuencia de uso consistente de ≥3 sesiones/día — volumen exacto según mercado inicial objetivo.
- **Hito de validación del modelo:** compradores vinculados a agente representante muestran mayor retención que usuarios sin agente asignado.

### Technical Success

- Sistema de autenticación de usuarios robusto y seguro.
- API de integración con ≥1 CRM inmobiliario documentada y operativa.
- Base de datos de listings con modelo de datos definido: ingesta, actualización y expiración de propiedades.
- Interfaz de swipe con animaciones fluidas a ≥60fps, tiempo de carga de listing <1s en condiciones normales de red móvil.

### Measurable Outcomes (6-12 meses post-lanzamiento)

| Métrica | Target |
|---|---|
| Sesiones diarias por usuario activo | ≥3/día |
| CRMs integrados | ≥1 en producción |
| Retención a 30 días | >40% |
| Usuarios con agente representante vinculado | >30% de base activa |

## Product Scope

### MVP — Minimum Viable Product

- **Interfaz de swipe:** animaciones fluidas, feedback visual/sonoro en match y reject, diseño que "gusta usar" independientemente del inventario disponible.
- **Catálogo de listings:** integración con ≥1 CRM para importación de propiedades exclusivas.
- **Autenticación de usuario:** registro, login y gestión de perfil básico (comprador).
- **Agente representante:** flujo de referral opt-in para vincular comprador con agente; override de listing agent en la UI.
- **Historial de matcheos:** el comprador puede revisar sus propiedades con match.

### Growth Features (Post-MVP)

- Notificaciones push personalizadas basadas en patrón de matcheos del usuario.
- Panel de analytics para agencias: tiempo medio de visualización por listing, ratio match/reject, benchmark de mercado.
- Integración con múltiples CRMs adicionales.
- Agente vinculado por búsqueda (capa especialista sobre el modelo base).
- Búsqueda de agentes representantes dentro de la app.

### Vision (Futuro)

- Descripciones de listings generadas con IA adaptadas al perfil del comprador.
- Reinder como estándar de facto de búsqueda inmobiliaria — el "feature de swipe" que todos los portales quieren replicar.
- Expansión a mercados europeos con adaptación a CRMs locales.

---

## User Journeys

### Journey 1 — El Comprador: Marcos, 34 años, primera vivienda

**Situación:** Marcos lleva 8 meses buscando piso en Madrid. Cada vez que abre Idealista sale con dolor de cabeza: 400 resultados, filtros que no recuerda dónde puso, anuncios duplicados y portadas de mala calidad. La búsqueda se siente como una tarea pendiente, no como un proceso que avanza.

**Cómo llega:** Su agente de confianza, Elena, le envía un link de referral. Marcos acepta el vínculo y abre la app por curiosidad.

**Acción:** Ve la primera propiedad en pantalla completa. Swipe derecho — match. Swipe izquierdo — siguiente. En 4 minutos hace 18 swipes en el metro. Esa noche, antes de dormir, hace 10 más. Al día siguiente abre la app tres veces. Sin darse cuenta, Marcos busca casa mientras vive su vida.

**Momento de valor:** Marcos hace match con un ático en Chamberí. El match es inmediato y unilateral — la propiedad está en el mercado y a él le gusta. Elena recibe la notificación al instante, llama esa misma mañana al agente que listó la propiedad y coordina la visita para esa semana.

**Resolución:** Marcos visita el piso. Le gusta. La búsqueda que parecía interminable se convirtió en un hábito que trabajó por él mientras él dormia, viajaba y tomaba café.

---

### Journey 2 — El Agente Representante: Elena, agente en inmobiliaria boutique

**Situación:** Elena trabaja con 12 compradores activos. Su diferencial tiene que ser la velocidad de respuesta y la información que consigue antes que cualquier otro agente.

**Cómo llega:** La agencia de Elena se integra con Reinder vía CRM. El director le explica que los agentes pueden vincular a sus clientes compradores. Elena es la primera en hacerlo en su oficina.

**Acción:** Envía links de referral a sus 12 compradores. 8 aceptan. Desde ese momento, cada match de cualquier cliente genera una notificación inmediata en su panel. El match es unilateral — la propiedad está disponible y el comprador ha expresado interés. Elena solo tiene que llamar al agente del listing y coordinar.

**Momento de valor:** A las 11pm, Marcos hace match con el ático de Chamberí. A las 9am del día siguiente Elena ya tiene la visita pedida. Su cliente queda impresionado. Ningún otro agente de Marcos hubiera actuado tan rápido.

**Resolución:** Elena cierra la operación. Reinder no la reemplaza — le da visibilidad en tiempo real sobre el interés de sus clientes y elimina la fricción de preguntar "\u00bfqué pisos te han gustado esta semana?"

---

### Journey 3 — La Agencia: Director Comercial de Inmobiliaria Premium, Madrid

**Situación:** La agencia tiene 80 exclusivas activas en Idealista y su web. Las métricas de engagement son opacas — no saben si su portada funciona ni cuánto tiempo pasa un usuario viendo cada listing.

**Cómo llega:** SantiCas (Reinder) los contacta directamente con una propuesta concreta: integración vía Inmovilla, sus exclusivas en una plataforma de compradores cualificados, y datos de comportamiento que Idealista nunca ofrece. Solo se admiten exclusivas verificadas — sin particulares ni listings no exclusivos.

**Acción:** El director aprueba. En 48h sus 80 exclusivas están en Reinder. Dos semanas después accede al panel de agencia: el chalet en Pozuelo tiene un tiempo medio de visualización de 8 segundos, muy por debajo del promedio de 22s. Cambian la portada.

**Momento de valor:** La semana siguiente el tiempo de visualización sube a 19 segundos. Los matcheos se triplican. Consiguen visita cualificada.

**Resolución:** La agencia renueva su acuerdo. Lo que empezó como un canal más se convierte en el canal con mejor ratio de visitas cualificadas de su portfolio.

---

### Journey 4 — Admin Reinder (Operaciones Internas)

**Situación:** En los primeros meses, SantiCas gestiona integraciones con CRMs, incorporación de agencias y calidad del inventario.

**Acción:** Verifica que todos los listings sean exclusivas de agencias integradas. Gestiona la activación de nuevas agencias. Monitorea métricas de plataforma y detecta anomalías. Mantiene el criterio de calidad: sin particulares, sin no-exclusivos.

**Evolución:** Este rol escala hacia un equipo de Customer Success B2B a medida que el número de agencias crece.

---

### Journey Requirements Summary

| Actor | Capacidades necesarias |
|---|---|
| Comprador | Auth, swipe UI, match/reject engine, historial de matcheos, vinculación con agente |
| Agente representante | Dashboard de matcheos por cliente, notificaciones en tiempo real, gestión de vínculos referral |
| Agencia/CRM | API de integración CRM, panel de analytics de listings, gestión de inventario exclusivo |
| Admin Reinder | Panel interno de gestión de agencias, verificación de listings, métricas globales |

---

## Domain-Specific Requirements

### Compliance & Privacidad (GDPR)

- **Acceso autenticado obligatorio:** Reinder no tiene modo de exploración anónimo. Todo el contenido requiere registro previo.
- **Consentimiento en onboarding:** Al crear cuenta (email o Google OAuth) el usuario acepta los Términos y Condiciones antes de acceder. Este es el punto de captura del consentimiento GDPR para el procesamiento de datos de comportamiento. T&C a definir legalmente antes del lanzamiento.
- **Datos de comportamiento del comprador:** Los datos de swipe y matcheos se usan internamente para mejorar el algoritmo y, en modo agregado/anonimizado, para el panel de analytics de agencias. Ningún dato personal se comparte directamente con agencias sin consentimiento adicional.

### Sincronización CRM — Modelo de Ingesta

- **Decisión pendiente:** real-time (webhooks) vs. batch diario. Depende del impacto en rendimiento y coste técnico.
- **Preferencia inicial:** sincronización en tiempo real para la fase de captación de agencias — argumento de venta diferencial.
- **Fallback:** batch diario nocturno si el webhook falla o la agencia no soporta eventos en tiempo real.

### Verificación de Exclusividad

- **Mecanismo principal:** cruce de referencia catastral (España) / CRU contra base de datos de Reinder para detectar duplicados del mismo inmueble.
- **Integración MLS:** conexión a MLS para verificación adicional de que la propiedad es una exclusiva real.
- **Limitación conocida:** una agencia puede introducir una referencia catastral errónea. La verificación es best-effort, no garantizada.
- **Política de duplicados:** listing duplicado detectado queda en revisión hasta resolución por Admin Reinder.

### Ciclo de Vida del Listing

| Estado | Comportamiento en Reinder |
|---|---|
| **Activa** | Aparece en el swipe feed normalmente |
| **Retirada del mercado** | Eliminación inmediata del feed |
| **Vendida** | Permanece visible un período breve con badge **"VENDIDA"** — social proof de mercado activo para compradores que hacen match |

---

## Innovation & Novel Patterns

### Áreas de Innovación Detectadas

**1. Inversión del modelo de poder del marketplace inmobiliario**
Los portales existentes son plataformas de distribución para vendedores; el comprador es el medio, no el fin. Reinder invierte esto estructuralmente: el comprador tiene representante propio, control de su experiencia y datos que trabajan a su favor. No es una feature — es un reencuadre completo del producto.

**2. Búsqueda inmobiliaria como comportamiento de microconsumo**
Reinder convierte la búsqueda — históricamente de alta fricción y sesión larga — en un comportamiento de baja fricción y sesión corta, replicando la mecánica de engagement de TikTok/Tinder en un dominio donde nadie lo ha aplicado como identidad central de producto.

**3. Matching unilateral como señal de intención cualificada**
Cada swipe-derecho es una señal de interés capturada en tiempo real y entregada al agente representante. El comportamiento pasivo del comprador (swipear en el bus) se convierte en un activo de información accionable para el agente.

### Landscape Competitivo

Existen precedentes de swipe en propiedades (Doorsteps Swipe de Zillow ~2014, apps menores) pero ninguno construyó toda su propuesta de valor alrededor del comprador ni lo escaló masivamente. La innovación de Reinder no es el swipe — es la **arquitectura buyer-first que rodea al swipe**.

### Enfoque de Validación

| Hipótesis | Cómo validar |
|---|---|
| El swipe genera hábito diario (≥3 sesiones/día) | Analítica de sesiones en primeros 30 días |
| Agentes con clientes vinculados cierran más operaciones | Comparar ratio visitas/cierre: agentes en Reinder vs. fuera |
| Badge "VENDIDA" refuerza urgencia del comprador | A/B test: compradores que ven "VENDIDA" vs. los que no |

### Riesgos de Innovación

- **Cold-start de inventario:** Sin suficientes exclusivas desde el inicio, el swipe pierde sentido. Mitigación: asegurar ≥1 agencia con catálogo significativo antes del lanzamiento público.
- **Adopción del agente representante:** Los compradores pueden no querer vincularse si no confían en el modelo. Mitigación: onboarding explicativo + periodo sin agente para que el usuario experimente valor primero.

---

## Web App + Mobile App — Requisitos Técnicos

### Stack Seleccionado

- **Web:** Next.js (React) con Server-Side Rendering (SSR) — máximo SEO, estándar de la industria para web apps modernas con contenido indexable.
- **Mobile:** React Native (cross-platform iOS + Android) — un único codebase para MVP, comparte lógica de negocio con la web.

### Estrategia Web/Mobile

- Web responsive como base — funciona en escritorio y móvil browser.
- **Smart App Banner en mobile:** al acceder desde navegador móvil, pop-up/banner invita a abrir o descargar la app nativa.
- La experiencia de swipe completa vive en la app móvil; la web cubre descubrimiento, perfil y panel de agentes.

### SEO — Modelo Gated Content

1. Google indexa URL del listing (título, descripción, imagen, precio, datos estructurados schema.org).
2. Usuario llega desde buscador → ve preview del listing + prompt de registro/login.
3. Tras autenticarse → acceso completo a la interfaz de swipe.
- Compatible con directrices de Google; maximiza SEO sin comprometer el modelo de acceso autenticado obligatorio.

### Compatibilidad de Plataformas

| Plataforma | Soporte |
|---|---|
| Web escritorio | Chrome, Safari, Firefox — últimas 2 versiones |
| Web móvil | Responsive + Smart App Banner |
| iOS App | iOS 15+ |
| Android App | Android 10+ |

### Accesibilidad

- MVP: buenas prácticas básicas (contraste, alt text en imágenes). Sin requisito formal WCAG.
- Post-MVP: evaluar si clientes B2B institucionales lo requieren.

---

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**Enfoque:** Experience MVP — validar que la búsqueda como microhábito funciona antes de escalar funcionalidad.
**Equipo mínimo:** 1 desarrollador full-stack, 1 diseñador UX/UI, SantiCas como PM + sales B2B.

### MVP Feature Set — Phase 1

**Journeys soportados:** Comprador (swipe completo), Agente representante (panel + notificaciones), Agencia (integración CRM básica).

**Must-Have:**
1. Auth (email + Google OAuth) con aceptación de T&C
2. Swipe UI con animaciones fluidas y SFX
3. Feed de propiedades exclusivas desde ≥1 CRM integrado
4. Historial de matcheos del comprador
5. Referral link agente → comprador (opt-in + reconfirmación periódica)
6. Notificación al agente en cada match de cliente
7. Gated content SEO: listing indexable + login wall
8. Ciclo de vida: activa / retirada (eliminación inmediata) / vendida (badge temporal)

### Roadmap

**Phase 2 — Growth:** Analytics para agencias, push notifications, Smart App Banner, más CRMs, filtros básicos.
**Phase 3 — Expansion:** IA de descripciones personalizadas, agente por búsqueda, expansión europea.

### Risk Mitigation

| Riesgo | Mitigación |
|---|---|
| Cold-start de inventario | ≥1 agencia con catálogo antes del lanzamiento público |
| UX de swipe no engancha | Invertir en animaciones y SFX desde el día 1 |
| Integración CRM compleja | Empezar con 1 CRM, construir conector genérico después |
| Pocos compradores iniciales | Agentes como canal de adquisición de compradores |

---

## Functional Requirements

### Gestión de Identidad y Acceso

- FR1: El comprador puede registrarse con email o Google OAuth
- FR2: El comprador debe aceptar Términos y Condiciones antes de acceder al contenido
- FR3: El agente puede registrarse y autenticarse en la plataforma
- FR4: El administrador de agencia puede crear y gestionar su cuenta institucional
- FR5: El sistema requiere autenticación para acceder a cualquier contenido de propiedades

### Descubrimiento de Propiedades (Swipe)

- FR6: El comprador puede visualizar propiedades en formato de tarjeta de pantalla completa
- FR7: El comprador puede hacer match (swipe derecho / acción positiva) sobre una propiedad
- FR8: El comprador puede rechazar (swipe izquierdo / acción negativa) una propiedad
- FR9: El sistema presenta propiedades del feed una a una en sesiones de corta duración
- FR10: El comprador puede acceder a su historial completo de matches
- FR11: El comprador puede ver el detalle ampliado de una propiedad antes de decidir
- FR12: El sistema distingue visualmente propiedades con estado "Vendida" mediante badge

### Vínculo Comprador–Agente Representante

- FR13: El agente puede generar un link de referral único para invitar a un comprador
- FR14: El comprador puede aceptar o rechazar el vínculo con un agente representante
- FR15: El vínculo comprador–agente caduca periódicamente y requiere reconfirmación activa
- FR16: El comprador puede desvincular a su agente representante en cualquier momento
- FR17: El sistema sobreescribe el "listing agent" por el agente representante del comprador en toda la UI

### Panel del Agente Representante

- FR18: El agente puede visualizar todos sus clientes compradores vinculados
- FR19: El agente recibe notificación inmediata cuando un cliente hace match
- FR20: El agente puede ver el historial de matches de cada cliente vinculado
- FR21: El agente puede ver qué propiedades ha rechazado cada cliente

### Gestión de Listings (Agencia)

- FR22: La agencia puede conectar su CRM para importar sus exclusivas activas
- FR23: El sistema sincroniza listings desde el CRM (real-time o batch, configurable)
- FR24: El sistema valida exclusividad del listing mediante referencia catastral / CRU
- FR25: El sistema detecta y bloquea listings duplicados hasta resolución manual
- FR26: La agencia puede marcar una propiedad como retirada del mercado (eliminación inmediata del feed)
- FR27: La agencia puede marcar una propiedad como vendida (visible brevemente con badge "Vendida")

### SEO y Descubrimiento Orgánico

- FR28: El sistema genera páginas indexables por motores de búsqueda para cada listing activo
- FR29: El sistema implementa datos estructurados schema.org para propiedades inmobiliarias
- FR30: Los usuarios no autenticados ven una preview del listing con prompt de registro al acceder desde buscador

### Administración de Plataforma

- FR31: El administrador puede activar y desactivar agencias integradas
- FR32: El administrador puede revisar y resolver listings marcados como duplicados
- FR33: El administrador puede monitorear métricas globales de la plataforma

---

## Non-Functional Requirements

### Performance

La experiencia de swipe es el núcleo del producto — la latencia percibida destruye el hábito.

- **NFR1:** Las tarjetas de propiedad cargan en ≤1s en condiciones de red móvil 4G
- **NFR2:** Las animaciones de swipe se ejecutan a ≥60fps en dispositivos con ≤3 años de antigüedad
- **NFR3:** Las notificaciones de match al agente se entregan en ≤5 segundos tras la acción del comprador
- **NFR4:** Las páginas de listing indexables (SEO) renderizan en servidor con Time to First Byte ≤2s

### Seguridad

- **NFR5:** Toda comunicación entre cliente y servidor usa HTTPS/TLS 1.3
- **NFR6:** Los tokens de sesión expiran tras 30 días de inactividad
- **NFR7:** Los datos de comportamiento del comprador (swipes, matches) se almacenan encriptados en reposo
- **NFR8:** El sistema no expone datos personales del comprador a las agencias sin consentimiento explícito
- **NFR9:** Los links de referral agente–comprador son de un solo uso o tienen expiración configurable

### Escalabilidad

- **NFR10:** La arquitectura soporta escalar a 10x usuarios sin rediseño estructural
- **NFR11:** La sincronización de CRM no degrada el rendimiento de la UI del comprador (procesos desacoplados)

### Integración

- **NFR12:** La API de integración con CRMs tiene documentación pública y SLA de disponibilidad del 99.5%
- **NFR13:** El sistema gestiona fallos de sincronización CRM con reintentos automáticos y alertas al admin
- **NFR14:** Los datos estructurados schema.org de listings se actualizan en ≤24h tras cambios en el CRM

### Fiabilidad

- **NFR15:** Disponibilidad del servicio ≥99.5% mensual (excluyendo ventanas de mantenimiento programado)
- **NFR16:** Los datos de matcheos del comprador no se pierden ante fallos de servidor (durabilidad garantizada)
