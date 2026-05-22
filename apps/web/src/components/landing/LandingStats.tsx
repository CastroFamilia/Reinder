"use client";

/**
 * Landing stats section — live platform numbers.
 * Fetches from /api/v1/public/stats on mount.
 * Story 11.1
 */
import { useState, useEffect } from "react";

interface PlatformStats {
  listingsActive: number;
  matchesTotal: number;
  agenciesActive: number;
}

export function LandingStats() {
  const [stats, setStats] = useState<PlatformStats | null>(null);

  useEffect(() => {
    fetch("/api/v1/public/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  // Show placeholder values if real data isn't available yet
  const displayStats = [
    {
      value: stats?.listingsActive || "—",
      label: "Propiedades exclusivas",
      suffix: stats?.listingsActive ? "+" : "",
    },
    {
      value: stats?.matchesTotal || "—",
      label: "Matches realizados",
      suffix: stats?.matchesTotal ? "+" : "",
    },
    {
      value: stats?.agenciesActive || "—",
      label: "Agencias verificadas",
      suffix: "",
    },
  ];

  return (
    <section
      style={{
        padding: "80px 24px",
        background: "var(--bg-surface)",
        borderTop: "1px solid var(--border)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div
        className="container"
        style={{
          maxWidth: "var(--max-width)",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "40px",
          textAlign: "center",
        }}
      >
        {displayStats.map((stat, i) => (
          <div key={i} className="animate-fade-in" style={{ opacity: 0, animationDelay: `${i * 0.1}s` }}>
            <div
              className="font-display"
              style={{
                fontSize: "48px",
                color: "var(--accent-primary)",
                marginBottom: "8px",
              }}
            >
              {typeof stat.value === "number"
                ? stat.value.toLocaleString("es-ES")
                : stat.value}
              {stat.suffix}
            </div>
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "15px",
                fontWeight: 500,
              }}
            >
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      <style>{`
        @media (max-width: 640px) {
          .container { grid-template-columns: 1fr !important; gap: 32px !important; }
        }
      `}</style>
    </section>
  );
}
