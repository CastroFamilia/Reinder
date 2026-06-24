/**
 * Agency Experiment Detail Page — /agency/experiments/[id]
 *
 * Shows experiment configuration and results dashboard.
 * Story 9.2 created a placeholder; Story 9.3 replaces it with the results dashboard.
 *
 * Story 9.3, AC7, Task 12
 */
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/supabase/db";
import { listingExperiments } from "@reinder/shared/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ExperimentResultsDashboard } from "@/features/agency/experiments/components/experiment-results-dashboard";
import type { ExperimentStatus } from "@reinder/shared/types/experiment";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ExperimentDetailPage({ params }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;

  // Fetch experiment
  const [experiment] = await db
    .select()
    .from(listingExperiments)
    .where(eq(listingExperiments.id, id))
    .limit(1);

  if (!experiment) {
    redirect("/agency/experiments");
  }

  const status = experiment.status as ExperimentStatus;
  const showDashboard = ["running", "paused", "completed"].includes(status);

  return (
    <div style={pageStyles.container}>
      {/* Header */}
      <div style={pageStyles.header}>
        <a href="/agency/experiments" style={pageStyles.backLink}>
          ← Experimentos
        </a>
        <h1 style={pageStyles.title}>{experiment.name}</h1>
        <div style={pageStyles.meta}>
          <span
            style={{
              ...pageStyles.statusBadge,
              ...(status === "running"
                ? pageStyles.statusRunning
                : status === "completed"
                  ? pageStyles.statusCompleted
                  : status === "paused"
                    ? pageStyles.statusPaused
                    : pageStyles.statusDraft),
            }}
          >
            {status}
          </span>
          <span style={pageStyles.type}>
            {experiment.experimentType.replace(/_/g, " ")}
          </span>
          {experiment.startedAt && (
            <span style={pageStyles.date}>
              Iniciado:{" "}
              {new Date(experiment.startedAt).toLocaleDateString("es-ES", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>
      </div>

      {/* Experiment Info */}
      <div style={pageStyles.infoGrid}>
        <div style={pageStyles.infoCard}>
          <h3 style={pageStyles.infoCardTitle}>Variante A (Control)</h3>
          <pre style={pageStyles.variantContent}>
            {JSON.stringify(experiment.variantA, null, 2)}
          </pre>
        </div>
        <div style={pageStyles.infoCard}>
          <h3 style={pageStyles.infoCardTitle}>Variante B (Test)</h3>
          <pre style={pageStyles.variantContent}>
            {JSON.stringify(experiment.variantB, null, 2)}
          </pre>
        </div>
      </div>

      {/* Results Dashboard or Placeholder */}
      {showDashboard ? (
        <section style={pageStyles.section}>
          <h2 style={pageStyles.sectionTitle}>Resultados del Experimento</h2>
          <ExperimentResultsDashboard
            experimentId={id}
            experimentStatus={status}
          />
        </section>
      ) : (
        <section style={pageStyles.placeholder}>
          <p style={pageStyles.placeholderText}>
            Los resultados estarán disponibles cuando el experimento esté en
            ejecución.
          </p>
          <p style={pageStyles.placeholderSubtext}>
            Cambia el estado a &quot;running&quot; para comenzar a recopilar datos.
          </p>
        </section>
      )}
    </div>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const pageStyles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "32px 24px",
    display: "flex",
    flexDirection: "column",
    gap: "32px",
    fontFamily: "Inter, sans-serif",
    color: "#F5F0E8",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  backLink: {
    color: "#9E9080",
    fontSize: "13px",
    textDecoration: "none",
  },
  title: {
    fontFamily: "'Clash Display', sans-serif",
    fontSize: "28px",
    fontWeight: 600,
    margin: 0,
    color: "#F5F0E8",
  },
  meta: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap" as const,
  },
  statusBadge: {
    padding: "3px 10px",
    borderRadius: "12px",
    fontSize: "11px",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  statusRunning: {
    background: "rgba(76, 175, 80, 0.15)",
    color: "#4CAF50",
  },
  statusCompleted: {
    background: "rgba(74, 144, 217, 0.15)",
    color: "#4A90D9",
  },
  statusPaused: {
    background: "rgba(255, 140, 0, 0.15)",
    color: "#FF8C00",
  },
  statusDraft: {
    background: "rgba(158, 144, 128, 0.15)",
    color: "#9E9080",
  },
  type: {
    fontSize: "13px",
    color: "#9E9080",
    textTransform: "capitalize" as const,
  },
  date: {
    fontSize: "13px",
    color: "#9E9080",
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
  },
  infoCard: {
    background: "#1E1A15",
    border: "1px solid #2E2820",
    borderRadius: "16px",
    padding: "20px",
  },
  infoCardTitle: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#9E9080",
    margin: "0 0 12px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  variantContent: {
    fontFamily: "'SF Mono', 'Fira Code', monospace",
    fontSize: "12px",
    color: "#F5F0E8",
    background: "#0D0D0D",
    borderRadius: "8px",
    padding: "12px",
    margin: 0,
    overflow: "auto" as const,
    maxHeight: "120px",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  sectionTitle: {
    fontFamily: "'Clash Display', sans-serif",
    fontSize: "20px",
    fontWeight: 600,
    color: "#F5F0E8",
    margin: 0,
  },
  placeholder: {
    background: "#1E1A15",
    border: "1px solid #2E2820",
    borderRadius: "24px",
    padding: "48px",
    textAlign: "center" as const,
  },
  placeholderText: {
    color: "#F5F0E8",
    fontSize: "16px",
    margin: "0 0 8px",
  },
  placeholderSubtext: {
    color: "#9E9080",
    fontSize: "14px",
    margin: 0,
  },
};
