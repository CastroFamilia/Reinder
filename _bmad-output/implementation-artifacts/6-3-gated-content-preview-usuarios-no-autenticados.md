# Story 6.3: Gated Content — Preview para Usuarios No Autenticados

Status: ready-for-dev

**GH Issue:** (to be assigned)

## Story

Como visitante orgánico que llega desde Google,
quiero poder ver una preview del listing antes de registrarme,
para que pueda evaluar si la propiedad me interesa antes de crear una cuenta.

## Acceptance Criteria

1. **Given** un usuario no autenticado que accede a `/listings/{id}` desde un motor de búsqueda  
   **When** carga la página  
   **Then** ve una preview del listing: imagen principal, precio, tipo de propiedad, ubicación y descripción parcial (primeras 2 líneas / ~200 caracteres)

2. **And** hay un prompt visible: "Regístrate gratis para ver todos los detalles y empezar a hacer match con propiedades" con botones "Registrarme" (Primary naranja) y "Iniciar sesión" (Secondary)

3. **And** el contenido completo (galería completa, descripción completa, datos del agente) está oculto/no-renderizado hasta autenticación — **implementado en la capa cliente** para evitar cloaking

4. **And** Google bot (User-Agent Googlebot) recibe la **misma respuesta HTML** que el usuario anónimo — sin cloaking (solo la preview en SSR, acciones de UI en cliente)

5. **And** tras el registro/login desde `/listings/{id}`, el usuario es redirigido de vuelta al mismo listing con acceso completo

## Tasks / Subtasks

- [ ] **Task 1 — Detectar autenticación en el RSC (Server Component)**
  - [ ] En `apps/web/src/app/listings/[id]/page.tsx`, llamar al cliente Supabase server para verificar `auth.getUser()`
  - [ ] Pasar `isAuthenticated: boolean` como prop a `ListingDetailPage`
  - [ ] NO redirigir usuarios no autenticados — la página es pública (no usar el middleware)

- [ ] **Task 2 — Preview mode en `ListingDetailPage`**
  - [ ] Modificar `ListingDetailPage` para aceptar prop `isAuthenticated: boolean`
  - [ ] Preview (no autenticado): imagen principal, precio, ubicación, descripción cortada (~200 chars + "...")
  - [ ] Ocultar en cliente: galería completa, descripción completa, datos de agente — **usar CSS/conditional render**, no JS-only hiding (para no romper SSR)
  - [ ] Full mode (autenticado): toda la información visible

- [ ] **Task 3 — `GatedContentCTA` component**
  - [ ] Crear `apps/web/src/features/listings/components/GatedContentCTA.tsx`
  - [ ] Mostrar cuando `!isAuthenticated`
  - [ ] Texto: "Regístrate gratis para ver todos los detalles y empezar a hacer match con propiedades"
  - [ ] Botón primario: "Registrarme" → `/register?next=/listings/{id}` (naranja, AC2)
  - [ ] Botón secundario: "Iniciar sesión" → `/login?next=/listings/{id}` (AC2, AC5)
  - [ ] Los query params `?next=` permiten el redirect post-auth de vuelta al listing (AC5)

- [ ] **Task 4 — Verificar anti-cloaking**
  - [ ] Asegurar que el HTML renderizado en servidor es idéntico para bot y usuario anónimo
  - [ ] El `isAuthenticated` check ocurre en el RSC — si Supabase devuelve `user: null` → preview mode
  - [ ] Google bot no tiene cookies de sesión → recibe exactamente la misma preview que el usuario anónimo → NO cloaking

- [ ] **Task 5 — Tests**
  - [ ] Crear `apps/web/src/features/listings/components/GatedContentCTA.test.tsx`
  - [ ] Tests: CTA visible cuando `!isAuthenticated`, botones con href correctos incluyendo `?next=` param
  - [ ] Tests: descripción cortada correctamente en preview mode
  - [ ] Tests: AC4 anti-cloaking (bot recibe mismo HTML que anónimo — via mismo server-side render logic)

## Dev Notes

### Architecture — Anti-cloaking (CRITICAL for SEO)

**The golden rule:** The server renders the SAME HTML for bots, anonymous users, and authenticated users — the gating is done by conditionally rendering preview vs. full content based on the `isAuthenticated` prop, which is determined server-side.

```
                        ┌─────────────────────────────────────┐
                        │  RSC page.tsx                        │
                        │  1. getListingById() — data fetch    │
                        │  2. auth.getUser() — check session   │
                        │     → null: isAuthenticated = false  │
                        │     → user: isAuthenticated = true   │
                        │  3. Render ListingDetailPage         │
                        │     with isAuthenticated prop        │
                        └─────────────────────────────────────┘
                                        │
                    ┌───────────────────┴───────────────────┐
              Bot/Anonymous (isAuth=false)          Authenticated (isAuth=true)
                    │                                        │
              Preview HTML + CTA                      Full content HTML
              (same for bot and anon)              (complete listing details)
```

This pattern is Google-compliant: same HTML for bot and anonymous visitor. No cloaking.

### Pattern for auth check in page.tsx

```typescript
// apps/web/src/app/listings/[id]/page.tsx
import { createClient } from '@/lib/supabase/server';

export default async function ListingPage({ params }: ListingPageProps) {
  const [listing, supabase] = await Promise.all([
    getListingById(params.id),
    createClient(),
  ]);

  if (!listing || !isListingPubliclyVisible(listing)) notFound();

  const { data: { user } } = await supabase.auth.getUser();
  const isAuthenticated = user !== null;

  const jsonLd = buildListingJsonLd(listing);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <ListingDetailPage listing={listing} isAuthenticated={isAuthenticated} />
    </>
  );
}
```

### `GatedContentCTA` component

```typescript
// apps/web/src/features/listings/components/GatedContentCTA.tsx
interface GatedContentCTAProps {
  listingId: string;
}

export function GatedContentCTA({ listingId }: GatedContentCTAProps) {
  const encodedNext = encodeURIComponent(`/listings/${listingId}`);
  return (
    <div className="gated-cta">
      <p>Regístrate gratis para ver todos los detalles y empezar a hacer match con propiedades</p>
      <a href={`/register?next=${encodedNext}`} className="btn-primary">Registrarme</a>
      <a href={`/login?next=${encodedNext}`} className="btn-secondary">Iniciar sesión</a>
    </div>
  );
}
```

### Preview description truncation

```typescript
// In ListingDetailPage — description preview
const previewDescription = isAuthenticated
  ? listing.description
  : (listing.description?.slice(0, 200) ?? null);
```

### File Locations

```
apps/web/src/
├── features/listings/
│   └── components/
│       ├── ListingDetailPage.tsx            ← MODIFY (add isAuthenticated prop, preview mode)
│       ├── GatedContentCTA.tsx              ← NEW
│       └── GatedContentCTA.test.tsx         ← NEW
└── app/listings/[id]/
    └── page.tsx                             ← MODIFY (auth check, isAuthenticated prop)
```

### Middleware — IMPORTANT

The middleware (`apps/web/src/middleware.ts`) matcher does NOT include `/listings/*`:
```
matcher: ["/swipe/:path*", "/matches/:path*", "/agent/:path*", "/agency/:path*", "/admin/:path*"]
```
This is correct — `/listings/[id]` is intentionally public. **DO NOT add /listings to the middleware matcher.**

### Redirect post-login (AC5)

The existing login page already supports `?next=` param:
```typescript
// apps/web/src/app/(auth)/login/page.tsx
const { next, error } = await searchParams;
return <LoginForm initialNext={next} initialError={error} />;
```
The `LoginForm` uses `next` to redirect after successful auth. 
The register page follows the same pattern.
This means AC5 is automatically satisfied by linking to `/login?next=/listings/{id}`.

### Testing Standards

- Framework: **Vitest** + `@testing-library/react`
- For `GatedContentCTA`: test rendered HTML, href attributes, text content
- For preview truncation: test with mock `ListingDetailPage` render
- AC4 (anti-cloaking): verify that the server-render with `user: null` produces same structure as with anonymous user — both get preview HTML

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 6.3]
- [Source: _bmad-output/implementation-artifacts/test-design-epic-6.md#Story 6.3 — T6.3-01 through T6.3-05]
- [Source: apps/web/src/middleware.ts — /listings not in matcher]
- [Source: apps/web/src/app/(auth)/login/page.tsx — ?next= param support]
- FR30: Preview de listing para no autenticados con prompt de registro
- Risk R3: Cloaking — mitigated by same HTML server-render for bot and anonymous user

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (BAD pipeline - Story context engine)

### Debug Log References

### Completion Notes List

### File List
