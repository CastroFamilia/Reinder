import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function main() {
  const email = "santimcastro@gmail.com";
  // 1. Get user id from auth.users (if using service role) or maybe we can't if we don't have service role
  // Let's just list all user_profiles since this is local dev
  const { data, error } = await supabase.from("user_profiles").select("*");
  console.log("Profiles:", data);
  if (error) console.error("Error:", error);
}

main();
