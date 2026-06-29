import Link from "next/link";
import { desc, isNull, sql } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { keywords, projects } from "@/lib/db/schema";

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
    .where(showArchived ? sql`${projects.archivedAt} IS NOT NULL` : isNull(projects.archivedAt))
    .groupBy(projects.id)
    .orderBy(desc(projects.createdAt));

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
              <th className="pb-2 pr-4 font-medium text-right">Keywords</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ project, keywordCount }) => (
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
                <td className="py-3 pr-4 text-muted">{project.region}</td>
                <td className="py-3 pr-4 text-right tabular-nums text-muted">
                  {keywordCount}
                </td>
              </tr>
            ))}
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
