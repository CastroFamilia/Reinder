"use client";

/**
 * apps/web/src/app/(auth)/login/login-form.tsx
 *
 * Formulario de login — Client Component.
 * Incluye email + contraseña y botón "Continuar con Google".
 * Diseño Reinder: fondo #0D0D0D, acento naranja #FF6B00.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginUser } from "@/features/auth/actions/login";
import { GoogleAuthButton } from "@/features/auth/components/google-auth-button";

const styles = {
  card: {
    background: "#1E1A15",
    border: "1px solid #2E2820",
    borderRadius: "24px",
    padding: "40px",
    width: "100%",
    maxWidth: "420px",
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
  subtitle: {
    color: "#9E9080",
    fontSize: "14px",
    marginBottom: "32px",
  } as React.CSSProperties,
  label: {
    display: "block",
    color: "#9E9080",
    fontSize: "12px",
    fontWeight: 500,
    letterSpacing: "0.5px",
    textTransform: "uppercase" as const,
    marginBottom: "6px",
  },
  input: {
    width: "100%",
    background: "#0D0D0D",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#2E2820",
    borderRadius: "12px",
    color: "#F5F0E8",
    fontSize: "15px",
    padding: "12px 16px",
    outline: "none",
    boxSizing: "border-box" as const,
    transition: "border-color 150ms ease",
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
    marginTop: "8px",
    transition: "opacity 150ms ease, box-shadow 150ms ease",
    boxShadow: "0 0 20px rgba(255,107,0,0.3)",
  } as React.CSSProperties,
  btnDisabled: {
    opacity: 0.4,
    cursor: "not-allowed",
    boxShadow: "none",
  } as React.CSSProperties,
  globalError: {
    background: "rgba(139,58,58,0.15)",
    border: "1px solid rgba(139,58,58,0.4)",
    borderRadius: "10px",
    color: "#E08080",
    fontSize: "13px",
    padding: "12px 16px",
    marginBottom: "16px",
  } as React.CSSProperties,
  divider: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    margin: "20px 0",
    color: "#4A4440",
    fontSize: "12px",
    letterSpacing: "0.5px",
  } as React.CSSProperties,
  dividerLine: {
    flex: 1,
    height: "1px",
    background: "#2E2820",
  } as React.CSSProperties,
  registerLink: {
    textAlign: "center" as const,
    marginTop: "20px",
    color: "#9E9080",
    fontSize: "13px",
  } as React.CSSProperties,
  registerLinkAnchor: {
    color: "#FF6B00",
    textDecoration: "none",
    fontWeight: 500,
  } as React.CSSProperties,
  fieldGroup: {
    marginBottom: "16px",
  } as React.CSSProperties,
};

export function LoginForm() {
  const router = useRouter();
  const [emailValue, setEmailValue] = useState("");
  const [passwordValue, setPasswordValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);

    if (!emailValue || !passwordValue) {
      setServerError("Email y contraseña son obligatorios.");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("email", emailValue);
      formData.set("password", passwordValue);
      const result = await loginUser(formData);

      if (result.error) {
        setServerError(result.error);
      } else {
        // Login exitoso — refrescar la sesión y navegar al panel del rol.
        // router.refresh() primero: invalida la caché del Server Component en
        // el destino para que renderice con la sesión nueva (no la previa).
        // La ruta viene del servidor (switch exhaustivo), pero validamos que
        // sea un path interno por defensa en profundidad.
        const rawPath = result.redirectTo ?? "/swipe";
        const destination = rawPath.startsWith("/") ? rawPath : "/swipe";
        router.refresh();
        router.push(destination);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={styles.card}>
      <div style={styles.logo}>Reinder</div>
      <p style={styles.subtitle}>Bienvenido de vuelta</p>

      {serverError && (
        <div style={styles.globalError} role="alert">
          {serverError}
        </div>
      )}

      {/* Botón Google OAuth — Primary path para login rápido */}
      <GoogleAuthButton />

      {/* Separador visual */}
      <div style={styles.divider}>
        <div style={styles.dividerLine} />
        <span>O continúa con email</span>
        <div style={styles.dividerLine} />
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {/* Email */}
        <div style={styles.fieldGroup}>
          <label htmlFor="login-email" style={styles.label}>
            Email
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={emailValue}
            onChange={(e) => setEmailValue(e.target.value)}
            style={styles.input}
            placeholder="tu@email.com"
          />
        </div>

        {/* Contraseña */}
        <div style={styles.fieldGroup}>
          <label htmlFor="login-password" style={styles.label}>
            Contraseña
          </label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={passwordValue}
            onChange={(e) => setPasswordValue(e.target.value)}
            style={styles.input}
            placeholder="Tu contraseña"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            ...styles.btnPrimary,
            ...(isSubmitting ? styles.btnDisabled : {}),
          }}
          aria-disabled={isSubmitting}
        >
          {isSubmitting ? "Iniciando sesión…" : "Iniciar sesión"}
        </button>
      </form>

      <p style={styles.registerLink}>
        ¿No tienes cuenta?{" "}
        <a href="/register" style={styles.registerLinkAnchor}>
          Regístrate gratis
        </a>
      </p>
    </div>
  );
}
