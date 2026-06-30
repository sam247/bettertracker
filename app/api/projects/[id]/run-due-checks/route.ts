import { and, asc, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { runKeywordCheck } from "@/lib/check-runner";
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

  const due = rows
    .filter((k) => isDue(k.nextCheckAt))
    .sort((a, b) => {
      const aTime = a.nextCheckAt?.getTime() ?? 0;
      const bTime = b.nextCheckAt?.getTime() ?? 0;
      return aTime - bTime;
    });

  const batchSize = parseInt(process.env.CRON_BATCH_SIZE ?? "20", 10);
  const batch = due.slice(0, batchSize);

  const results = [];
  for (const keyword of batch) {
    results.push(await runKeywordCheck(keyword.id));
  }

  const succeeded = results.filter((r) => r.success).length;
  return NextResponse.json({
    checked: results.length,
    succeeded,
    remaining: Math.max(due.length - batch.length, 0),
    results,
  });
}
