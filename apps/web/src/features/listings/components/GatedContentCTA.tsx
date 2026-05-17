/**
 * apps/web/src/features/listings/components/GatedContentCTA.tsx
 *
 * Story 6.3: Gated Content — Preview para Usuarios No Autenticados
 *
 * Call-to-action component shown to anonymous visitors on listing pages.
 * Encourages registration/login to access full listing details.
 *
 * AC2: Visible text + "Registrarme" (Primary naranja) + "Iniciar sesión" (Secondary)
 * AC5: Buttons include ?next=/listings/{id} for post-auth redirect
 * AC4: This is a Server Component — renders the same HTML for bot and anonymous user (no cloaking)
 */

interface GatedContentCTAProps {
  listingId: string;
}

export function GatedContentCTA({ listingId }: GatedContentCTAProps) {
  const encodedNext = encodeURIComponent(`/listings/${listingId}`);

  return (
    <section className="gated-cta" aria-label="Registro requerido">
      <div className="gated-cta__overlay" />
      <div className="gated-cta__content">
        <p className="gated-cta__text">
          Regístrate gratis para ver todos los detalles y empezar a hacer match
          con propiedades
        </p>
        <div className="gated-cta__actions">
          {/* AC2: Primary naranja */}
          <a
            href={`/register?next=${encodedNext}`}
            className="gated-cta__btn gated-cta__btn--primary"
          >
            Registrarme
          </a>
          {/* AC2: Secondary */}
          <a
            href={`/login?next=${encodedNext}`}
            className="gated-cta__btn gated-cta__btn--secondary"
          >
            Iniciar sesión
          </a>
        </div>
      </div>
    </section>
  );
}
