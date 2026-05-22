/**
 * apps/web/src/app/(protected)/layout.tsx
 *
 * Layout for all authenticated buyer pages.
 * Renders Navbar with user data + Footer.
 * Story 11.6
 */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch basic profile data for the navbar
  let userName: string | null = null;
  let avatarUrl: string | null = null;
  try {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();
    userName = profile?.full_name ?? user.email?.split("@")[0] ?? null;
    avatarUrl = profile?.avatar_url ?? null;
  } catch {
    // Fail silently — navbar will show fallback
  }

  return (
    <>
      <Navbar
        isAuthenticated={true}
        userName={userName}
        avatarUrl={avatarUrl}
        newMatchCount={0}
      />
      <main
        style={{
          minHeight: "100vh",
          paddingTop: "var(--navbar-height)",
        }}
      >
        {children}
      </main>
      <Footer />
    </>
  );
}
