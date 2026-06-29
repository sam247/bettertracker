import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  apiLogs,
  groups,
  keywords,
  projects,
  rankChecks,
} from "@/lib/db/schema";

export async function deleteProject(projectId: string): Promise<boolean> {
  const keywordRows = await db
    .select({ id: keywords.id })
    .from(keywords)
    .where(eq(keywords.projectId, projectId));

  const keywordIds = keywordRows.map((row) => row.id);

  if (keywordIds.length > 0) {
    await db.delete(apiLogs).where(inArray(apiLogs.keywordId, keywordIds));
    await db.delete(rankChecks).where(inArray(rankChecks.keywordId, keywordIds));
  }

  await db.delete(keywords).where(eq(keywords.projectId, projectId));
  await db.delete(groups).where(eq(groups.projectId, projectId));

  const [deleted] = await db
    .delete(projects)
    .where(eq(projects.id, projectId))
    .returning({ id: projects.id });

  return !!deleted;
}
