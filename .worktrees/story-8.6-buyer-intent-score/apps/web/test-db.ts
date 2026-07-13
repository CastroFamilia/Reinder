import { db } from "./src/lib/supabase/db";
import { agentBuyerBonds } from "@reinder/shared/db/schema";
import "dotenv/config";

async function main() {
  try {
    const clients = await db.select().from(agentBuyerBonds).limit(1);
    console.log("Success:", clients);
  } catch (e) {
    console.error("Drizzle Error:", e);
  }
}

main();
