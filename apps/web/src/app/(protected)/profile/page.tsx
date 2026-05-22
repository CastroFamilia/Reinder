/**
 * apps/web/src/app/(protected)/profile/page.tsx
 *
 * Buyer profile — personal data, preferences, agent, account management.
 * Story 11.5
 */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/supabase/db";
import {
  userProfiles,
  agentBuyerBonds,
  matchEvents,
  swipeEvents,
} from "@reinder/shared/db/schema";
import { eq, and, count } from "drizzle-orm";
import type { Metadata } from "next";
import { LogoutButton } from "@/components/profile/LogoutButton";

export const metadata: Metadata = {
  title: "Mi Perfil — Reinder",
  description: "Gestiona tu perfil, preferencias y cuenta en Reinder.",
};

export default async function ProfilePage() {
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

  const displayName = profile?.fullName || user.email?.split("@")[0] || "Usuario";
  const searchPrefs = profile?.searchPreferences as {
    zones?: string[];
    maxPrice?: number;
    minRooms?: number;
    minSqm?: number;
  } | null;

  // Stats
  const [matchCount] = await db
    .select({ total: count() })
    .from(matchEvents)
    .where(eq(matchEvents.buyerId, user.id));

  const [swipeCount] = await db
    .select({ total: count() })
    .from(swipeEvents)
    .where(eq(swipeEvents.buyerId, user.id));

  // Agent bond
  const [bond] = await db
    .select({
      bondId: agentBuyerBonds.id,
      agentName: userProfiles.fullName,
      agentAvatar: userProfiles.avatarUrl,
      bondCreatedAt: agentBuyerBonds.createdAt,
      expiresAt: agentBuyerBonds.expiresAt,
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

  // Account creation date
  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";

  return (
    <div className="bg-gradient-radial" style={{ minHeight: "100vh", padding: "40px 24px" }}>
      <div style={{ maxWidth: "720px", margin: "0 auto" }}>
        {/* Profile header */}
        <section
          className="card animate-fade-in"
          style={{
            opacity: 0,
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            gap: "20px",
            flexWrap: "wrap",
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              background: profile?.avatarUrl
                ? `url(${profile.avatarUrl}) center/cover`
                : "linear-gradient(135deg, rgba(255,107,0,0.2), rgba(255,107,0,0.05))",
              border: "3px solid rgba(255,107,0,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FF6B00",
              fontSize: "28px",
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {!profile?.avatarUrl && displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-h2" style={{ color: "var(--text-primary)", marginBottom: "4px" }}>
              {displayName}
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>
              {user.email}
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "4px" }}>
              Miembro desde {memberSince}
            </p>
          </div>
        </section>

        {/* Stats row */}
        <section
          className="card animate-fade-in-up"
          style={{
            opacity: 0,
            animationDelay: "0.1s",
            marginBottom: "24px",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "16px",
            textAlign: "center",
          }}
        >
          <div>
            <p className="font-display" style={{ color: "#FF6B00", fontSize: "28px" }}>
              {matchCount?.total ?? 0}
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "12px" }}>Matches</p>
          </div>
          <div>
            <p className="font-display" style={{ color: "#FF6B00", fontSize: "28px" }}>
              {swipeCount?.total ?? 0}
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "12px" }}>Vistas</p>
          </div>
          <div>
            <p className="font-display" style={{ color: "#FF6B00", fontSize: "28px" }}>
              {bond ? "✓" : "—"}
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "12px" }}>Agente</p>
          </div>
        </section>

        {/* Search preferences */}
        <section
          className="card animate-fade-in-up"
          style={{ opacity: 0, animationDelay: "0.2s", marginBottom: "24px" }}
        >
          <h2 className="text-h3" style={{ color: "var(--text-primary)", marginBottom: "16px" }}>
            ⚙️ Preferencias de búsqueda
          </h2>

          {searchPrefs && Object.keys(searchPrefs).length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {searchPrefs.zones && (
                <PrefRow label="Zona" value={String(searchPrefs.zones)} />
              )}
              {searchPrefs.maxPrice && (
                <PrefRow label="Precio máximo" value={`€${Number(searchPrefs.maxPrice).toLocaleString("es-ES")}`} />
              )}
              {searchPrefs.minRooms && (
                <PrefRow label="Habitaciones" value={`${searchPrefs.minRooms}+`} />
              )}
              {searchPrefs.minSqm && (
                <PrefRow label="Superficie mínima" value={`${searchPrefs.minSqm}m²`} />
              )}
            </div>
          ) : (
            <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>
              Sin filtros configurados. Configura tus preferencias desde la app móvil.
            </p>
          )}
          <p style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "12px", fontStyle: "italic" }}>
            Las preferencias se editan desde la app para una experiencia optimizada
          </p>
        </section>

        {/* Agent representative */}
        <section
          className="card animate-fade-in-up"
          style={{ opacity: 0, animationDelay: "0.3s", marginBottom: "24px" }}
        >
          <h2 className="text-h3" style={{ color: "var(--text-primary)", marginBottom: "16px" }}>
            🤝 Agente representante
          </h2>

          {bond ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
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
                  <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: "16px" }}>
                    {bond.agentName || "Tu agente"}
                  </p>
                  <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                    Vinculado desde{" "}
                    {new Date(bond.bondCreatedAt).toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <div className="badge badge-new" style={{ marginBottom: "12px" }}>
                ✓ Vínculo activo
              </div>
              <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                Tu agente ve tus matches en tiempo real y coordina visitas por ti.
                Puedes desvincularte en cualquier momento desde la app.
              </p>
            </div>
          ) : (
            <div>
              <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "12px" }}>
                No tienes un agente representante vinculado.
              </p>
              <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                Un agente representante ve tus matches en tiempo real y coordina visitas por ti.
                Pide a tu agente de confianza que te envíe su link de referral.
              </p>
            </div>
          )}
        </section>

        {/* Account */}
        <section
          className="card animate-fade-in-up"
          style={{ opacity: 0, animationDelay: "0.4s" }}
        >
          <h2 className="text-h3" style={{ color: "var(--text-primary)", marginBottom: "16px" }}>
            🔐 Cuenta
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <LogoutButton />
            <p style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "8px" }}>
              ¿Quieres eliminar tu cuenta? Contacta con{" "}
              <a href="mailto:soporte@reinder.com" style={{ color: "#FF6B00", textDecoration: "underline" }}>
                soporte@reinder.com
              </a>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function PrefRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
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
