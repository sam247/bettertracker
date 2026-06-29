import { and, eq, inArray, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { keywords } from "@/lib/db/schema";
import { normaliseKeyword } from "@/lib/normalise-keyword";

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

  let keywordTexts: string[] = [];
  if (body.keywords) {
    keywordTexts = String(body.keywords)
      .split("\n")
      .map((k) => k.trim())
      .filter(Boolean);
  } else if (Array.isArray(body.keywordList)) {
    keywordTexts = body.keywordList.map((k: unknown) => String(k).trim()).filter(Boolean);
  }

  if (ids.length === 0 && keywordTexts.length === 0) {
    return NextResponse.json(
      { error: "Provide ids or keywords to delete" },
      { status: 400 },
    );
  }

  const now = new Date();
  let deletedCount = 0;
  const notFound: string[] = [];

  if (ids.length > 0) {
    const result = await db
      .update(keywords)
      .set({ deletedAt: now })
      .where(
        and(
          eq(keywords.projectId, projectId),
          isNull(keywords.deletedAt),
          inArray(keywords.id, ids),
        ),
      )
      .returning({ id: keywords.id });

    deletedCount += result.length;
  }

  if (keywordTexts.length > 0) {
    const normalised = keywordTexts.map(normaliseKeyword);
    const existing = await db
      .select()
      .from(keywords)
      .where(
        and(eq(keywords.projectId, projectId), isNull(keywords.deletedAt)),
      );

    const byNormalised = new Map(
      existing.map((k) => [k.keywordNormalised, k.id]),
    );

    const idsToDelete: string[] = [];
    for (const text of keywordTexts) {
      const key = normaliseKeyword(text);
      const matchId = byNormalised.get(key);
      if (matchId) {
        idsToDelete.push(matchId);
      } else {
        notFound.push(text);
      }
    }

    if (idsToDelete.length > 0) {
      const result = await db
        .update(keywords)
        .set({ deletedAt: now })
        .where(inArray(keywords.id, idsToDelete))
        .returning({ id: keywords.id });
      deletedCount += result.length;
    }
  }

  return NextResponse.json({ deleted: deletedCount, notFound });
}
