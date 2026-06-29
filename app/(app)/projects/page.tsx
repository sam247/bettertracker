import Link from "next/link";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { ProjectsTable } from "@/components/projects-table";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { keywords, projects, rankChecks } from "@/lib/db/schema";
import { buildProjectAvgHistory } from "@/lib/keyword-history";
import { computeProjectKeywordStats } from "@/lib/project-stats";

export const dynamic = "force-dynamic";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const params = await searchParams;
  const showArchived = params.archived === "true";

  const rows = await db
    .select({
      project: projects,
      keywordCount: sql<number>`count(${keywords.id})::int`,
    })
    .from(projects)
    .leftJoin(
      keywords,
      sql`${keywords.projectId} = ${projects.id} AND ${keywords.deletedAt} IS NULL`,
    )
    .where(
      showArchived
        ? sql`${projects.archivedAt} IS NOT NULL`
        : isNull(projects.archivedAt),
    )
    .groupBy(projects.id)
    .orderBy(desc(projects.createdAt));

  const projectIds = rows.map((row) => row.project.id);

  const keywordRows =
    projectIds.length > 0
      ? await db
          .select()
          .from(keywords)
          .where(
            and(isNull(keywords.deletedAt), inArray(keywords.projectId, projectIds)),
          )
      : [];

  const keywordsByProject = new Map<string, typeof keywordRows>();
  for (const keyword of keywordRows) {
    const list = keywordsByProject.get(keyword.projectId) ?? [];
    list.push(keyword);
    keywordsByProject.set(keyword.projectId, list);
  }

  const historyRows =
    projectIds.length > 0
      ? await db
          .select({
            projectId: keywords.projectId,
            position: rankChecks.position,
            createdAt: rankChecks.createdAt,
          })
          .from(rankChecks)
          .innerJoin(keywords, eq(rankChecks.keywordId, keywords.id))
          .where(
            and(
              isNull(keywords.deletedAt),
              eq(rankChecks.status, "success"),
              inArray(keywords.projectId, projectIds),
            ),
          )
      : [];

  const trendByProject = buildProjectAvgHistory(historyRows);

  const tableRows = rows.map(({ project, keywordCount }) => ({
    project,
    keywordCount,
    stats: computeProjectKeywordStats(keywordsByProject.get(project.id) ?? []),
    trend: trendByProject[project.id] ?? [],
  }));

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium">Projects</h1>
          <p className="mt-1 text-sm text-muted">
            {showArchived ? "Archived projects" : "Active projects"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={showArchived ? "/projects" : "/projects?archived=true"}>
            <Button variant="ghost">
              {showArchived ? "Show active" : "Show archived"}
            </Button>
          </Link>
          <Link href="/projects/new">
            <Button>Add project</Button>
          </Link>
        </div>
      </div>

      <ProjectsTable rows={tableRows} />
    </div>
  );
}
