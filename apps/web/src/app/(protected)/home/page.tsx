/**
 * apps/web/src/app/(protected)/home/page.tsx
 *
 * Buyer dashboard — personalized home page.
 * Shows welcome, recent matches, active filters, agent info, and activity.
 * Story 11.3
 */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/supabase/db";
import {
  userProfiles,
  matchEvents,
  listings,
  agentBuyerBonds,
  swipeEvents,
} from "@reinder/shared/db/schema";
import { eq, and, desc, count } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Inicio — Reinder",
  description: "Tu panel personal de propiedades y matches en Reinder.",
};

export default async function BuyerHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch profile
  const [profile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.id, user.id))
    .limit(1);

  const displayName = profile?.fullName || user.email?.split("@")[0] || "comprador";

  // Fetch recent matches (last 6)
  const recentMatches = await db
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
    .orderBy(desc(matchEvents.createdAt))
    .limit(6);

  // Count total matches
  const [matchCountResult] = await db
    .select({ total: count() })
    .from(matchEvents)
    .where(eq(matchEvents.buyerId, user.id));

  // Count total swipes
  const [swipeCountResult] = await db
    .select({ total: count() })
    .from(swipeEvents)
    .where(eq(swipeEvents.buyerId, user.id));

  // Get agent bond
  const [bond] = await db
    .select({
      agentId: agentBuyerBonds.agentId,
      agentName: userProfiles.fullName,
      agentAvatar: userProfiles.avatarUrl,
      bondCreatedAt: agentBuyerBonds.createdAt,
    })
    .from(agentBuyerBonds)
    .leftJoin(userProfiles, eq(userProfiles.id, agentBuyerBonds.agentId))
    .where(
      and(
        eq(agentBuyerBonds.buyerId, user.id),
        eq(agentBuyerBonds.status, "active")
      )
    )
    .limit(1);

  // Parse search preferences
  const searchPrefs = profile?.searchPreferences as {
    zones?: string[];
    maxPrice?: number;
    minRooms?: number;
    minSqm?: number;
  } | null;

  const totalMatches = matchCountResult?.total ?? 0;
  const totalSwipes = swipeCountResult?.total ?? 0;

  return (
    <div className="bg-gradient-radial" style={{ minHeight: "100vh", padding: "40px 24px" }}>
      <div style={{ maxWidth: "var(--max-width)", margin: "0 auto" }}>
        {/* Welcome header */}
        <section className="animate-fade-in" style={{ opacity: 0, marginBottom: "48px" }}>
          <h1 className="text-h1 font-display" style={{ color: "var(--text-primary)", marginBottom: "8px" }}>
            Hola, <span style={{ color: "#FF6B00" }}>{displayName}</span> 👋
          </h1>
          <p className="text-body" style={{ color: "var(--text-muted)" }}>
            {totalMatches > 0
              ? `${totalMatches} matches activos · ${totalSwipes} propiedades vistas`
              : "Empieza a descubrir propiedades desde la app"}
          </p>
        </section>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "24px",
          }}
          className="dashboard-grid"
        >
          {/* App CTA Card */}
          <div
            className="card animate-fade-in-up"
            style={{
              opacity: 0,
              animationDelay: "0.1s",
              gridColumn: "1 / -1",
              background: "linear-gradient(135deg, rgba(255,107,0,0.08) 0%, var(--bg-surface) 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "24px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2 className="text-h3" style={{ color: "var(--text-primary)", marginBottom: "8px" }}>
                📱 La experiencia de swipe vive en la app
              </h2>
              <p className="text-body" style={{ color: "var(--text-muted)" }}>
                Abre Reinder en tu móvil para descubrir propiedades con el gesto que ya conoces.
              </p>
            </div>
            <a
              href="https://reinder.app"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              Abrir en la app →
            </a>
          </div>

          {/* Recent matches */}
          <div
            className="card animate-fade-in-up"
            style={{ opacity: 0, animationDelay: "0.2s", gridColumn: "1 / -1" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 className="text-h3" style={{ color: "var(--text-primary)" }}>
                💜 Últimos matches
              </h2>
              {totalMatches > 6 && (
                <Link href="/matches" className="btn btn-ghost btn-sm">
                  Ver todos →
                </Link>
              )}
            </div>

            {recentMatches.length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                  gap: "16px",
                }}
              >
                {recentMatches.map((match) => (
                  <Link
                    key={match.matchId}
                    href={`/listings/${match.listingId}`}
                    className="card-interactive"
                    style={{
                      background: "var(--bg-primary)",
                      border: "1px solid var(--border)",
                      borderRadius: "16px",
                      overflow: "hidden",
                      textDecoration: "none",
                      transition: "all 150ms ease",
                    }}
                  >
                    {/* Image */}
                    <div
                      style={{
                        width: "100%",
                        height: "140px",
                        background: match.images?.length
                          ? `url(${match.images[0]}) center/cover`
                          : "linear-gradient(135deg, rgba(255,107,0,0.1), rgba(255,107,0,0.02))",
                        position: "relative",
                      }}
                    >
                      {match.status === "sold" && (
                        <div className="badge badge-sold" style={{ position: "absolute", top: "8px", left: "8px" }}>
                          VENDIDA
                        </div>
                      )}
                    </div>
                    <div style={{ padding: "12px" }}>
                      <p
                        className="font-display"
                        style={{ color: "var(--text-primary)", fontSize: "18px", marginBottom: "4px" }}
                      >
                        {match.price
                          ? `€${Number(match.price).toLocaleString("es-ES")}`
                          : "Precio a consultar"}
                      </p>
                      <p style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "2px" }}>
                        {match.title || "Propiedad"}
                      </p>
                      <p style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                        {[
                          match.bedrooms ? `${match.bedrooms} hab` : null,
                          match.sizeSqm ? `${match.sizeSqm}m²` : null,
                          match.city,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <p style={{ fontSize: "32px", marginBottom: "12px" }}>🏠</p>
                <p style={{ color: "var(--text-muted)" }}>
                  Aún no tienes matches — abre la app y empieza a descubrir
                </p>
              </div>
            )}
          </div>

          {/* Search preferences */}
          <div
            className="card animate-fade-in-up"
            style={{ opacity: 0, animationDelay: "0.3s" }}
          >
            <h2 className="text-h3" style={{ color: "var(--text-primary)", marginBottom: "16px" }}>
              ⚙️ Tus filtros activos
            </h2>

            {searchPrefs ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {searchPrefs.zones && (
                  <FilterChip label="Zona" value={String(searchPrefs.zones)} />
                )}
                {searchPrefs.maxPrice && (
                  <FilterChip label="Precio máximo" value={`€${Number(searchPrefs.maxPrice).toLocaleString("es-ES")}`} />
                )}
                {searchPrefs.minRooms && (
                  <FilterChip label="Habitaciones mín." value={`${searchPrefs.minRooms}+`} />
                )}
                {searchPrefs.minSqm && (
                  <FilterChip label="m² mín." value={`${searchPrefs.minSqm}m²`} />
                )}
                <p style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "8px", fontStyle: "italic" }}>
                  Edita tus preferencias desde la app
                </p>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>
                  Sin filtros configurados — verás todas las propiedades activas
                </p>
                <p style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "8px" }}>
                  Configura tus preferencias desde la app para un feed personalizado
                </p>
              </div>
            )}
          </div>

          {/* Agent representative */}
          <div
            className="card animate-fade-in-up"
            style={{ opacity: 0, animationDelay: "0.4s" }}
          >
            <h2 className="text-h3" style={{ color: "var(--text-primary)", marginBottom: "16px" }}>
              🤝 Tu agente representante
            </h2>

            {bond ? (
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: bond.agentAvatar
                      ? `url(${bond.agentAvatar}) center/cover`
                      : "rgba(255,107,0,0.15)",
                    border: "2px solid rgba(255,107,0,0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#FF6B00",
                    fontSize: "18px",
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {!bond.agentAvatar && (bond.agentName?.[0]?.toUpperCase() || "A")}
                </div>
                <div>
                  <p style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                    {bond.agentName || "Tu agente"}
                  </p>
                  <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                    Vinculado desde {new Date(bond.bondCreatedAt).toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  <div className="badge badge-new" style={{ marginTop: "8px" }}>
                    ✓ Activo
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <p style={{ fontSize: "32px", marginBottom: "12px" }}>🤝</p>
                <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "12px" }}>
                  No tienes agente representante vinculado
                </p>
                <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                  Pide a tu agente de confianza que te envíe su link de referral para vincularte
                </p>
              </div>
            )}
          </div>

          {/* Quick stats */}
          <div
            className="card animate-fade-in-up"
            style={{
              opacity: 0,
              animationDelay: "0.5s",
              gridColumn: "1 / -1",
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "16px",
              textAlign: "center",
            }}
          >
            <StatItem value={totalMatches} label="Matches" icon="💜" />
            <StatItem value={totalSwipes} label="Propiedades vistas" icon="👁️" />
            <StatItem value={bond ? 1 : 0} label="Agente vinculado" icon="🤝" />
            <StatItem
              value={searchPrefs ? Object.keys(searchPrefs).length : 0}
              label="Filtros activos"
              icon="⚙️"
            />
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .dashboard-grid { grid-template-columns: 1fr !important; }
          .dashboard-grid > div:last-child { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  );
}

function FilterChip({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 14px",
        background: "var(--bg-primary)",
        borderRadius: "var(--radius-btn)",
        border: "1px solid var(--border)",
      }}
    >
      <span style={{ color: "var(--text-muted)", fontSize: "13px" }}>{label}</span>
      <span style={{ color: "var(--text-primary)", fontSize: "14px", fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function StatItem({ value, label, icon }: { value: number; label: string; icon: string }) {
  return (
    <div>
      <p style={{ fontSize: "24px", marginBottom: "4px" }}>{icon}</p>
      <p className="font-display" style={{ color: "var(--accent-primary)", fontSize: "28px" }}>
        {value}
      </p>
      <p style={{ color: "var(--text-muted)", fontSize: "12px" }}>{label}</p>
    </div>
  );
}
