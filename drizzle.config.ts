import { defineConfig } from "drizzle-kit";

const url =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.POSTGRES_URL;

if (!url) {
  throw new Error(
    "No database URL. Set DATABASE_URL, POSTGRES_URL, or POSTGRES_URL_NON_POOLING.",
  );
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url,
  },
});
