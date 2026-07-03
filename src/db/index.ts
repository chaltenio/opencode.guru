import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __pgClient: ReturnType<typeof postgres> | undefined;
}

function getClient() {
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

export const db = drizzle(getClient(), { schema });
export { schema };
export type DB = typeof db;