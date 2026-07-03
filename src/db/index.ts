import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Schema = typeof schema;
type Database = PostgresJsDatabase<Schema>;

declare global {
  // eslint-disable-next-line no-var
  var __pgClient: ReturnType<typeof postgres> | undefined;
  // eslint-disable-next-line no-var
  var __dbInstance: Database | undefined;
}

function getClient(): ReturnType<typeof postgres> {
  if (!process.env.POSTGRES_URL) {
    throw new Error(
      "POSTGRES_URL is not set. Add it to .env.local (see .env.example).",
    );
  }
  if (!global.__pgClient) {
    global.__pgClient = postgres(process.env.POSTGRES_URL, {
      prepare: false,
      max: 10,
    });
  }
  return global.__pgClient;
}

function getDb(): Database {
  if (!global.__dbInstance) {
    global.__dbInstance = drizzle(getClient(), { schema });
  }
  return global.__dbInstance;
}

/**
 * Lazy Drizzle proxy. The real connection is created on first access, so
 * importing this module never touches `process.env.POSTGRES_URL`. This is
 * what lets `next build` succeed on Vercel before runtime env vars are
 * guaranteed to be present.
 *
 * Every property access (e.g. `db.select`, `db.insert`) forwards to the
 * underlying Drizzle instance. Methods are bound so `db.select(...).from(...)`
 * chains work correctly.
 */
export const db = new Proxy({} as Database, {
  get(_target, prop, _receiver) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
}) as Database;

export { schema };
export type DB = Database;