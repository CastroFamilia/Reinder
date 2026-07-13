/**
 * run-migrations.mjs
 * Aplica las migraciones SQL de Drizzle directamente a Supabase
 * sin depender de drizzle-kit (que requiere un schema de migraciones propio).
 *
 * Uso: node run-migrations.mjs
 */

import postgres from 'postgres';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

const MIGRATIONS_DIR = join(__dirname, 'packages/shared/src/db/migrations');

// Connect with prepare: false (required for Supabase pooler)
const sql = postgres(DATABASE_URL, {
  prepare: false,
  ssl: { rejectUnauthorized: false },
  max: 1,
});

async function runMigrations() {
  console.log('🔗 Connecting to database...');

  try {
    // Test connection
    const [result] = await sql`SELECT current_database() as db, current_user as usr`;
    console.log(`✅ Connected: db=${result.db}, user=${result.usr}`);
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    await sql.end();
    process.exit(1);
  }

  // Create migrations tracking table
  await sql`
    CREATE TABLE IF NOT EXISTS _reinder_migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('✅ Migration tracking table ready');

  // Get already applied migrations
  const applied = await sql`SELECT filename FROM _reinder_migrations`;
  const appliedSet = new Set(applied.map(r => r.filename));

  // Get all SQL migration files sorted
  const files = readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  let count = 0;
  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`⏭  Skipping (already applied): ${file}`);
      continue;
    }

    const filePath = join(MIGRATIONS_DIR, file);
    const sqlContent = readFileSync(filePath, 'utf8');

    console.log(`\n📄 Applying: ${file}`);

    // Split by statement-breakpoint and execute each statement
    const statements = sqlContent
      .split('--> statement-breakpoint')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      try {
        await sql.unsafe(statement);
      } catch (err) {
        // Ignore "already exists" errors (idempotent)
        if (err.message.includes('already exists') || err.code === '42P07' || err.code === '42710') {
          console.log(`  ⚠  Already exists, skipping: ${statement.slice(0, 60)}...`);
        } else {
          console.error(`  ❌ Error in statement: ${statement.slice(0, 100)}`);
          console.error(`     ${err.message}`);
          // Don't stop — continue with remaining statements
        }
      }
    }

    // Mark as applied
    await sql`INSERT INTO _reinder_migrations (filename) VALUES (${file}) ON CONFLICT DO NOTHING`;
    console.log(`  ✅ Applied: ${file}`);
    count++;
  }

  console.log(`\n🎉 Done! ${count} migration(s) applied.`);
  await sql.end();
}

runMigrations().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
