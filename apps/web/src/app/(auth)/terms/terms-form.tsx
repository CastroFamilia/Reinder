"use client";

/**
 * apps/web/src/app/(auth)/terms/terms-form.tsx
 *
 * Formulario de aceptación de T&C — Client Component.
 * Mostrado a usuarios nuevos de Google OAuth.
 * Un botón grande "Aceptar y empezar" invoca la Server Action acceptTerms.
 */
import { useTransition } from "react";
import { acceptTerms } from "@/features/auth/actions/terms";

const styles = {
  card: {
    background: "#1E1A15",
    border: "1px solid #2E2820",
    borderRadius: "24px",
    padding: "40px",
    width: "100%",
    maxWidth: "480px",
    boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
  } as React.CSSProperties,
  logo: {
    color: "#FF6B00",
    fontSize: "28px",
    fontWeight: 700,
    letterSpacing: "-0.5px",
    marginBottom: "8px",
    fontFamily: "system-ui, sans-serif",
  } as React.CSSProperties,
  title: {
    color: "#F5F0E8",
    fontSize: "20px",
    fontWeight: 600,
    marginBottom: "8px",
  } as React.CSSProperties,
  subtitle: {
    color: "#9E9080",
    fontSize: "14px",
    marginBottom: "28px",
    lineHeight: "1.6",
  } as React.CSSProperties,
  tcBox: {
    background: "#0D0D0D",
    border: "1px solid #2E2820",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "24px",
    maxHeight: "200px",
    overflowY: "auto" as const,
  } as React.CSSProperties,
  tcText: {
    color: "#9E9080",
    fontSize: "13px",
    lineHeight: "1.7",
  } as React.CSSProperties,
  tcLink: {
    color: "#FF6B00",
    textDecoration: "underline",
  } as React.CSSProperties,
  btnPrimary: {
    width: "100%",
    background: "#FF6B00",
    color: "#0D0D0D",
    fontWeight: 700,
    fontSize: "15px",
    padding: "14px",
    borderRadius: "12px",
    border: "none",
    cursor: "pointer",
    transition: "opacity 150ms ease, box-shadow 150ms ease",
    boxShadow: "0 0 20px rgba(255,107,0,0.3)",
  } as React.CSSProperties,
  btnDisabled: {
    opacity: 0.4,
    cursor: "not-allowed",
    boxShadow: "none",
  } as React.CSSProperties,
  note: {
    color: "#4A4440",
    fontSize: "12px",
    textAlign: "center" as const,
    marginTop: "16px",
    lineHeight: "1.5",
  } as React.CSSProperties,
};

export function TermsForm() {
  const [isPending, startTransition] = useTransition();

  function handleAccept() {
    startTransition(async () => {
      await acceptTerms();
    });
  }

  return (
    <div style={styles.card}>
      <div style={styles.logo}>Reinder</div>
      <h1 style={styles.title}>Una última cosa</h1>
      <p style={styles.subtitle}>
        Antes de empezar a descubrir propiedades, necesitamos que aceptes
        nuestros Términos y Condiciones y la Política de Privacidad.
      </p>

      <div style={styles.tcBox}>
        <p style={styles.tcText}>
          Al usar Reinder, aceptas que tus interacciones con propiedades
          (matches y descartes) se almacenan de forma encriptada para mejorar
          tu experiencia. Nunca compartimos tus datos personales con agencias
          sin tu consentimiento explícito.
          <br />
          <br />
          Puedes leer el documento completo en{" "}
          <a href="/legal/terms" style={styles.tcLink} target="_blank" rel="noopener noreferrer">
            Términos y Condiciones
          </a>{" "}
          y{" "}
          <a href="/legal/privacy" style={styles.tcLink} target="_blank" rel="noopener noreferrer">
            Política de Privacidad
          </a>
          .
        </p>
      </div>

      <button
        onClick={handleAccept}
        disabled={isPending}
        style={{
          ...styles.btnPrimary,
          ...(isPending ? styles.btnDisabled : {}),
        }}
        aria-disabled={isPending}
      >
        {isPending ? "Guardando…" : "Aceptar y empezar a explorar"}
      </button>

      <p style={styles.note}>
        Al pulsar el botón confirmas tu aceptación con fecha y hora registradas.
        Requerido por GDPR.
      </p>
    </div>
  );
}
