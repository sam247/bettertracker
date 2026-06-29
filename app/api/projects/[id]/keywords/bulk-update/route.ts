import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { keywords } from "@/lib/db/schema";

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
    return NextResponse.json({ error: "Provide ids to update" }, { status: 400 });
  }

  const updates: Partial<typeof keywords.$inferInsert> = {};
  if (body.groupId !== undefined) updates.groupId = String(body.groupId);
  if (body.enabled !== undefined) updates.enabled = Boolean(body.enabled);
  if (body.frequency !== undefined) updates.frequency = String(body.frequency);

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  const result = await db
    .update(keywords)
    .set(updates)
    .where(
      and(
        eq(keywords.projectId, projectId),
        isNull(keywords.deletedAt),
        inArray(keywords.id, ids),
      ),
    )
    .returning({ id: keywords.id });

  return NextResponse.json({ updated: result.length });
}
