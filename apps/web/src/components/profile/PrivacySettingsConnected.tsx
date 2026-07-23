/**
 * apps/web/src/components/profile/PrivacySettingsConnected.tsx
 *
 * Story 10.5 — AC3: Client-side wrapper that connects PrivacySettings
 * to the PATCH /api/v1/buyer/personalization endpoint.
 *
 * Used in the server-rendered ProfilePage to provide interactivity.
 */

"use client";

import { PrivacySettings } from "@/components/profile/PrivacySettings";

export interface PrivacySettingsConnectedProps {
  /** Initial value from the server-fetched profile */
  initialEnabled: boolean;
}

export function PrivacySettingsConnected({
  initialEnabled,
}: PrivacySettingsConnectedProps) {
  const handleToggle = async (enabled: boolean) => {
    const res = await fetch("/api/v1/buyer/personalization", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error?.message ?? "Failed to update personalization");
    }
  };

  return (
    <PrivacySettings
      personalizationEnabled={initialEnabled}
      onToggle={handleToggle}
    />
  );
}
