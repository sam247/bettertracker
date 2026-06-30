import { sql } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { getDatabaseUrl } from "../lib/db/url";

const KEEP_PROJECT = process.env.KEEP_PROJECT ?? "RIGS Electrical";

async function main() {
  const db = drizzle(neon(getDatabaseUrl()));

  const deleted = await db.execute(sql`
    DELETE FROM rank_checks
    WHERE keyword_id IN (
      SELECT k.id
      FROM keywords k
      JOIN projects p ON p.id = k.project_id
      WHERE p.name <> ${KEEP_PROJECT}
        AND k.deleted_at IS NULL
    )
  `);

  const reset = await db.execute(sql`
    UPDATE keywords k
    SET
      current_position = NULL,
      previous_position = NULL,
      best_position = NULL,
      current_ranking_url = NULL,
      last_checked_at = NULL,
      next_check_at = NULL
    FROM projects p
    WHERE k.project_id = p.id
      AND p.name <> ${KEEP_PROJECT}
      AND k.deleted_at IS NULL
  `);

  console.log(
    `Cleared ${deleted.rowCount ?? 0} rank check(s) and reset ${reset.rowCount ?? 0} keyword(s). Kept: ${KEEP_PROJECT}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
