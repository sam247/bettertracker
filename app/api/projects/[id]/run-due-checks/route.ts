import { and, asc, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { runKeywordChecks } from "@/lib/check-runner";
import { isDue } from "@/lib/dates";
import { db } from "@/lib/db";
import { keywords, projects } from "@/lib/db/schema";

export const maxDuration = 300;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await context.params;

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (project.archivedAt) {
    return NextResponse.json({ error: "Project archived" }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(keywords)
    .where(
      and(
        eq(keywords.projectId, projectId),
        eq(keywords.enabled, true),
        isNull(keywords.deletedAt),
      ),
    )
    .orderBy(asc(keywords.keyword));

  const dueIds = rows
    .filter((k) => isDue(k.nextCheckAt))
    .sort((a, b) => {
      const aTime = a.nextCheckAt?.getTime() ?? 0;
      const bTime = b.nextCheckAt?.getTime() ?? 0;
      return aTime - bTime;
    })
    .map((k) => k.id);

  if (dueIds.length === 0) {
    return NextResponse.json({
      checked: 0,
      succeeded: 0,
      failed: 0,
      remaining: 0,
      results: [],
    });
  }

  const { results, checked, succeeded, failed } = await runKeywordChecks(dueIds);

  return NextResponse.json({
    checked,
    succeeded,
    failed,
    remaining: 0,
    results,
  });
}
