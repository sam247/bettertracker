import Link from "next/link";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { PositionSparkline } from "@/components/position-sparkline";
import { ProjectMovementCell } from "@/components/project-movement-cell";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { keywords, projects, rankChecks } from "@/lib/db/schema";
import { formatRegionDisplay } from "@/lib/format-region";
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

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="pb-2 pr-4 font-medium">Name</th>
              <th className="pb-2 pr-4 font-medium">Domain</th>
              <th className="pb-2 pr-4 font-medium">Region</th>
              <th className="pb-2 pl-4 pr-2 font-medium text-center">Avg position</th>
              <th className="pb-2 px-2 font-medium text-center">Movement</th>
              <th className="pb-2 px-2 font-medium text-center">Trend</th>
              <th className="pb-2 pl-2 pr-4 font-medium text-center">Keywords</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ project, keywordCount }) => {
              const projectKeywords = keywordsByProject.get(project.id) ?? [];
              const stats = computeProjectKeywordStats(projectKeywords);
              const trend = trendByProject[project.id] ?? [];

              return (
                <tr
                  key={project.id}
                  className="border-b border-border/50 hover:bg-surface/50"
                >
                  <td className="py-3 pr-4">
                    <Link
                      href={`/projects/${project.id}`}
                      className="font-medium no-underline hover:underline"
                    >
                      {project.name}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-muted">{project.targetDomain}</td>
                  <td className="py-3 pr-4 text-muted">
                    {formatRegionDisplay(project.region)}
                  </td>
                  <td className="py-3 pl-4 pr-2 text-center tabular-nums text-muted">
                    {stats.avgPosition !== null
                      ? stats.avgPosition % 1 === 0
                        ? stats.avgPosition
                        : stats.avgPosition.toFixed(1)
                      : "—"}
                  </td>
                  <td className="py-3 px-2 text-center">
                    <ProjectMovementCell net={stats.netMovement} />
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex justify-center">
                      <PositionSparkline positions={trend} />
                    </div>
                  </td>
                  <td className="py-3 pl-2 pr-4 text-center tabular-nums text-muted">
                    {keywordCount}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="py-12 text-center text-sm text-muted">
            No projects yet.{" "}
            <Link href="/projects/new" className="text-blue">
              Create one
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
