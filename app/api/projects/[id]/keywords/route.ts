import { and, asc, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { groups, keywords } from "@/lib/db/schema";
import { normaliseKeyword } from "@/lib/normalise-keyword";

export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const rows = await db
    .select({
      keyword: keywords,
      group: groups,
    })
    .from(keywords)
    .innerJoin(groups, eq(keywords.groupId, groups.id))
    .where(and(eq(keywords.projectId, id), isNull(keywords.deletedAt)))
    .orderBy(asc(keywords.keyword));

  return NextResponse.json(rows);
}

export async function POST(request: Request, context: RouteContext) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await context.params;
  const body = await request.json();
  const groupId = String(body.groupId ?? "");
  const frequency = String(body.frequency ?? "weekly");
  const targetUrl = body.targetUrl ? String(body.targetUrl).trim() : null;

  let keywordList: string[] = [];
  if (Array.isArray(body.keywords)) {
    keywordList = body.keywords.map(String);
  } else if (body.keyword) {
    keywordList = [String(body.keyword)];
  } else if (body.bulk) {
    keywordList = String(body.bulk)
      .split("\n")
      .map((k) => k.trim())
      .filter(Boolean);
  }

  if (!groupId || keywordList.length === 0) {
    return NextResponse.json(
      { error: "Group and at least one keyword are required" },
      { status: 400 },
    );
  }

  const [group] = await db
    .select()
    .from(groups)
    .where(and(eq(groups.id, groupId), eq(groups.projectId, projectId)))
    .limit(1);

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const created = [];
  const skipped: string[] = [];

  for (const raw of keywordList) {
    const keyword = raw.trim();
    if (!keyword) continue;
    const keywordNormalised = normaliseKeyword(keyword);

    try {
      const [row] = await db
        .insert(keywords)
        .values({
          projectId,
          groupId,
          keyword,
          keywordNormalised,
          targetUrl,
          frequency,
        })
        .returning();
      created.push(row);
    } catch {
      skipped.push(keyword);
    }
  }

  return NextResponse.json({ created, skipped }, { status: 201 });
}
