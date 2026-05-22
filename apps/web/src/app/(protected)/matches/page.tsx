/**
 * apps/web/src/app/(protected)/matches/page.tsx
 *
 * Matches gallery — all buyer matches with grid/list views.
 * Story 11.4
 */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/supabase/db";
import { matchEvents, listings } from "@reinder/shared/db/schema";
import { eq, desc } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Mis Matches — Reinder",
  description: "Todas las propiedades que te han gustado en Reinder.",
};

export default async function MatchesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const matches = await db
    .select({
      matchId: matchEvents.id,
      listingId: matchEvents.listingId,
      createdAt: matchEvents.createdAt,
      title: listings.title,
      price: listings.price,
      city: listings.city,
      images: listings.images,
      status: listings.status,
      bedrooms: listings.bedrooms,
      sizeSqm: listings.sizeSqm,
    })
    .from(matchEvents)
    .leftJoin(listings, eq(listings.id, matchEvents.listingId))
    .where(eq(matchEvents.buyerId, user.id))
    .orderBy(desc(matchEvents.createdAt));

  return (
    <div className="bg-gradient-radial" style={{ minHeight: "100vh", padding: "40px 24px" }}>
      <div style={{ maxWidth: "var(--max-width)", margin: "0 auto" }}>
        {/* Header */}
        <section className="animate-fade-in" style={{ opacity: 0, marginBottom: "40px" }}>
          <h1 className="text-h1 font-display" style={{ color: "var(--text-primary)", marginBottom: "8px" }}>
            Mis Matches
          </h1>
          <p className="text-body" style={{ color: "var(--text-muted)" }}>
            {matches.length > 0
              ? `${matches.length} ${matches.length === 1 ? "propiedad guardada" : "propiedades guardadas"}`
              : "Aún no tienes matches"}
          </p>
        </section>

        {matches.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "20px",
            }}
          >
            {matches.map((match, i) => (
              <Link
                key={match.matchId}
                href={`/listings/${match.listingId}`}
                className="card card-interactive animate-fade-in-up"
                style={{
                  opacity: 0,
                  animationDelay: `${Math.min(i * 0.05, 0.5)}s`,
                  padding: 0,
                  overflow: "hidden",
                  textDecoration: "none",
                }}
              >
                {/* Image */}
                <div
                  style={{
                    width: "100%",
                    height: "200px",
                    background: match.images?.length
                      ? `url(${match.images[0]}) center/cover`
                      : "linear-gradient(135deg, rgba(255,107,0,0.08), rgba(255,107,0,0.02))",
                    position: "relative",
                  }}
                >
                  {/* Badges */}
                  <div style={{ position: "absolute", top: "12px", left: "12px", display: "flex", gap: "6px" }}>
                    {match.status === "sold" && (
                      <span className="badge badge-sold">VENDIDA</span>
                    )}
                    {match.status === "active" && (
                      <span className="badge badge-exclusive">EXCLUSIVA</span>
                    )}
                  </div>

                  {/* Match date */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: "12px",
                      right: "12px",
                      background: "rgba(13,13,13,0.75)",
                      backdropFilter: "blur(8px)",
                      borderRadius: "var(--radius-pill)",
                      padding: "4px 10px",
                      fontSize: "11px",
                      color: "var(--text-muted)",
                    }}
                  >
                    {new Date(match.createdAt).toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "short",
                    })}
                  </div>
                </div>

                {/* Content */}
                <div style={{ padding: "16px" }}>
                  <p
                    className="font-display"
                    style={{
                      color: "var(--text-primary)",
                      fontSize: "22px",
                      marginBottom: "4px",
                    }}
                  >
                    {match.price
                      ? `€${Number(match.price).toLocaleString("es-ES")}`
                      : "Precio a consultar"}
                  </p>
                  <p style={{ color: "var(--text-primary)", fontSize: "15px", marginBottom: "8px", fontWeight: 500 }}>
                    {match.title || "Propiedad"}
                  </p>
                  <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                    {[
                      match.bedrooms ? `${match.bedrooms} hab` : null,
                      match.sizeSqm ? `${match.sizeSqm}m²` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {match.city && (
                    <p style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "4px" }}>
                      📍 {match.city}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          /* Empty state */
          <div
            className="card animate-fade-in"
            style={{
              opacity: 0,
              textAlign: "center",
              padding: "80px 40px",
              maxWidth: "480px",
              margin: "0 auto",
            }}
          >
            <p style={{ fontSize: "48px", marginBottom: "16px" }}>🏠</p>
            <h2 className="text-h2" style={{ color: "var(--text-primary)", marginBottom: "12px" }}>
              Aún no tienes matches
            </h2>
            <p
              className="text-body"
              style={{ color: "var(--text-muted)", marginBottom: "32px" }}
            >
              Abre la app en tu móvil y empieza a descubrir propiedades exclusivas. 
              Cada swipe derecho se guardará aquí.
            </p>
            <a
              href="https://reinder.app"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              📱 Abrir en la app
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
