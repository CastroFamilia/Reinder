/**
 * apps/web/src/app/listings/[id]/page.tsx
 *
 * Public listing detail page (SSR).
 * Shows property info, images, and gated content for non-authenticated users.
 * Authenticated users see additional match context + agent info.
 *
 * Story 11.7
 */
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/supabase/db";
import { createClient } from "@/lib/supabase/server";
import {
  listings,
  agencies,
  matchEvents,
  agentBuyerBonds,
  userProfiles,
} from "@reinder/shared/db/schema";
import { eq, and } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ShareButton } from "@/components/listing/ShareButton";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const [listing] = await db
    .select({ title: listings.title, price: listings.price, city: listings.city })
    .from(listings)
    .where(eq(listings.id, id))
    .limit(1);

  if (!listing) {
    return { title: "Propiedad no encontrada — Reinder" };
  }

  const price = listing.price
    ? `€${Number(listing.price).toLocaleString("es-ES")}`
    : "";

  return {
    title: `${listing.title} ${price} — Reinder`,
    description: `${listing.title} en ${listing.city || "España"}. ${price}. Descubre esta propiedad exclusiva en Reinder.`,
    openGraph: {
      title: `${listing.title} — Reinder`,
      description: `${price} · ${listing.city || ""}`,
      type: "website",
    },
  };
}

export default async function ListingDetailPage({ params }: Props) {
  const { id } = await params;

  // Fetch listing with agency
  const [listing] = await db
    .select({
      id: listings.id,
      title: listings.title,
      description: listings.description,
      price: listings.price,
      currency: listings.currency,
      bedrooms: listings.bedrooms,
      sizeSqm: listings.sizeSqm,
      address: listings.address,
      city: listings.city,
      country: listings.country,
      latitude: listings.latitude,
      longitude: listings.longitude,
      images: listings.images,
      status: listings.status,
      exclusivityVerified: listings.exclusivityVerified,
      createdAt: listings.createdAt,
      agencyName: agencies.name,
    })
    .from(listings)
    .leftJoin(agencies, eq(agencies.id, listings.agencyId))
    .where(eq(listings.id, id))
    .limit(1);

  if (!listing) notFound();

  // Check auth status
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch buyer-specific data if authenticated
  let isMatched = false;
  let buyerAgentName: string | null = null;
  let userName: string | null = null;
  let avatarUrl: string | null = null;

  if (user) {
    // Check if this listing is in buyer's matches
    const [match] = await db
      .select({ id: matchEvents.id })
      .from(matchEvents)
      .where(
        and(eq(matchEvents.buyerId, user.id), eq(matchEvents.listingId, id))
      )
      .limit(1);
    isMatched = !!match;

    // Get buyer's agent
    const [bond] = await db
      .select({ agentName: userProfiles.fullName })
      .from(agentBuyerBonds)
      .leftJoin(userProfiles, eq(userProfiles.id, agentBuyerBonds.agentId))
      .where(
        and(
          eq(agentBuyerBonds.buyerId, user.id),
          eq(agentBuyerBonds.status, "active")
        )
      )
      .limit(1);
    buyerAgentName = bond?.agentName ?? null;

    // Get user profile for navbar
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();
    userName = profile?.full_name ?? user.email?.split("@")[0] ?? null;
    avatarUrl = profile?.avatar_url ?? null;
  }

  const price = listing.price
    ? `€${Number(listing.price).toLocaleString("es-ES")}`
    : "Precio a consultar";

  const imageList = (listing.images as string[] | null) ?? [];

  return (
    <>
      <Navbar
        isAuthenticated={!!user}
        userName={userName}
        avatarUrl={avatarUrl}
      />

      <main
        style={{
          minHeight: "100vh",
          paddingTop: "var(--navbar-height)",
        }}
      >
        {/* Image gallery */}
        <section
          style={{
            maxWidth: "var(--max-width)",
            margin: "0 auto",
            padding: "24px 24px 0",
          }}
        >
          {imageList.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: imageList.length > 1 ? "2fr 1fr" : "1fr",
                gridTemplateRows: imageList.length > 2 ? "1fr 1fr" : "1fr",
                gap: "8px",
                borderRadius: "var(--radius-card)",
                overflow: "hidden",
                maxHeight: "480px",
              }}
            >
              {/* Hero image */}
              <div
                style={{
                  gridRow: imageList.length > 2 ? "1 / -1" : undefined,
                  background: `url(${imageList[0]}) center/cover`,
                  minHeight: "320px",
                  cursor: "pointer",
                }}
              />
              {/* Secondary images */}
              {imageList.slice(1, 3).map((img, i) => (
                <div
                  key={i}
                  style={{
                    background: `url(${img}) center/cover`,
                    minHeight: "155px",
                    cursor: "pointer",
                    position: "relative",
                  }}
                >
                  {i === 1 && imageList.length > 3 && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: "rgba(13,13,13,0.6)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--text-primary)",
                        fontSize: "16px",
                        fontWeight: 600,
                      }}
                    >
                      +{imageList.length - 3} fotos
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                height: "320px",
                borderRadius: "var(--radius-card)",
                background:
                  "linear-gradient(135deg, rgba(255,107,0,0.08), rgba(255,107,0,0.02))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-muted)",
                fontSize: "16px",
              }}
            >
              Sin imágenes disponibles
            </div>
          )}
        </section>

        {/* Content */}
        <section
          style={{
            maxWidth: "var(--max-width)",
            margin: "0 auto",
            padding: "32px 24px 80px",
            display: "grid",
            gridTemplateColumns: "1fr 380px",
            gap: "32px",
          }}
          className="listing-content-grid"
        >
          {/* Left: Property details */}
          <div>
            {/* Badges */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
              {listing.exclusivityVerified && (
                <span className="badge badge-exclusive">EXCLUSIVA</span>
              )}
              {listing.status === "sold" && (
                <span className="badge badge-sold">VENDIDA</span>
              )}
              {isMatched && (
                <span className="badge badge-reaffirmed">💜 EN TUS MATCHES</span>
              )}
            </div>

            {/* Price */}
            <h1
              className="font-display"
              style={{
                color: "var(--text-primary)",
                fontSize: "40px",
                marginBottom: "8px",
                letterSpacing: "-0.02em",
              }}
            >
              {price}
            </h1>

            {/* Title */}
            <h2
              style={{
                color: "var(--text-primary)",
                fontSize: "22px",
                fontWeight: 600,
                marginBottom: "8px",
              }}
            >
              {listing.title}
            </h2>

            {/* Location */}
            {(listing.city || listing.address) && (
              <p style={{ color: "var(--text-muted)", fontSize: "15px", marginBottom: "24px" }}>
                📍 {[listing.address, listing.city, listing.country].filter(Boolean).join(", ")}
              </p>
            )}

            {/* Key specs */}
            <div
              style={{
                display: "flex",
                gap: "24px",
                padding: "20px 0",
                borderTop: "1px solid var(--border)",
                borderBottom: "1px solid var(--border)",
                marginBottom: "32px",
                flexWrap: "wrap",
              }}
            >
              {listing.bedrooms && (
                <SpecItem icon="🛏️" label="Habitaciones" value={String(listing.bedrooms)} />
              )}
              {listing.sizeSqm && (
                <SpecItem icon="📐" label="Superficie" value={`${listing.sizeSqm}m²`} />
              )}
              {listing.currency && (
                <SpecItem icon="💰" label="Moneda" value={listing.currency} />
              )}
            </div>

            {/* Description */}
            {listing.description && (
              <div style={{ marginBottom: "32px" }}>
                <h3
                  style={{
                    color: "var(--text-primary)",
                    fontSize: "18px",
                    fontWeight: 600,
                    marginBottom: "12px",
                  }}
                >
                  Descripción
                </h3>
                <p
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "15px",
                    lineHeight: "1.8",
                    whiteSpace: "pre-line",
                  }}
                >
                  {listing.description}
                </p>
              </div>
            )}

            {/* Map placeholder */}
            {listing.latitude && listing.longitude && (
              <div style={{ marginBottom: "32px" }}>
                <h3
                  style={{
                    color: "var(--text-primary)",
                    fontSize: "18px",
                    fontWeight: 600,
                    marginBottom: "12px",
                  }}
                >
                  Ubicación
                </h3>
                <div
                  style={{
                    height: "240px",
                    borderRadius: "var(--radius-card)",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text-muted)",
                  }}
                >
                  <a
                    href={`https://www.google.com/maps?q=${listing.latitude},${listing.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                  >
                    📍 Ver en Google Maps
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Action card */}
            <div className="card" style={{ position: "sticky", top: "calc(var(--navbar-height) + 24px)" }}>
              {user ? (
                <>
                  {/* Authenticated: show match status + agent */}
                  {isMatched && (
                    <div
                      style={{
                        background: "rgba(255,107,0,0.08)",
                        border: "1px solid rgba(255,107,0,0.2)",
                        borderRadius: "var(--radius-btn)",
                        padding: "12px 16px",
                        marginBottom: "16px",
                        textAlign: "center",
                      }}
                    >
                      <p style={{ color: "#FF6B00", fontWeight: 600, fontSize: "14px" }}>
                        💜 Esta propiedad está en tus matches
                      </p>
                    </div>
                  )}

                  {buyerAgentName && (
                    <div style={{ marginBottom: "16px" }}>
                      <p style={{ color: "var(--text-muted)", fontSize: "12px", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 500 }}>
                        Tu agente representante
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "50%",
                            background: "rgba(255,107,0,0.15)",
                            border: "2px solid rgba(255,107,0,0.3)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#FF6B00",
                            fontSize: "16px",
                            fontWeight: 700,
                          }}
                        >
                          {buyerAgentName[0]?.toUpperCase() || "A"}
                        </div>
                        <div>
                          <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: "15px" }}>
                            {buyerAgentName}
                          </p>
                          <p style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                            Coordina visitas por ti
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <ShareButton title={listing.title} listingId={listing.id} />

                  <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
                    <p style={{ color: "var(--text-muted)", fontSize: "12px", textAlign: "center" }}>
                      Publicado por <strong style={{ color: "var(--text-primary)" }}>{listing.agencyName}</strong>
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {/* Unauthenticated: registration gate */}
                  <h3
                    style={{
                      color: "var(--text-primary)",
                      fontSize: "18px",
                      fontWeight: 600,
                      marginBottom: "12px",
                    }}
                  >
                    ¿Te interesa esta propiedad?
                  </h3>
                  <p
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "14px",
                      lineHeight: "1.6",
                      marginBottom: "20px",
                    }}
                  >
                    Crea tu cuenta gratuita para guardar matches, vincular a tu agente de confianza, y recibir propiedades similares.
                  </p>
                  <Link
                    href={`/register?next=/listings/${listing.id}`}
                    className="btn btn-primary btn-lg"
                    style={{ width: "100%", marginBottom: "12px", textAlign: "center" }}
                  >
                    Crear cuenta gratis
                  </Link>
                  <Link
                    href={`/login?next=/listings/${listing.id}`}
                    className="btn btn-secondary"
                    style={{ width: "100%", textAlign: "center" }}
                  >
                    Ya tengo cuenta
                  </Link>
                  <p
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "11px",
                      textAlign: "center",
                      marginTop: "12px",
                    }}
                  >
                    Propiedad de {listing.agencyName || "agencia verificada"}
                  </p>
                </>
              )}
            </div>

            {/* Listing metadata */}
            <div className="card" style={{ padding: "16px" }}>
              <p style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                Publicada el{" "}
                {new Date(listing.createdAt).toLocaleDateString("es-ES", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
              <p style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "4px" }}>
                ID: {listing.id.slice(0, 8)}…
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      <style>{`
        @media (max-width: 900px) {
          .listing-content-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}

function SpecItem({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <span style={{ fontSize: "20px" }}>{icon}</span>
      <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>{label}</span>
      <span style={{ color: "var(--text-primary)", fontSize: "16px", fontWeight: 600 }}>
        {value}
      </span>
    </div>
  );
}
