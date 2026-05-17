# Story 6.2: Datos Estructurados Schema.org en Páginas de Listing

Status: ready-for-dev

**GH Issue:** (to be assigned)

## Story

Como equipo de Reinder,
quiero que cada página de listing incluya datos estructurados schema.org,
para que Google muestre rich snippets en los resultados de búsqueda.

## Acceptance Criteria

1. **Given** una página de listing SSR renderizada  
   **When** se inspecciona el HTML del `<head>`  
   **Then** contiene `<script type="application/ld+json">` con schema `RealEstateListing` que incluye: `name`, `description`, `price`, `address` (con `streetAddress`, `addressLocality`, `addressCountry`), `numberOfRooms`, `floorSize` e `image`

2. **And** el schema se genera en `features/listings/lib/structured-data.ts` como función pura (testable unitariamente)

3. **And** campos opcionales nulos (`description`, `bedrooms`, `sizeSqm`, `address`, `images`) no generan claves con valor `null` en el JSON-LD — se omiten

4. **And** la validación pasaría sin errores críticos en el Rich Results Test de Google (schema mínimo requerido siempre presente)

5. **And** el schema se actualiza automáticamente en ≤24h tras cambios en el CRM gracias al ISR tag-based revalidation de Story 6.1 (NFR14) — no requiere código adicional en esta story

## Tasks / Subtasks

- [ ] **Task 1 — `structured-data.ts` — generador de JSON-LD**
  - [ ] Crear `apps/web/src/features/listings/lib/structured-data.ts`
  - [ ] Exportar función pura `buildListingJsonLd(listing: ListingForSSR): string`
  - [ ] Generar objeto `@type: "RealEstateListing"` con `@context: "https://schema.org"`
  - [ ] Incluir: `name`, `description`, `price` (as `priceSpecification.price`), `address` (`PostalAddress`), `numberOfRooms`, `floorSize` (`QuantitativeValue`), `photo` (array de `ImageObject`)
  - [ ] Omitir claves cuando el campo fuente es `null | undefined`
  - [ ] Añadir `url` con la URL canónica del listing (`/listings/{id}`)

- [ ] **Task 2 — Inyectar JSON-LD en el `<head>` de la página SSR**
  - [ ] En `apps/web/src/app/listings/[id]/page.tsx`, importar `buildListingJsonLd`
  - [ ] Renderizar `<script type="application/ld+json">` con el JSON-LD via `dangerouslySetInnerHTML={{ __html: buildListingJsonLd(listing) }}`
  - [ ] Colocar el `<script>` dentro de `<head>` via Next.js `<Head>` o directamente en el RSC retornado (Next.js 15 permite `<script>` en RSC sin `<Head>`)

- [ ] **Task 3 — Tests unitarios del generador**
  - [ ] Crear `apps/web/src/features/listings/lib/structured-data.test.ts`
  - [ ] T6.2-01: HTML contiene `<script type="application/ld+json">` con tipo `RealEstateListing`
  - [ ] T6.2-02: JSON-LD incluye `name`, `description`, `price`, `address`, `numberOfRooms`, `floorSize`, `image`
  - [ ] T6.2-03: Campos opcionales nulos no aparecen en el JSON-LD output

## Dev Notes

### Architecture — MUST follow

- **Función pura, no componente**: `buildListingJsonLd()` debe ser una función TypeScript pura que recibe `ListingForSSR` y devuelve un string JSON. NO un React component. Testable unitariamente sin JSDOM.
- **`'server-only'` import**: El archivo puede importar `'server-only'` como guarda, pero la función es pura, no necesita acceso a DB ni cookies.
- **Inserción en RSC**: En `page.tsx`, renderizar directamente:
  ```tsx
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{ __html: buildListingJsonLd(listing) }}
  />
  ```
  Next.js 15 App Router permite `<script>` en Server Components sin necesidad de `next/head`.
- **No duplicar metadata**: `generateMetadata()` ya maneja `<title>`, `<meta>`, Open Graph. El JSON-LD es adicional y complementario — no reemplaza ni duplica.
- **Schema type**: Usar `RealEstateListing` (subtipo de `Residence` → `Place` en schema.org). Es el tipo más específico y correcto para propiedades inmobiliarias en venta.

### JSON-LD Schema Target

```json
{
  "@context": "https://schema.org",
  "@type": "RealEstateListing",
  "name": "Ático con terraza en Malasaña",
  "description": "Espectacular ático a estrenar...",
  "url": "https://reinder.app/listings/listing-1",
  "priceSpecification": {
    "@type": "UnitPriceSpecification",
    "price": 485000,
    "priceCurrency": "EUR"
  },
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Calle Fuencarral 42",
    "addressLocality": "Madrid",
    "addressCountry": "ES"
  },
  "numberOfRooms": 3,
  "floorSize": {
    "@type": "QuantitativeValue",
    "value": 95,
    "unitCode": "MTK"
  },
  "photo": [
    {
      "@type": "ImageObject",
      "url": "https://example.com/image1.jpg"
    }
  ]
}
```

### Field Mapping: `ListingForSSR` → JSON-LD

| JSON-LD field | Source field | Notes |
|---|---|---|
| `name` | `listing.title` | Required — always present |
| `description` | `listing.description` | Optional — omit if null |
| `url` | `/listings/${listing.id}` | Canonical URL |
| `priceSpecification.price` | `parseFloat(listing.price)` | Optional — omit block if null |
| `priceSpecification.priceCurrency` | `listing.currency ?? 'EUR'` | Default EUR |
| `address.streetAddress` | `listing.address` | Optional |
| `address.addressLocality` | `listing.city` | Optional |
| `address.addressCountry` | `listing.country ?? 'ES'` | Default ES |
| `numberOfRooms` | `listing.bedrooms` | Optional — omit if null |
| `floorSize.value` | `parseFloat(listing.sizeSqm)` | Optional — omit block if null |
| `photo[].url` | `listing.images[0..n]` | Optional — omit if empty array |

> **Key rule**: If all optional fields of a nested block are null, omit the entire block (e.g., if `address`, `city`, and `country` are all null → don't emit `address: {}`)

### Null-safety pattern

```typescript
export function buildListingJsonLd(listing: ListingForSSR): string {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: listing.title,
    url: `https://reinder.app/listings/${listing.id}`,
  };

  if (listing.description) schema.description = listing.description;
  if (listing.price != null) {
    schema.priceSpecification = {
      '@type': 'UnitPriceSpecification',
      price: parseFloat(listing.price),
      priceCurrency: listing.currency ?? 'EUR',
    };
  }
  if (listing.address || listing.city) {
    const address: Record<string, string> = { '@type': 'PostalAddress' };
    if (listing.address) address.streetAddress = listing.address;
    if (listing.city)    address.addressLocality = listing.city;
    if (listing.country) address.addressCountry = listing.country;
    else address.addressCountry = 'ES'; // default Spain
    schema.address = address;
  }
  if (listing.bedrooms != null) schema.numberOfRooms = listing.bedrooms;
  if (listing.sizeSqm != null) {
    schema.floorSize = {
      '@type': 'QuantitativeValue',
      value: parseFloat(listing.sizeSqm),
      unitCode: 'MTK', // ISO 80000-3 square meters
    };
  }
  if (listing.images?.length > 0) {
    schema.photo = listing.images.map((url) => ({ '@type': 'ImageObject', url }));
  }

  return JSON.stringify(schema);
}
```

### File Locations

```
apps/web/src/
├── features/listings/lib/
│   ├── queries.ts                  ← existing (Story 6.1)
│   ├── structured-data.ts          ← NEW
│   └── structured-data.test.ts     ← NEW
└── app/listings/[id]/
    └── page.tsx                    ← MODIFY (add JSON-LD script tag)
```

### Previous Story Intelligence (Story 6.1)

- `ListingForSSR` type exported from `features/listings/lib/queries.ts` — import and reuse
- `page.tsx` already has `generateMetadata()` — add the `<script>` tag to the returned JSX, not to metadata
- The cache tag `listings-{id}` from `unstable_cache` covers 6.1 + 6.2 — no additional cache work needed (AC5 is free)
- Pattern: `apps/web/src/app/listings/[id]/page.tsx` → add after `<ListingDetailPage>` or inside the fragment:

```tsx
return (
  <>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: buildListingJsonLd(listing) }}
    />
    <ListingDetailPage listing={listing} />
  </>
);
```

### Testing Standards

- Framework: **Vitest** (no JSDOM needed — pure function test)
- Pattern: Test the JSON-LD string output, parse it, validate structure
- AC3: verify `null` fields not present: use `expect(parsed).not.toHaveProperty('description')` pattern
- No mocking needed — pure function

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 6.2]
- [Source: _bmad-output/implementation-artifacts/test-design-epic-6.md#Story 6.2 — T6.2-01, T6.2-02, T6.2-03]
- [Source: _bmad-output/implementation-artifacts/6-1-paginas-listing-ssr-indexables-google.md]
- [Source: features/listings/lib/queries.ts — ListingForSSR type]
- Schema.org: https://schema.org/RealEstateListing
- NFR14: schema.org data ≤24h stale (handled by ISR from 6.1)
- FR29: Datos estructurados schema.org en páginas de listing

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (BAD pipeline - Story context engine)

### Debug Log References

### Completion Notes List

### File List
