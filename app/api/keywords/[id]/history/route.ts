import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rankChecks } from "@/lib/db/schema";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const rows = await db
    .select({
      position: rankChecks.position,
      rankingUrl: rankChecks.rankingUrl,
      createdAt: rankChecks.createdAt,
      status: rankChecks.status,
    })
    .from(rankChecks)
    .where(and(eq(rankChecks.keywordId, id), eq(rankChecks.status, "success")))
    .orderBy(desc(rankChecks.createdAt))
    .limit(10);

  return NextResponse.json({
    history: [...rows].reverse(),
    positions: [...rows].reverse().map((r) => r.position),
  });
}
