import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { keywords, projects } from "@/lib/db/schema";
import type { CommandPaletteData } from "@/lib/commands/types";

export async function getCommandPaletteData(): Promise<CommandPaletteData> {
  const projectRows = await db
    .select({
      id: projects.id,
      name: projects.name,
      domain: projects.targetDomain,
    })
    .from(projects)
    .where(isNull(projects.archivedAt))
    .orderBy(asc(projects.name));

  const keywordRows = await db
    .select({
      id: keywords.id,
      keyword: keywords.keyword,
      projectId: keywords.projectId,
      projectName: projects.name,
    })
    .from(keywords)
    .innerJoin(projects, eq(keywords.projectId, projects.id))
    .where(and(isNull(keywords.deletedAt), isNull(projects.archivedAt)))
    .orderBy(asc(keywords.keyword));

  return {
    projects: projectRows.map((row) => ({
      id: row.id,
      name: row.name,
      domain: row.domain,
    })),
    keywords: keywordRows,
  };
}
