import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { groups, keywords } from "@/lib/db/schema";

type RouteContext = { params: Promise<{ id: string; groupId: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId, groupId } = await context.params;

  const projectGroups = await db
    .select()
    .from(groups)
    .where(eq(groups.projectId, projectId));

  if (projectGroups.length <= 1) {
    return NextResponse.json(
      { error: "Cannot delete the only group in a project" },
      { status: 400 },
    );
  }

  const group = projectGroups.find((row) => row.id === groupId);
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const otherGroups = projectGroups.filter((row) => row.id !== groupId);
  const targetGroup =
    otherGroups.find((row) => row.name === "Default") ?? otherGroups[0];

  await db
    .update(keywords)
    .set({ groupId: targetGroup.id })
    .where(
      and(eq(keywords.groupId, groupId), isNull(keywords.deletedAt)),
    );

  await db.delete(groups).where(eq(groups.id, groupId));

  return NextResponse.json({
    ok: true,
    movedToGroupId: targetGroup.id,
    movedToGroupName: targetGroup.name,
  });
}
