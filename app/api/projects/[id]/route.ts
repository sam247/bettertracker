import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(project);
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json();

  const updates: Partial<typeof projects.$inferInsert> = {};
  if (body.name !== undefined) updates.name = String(body.name).trim();
  if (body.targetDomain !== undefined)
    updates.targetDomain = String(body.targetDomain).trim();
  if (body.region !== undefined) updates.region = String(body.region).trim();
  if (body.device !== undefined) updates.device = String(body.device).trim();

  const [project] = await db
    .update(projects)
    .set(updates)
    .where(eq(projects.id, id))
    .returning();

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(project);
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const [project] = await db
    .update(projects)
    .set({ archivedAt: new Date() })
    .where(eq(projects.id, id))
    .returning();

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(project);
}
