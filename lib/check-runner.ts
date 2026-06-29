import { and, desc, eq, gte, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { keywords, projects, rankChecks } from "@/lib/db/schema";
import { addFrequency, type Frequency } from "@/lib/dates";
import { rankCheck } from "@/lib/serprobot";

export interface CheckOutcome {
  keywordId: string;
  success: boolean;
  position: number | null;
  error: string | null;
}

export async function runKeywordCheck(keywordId: string): Promise<CheckOutcome> {
  const rows = await db
    .select({
      keyword: keywords,
      project: projects,
    })
    .from(keywords)
    .innerJoin(projects, eq(keywords.projectId, projects.id))
    .where(eq(keywords.id, keywordId))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return { keywordId, success: false, position: null, error: "Keyword not found" };
  }

  const { keyword, project } = row;

  if (keyword.deletedAt) {
    return { keywordId, success: false, position: null, error: "Keyword deleted" };
  }
  if (project.archivedAt) {
    return { keywordId, success: false, position: null, error: "Project archived" };
  }
  if (!keyword.enabled) {
    return { keywordId, success: false, position: null, error: "Tracking disabled" };
  }

  const result = await rankCheck(
    project.region,
    keyword.keyword,
    project.targetDomain,
    project.device,
    keyword.id,
  );

  const now = new Date();

  if (!result.success) {
    await db.insert(rankChecks).values({
      keywordId: keyword.id,
      position: null,
      rankingUrl: null,
      status: "failed",
      errorMessage: result.error ?? "Check failed",
    });

    return {
      keywordId,
      success: false,
      position: null,
      error: result.error ?? "Check failed",
    };
  }

  const newPosition = result.position;
  const previousPosition = keyword.currentPosition;
  let bestPosition = keyword.bestPosition;

  if (newPosition !== null) {
    if (bestPosition === null || newPosition < bestPosition) {
      bestPosition = newPosition;
    }
  }

  await db.insert(rankChecks).values({
    keywordId: keyword.id,
    position: newPosition,
    rankingUrl: result.rankingUrl,
    status: "success",
    errorMessage: null,
  });

  await db
    .update(keywords)
    .set({
      previousPosition,
      currentPosition: newPosition,
      bestPosition,
      currentRankingUrl: result.rankingUrl,
      lastCheckedAt: now,
      nextCheckAt: addFrequency(now, keyword.frequency as Frequency),
    })
    .where(eq(keywords.id, keyword.id));

  return { keywordId, success: true, position: newPosition, error: null };
}

export async function getDueKeywords(limit: number) {
  const now = new Date();
  const rows = await db
    .select({ keyword: keywords })
    .from(keywords)
    .innerJoin(projects, eq(keywords.projectId, projects.id))
    .where(
      and(
        eq(keywords.enabled, true),
        isNull(keywords.deletedAt),
        isNull(projects.archivedAt),
      ),
    );

  return rows
    .map((r) => r.keyword)
    .filter((k) => !k.nextCheckAt || k.nextCheckAt.getTime() <= now.getTime())
    .sort((a, b) => {
      const aTime = a.nextCheckAt?.getTime() ?? 0;
      const bTime = b.nextCheckAt?.getTime() ?? 0;
      return aTime - bTime;
    })
    .slice(0, limit);
}

export async function getRetryKeywords(limit: number) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const allKeywords = await db
    .select({ keyword: keywords })
    .from(keywords)
    .innerJoin(projects, eq(keywords.projectId, projects.id))
    .where(
      and(
        eq(keywords.enabled, true),
        isNull(keywords.deletedAt),
        isNull(projects.archivedAt),
      ),
    );

  const retryIds: string[] = [];

  for (const { keyword } of allKeywords) {
    if (retryIds.length >= limit) break;

    const recent = await db
      .select()
      .from(rankChecks)
      .where(
        and(
          eq(rankChecks.keywordId, keyword.id),
          gte(rankChecks.createdAt, since),
        ),
      )
      .orderBy(desc(rankChecks.createdAt));
    const hasRecentFailure = recent.some((c) => c.status === "failed");
    const hasRecentSuccess = recent.some((c) => c.status === "success");

    if (hasRecentFailure && !hasRecentSuccess) {
      retryIds.push(keyword.id);
    }
  }

  return retryIds;
}
