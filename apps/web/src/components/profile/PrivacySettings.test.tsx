/**
 * Story 10.5 — ATDD Tests: PrivacySettings component (Web)
 *
 * AC3: Toggle UI in Profile web
 *      - Renders "Privacidad y Datos" section with personalization toggle
 *      - Toggle reflects current personalization_enabled value
 *      - Descriptive text explains what personalization does
 *      - Toggle has testID "personalization-toggle"
 *      - Section has testID "privacy-settings-section"
 *      - Disabling shows toast: "Personalización desactivada..."
 *      - Enabling shows toast: "Personalización activada..."
 *      - Optimistic UI with rollback on error
 *
 * TDD RED PHASE: All tests are intentionally skipped (test.skip).
 * They will FAIL until the feature is implemented.
 *
 * Run: pnpm --filter @reinder/web test apps/web/src/components/profile/PrivacySettings.test.tsx
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, test } from "vitest";

/*
 * Provider Scrutiny Evidence:
 * - Component: NEW — not yet implemented (TDD red phase)
 * - File: apps/web/src/components/profile/PrivacySettings.tsx (does not exist yet)
 * - Expected from acceptance criteria (Story 10.5, AC3):
 *   - Section: "Privacidad y Datos"
 *   - Toggle: labeled "Personalización de contenido"
 *   - Explanatory text below toggle
 *   - testIDs: "privacy-settings-section", "personalization-toggle"
 *   - Toast messages on toggle change
 */

// ─── AC3: Section rendering ──────────────────────────────────────────────────

describe("PrivacySettings — Rendering (AC3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('[P0] T10.5-12: renders "Privacidad y Datos" section heading', async () => {
    // Import will fail until component is created
    const { PrivacySettings } = await import(
      "@/components/profile/PrivacySettings"
    );

    render(
      <PrivacySettings personalizationEnabled={true} onToggle={vi.fn()} />
    );

    expect(
      screen.getByText(/Privacidad y Datos/i)
    ).toBeInTheDocument();
  });

  test("[P0] T10.5-13: renders toggle labeled 'Personalización de contenido'", async () => {
    const { PrivacySettings } = await import(
      "@/components/profile/PrivacySettings"
    );

    render(
      <PrivacySettings personalizationEnabled={true} onToggle={vi.fn()} />
    );

    expect(
      screen.getByText(/Personalización de contenido/i)
    ).toBeInTheDocument();
  });

  test('[P0] T10.5-14: renders explanatory text about personalization', async () => {
    const { PrivacySettings } = await import(
      "@/components/profile/PrivacySettings"
    );

    render(
      <PrivacySettings personalizationEnabled={true} onToggle={vi.fn()} />
    );

    expect(
      screen.getByText(
        /Cuando está activa, Reinder adapta las fotos y descripción de cada propiedad a tus preferencias/i
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Tus datos nunca se comparten con terceros/i)
    ).toBeInTheDocument();
  });

  test('[P0] T10.5-15: section has testID "privacy-settings-section"', async () => {
    const { PrivacySettings } = await import(
      "@/components/profile/PrivacySettings"
    );

    render(
      <PrivacySettings personalizationEnabled={true} onToggle={vi.fn()} />
    );

    expect(
      screen.getByTestId("privacy-settings-section")
    ).toBeInTheDocument();
  });

  test('[P0] T10.5-16: toggle has testID "personalization-toggle"', async () => {
    const { PrivacySettings } = await import(
      "@/components/profile/PrivacySettings"
    );

    render(
      <PrivacySettings personalizationEnabled={true} onToggle={vi.fn()} />
    );

    expect(
      screen.getByTestId("personalization-toggle")
    ).toBeInTheDocument();
  });
});

// ─── AC3: Toggle state reflects personalization_enabled ──────────────────────

describe("PrivacySettings — Toggle State (AC3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("[P0] T10.5-17: toggle is ON when personalizationEnabled is true", async () => {
    const { PrivacySettings } = await import(
      "@/components/profile/PrivacySettings"
    );

    render(
      <PrivacySettings personalizationEnabled={true} onToggle={vi.fn()} />
    );

    const toggle = screen.getByTestId("personalization-toggle");
    // Toggle should be in "checked" / "on" state
    expect(toggle).toBeChecked();
  });

  test("[P0] T10.5-18: toggle is OFF when personalizationEnabled is false", async () => {
    const { PrivacySettings } = await import(
      "@/components/profile/PrivacySettings"
    );

    render(
      <PrivacySettings personalizationEnabled={false} onToggle={vi.fn()} />
    );

    const toggle = screen.getByTestId("personalization-toggle");
    expect(toggle).not.toBeChecked();
  });
});

// ─── AC3: Toggle interaction ─────────────────────────────────────────────────

describe("PrivacySettings — Toggle Interaction (AC3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("[P0] T10.5-19: calls onToggle(false) when disabling personalization", async () => {
    const { PrivacySettings } = await import(
      "@/components/profile/PrivacySettings"
    );

    const onToggle = vi.fn().mockResolvedValue(undefined);

    render(
      <PrivacySettings personalizationEnabled={true} onToggle={onToggle} />
    );

    const toggle = screen.getByTestId("personalization-toggle");
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(onToggle).toHaveBeenCalledWith(false);
    });
  });

  test("[P0] T10.5-20: calls onToggle(true) when enabling personalization", async () => {
    const { PrivacySettings } = await import(
      "@/components/profile/PrivacySettings"
    );

    const onToggle = vi.fn().mockResolvedValue(undefined);

    render(
      <PrivacySettings personalizationEnabled={false} onToggle={onToggle} />
    );

    const toggle = screen.getByTestId("personalization-toggle");
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(onToggle).toHaveBeenCalledWith(true);
    });
  });

  test('[P1] T10.5-21: shows toast "Personalización desactivada" after disabling', async () => {
    const { PrivacySettings } = await import(
      "@/components/profile/PrivacySettings"
    );

    const onToggle = vi.fn().mockResolvedValue(undefined);

    render(
      <PrivacySettings personalizationEnabled={true} onToggle={onToggle} />
    );

    const toggle = screen.getByTestId("personalization-toggle");
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(
        screen.getByText(
          /Personalización desactivada/i
        )
      ).toBeInTheDocument();
    });
  });

  test('[P1] T10.5-22: shows toast "Personalización activada" after enabling', async () => {
    const { PrivacySettings } = await import(
      "@/components/profile/PrivacySettings"
    );

    const onToggle = vi.fn().mockResolvedValue(undefined);

    render(
      <PrivacySettings personalizationEnabled={false} onToggle={onToggle} />
    );

    const toggle = screen.getByTestId("personalization-toggle");
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(
        screen.getByText(/Personalización activada/i)
      ).toBeInTheDocument();
    });
  });

  test("[P1] T10.5-23: toggle shows optimistic UI — changes immediately before API response", async () => {
    const { PrivacySettings } = await import(
      "@/components/profile/PrivacySettings"
    );

    // Create a promise that we control
    let resolveToggle: () => void;
    const onToggle = vi.fn().mockImplementation(
      () => new Promise<void>((resolve) => { resolveToggle = resolve; })
    );

    render(
      <PrivacySettings personalizationEnabled={true} onToggle={onToggle} />
    );

    const toggle = screen.getByTestId("personalization-toggle");
    fireEvent.click(toggle);

    // Toggle should change immediately (optimistic)
    await waitFor(() => {
      expect(toggle).not.toBeChecked();
    });

    // Resolve the API call
    resolveToggle!();
  });

  test("[P2] T10.5-24: toggle reverts on API error (rollback)", async () => {
    const { PrivacySettings } = await import(
      "@/components/profile/PrivacySettings"
    );

    const onToggle = vi.fn().mockRejectedValue(new Error("Network error"));

    render(
      <PrivacySettings personalizationEnabled={true} onToggle={onToggle} />
    );

    const toggle = screen.getByTestId("personalization-toggle");
    fireEvent.click(toggle);

    // Should revert back to checked after error
    await waitFor(() => {
      expect(toggle).toBeChecked();
    });
  });
});
