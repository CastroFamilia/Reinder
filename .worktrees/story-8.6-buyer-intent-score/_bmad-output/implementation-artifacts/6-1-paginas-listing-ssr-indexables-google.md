# Story 6.1: Páginas de Listing SSR Indexables por Google

Status: done

**GH Issue:** (to be assigned)

## Story

Como equipo de Reinder,
quiero que cada listing activo tenga una URL pública indexable,
para que Reinder capture tráfico orgánico de compradores que buscan propiedades en Google.

## Acceptance Criteria

1. **Given** un listing activo en la base de datos de Reinder  
   **When** Google bot o cualquier crawler accede a `/listings/{id}`  
   **Then** recibe una página HTML renderizada en servidor (SSR via Next.js 15) con: título, precio, descripción, ubicación e imagen principal

2. **And** el TTFB es ≤2 segundos (NFR4)

3. **And** la página incluye `<title>`, `<meta name="description">`, `og:image`, `og:price` correctos (generados via `generateMetadata` de Next.js 15)

4. **And** el caché se invalida automáticamente cuando el listing cambia de estado (ISR con `revalidateTag`)

5. **And** listings con `status = 'withdrawn'` devuelven 404

6. **And** listings con `status = 'sold'` y `sold_at` hace más de 72h devuelven 404

## Tasks / Subtasks

- [x] **Task 1 — Route pública `/listings/[id]`**
  - [x] Crear directorio de ruta pública: `apps/web/src/app/listings/[id]/`
  - [x] Crear `page.tsx` como React Server Component con `async` fetch de Supabase
  - [x] Implementar lógica 404: `notFound()` si `status = 'withdrawn'` o (`status = 'sold'` AND `updatedAt < now - 72h`)
  - [x] Implementar `generateMetadata()` con `<title>`, `<meta name="description">`, `og:image`, `og:price`
  - [x] Añadir `export const revalidate = 3600` + etiqueta de caché `listings-{id}` via `unstable_cache`

- [x] **Task 2 — Data fetching SSR**
  - [x] Crear función `getListingById(id: string)` en `apps/web/src/features/listings/lib/queries.ts`
  - [x] Usar Drizzle ORM con el cliente Supabase de servidor (`@/lib/supabase/db`)
  - [x] Query con unstable_cache factory pattern para stable cache instances per id
  - [x] Si no existe → retornar `null` (la página llama `notFound()`)

- [x] **Task 3 — Componente de página del listing**
  - [x] Crear componente `ListingDetailPage` en `apps/web/src/features/listings/components/ListingDetailPage.tsx`
  - [x] Mostrar: imagen principal, título, precio formateado (€ EUR), descripción, ubicación, habitaciones, m²
  - [x] Usar `<Image>` de Next.js con `priority` para LCP optimization
  - [x] Badge VENDIDA para listings `sold` dentro del plazo de 72h

- [x] **Task 4 — Cache invalidation en status change**
  - [x] Crear `apps/web/src/app/api/v1/agency/listings/[id]/status/route.ts`
  - [x] `revalidateTag(`listings-${params.id}`)` tras update exitoso
  - [x] `revalidateTag('listings')` para invalidar listas
  - [x] Documentar en comentarios que el tag se coordina con SSR page

- [x] **Task 5 — Tests**
  - [x] `apps/web/src/features/listings/lib/queries.test.ts`: ATDD TDD red phase tests
  - [x] `apps/web/src/app/api/v1/agency/listings/[id]/status/route.test.ts`: AC4 cache invalidation tests

- [x] **Task 6 — Code review fixes**
  - [x] Fix `unstable_cache` factory pattern
  - [x] Add `next.config.ts` image remote patterns (Supabase, Inmovilla, picsum)

## Dev Notes

### Architecture Patterns (MUST follow)

- **Route groups:** La ruta `/listings/[id]` debe ser PÚBLICA — NO anidada en `(protected)` ni en `(auth)`. Crear directamente en `apps/web/src/app/listings/[id]/page.tsx`. Esto es crítico para que Google bot pueda indexar sin autenticación.
- **RSC (React Server Components):** El `page.tsx` debe ser un Server Component puro — sin `'use client'`. Todo el fetch ocurre en servidor.
- **Next.js 15 caching:** Usar el fetch tagging pattern con `unstable_cache` o el nuevo `{ next: { tags: ['listings-{id}'] } }` en el fetch. Llamar `revalidateTag('listings-{id}')` desde la API route de cambio de status.
- **`generateMetadata` async:** `export async function generateMetadata({ params })` para SEO tags — se ejecuta en servidor antes de renderizar.
- **`notFound()`:** Importar de `next/navigation` y llamar explícitamente para retornar 404.
- **No usar `cache: 'no-store'`** en esta página — necesita ISR para rendimiento.

### File Locations

```
apps/web/src/
├── app/
│   ├── listings/
│   │   └── [id]/
│   │       └── page.tsx              ← NUEVA (RSC, SSR, generateMetadata, revalidate)
│   └── api/
│       └── v1/
│           └── agency/
│               └── listings/
│                   └── [id]/
│                       └── status/
│                           └── route.ts  ← MODIFICAR (añadir revalidateTag)
└── features/
    └── listings/
        ├── components/
        │   └── ListingDetailPage.tsx  ← NUEVA (UI del listing)
        └── lib/
            ├── queries.ts             ← NUEVA (getListingById + Drizzle query)
            └── queries.test.ts        ← NUEVA (tests unitarios)
```

### Database Schema Reference

La tabla `listings` (en `packages/shared/src/db/schema.ts`) tiene estos campos relevantes:

```typescript
{
  id: uuid,
  title: text (NOT NULL),
  description: text,
  price: numeric(15,2),
  currency: char(3) DEFAULT 'EUR',
  bedrooms: integer,
  sizeSqm: numeric(10,2),
  address: text,
  city: text,
  country: text,
  images: jsonb (string[]) DEFAULT [],
  status: text DEFAULT 'active',  // 'active' | 'sold' | 'withdrawn' | 'pending_review'
  exclusivityVerified: boolean,
  catastralRef: text,
  agencyId: uuid FK → agencies.id,
  createdAt: timestamp,
  updatedAt: timestamp,
}
```

> ⚠️ **IMPORTANTE:** El campo `sold_at` no existe en el schema actual (no fue implementado en 5.4 en main). Para la lógica de "sold >72h → 404" usar `updatedAt` como proxy (timestamp del último cambio de status). Si `status = 'sold'` Y `updatedAt < now - 72h` → 404. Documentar este workaround en comentario.

### Supabase Client Pattern

Seguir el patrón establecido en otros Server Components del proyecto:

```typescript
// apps/web/src/lib/supabase/server.ts ya existe
import { createClient } from '@/lib/supabase/server';
// O usar Drizzle (preferido para queries tipadas):
import { db } from '@/lib/supabase/db';
import { listings } from '@reinder/shared/db/schema';
import { eq } from 'drizzle-orm';
```

### ISR / Cache Strategy

```typescript
// apps/web/src/app/listings/[id]/page.tsx
export const revalidate = 3600; // revalidar cada hora como fallback

// En getListingById usar next fetch options para tag-based revalidation:
// El Drizzle client no soporta next tags directamente — usar unstable_cache:
import { unstable_cache } from 'next/cache';

const getListingById = unstable_cache(
  async (id: string) => { /* drizzle query */ },
  ['listing'],
  { tags: [`listings-${id}`], revalidate: 3600 }
);
// ⚠️ unstable_cache no acepta el id dinámico en tags fácilmente — alternativa:
// Wrapper function que pasa el id al crear la caché
```

> **Recomendación:** Usar el patrón de función factory con `unstable_cache` por listing id, o usar `fetch` con URL interna y `next: { tags: [...] }` si se prefiere consistencia con el patrón de Next.js 15.

### SEO Metadata Pattern

```typescript
export async function generateMetadata({ params }: { params: { id: string } }) {
  const listing = await getListingById(params.id);
  if (!listing) return { title: 'Propiedad no encontrada' };
  
  return {
    title: `${listing.title} — ${listing.city} | Reinder`,
    description: listing.description?.slice(0, 155) ?? `${listing.title} en ${listing.city}. ${listing.price} EUR.`,
    openGraph: {
      title: listing.title,
      description: listing.description?.slice(0, 155),
      images: listing.images?.[0] ? [{ url: listing.images[0] }] : [],
      type: 'article',
    },
    other: {
      'og:price:amount': listing.price?.toString() ?? '',
      'og:price:currency': listing.currency ?? 'EUR',
    },
  };
}
```

### Testing Standards

- Framework: **Vitest** (ya configurado en `apps/web`)
- Mocking: `vi.mock('@/lib/supabase/server')` para Supabase client
- Para RSC testing: usar `@testing-library/react` con `renderToString` o testear la lógica de queries por separado de la UI
- Archivo de test al lado del archivo que testea (colocación) o en `__tests__/`

### Previous Story Intelligence (Epic 5)

- Story 5.4 añadió `PATCH /api/v1/agency/listings/[id]/status/route.ts` — este es el endpoint donde debe llamarse `revalidateTag`
- El cliente de DB Drizzle está en `@/lib/supabase/db` (patrón establecido en Epic 5)
- Las páginas protegidas usan `(protected)` route group — esta página NO debe usar ese grupo
- Patrón de respuesta de API: `{ data: T | null, error: { code: string, message: string } | null }`

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#SEO + Admin]
- [Source: _bmad-output/implementation-artifacts/test-design-epic-6.md]
- [Source: packages/shared/src/db/schema.ts#listings table]
- [Source: apps/web/src/app/api/v1/agency/listings/[id]/status/route.ts]
- [Source: Next.js 15 docs: generateMetadata, revalidateTag, unstable_cache]
- NFR4: TTFB ≤2s para páginas SSR
- NFR5: Todo HTTPS/TLS 1.3

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (BAD pipeline - Story context engine)

### Debug Log References

### Completion Notes List

### File List

- `apps/web/src/features/listings/lib/queries.ts` [NEW]
- `apps/web/src/features/listings/lib/queries.test.ts` [NEW]
- `apps/web/src/features/listings/components/ListingDetailPage.tsx` [NEW]
- `apps/web/src/app/listings/[id]/page.tsx` [NEW]
- `apps/web/src/app/api/v1/agency/listings/[id]/status/route.ts` [NEW]
- `apps/web/src/app/api/v1/agency/listings/[id]/status/route.test.ts` [NEW]
- `apps/web/next.config.ts` [MODIFIED — added images.remotePatterns]
