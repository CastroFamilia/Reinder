import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/supabase/db";
import { swipeEvents, matchEvents } from "@reinder/shared/db/schema";
import { eq } from "drizzle-orm";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Delete matches and swipes for the authenticated user
    await db.delete(matchEvents).where(eq(matchEvents.buyerId, user.id));
    await db.delete(swipeEvents).where(eq(swipeEvents.buyerId, user.id));

    return NextResponse.json({ success: true, message: "Swipes and matches cleared" });
  } catch (error) {
    console.error("[dev/clear-swipes] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
