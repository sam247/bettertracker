import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { groups } from "@/lib/db/schema";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const rows = await db
    .select()
    .from(groups)
    .where(eq(groups.projectId, id))
    .orderBy(asc(groups.sortOrder));

  return NextResponse.json(rows);
}

export async function POST(request: Request, context: RouteContext) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json();
  const name = String(body.name ?? "").trim();

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(groups)
    .where(eq(groups.projectId, id));

  const [group] = await db
    .insert(groups)
    .values({
      projectId: id,
      name,
      sortOrder: existing.length,
    })
    .returning();

  return NextResponse.json(group, { status: 201 });
}
