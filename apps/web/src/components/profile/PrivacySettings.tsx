/**
 * apps/web/src/components/profile/PrivacySettings.tsx
 *
 * Story 10.5 — AC3: Privacy settings section for buyer profile page.
 *
 * Renders a "Privacidad y Datos" section with a toggle for personalization
 * and explanatory GDPR-compliant text. Supports optimistic UI with rollback.
 */

"use client";

import { useState } from "react";

export interface PrivacySettingsProps {
  /** Current personalization_enabled value from user profile */
  personalizationEnabled: boolean;
  /** Callback to toggle personalization. Should return a promise that resolves on success or rejects on failure. */
  onToggle: (enabled: boolean) => Promise<void>;
}

export function PrivacySettings({
  personalizationEnabled,
  onToggle,
}: PrivacySettingsProps) {
  const [isEnabled, setIsEnabled] = useState(personalizationEnabled);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    const newValue = !isEnabled;

    // Optimistic UI: change immediately
    setIsEnabled(newValue);
    setIsLoading(true);
    setToastMessage(null);

    try {
      await onToggle(newValue);
      // Show success toast
      setToastMessage(
        newValue
          ? "Personalización activada. Verás contenido adaptado a tus preferencias."
          : "Personalización desactivada. Verás las propiedades tal como las publica la agencia."
      );
    } catch {
      // Rollback on error
      setIsEnabled(!newValue);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section data-testid="privacy-settings-section">
      <h3>Privacidad y Datos</h3>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
        <div>
          <label htmlFor="personalization-toggle-input" style={{ fontWeight: 600 }}>
            Personalización de contenido
          </label>
          <p style={{ fontSize: "0.875rem", color: "#666", marginTop: "0.25rem" }}>
            Cuando está activa, Reinder adapta las fotos y descripción de cada
            propiedad a tus preferencias. Tus datos nunca se comparten con
            terceros.
          </p>
        </div>

        <input
          id="personalization-toggle-input"
          data-testid="personalization-toggle"
          type="checkbox"
          role="switch"
          checked={isEnabled}
          disabled={isLoading}
          onChange={handleToggle}
          aria-label="Personalización de contenido"
        />
      </div>

      {toastMessage && (
        <div role="status" aria-live="polite" style={{ marginTop: "0.75rem" }}>
          {toastMessage}
        </div>
      )}
    </section>
  );
}
