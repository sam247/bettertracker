import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { keywords } from "@/lib/db/schema";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json();

  const updates: Partial<typeof keywords.$inferInsert> = {};
  if (body.groupId !== undefined) updates.groupId = String(body.groupId);
  if (body.frequency !== undefined) updates.frequency = String(body.frequency);
  if (body.enabled !== undefined) updates.enabled = Boolean(body.enabled);
  if (body.targetUrl !== undefined) {
    updates.targetUrl = body.targetUrl ? String(body.targetUrl).trim() : null;
  }

  const [keyword] = await db
    .update(keywords)
    .set(updates)
    .where(eq(keywords.id, id))
    .returning();

  if (!keyword) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(keyword);
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const [keyword] = await db
    .update(keywords)
    .set({ deletedAt: new Date() })
    .where(eq(keywords.id, id))
    .returning();

  if (!keyword) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(keyword);
}
