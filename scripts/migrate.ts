/**
 * Production migration runner.
 *
 * Uses POSTGRES_URL_NON_POOLING if available (required for Supabase / PgBouncer
 * transaction-pooling mode, which breaks DDL transactions). Falls back to
 * POSTGRES_PRISMA_URL, then POSTGRES_URL.
 *
 * Run via: `npm run db:migrate:prod`
 * Automatically invoked by Vercel's build command (see vercel.json).
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import path from "node:path";
import fs from "node:fs";

async function main() {
  const url =
    process.env.POSTGRES_URL_NON_POOLING ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL;

  if (!url) {
    console.error(
      "[migrate] No database URL found. Set POSTGRES_URL (or POSTGRES_URL_NON_POOLING) before running.",
    );
    process.exit(1);
  }

  const label =
    url === process.env.POSTGRES_URL_NON_POOLING
      ? "POSTGRES_URL_NON_POOLING"
      : url === process.env.POSTGRES_PRISMA_URL
        ? "POSTGRES_PRISMA_URL"
        : "POSTGRES_URL";
  console.log(`[migrate] Using ${label}`);

  // Resolve the drizzle migrations folder. Try several candidates so this
  // works both locally (cwd is project root) and on Vercel (tsx may resolve
  // import.meta.url differently).
  const candidates = [
    path.resolve(process.cwd(), "drizzle"),
    path.resolve(process.cwd(), "..", "drizzle"),
    path.resolve(process.cwd(), "..", "..", "drizzle"),
  ];
  const migrationsFolder = candidates.find((p) => fs.existsSync(p));
  if (!migrationsFolder) {
    console.error(
      `[migrate] Could not find a 'drizzle' folder. Tried:\n  ${candidates.join("\n  ")}`,
    );
    process.exit(1);
  }
  console.log(`[migrate] Migrations folder: ${migrationsFolder}`);

  const sql = postgres(url, { max: 1, prepare: false });
  const db = drizzle(sql);

  try {
    console.log("[migrate] Applying migrations…");
    await migrate(db, { migrationsFolder });
    console.log("[migrate] ✓ All migrations applied successfully.");
  } catch (e) {
    console.error("[migrate] ✗ Migration failed:", e);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});