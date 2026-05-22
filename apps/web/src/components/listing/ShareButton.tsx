"use client";

/**
 * Share button for listing detail page.
 * Generates a clean share link for WhatsApp/email/clipboard.
 * Story 11.7
 */
import { useState } from "react";

interface ShareButtonProps {
  title: string;
  listingId: string;
}

export function ShareButton({ title, listingId }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/listings/${listingId}`
      : `/listings/${listingId}`;

  const shareText = `Mira esta propiedad en Reinder: ${title}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleWhatsApp() {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`,
      "_blank"
    );
  }

  function handleEmail() {
    window.open(
      `mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`,
      "_blank"
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <p
        style={{
          color: "var(--text-muted)",
          fontSize: "12px",
          marginBottom: "4px",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          fontWeight: 500,
        }}
      >
        Compartir
      </p>

      <div style={{ display: "flex", gap: "8px" }}>
        <button
          onClick={handleWhatsApp}
          className="btn btn-secondary btn-sm"
          style={{ flex: 1 }}
          aria-label="Compartir por WhatsApp"
        >
          💬 WhatsApp
        </button>
        <button
          onClick={handleEmail}
          className="btn btn-secondary btn-sm"
          style={{ flex: 1 }}
          aria-label="Compartir por email"
        >
          ✉️ Email
        </button>
      </div>

      <button
        onClick={handleCopy}
        className="btn btn-ghost btn-sm"
        style={{
          width: "100%",
          color: copied ? "#4ADE80" : "var(--accent-primary)",
          transition: "color 150ms ease",
        }}
        aria-label="Copiar enlace"
      >
        {copied ? "✓ Enlace copiado" : "🔗 Copiar enlace"}
      </button>
    </div>
  );
}
