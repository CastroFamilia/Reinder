"use client";

/**
 * Logout button component.
 * Story 11.5
 */
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      await supabase.auth.signOut();
      router.refresh();
      router.push("/");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="btn btn-secondary"
      style={{
        width: "fit-content",
        opacity: loading ? 0.5 : 1,
      }}
    >
      {loading ? "Cerrando sesión…" : "Cerrar sesión"}
    </button>
  );
}
