import { Suspense } from "react";
import { ArchiveProjectButton } from "@/components/archive-project-button";
import { CheckingProvider } from "@/components/checking-context";
import { DeleteProjectButton } from "@/components/delete-project-button";
import { GroupsManager } from "@/components/groups-manager";
import { KeywordsTable } from "@/components/keywords-table";
import { ProjectForm } from "@/components/project-form";
import { isGoogleAdsConfigured } from "@/lib/google-ads-config";
import { ProjectPageHeader } from "@/components/project-page-header";
import { notFound } from "next/navigation";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { groups, keywords, projects, rankChecks } from "@/lib/db/schema";
import { buildBaselinePositions, buildMovementTimeline, buildPositionHistory } from "@/lib/keyword-history";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { id } = await params;
  const { edit } = await searchParams;

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);

  if (!project) notFound();

  const groupRows = await db
    .select()
    .from(groups)
    .where(eq(groups.projectId, id))
    .orderBy(asc(groups.sortOrder));

  const rows = await db
    .select({
      keyword: keywords,
      group: groups,
    })
    .from(keywords)
    .innerJoin(groups, eq(keywords.groupId, groups.id))
    .where(and(eq(keywords.projectId, id), isNull(keywords.deletedAt)))
    .orderBy(asc(keywords.keyword));

  const checkRows = await db
    .select({
      keywordId: rankChecks.keywordId,
      position: rankChecks.position,
      createdAt: rankChecks.createdAt,
    })
    .from(rankChecks)
    .innerJoin(keywords, eq(rankChecks.keywordId, keywords.id))
    .where(
      and(
        eq(keywords.projectId, id),
        isNull(keywords.deletedAt),
        eq(rankChecks.status, "success"),
      ),
    )
    .orderBy(asc(rankChecks.createdAt));

  const positionHistory = buildPositionHistory(checkRows);
  const baselinePositions = buildBaselinePositions(checkRows);
  const movementTimeline = buildMovementTimeline(
    checkRows,
    baselinePositions,
    rows
      .filter((r) => r.keyword.enabled)
      .map((r) => r.keyword.id),
  );

  const keywordCountByGroup = Object.fromEntries(
    groupRows.map((group) => [
      group.id,
      rows.filter((row) => row.group.id === group.id).length,
    ]),
  );

  if (edit === "true") {
    return (
      <div>
        <h1 className="mb-8 text-xl font-medium">Edit project</h1>
        <ProjectForm project={project} />
        <div className="mt-8 border-t border-border pt-8">
          <GroupsManager
            projectId={project.id}
            groups={groupRows}
            keywordCounts={keywordCountByGroup}
          />
        </div>
        <div className="mt-8 space-y-6 border-t border-border pt-8">
          <div>
            <h2 className="mb-2 text-sm font-medium">Archive</h2>
            <p className="mb-3 text-xs text-muted">
              Stop tracking keywords. Data is kept and can be viewed under
              archived projects.
            </p>
            <ArchiveProjectButton projectId={project.id} />
          </div>
          <div>
            <h2 className="mb-2 text-sm font-medium">Delete</h2>
            <p className="mb-3 text-xs text-muted">
              Permanently remove this project, all keywords, and rank history.
            </p>
            <DeleteProjectButton
              projectId={project.id}
              projectName={project.name}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <CheckingProvider>
      <ProjectPageHeader
        projectId={id}
        project={project}
        keywords={rows.map((r) => r.keyword)}
        volumesEnabled={isGoogleAdsConfigured(project.gadsCustomerId)}
      />

      <Suspense
        fallback={
          <div className="py-12 text-center text-sm text-muted">Loading…</div>
        }
      >
        <KeywordsTable
          projectId={id}
          rows={rows}
          groups={groupRows}
          positionHistory={positionHistory}
          baselinePositions={baselinePositions}
          movementTimeline={movementTimeline}
        />
      </Suspense>
    </CheckingProvider>
  );
}
