import "server-only";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/supabase/db";
import { userProfiles } from "@reinder/shared/db/schema";
import { eq } from "drizzle-orm";
import type { ApiResponse } from "@reinder/shared";

export async function POST(request: NextRequest) {
  // Only allow in development mode or if the user is already an admin
  // (We check admin status below, but for safety we also check NODE_ENV if we wanted strict dev-only. 
  //  However, since we want this accessible for admins in production too, we'll rely on the logic below).
  
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      },
      { status: 401 }
    );
  }

  let body: { role?: "buyer" | "agent" | "agency_admin" | "platform_admin" };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { data: null, error: { code: "INVALID_INPUT", message: "Invalid JSON" } },
      { status: 400 }
    );
  }

  const { role } = body;
  if (!role || !["buyer", "agent", "agency_admin", "platform_admin"].includes(role)) {
    return NextResponse.json(
      { data: null, error: { code: "INVALID_INPUT", message: "Invalid role" } },
      { status: 400 }
    );
  }

  // Security check: only allow switching if in development OR if the user is currently an admin
  const isDev = process.env.NODE_ENV === "development";
  let isCurrentAdmin = false;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile && profile.role === "platform_admin") {
    isCurrentAdmin = true;
  }

  if (!isDev && !isCurrentAdmin) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "FORBIDDEN", message: "Not allowed to switch roles in production unless admin" },
      },
      { status: 403 }
    );
  }

  // Perform the role update
  await supabase
    .from("user_profiles")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  return NextResponse.json({ data: { success: true, role }, error: null });
}
