/**
 * Seed script — Importa listings reales desde la API de RE/MAX Altitud
 * y los inserta en la tabla `listings` de Supabase via Drizzle.
 *
 * Uso:
 *   npx tsx packages/shared/scripts/seed-remax.ts
 *
 * Requiere DATABASE_URL en el entorno o en apps/web/.env.local
 */

import { getDb } from "../src/db/index";
import { agencies, listings } from "../src/db/schema";
import { eq } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const API_URL =
  "https://api.remax-cca.com/api/PropertiesPerOffice/FEA8746D-CC1D-41B8-89F3-D04AC98274AF";

const AGENCY_NAME = "RE/MAX Altitud";

// ---------------------------------------------------------------------------
// Types (API response)
// ---------------------------------------------------------------------------

interface RemaxProperty {
  ListingId: string;
  ListPrice: number;
  ListingTitle_en?: string;
  ListingTitle_es?: string;
  PropertyTypeName_en?: string;
  PropertyTypeName_es?: string;
  Location?: string;
  StateDepProv?: string;
  Country?: string;
  UnparsedAddress?: string;
  BedroomsTotal?: number;
  BathroomsFull?: number;
  LotSizeArea?: number;
  ConstructionSize?: number;
  Images?: string; // pipe-delimited URLs
  PoolPrivate?: string;
  Viewyn?: string;
  GatedCommunity?: string;
  Cooling?: string;
  FirstName?: string;
  LastName?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapRemaxToListing(
  p: RemaxProperty,
  agencyId: string
): typeof listings.$inferInsert {
  // Parse images: pipe-delimited string → string[]
  const imageUrls = p.Images ? p.Images.split("|").filter(Boolean) : [];

  // Title: prefer Spanish, fallback to English
  const title =
    p.ListingTitle_es || p.ListingTitle_en || "Propiedad sin título";

  // Description: build from available metadata
  const descParts: string[] = [];
  if (p.PropertyTypeName_es || p.PropertyTypeName_en) {
    descParts.push(p.PropertyTypeName_es || p.PropertyTypeName_en || "");
  }
  if (p.BedroomsTotal) descParts.push(`${p.BedroomsTotal} habitaciones`);
  if (p.BathroomsFull) descParts.push(`${p.BathroomsFull} baños`);
  if (p.ConstructionSize && p.ConstructionSize > 0)
    descParts.push(`${p.ConstructionSize} m² construidos`);
  if (p.LotSizeArea) descParts.push(`${p.LotSizeArea} m² de terreno`);

  const amenities: string[] = [];
  if (p.PoolPrivate === "Y") amenities.push("piscina privada");
  if (p.Viewyn === "Y") amenities.push("vistas");
  if (p.GatedCommunity === "Y") amenities.push("comunidad cerrada");
  if (p.Cooling === "Y") amenities.push("aire acondicionado");
  if (amenities.length > 0) descParts.push(`Con ${amenities.join(", ")}`);

  const description =
    descParts.length > 0 ? descParts.join(". ") + "." : null;

  // Size: prefer construction size, fallback to lot size
  const size =
    p.ConstructionSize && p.ConstructionSize > 0
      ? String(p.ConstructionSize)
      : p.LotSizeArea
        ? String(p.LotSizeArea)
        : null;

  // Location
  const locationParts = [p.Location, p.StateDepProv, p.Country].filter(Boolean);
  const address = p.UnparsedAddress || locationParts.join(", ") || null;
  const city = p.Location || null;
  const country = p.Country || null;

  return {
    agencyId,
    externalId: p.ListingId,
    title,
    description,
    price: p.ListPrice ? String(p.ListPrice) : null,
    currency: "USD",
    bedrooms: p.BedroomsTotal ?? null,
    sizeSqm: size,
    address,
    city,
    country,
    latitude: null,
    longitude: null,
    images: imageUrls,
    status: "active",
    exclusivityVerified: false,
    catastralRef: null,
    // Note: soldAt omitted — column may not exist in DB yet
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // 1. Resolve DATABASE_URL
  const databaseUrl =
    process.env.DATABASE_URL ||
    (() => {
      // Try to read from apps/web/.env.local
      try {
        const fs = require("fs");
        const path = require("path");
        const envPath = path.resolve(
          __dirname,
          "../../../apps/web/.env.local"
        );
        const envContent = fs.readFileSync(envPath, "utf-8");
        const match = envContent.match(
          /DATABASE_URL=["']?([^"'\n]+)["']?/
        );
        if (match) return match[1];
      } catch {
        // ignore
      }
      return null;
    })();

  if (!databaseUrl) {
    console.error("❌ DATABASE_URL not found. Set it in env or apps/web/.env.local");
    process.exit(1);
  }

  console.log("🔗 Connecting to database...");
  const db = getDb(databaseUrl);

  // 2. Ensure the RE/MAX Altitud agency exists
  console.log(`🏢 Ensuring agency "${AGENCY_NAME}" exists...`);
  let [agency] = await db
    .select()
    .from(agencies)
    .where(eq(agencies.name, AGENCY_NAME))
    .limit(1);

  if (!agency) {
    [agency] = await db
      .insert(agencies)
      .values({ name: AGENCY_NAME, isActive: true })
      .returning();
    console.log(`   ✅ Created agency: ${agency.id}`);
  } else {
    console.log(`   ✅ Agency exists: ${agency.id}`);
  }

  // 3. Fetch listings from Remax API
  console.log(`📡 Fetching from RE/MAX Altitud API...`);
  const res = await fetch(API_URL);
  if (!res.ok) {
    console.error(`❌ API responded with HTTP ${res.status}`);
    process.exit(1);
  }

  const data: RemaxProperty[] = await res.json();
  console.log(`   📦 Received ${data.length} properties`);

  // 4. Check existing seeded listings to avoid duplicates
  const existing = await db
    .select({ externalId: listings.externalId })
    .from(listings)
    .where(eq(listings.agencyId, agency.id));

  const existingIds = new Set(existing.map((e) => e.externalId));
  const newProperties = data.filter(
    (p) => !existingIds.has(p.ListingId)
  );

  console.log(
    `   🔍 ${existing.length} already seeded, ${newProperties.length} new`
  );

  if (newProperties.length === 0) {
    console.log("✅ No new properties to seed. Done!");
    process.exit(0);
  }

  // 5. Map and insert
  const values = newProperties.map((p) => mapRemaxToListing(p, agency.id));

  console.log(`💾 Inserting ${values.length} listings...`);

  // Insert in batches of 20 to avoid query size limits
  const BATCH_SIZE = 20;
  let inserted = 0;

  for (let i = 0; i < values.length; i += BATCH_SIZE) {
    const batch = values.slice(i, i + BATCH_SIZE);
    await db.insert(listings).values(batch);
    inserted += batch.length;
    console.log(`   📝 Inserted ${inserted}/${values.length}`);
  }

  console.log(`\n✅ Seed complete! ${inserted} new listings from RE/MAX Altitud.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("💥 Seed failed:", err);
  process.exit(1);
});
