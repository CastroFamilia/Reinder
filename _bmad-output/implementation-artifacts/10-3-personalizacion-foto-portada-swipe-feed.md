# Story 10.3: Personalización de Foto de Portada en Swipe Feed

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

Como comprador de Reinder,
quiero que la foto de portada de cada propiedad en el swipe feed se seleccione automáticamente según mis preferencias de visualización,
para que vea primero el aspecto de la propiedad que más me interesa sin tener que recorrer toda la galería.

## Contexto del Epic

**Epic 10 — Personalized Content Layer:** Cada comprador ve la versión del listing más relevante para su perfil implícito. Story 10.1 creó el `buyer_preference_vector`. Story 10.2 creó el `listing_fit_score` con el campo `recommended_photo_index` (actualmente siempre `null`). **Esta story (10.3)** implementa el cálculo de `recommended_photo_index` y lo integra en el feed para que PropertyCard muestre la foto personalizada.

**FR cubierto:** FR-E10-3 — La foto de portada mostrada al comprador se selecciona automáticamente según su preference_vector (sin intervención de la agencia).
**NFRs aplicados:** NFR2 (la selección de variante personalizada debe resolverse en <5ms — el índice DEBE estar pre-calculado en `listing_fit_scores`, NUNCA computarse en tiempo real durante el swipe), NFR8 (personalización basada exclusivamente en datos internos).
**Pre-requisitos:** Story 10.1 completa (PR #42), Story 10.2 completa (PR #44), Story 10.5 completa (PR #43 — campo `personalization_enabled`).

**Posición en el epic:** Story 10.3 es la **tercera story** del Epic 10 y la primera que produce un cambio visible en la UI del comprador. Transforma el `listing_fit_score` pre-calculado en una foto de portada personalizada.

**Dependencias directas:**
- Story 10.1 (done, PR #42): tabla `buyer_preference_vectors`, tipos `BuyerPreferenceVector`, `PhotoEngagement.preferredPhotoIndices`
- Story 10.2 (done, PR #44): tabla `listing_fit_scores`, campo `recommended_photo_index` (nullable), función `computeListingFitScore()`, tipos `ListingFitScore`, `DimensionScores`
- Story 10.5 (done, PR #43): campo `personalization_enabled` en `user_profiles` — cuando `false`, usar foto por defecto de la agencia
- Story 2.2 (done): `PropertyCard` component (`apps/mobile/src/features/swipe/components/property-card.tsx`)
- Listings API (`apps/web/src/app/api/v1/listings/route.ts`): actualmente hardcodea `imageUrl = images[0]`

## Acceptance Criteria (BDD)

### AC1 — Cálculo de `recommendedPhotoIndex` en `computeListingFitScore()`
**Given** un buyer con `preferredPhotoIndices` en su preference_vector (ej: `[2, 0, 4]` — ordenados por engagement time)
**And** un listing con 6 fotos en su array `images`
**When** se ejecuta `computeListingFitScore(vector, listing)`
**Then** `recommendedPhotoIndex` contiene el índice de la foto más relevante para este buyer:
  - Selecciona el primer índice de `preferredPhotoIndices` que sea < `images.length`
  - Si `preferredPhotoIndices = [2, 0, 4]` y `images.length = 6` → `recommendedPhotoIndex = 2`
  - Si `preferredPhotoIndices = [5, 3, 1]` y `images.length = 4` → `recommendedPhotoIndex = 3` (primer índice válido)

**Given** un buyer con `preferredPhotoIndices` vacío (`[]`)
**When** se ejecuta `computeListingFitScore(vector, listing)`
**Then** `recommendedPhotoIndex = 0` (fallback: primera foto, la de la agencia)

**Given** un listing con `images` null o vacío
**When** se ejecuta `computeListingFitScore(vector, listing)`
**Then** `recommendedPhotoIndex = null` (sin imágenes disponibles)

**Given** un buyer cuyos `preferredPhotoIndices` son todos ≥ `images.length` del listing
**When** se ejecuta `computeListingFitScore(vector, listing)`
**Then** `recommendedPhotoIndex = 0` (fallback: primera foto)

### AC2 — Persistencia de `recommended_photo_index` en el batch job
**Given** el aggregation job `compute_listing_fit_scores()` ejecutándose via pg_cron cada 6h
**When** el job calcula/actualiza un `listing_fit_score`
**Then** el campo `recommended_photo_index` se persiste con el valor devuelto por `computeListingFitScore()`
**And** el UPSERT actualiza `recommended_photo_index` junto con `overall_score` y `dimension_scores`

### AC3 — API endpoint `/api/v1/listings` devuelve foto personalizada
**Given** un buyer autenticado con `personalization_enabled = true` y fit scores pre-calculados
**When** hace GET `/api/v1/listings`
**Then** cada listing en la respuesta tiene `imageUrl` apuntando a `images[recommended_photo_index]` en lugar de `images[0]`
**And** el campo `imageUrls` (galería completa) se mantiene sin cambios — todas las fotos siguen disponibles
**And** si el `recommended_photo_index` es null o inválido (≥ images.length), usa `images[0]` como fallback

**Given** un buyer con `personalization_enabled = false`
**When** hace GET `/api/v1/listings`
**Then** `imageUrl` usa `images[0]` (la foto de portada de la agencia — sin personalización)
**And** NO se consulta la tabla `listing_fit_scores` para este buyer

**Given** un buyer sin fit scores pre-calculados (usuario nuevo, primera sesión)
**When** hace GET `/api/v1/listings`
**Then** `imageUrl` usa `images[0]` (fallback por defecto)
**And** el rendimiento del endpoint no se degrada

### AC4 — PropertyCard refleja la foto personalizada
**Given** un listing con `imageUrl` personalizada (ya resuelta en la API)
**When** el `PropertyCard` renderiza el listing en el swipe feed
**Then** la imagen hero muestra la URL personalizada recibida en `imageUrl`
**And** NO se requieren cambios en PropertyCard — la personalización se resuelve en el backend

### AC5 — Performance: lookup de foto en <5ms
**Given** un buyer con 50 fit scores pre-calculados
**When** el API endpoint consulta `listing_fit_scores` para resolver foto personalizada
**Then** la consulta JOIN con `listing_fit_scores` se resuelve en <5ms usando el índice existente `idx_lfs_buyer_overall`
**And** la latencia total del endpoint GET `/api/v1/listings` no aumenta más de 10ms con respecto al baseline sin personalización

### AC6 — Galería de detalle mantiene orden original
**Given** un buyer que abre el `PropertyDetailSheet` (bottom sheet de detalle) de un listing
**When** navega por la galería de fotos
**Then** las fotos están en el orden original de la agencia (`imageUrls` no se reordena)
**And** la foto personalizada de portada solo afecta al hero del feed, no a la galería

### AC7 — Invalidación al cambiar fotos del listing
**Given** un listing cuyo array `images` cambia (por CRM sync: se añaden, eliminan o reordenan fotos)
**When** el trigger `AFTER UPDATE` en `listings` detecta cambio en `images`
**Then** los `listing_fit_scores` de ese listing se invalidan (DELETE) — el batch recalcula `recommended_photo_index`
**And** mientras no se recalcule, el fallback `images[0]` se usa para ese listing

### AC8 — Tests unitarios del cálculo de `recommendedPhotoIndex`
**Given** los tests en `compute-listing-fit-score.test.ts`
**When** se ejecutan con `vitest`
**Then** cubren todos los escenarios de AC1:
  - Buyer con preferredPhotoIndices válidos → selecciona primer índice válido
  - Buyer con preferredPhotoIndices vacío → fallback 0
  - Listing sin imágenes → null
  - Todos los índices fuera de rango → fallback 0
  - Listing con 1 sola foto → siempre 0

## Tasks / Subtasks

- [x] Task 1: Actualizar lógica de `computeListingFitScore()` para calcular `recommendedPhotoIndex` (AC: #1)
  - [x] 1.1 Modificar `packages/shared/src/personalization/compute-listing-fit-score.ts`: implementar selección de `recommendedPhotoIndex` basada en `preferredPhotoIndices` del vector
  - [x] 1.2 Añadir función helper `selectRecommendedPhotoIndex(preferredIndices: number[], imageCount: number): number | null`
  - [x] 1.3 Actualizar tests `compute-listing-fit-score.test.ts` con todos los escenarios de AC1 y AC8

- [x] Task 2: Actualizar batch job para persistir `recommended_photo_index` (AC: #2)
  - [x] 2.1 Verificar que el endpoint `POST /api/v1/admin/fit-scores/compute` ya persiste `recommendedPhotoIndex` en el UPSERT — si no, actualizar el UPSERT query
  - [x] 2.2 Verificar que la migración SQL del trigger `AFTER UPDATE` en `listings` detecta cambios en el campo `images` (AC7) — si no, actualizar el trigger

- [x] Task 3: Personalizar `imageUrl` en el endpoint GET `/api/v1/listings` (AC: #3, #5)
  - [x] 3.1 Modificar `apps/web/src/app/api/v1/listings/route.ts`:
    - Extraer `buyer_id` del JWT (`auth.uid()`) via Supabase server client
    - Consultar `user_profiles.personalization_enabled` para el buyer
    - Si `personalization_enabled = true`: hacer LEFT JOIN con `listing_fit_scores` para obtener `recommended_photo_index` por listing
    - Si `personalization_enabled = false` o no hay fit scores: usar `images[0]`
  - [x] 3.2 Mapear `images[recommended_photo_index]` a `imageUrl` en la respuesta, con fallback `images[0]` si el índice es inválido
  - [x] 3.3 Tests del endpoint: buyer personalizado, buyer sin personalización, buyer nuevo sin scores, índice fuera de rango

- [x] Task 4: Actualizar trigger de invalidación para incluir cambios en `images` (AC: #7)
  - [x] 4.1 Crear migración `supabase/migrations/YYYYMMDD000001_listing_fit_scores_images_trigger.sql` — la migración existente (`20260722000002_listing_fit_scores.sql` L91-97) monitorea `price`, `size_sqm`, `bedrooms`, `city`, `latitude`, `longitude` pero NO `images`. Añadir `OR OLD.images IS DISTINCT FROM NEW.images` al trigger `invalidate_listing_fit_scores()` usando `CREATE OR REPLACE FUNCTION`

- [x] Task 5: Verificación de rendimiento (AC: #5)
  - [x] 5.1 Verificar que la consulta LEFT JOIN con `listing_fit_scores` usa el índice `idx_lfs_buyer_overall` y se resuelve en <5ms
  - [x] 5.2 Si es necesario, añadir índice adicional `(buyer_id, listing_id)` — pero el UNIQUE constraint `listing_fit_scores_buyer_listing_unique` ya cubre este caso

## Dev Notes

### Arquitectura de la personalización — flujo de datos completo

```
[pg_cron cada 6h] → computeListingFitScore(vector, listing) → UPSERT listing_fit_scores
                                                                    ↓
                                                      recommended_photo_index = N
                                                                    ↓
[GET /api/v1/listings] → LEFT JOIN listing_fit_scores → images[N] → imageUrl en response
                                                                    ↓
[PropertyCard] → <Image source={{ uri: listing.imageUrl }} /> → foto personalizada
```

**Principio clave:** La personalización se resuelve ENTERAMENTE en el backend. PropertyCard NO necesita cambios — recibe `imageUrl` ya personalizado en la respuesta de la API. Esto evita latencia en el UI thread (NFR2: 60fps) y mantiene la lógica centralizada.

### Modificación de `computeListingFitScore()` — CAMBIO MÍNIMO

**Archivo:** `packages/shared/src/personalization/compute-listing-fit-score.ts` (L229-292)

Actualmente retorna `recommendedPhotoIndex: null` (L290). Cambiar a:

```typescript
return {
  overallScore,
  dimensionScores,
  recommendedPhotoIndex: selectRecommendedPhotoIndex(
    vector.photoEngagement.preferredPhotoIndices,
    listing.images?.length ?? 0,
  ),
};
```

**Nueva función helper** (en el mismo archivo, arriba de la función principal):

```typescript
/**
 * Selects the best cover photo index for this buyer based on their
 * preferred photo indices from engagement data.
 *
 * Algorithm: Pick the first preferredPhotoIndex that exists in the
 * listing's image array. Falls back to 0 (agency default).
 *
 * @returns Photo index (0-based), or null if listing has no images.
 */
function selectRecommendedPhotoIndex(
  preferredIndices: number[],
  imageCount: number,
): number | null {
  if (imageCount === 0) return null;
  if (preferredIndices.length === 0) return 0;

  for (const idx of preferredIndices) {
    if (idx < imageCount) return idx;
  }

  return 0; // All preferred indices out of range
}
```

### Modificación del endpoint GET `/api/v1/listings` — CAMBIO PRINCIPAL

**Archivo:** `apps/web/src/app/api/v1/listings/route.ts`

**Estado actual (L66-92):** Query simple `SELECT * FROM listings` → mapea `images[0]` a `imageUrl`.

**Cambio necesario:**
1. Extraer `buyer_id` del JWT con `createServerClient()` de `@supabase/ssr`
2. Consultar `user_profiles.personalization_enabled`
3. Si enabled: LEFT JOIN con `listing_fit_scores` para obtener `recommended_photo_index`
4. Usar `recommended_photo_index` para seleccionar la foto

**Patrón de auth existente:** Copiar el patrón de `apps/web/src/app/api/v1/buyer/personalization/route.ts` (Story 10.5) para extraer el userId del JWT.

**Drizzle LEFT JOIN:**
```typescript
import { listingFitScores } from '@reinder/shared/db/schema';

const rows = await db
  .select({
    listing: listings,
    recommendedPhotoIndex: listingFitScores.recommendedPhotoIndex,
  })
  .from(listings)
  .leftJoin(
    listingFitScores,
    and(
      eq(listingFitScores.listingId, listings.id),
      eq(listingFitScores.buyerId, userId),
    ),
  )
  .where(and(...conditions))
  .orderBy(desc(listings.createdAt))
  .limit(50);
```

**Selección de foto en el map:**
```typescript
const data: Listing[] = rows.map((row) => {
  const images = (row.listing.images as string[] | null) ?? [];
  const photoIndex = personalizationEnabled
    ? (row.recommendedPhotoIndex ?? 0)
    : 0;
  const safeIndex = photoIndex < images.length ? photoIndex : 0;
  const firstImage = images.length > 0 ? images[safeIndex] : '';

  return {
    // ... same fields ...
    imageUrl: firstImage,
    imageUrls: images.length > 0 ? images : undefined,
    // ... rest ...
  };
});
```

### Tablas fuente (INPUT — no crear, ya existen)

| Tabla | Campos relevantes | Story |
|-------|-------------------|-------|
| `listing_fit_scores` | `buyer_id`, `listing_id`, `recommended_photo_index` | 10.2 (PR #44) |
| `buyer_preference_vectors` | `buyer_id`, `vector.photoEngagement.preferredPhotoIndices` | 10.1 (PR #42) |
| `listings` | `id`, `images` (JSONB string[]) | Schema original |
| `user_profiles` | `personalization_enabled` (BOOLEAN DEFAULT TRUE) | 10.5 (PR #43) |

### Archivos que esta story MODIFICA (NO crear nuevos)

```
packages/shared/src/personalization/compute-listing-fit-score.ts   # Añadir selectRecommendedPhotoIndex()
packages/shared/src/personalization/compute-listing-fit-score.test.ts  # Añadir tests de recommendedPhotoIndex
apps/web/src/app/api/v1/listings/route.ts                           # LEFT JOIN + foto personalizada
apps/web/src/app/api/v1/listings/route.test.ts                      # Tests del endpoint con personalización
```

### Archivos que esta story CREA

```
supabase/migrations/YYYYMMDD000001_listing_fit_scores_images_trigger.sql  # Trigger update: añadir `images` a campos monitoreados
```

### Trigger de invalidación — CONFIRMADO: `images` no está cubierto

La migración `20260722000002_listing_fit_scores.sql` define el trigger `invalidate_listing_fit_scores()` (L88-104) que monitorea: `price`, `size_sqm`, `bedrooms`, `city`, `latitude`, `longitude`. El campo `images` NO está incluido. **Se requiere una nueva migración** que actualice la función del trigger añadiendo `OR OLD.images IS DISTINCT FROM NEW.images` para que cambios en las fotos del listing invaliden los fit scores (y por extensión el `recommended_photo_index`).

### Convenciones de código del proyecto

- **ORM:** Drizzle ORM 0.45.x — camelCase en TypeScript, snake_case en DB
- **API response shape:** `{ data: T | null, error: { code: string, message: string } | null }` (patrón `ApiResponse<T>`)
- **Auth guard pattern:** `createServerClient()` de `@supabase/ssr` en route handlers (Next.js App Router)
- **Test framework:** Vitest para unit tests en `packages/shared`, Jest para tests en `apps/web` y `apps/mobile`
- **Import alias:** `@reinder/shared` para imports desde packages/shared
- **Numeric fields:** `price`, `sizeSqm`, `latitude`, `longitude` son `numeric()` en Drizzle (strings en TS). Convertir a `Number()` antes de calcular.

### GDPR / Privacidad

- La foto personalizada es un dato derivado del comportamiento — cubierto por consentimiento GDPR del onboarding
- Si `personalization_enabled = false`: NO consultar `listing_fit_scores`, usar foto por defecto
- El campo `recommended_photo_index` es interno — NUNCA se expone directamente en la UI como "personalizado"
- La personalización es transparente para el comprador — simplemente ve "la mejor foto"

### Consideraciones de performance

- El LEFT JOIN con `listing_fit_scores` usa el índice UNIQUE `(buyer_id, listing_id)` — lookup O(1) por listing
- Con 50 listings en el feed y 1 buyer, son 50 lookups en un índice B-tree = negligible
- Si no hay fit scores (buyer nuevo), el LEFT JOIN retorna NULL → fallback `images[0]` sin coste adicional
- La consulta de `personalization_enabled` es 1 SELECT a `user_profiles` — se puede hacer en paralelo con la query de listings o cachear en el JWT claim (futuro)

### Anti-patrones a EVITAR

1. **NO calcular `recommendedPhotoIndex` en tiempo real en el endpoint** — ya está pre-calculado en el batch job
2. **NO modificar PropertyCard** — la personalización se resuelve en el backend. PropertyCard solo lee `listing.imageUrl`
3. **NO reordenar `imageUrls`** — la galería de detalle mantiene el orden de la agencia
4. **NO duplicar la lógica de selección de foto** — la función `selectRecommendedPhotoIndex()` es la única fuente de verdad, tanto en el batch job como para cualquier fallback
5. **NO crear un nuevo endpoint** — modificar el existente `GET /api/v1/listings` que ya sirve el feed

### Project Structure Notes

- Alineado con `packages/shared/src/personalization/` (módulo establecido en Stories 10.1-10.2)
- No se crean nuevos componentes UI — la personalización es backend-only en su interfaz visible
- Sin conflictos con la estructura existente — extensión natural del pipeline de personalización

### References

- [Source: epics.md#Epic 10, líneas 386-424](file:///Users/santiagocastro/Desktop/Projects%20Antigravity/Reinder/_bmad-output/planning-artifacts/epics.md#L386)
- [Source: architecture.md#Data Architecture](file:///Users/santiagocastro/Desktop/Projects%20Antigravity/Reinder/_bmad-output/planning-artifacts/architecture.md#L136)
- [Story 10.2 completa — patrón a reusar](file:///Users/santiagocastro/Desktop/Projects%20Antigravity/Reinder/_bmad-output/implementation-artifacts/10-2-listing-fit-score-calculo-afinidad.md)
- [Story 10.5 — personalization_enabled](file:///Users/santiagocastro/Desktop/Projects%20Antigravity/Reinder/_bmad-output/implementation-artifacts/10-5-control-privacidad-desactivacion-personalizacion.md)
- [computeListingFitScore (10.2)](file:///Users/santiagocastro/Desktop/Projects%20Antigravity/Reinder/packages/shared/src/personalization/compute-listing-fit-score.ts)
- [fit-score-types.ts (10.2)](file:///Users/santiagocastro/Desktop/Projects%20Antigravity/Reinder/packages/shared/src/personalization/fit-score-types.ts)
- [PhotoEngagement types (10.1)](file:///Users/santiagocastro/Desktop/Projects%20Antigravity/Reinder/packages/shared/src/personalization/types.ts#L48-L52)
- [Listings API endpoint](file:///Users/santiagocastro/Desktop/Projects%20Antigravity/Reinder/apps/web/src/app/api/v1/listings/route.ts)
- [PropertyCard component](file:///Users/santiagocastro/Desktop/Projects%20Antigravity/Reinder/apps/mobile/src/features/swipe/components/property-card.tsx)
- [Listing type definition](file:///Users/santiagocastro/Desktop/Projects%20Antigravity/Reinder/packages/shared/src/types/listing.ts)
- [Schema: listing_fit_scores table](file:///Users/santiagocastro/Desktop/Projects%20Antigravity/Reinder/packages/shared/src/db/schema.ts#L646-L683)
- [Schema: listings table](file:///Users/santiagocastro/Desktop/Projects%20Antigravity/Reinder/packages/shared/src/db/schema.ts#L120-L155)

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
