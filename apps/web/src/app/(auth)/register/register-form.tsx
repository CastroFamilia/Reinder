"use client";

/**
 * apps/web/src/app/(auth)/register/register-form.tsx
 *
 * Formulario de registro — Client Component.
 * Diseño Reinder: fondo #0D0D0D, acento naranja #FF6B00.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerUser } from "@/features/auth/actions/register";
import { validateRegisterInput } from "@/features/auth/lib/validation";
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
  inputError: {
    borderColor: "#8B3A3A",
  } as React.CSSProperties,
  errorText: {
    color: "#C0544C",
    fontSize: "12px",
    marginTop: "6px",
  } as React.CSSProperties,
  tcRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    marginTop: "8px",
  } as React.CSSProperties,
  tcText: {
    color: "#9E9080",
    fontSize: "13px",
    lineHeight: "1.5",
  } as React.CSSProperties,
  tcLink: {
    color: "#FF6B00",
    textDecoration: "underline",
    cursor: "pointer",
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
    marginTop: "24px",
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
  loginLink: {
    textAlign: "center" as const,
    marginTop: "20px",
    color: "#9E9080",
    fontSize: "13px",
  } as React.CSSProperties,
  loginLinkAnchor: {
    color: "#FF6B00",
    textDecoration: "none",
    fontWeight: 500,
  } as React.CSSProperties,
  fieldGroup: {
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
};

export function RegisterForm() {
  const router = useRouter();
  const [acceptedTc, setAcceptedTc] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [passwordValue, setPasswordValue] = useState("");
  const [emailValue, setEmailValue] = useState("");
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const passwordTooShort = passwordValue.length > 0 && passwordValue.length < 8;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setClientError(null);
    setServerError(null);

    const validationError = validateRegisterInput({
      email: emailValue,
      password: passwordValue,
      acceptedTc,
    });

    if (validationError) {
      setClientError(validationError.message);
      return;
    }

    setPending(true);
    try {
      const formData = new FormData();
      formData.set("email", emailValue);
      formData.set("password", passwordValue);
      formData.set("termsAccepted", String(acceptedTc));
      const result = await registerUser(formData);

      if (result.error) {
        setServerError(result.error);
      } else {
        router.push("/swipe");
      }
    } finally {
      setPending(false);
    }
  }

  const isSubmitDisabled = !acceptedTc || pending;

  return (
    <div style={styles.card}>
      <div style={styles.logo}>Reinder</div>
      <p style={styles.subtitle}>Descubre tu próxima propiedad</p>

      {serverError && (
        <div style={styles.globalError} role="alert">
          {serverError}
        </div>
      )}

      {/* Botón Google OAuth */}
      <GoogleAuthButton />

      {/* Separador */}
      <div style={styles.divider}>
        <div style={styles.dividerLine} />
        <span>O continúa con email</span>
        <div style={styles.dividerLine} />
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {/* Email */}
        <div style={styles.fieldGroup}>
          <label htmlFor="email" style={styles.label}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={emailValue}
            onChange={(e) => setEmailValue(e.target.value)}
            style={styles.input}
            placeholder="tu@email.com"
            aria-describedby="email-error"
          />
        </div>

        {/* Contraseña */}
        <div style={styles.fieldGroup}>
          <label htmlFor="password" style={styles.label}>
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={passwordValue}
            onChange={(e) => setPasswordValue(e.target.value)}
            style={{
              ...styles.input,
              ...(passwordTooShort ? styles.inputError : {}),
            }}
            placeholder="Mínimo 8 caracteres"
            aria-describedby="password-error"
          />
          {passwordTooShort && (
            <p id="password-error" style={styles.errorText} role="alert">
              La contraseña debe tener al menos 8 caracteres.
            </p>
          )}
        </div>

        {/* Términos y Condiciones */}
        <div style={styles.tcRow}>
          <input
            id="accept-tc"
            type="checkbox"
            checked={acceptedTc}
            onChange={(e) => setAcceptedTc(e.target.checked)}
            aria-required="true"
            style={{ marginTop: "2px", accentColor: "#FF6B00", flexShrink: 0 }}
          />
          <label htmlFor="accept-tc" style={styles.tcText}>
            Acepto los{" "}
            <a href="/terms" style={styles.tcLink} target="_blank" rel="noopener noreferrer">
              Términos y Condiciones
            </a>{" "}
            y la{" "}
            <a href="/privacy" style={styles.tcLink} target="_blank" rel="noopener noreferrer">
              Política de Privacidad
            </a>
          </label>
        </div>

        {clientError && (
          <p style={{ ...styles.errorText, marginTop: "12px" }} role="alert">
            {clientError}
          </p>
        )}

        {/* Botón submit */}
        <button
          type="submit"
          disabled={isSubmitDisabled}
          style={{
            ...styles.btnPrimary,
            ...(isSubmitDisabled ? styles.btnDisabled : {}),
          }}
          aria-disabled={isSubmitDisabled}
        >
          {pending ? "Creando cuenta…" : "Crear cuenta"}
        </button>
      </form>

      <p style={styles.loginLink}>
        ¿Ya tienes cuenta?{" "}
        <a href="/login" style={styles.loginLinkAnchor}>
          Inicia sesión
        </a>
      </p>
    </div>
  );
}
