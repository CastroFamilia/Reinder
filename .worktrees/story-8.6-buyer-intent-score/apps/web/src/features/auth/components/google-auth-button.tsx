"use client";

/**
 * apps/web/src/features/auth/components/google-auth-button.tsx
 *
 * Botón "Continuar con Google" — Client Component.
 * Estilo Secondary: glass + borde naranja translúcido (UX-DR11).
 *
 * Usa useFormStatus para gestionar el estado de carga mientras
 * la Server Action signInWithGoogle redirige al URL de Google OAuth.
 *
 * Story 1.6 fix M1: acepta prop `next` para redirect-back tras OAuth.
 * El valor se envía como input hidden → lo recoge signInWithGoogle().
 */
import { useFormStatus } from "react-dom";
import { signInWithGoogle } from "@/features/auth/actions/oauth";

const googleIconSvg = (
  <svg
    width="18"
    height="18"
    viewBox="0 0 18 18"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
      fill="#4285F4"
    />
    <path
      d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
      fill="#34A853"
    />
    <path
      d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
      fill="#FBBC05"
    />
    <path
      d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z"
      fill="#EA4335"
    />
  </svg>
);

function GoogleButtonContent() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-label="Continuar con Google"
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        background: "rgba(30,26,21,0.6)",
        border: "1px solid rgba(255,107,0,0.35)",
        borderRadius: "12px",
        color: "#F5F0E8",
        fontSize: "15px",
        fontWeight: 500,
        padding: "13px",
        cursor: pending ? "not-allowed" : "pointer",
        opacity: pending ? 0.5 : 1,
        transition: "opacity 150ms ease, border-color 150ms ease",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
      onMouseEnter={(e) => {
        if (!pending) {
          (e.currentTarget as HTMLButtonElement).style.borderColor =
            "rgba(255,107,0,0.6)";
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor =
          "rgba(255,107,0,0.35)";
      }}
    >
      {pending ? (
        <>
          <span
            style={{
              width: "18px",
              height: "18px",
              border: "2px solid rgba(255,107,0,0.3)",
              borderTopColor: "#FF6B00",
              borderRadius: "50%",
              display: "inline-block",
              animation: "spin 0.8s linear infinite",
            }}
          />
          Redirigiendo…
        </>
      ) : (
        <>
          {googleIconSvg}
          Continuar con Google
        </>
      )}
    </button>
  );
}

interface GoogleAuthButtonProps {
  /** URL destino tras OAuth exitoso — reenvía el ?next= del middleware (fix M1). */
  next?: string;
}

export function GoogleAuthButton({ next }: GoogleAuthButtonProps = {}) {
  return (
    <form action={signInWithGoogle}>
      {/* Input hidden para propagar next= al Server Action (fix M1) */}
      {next && <input type="hidden" name="next" value={next} />}
      <GoogleButtonContent />
    </form>
  );
}
