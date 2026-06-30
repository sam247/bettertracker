import { sql } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { getDatabaseUrl } from "../lib/db/url";

/** Mark daily keywords due if their next_check_at is not aligned to 00:01 UK. */
async function main() {
  const db = drizzle(neon(getDatabaseUrl()));

  const result = await db.execute(sql`
    UPDATE keywords
    SET next_check_at = NULL
    WHERE enabled = true
      AND deleted_at IS NULL
      AND frequency = 'daily'
      AND (
        next_check_at IS NULL
        OR EXTRACT(HOUR FROM next_check_at AT TIME ZONE 'Europe/London') != 0
        OR EXTRACT(MINUTE FROM next_check_at AT TIME ZONE 'Europe/London') != 1
        OR next_check_at > last_checked_at + INTERVAL '2 days'
      )
  `);

  console.log(`Reset ${result.rowCount ?? 0} daily keyword schedule(s) for catch-up.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
