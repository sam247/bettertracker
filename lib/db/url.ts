/**
 * Vercel Postgres sets POSTGRES_URL; allow DATABASE_URL as an override.
 * Use POSTGRES_URL_NON_POOLING for drizzle-kit push (migrations).
 */
export function getDatabaseUrl(): string {
  const url =
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_URL_NON_POOLING;

  if (!url) {
    throw new Error(
      "No database URL found. Set DATABASE_URL or connect Vercel Postgres (POSTGRES_URL).",
    );
  }

  return url;
}
