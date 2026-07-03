import type { Config } from "drizzle-kit";

if (!process.env.POSTGRES_URL) {
  console.warn(
    "[drizzle] POSTGRES_URL not set — copy .env.example to .env.local and fill in your database URL",
  );
}

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.POSTGRES_URL ?? "",
  },
  verbose: true,
  strict: true,
} satisfies Config;