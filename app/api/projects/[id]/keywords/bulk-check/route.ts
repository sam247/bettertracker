import { and, eq, inArray, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { runKeywordCheck } from "@/lib/check-runner";
import { db } from "@/lib/db";
import { keywords } from "@/lib/db/schema";

export const maxDuration = 300;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await context.params;
  const body = await request.json();
  const ids = Array.isArray(body.ids)
    ? body.ids.map(String).filter(Boolean)
    : [];

  if (ids.length === 0) {
    return NextResponse.json({ error: "Provide ids to check" }, { status: 400 });
  }

  const rows = await db
    .select({ id: keywords.id })
    .from(keywords)
    .where(
      and(
        eq(keywords.projectId, projectId),
        isNull(keywords.deletedAt),
        inArray(keywords.id, ids),
      ),
    );

  const batchSize = Math.min(
    parseInt(process.env.CRON_BATCH_SIZE ?? "5", 10),
    5,
  );
  const batch = rows.slice(0, batchSize);

  const results = [];
  for (const row of batch) {
    results.push(await runKeywordCheck(row.id));
  }

  const succeeded = results.filter((r) => r.success).length;
  return NextResponse.json({
    checked: results.length,
    succeeded,
    remaining: Math.max(rows.length - batch.length, 0),
    results,
  });
}
