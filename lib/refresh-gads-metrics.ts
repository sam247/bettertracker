import { and, asc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiLogs, keywords, projects, type Keyword } from "@/lib/db/schema";
import { fetchKeywordHistoricalMetricsFromMcp } from "@/lib/gads-mcp-client";
import {
  GADS_METRICS_BATCH_SIZE,
  GADS_METRICS_STALE_DAYS,
  isGadsMetricsStale,
  resolveGadsCustomerId,
} from "@/lib/gads-metrics";
import { normaliseKeyword } from "@/lib/normalise-keyword";

export type GadsMetricsRefreshResult = {
  processed: number;
  updated: number;
  skipped: number;
  failed: number;
  remaining: number;
  errors: string[];
};

type KeywordWithProject = {
  keyword: Keyword;
  project: typeof projects.$inferSelect;
};

async function logGadsRefreshFailure(
  keywordId: string,
  error: string,
  httpStatus: number | null = null,
) {
  await db.insert(apiLogs).values({
    action: "gads_metrics_refresh",
    keywordId,
    creditsCost: 0,
    httpStatus,
    error,
    responseSnippet: error.slice(0, 500),
  });
}

export async function countKeywordsNeedingGadsRefresh(
  projectId?: string,
): Promise<number> {
  const staleBefore = new Date(
    Date.now() - GADS_METRICS_STALE_DAYS * 24 * 60 * 60 * 1000,
  );

  const conditions = [
    isNull(keywords.deletedAt),
    isNull(projects.archivedAt),
    or(
      isNull(keywords.searchVolumeUpdatedAt),
      sql`${keywords.searchVolumeUpdatedAt} < ${staleBefore}`,
    ),
  ];

  if (projectId) {
    conditions.push(eq(keywords.projectId, projectId));
  }

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(keywords)
    .innerJoin(projects, eq(keywords.projectId, projects.id))
    .where(and(...conditions));

  return row?.count ?? 0;
}

export async function getKeywordsNeedingGadsRefresh(
  limit: number,
  projectId?: string,
): Promise<KeywordWithProject[]> {
  const staleBefore = new Date(
    Date.now() - GADS_METRICS_STALE_DAYS * 24 * 60 * 60 * 1000,
  );

  const conditions = [
    isNull(keywords.deletedAt),
    isNull(projects.archivedAt),
    or(
      isNull(keywords.searchVolumeUpdatedAt),
      sql`${keywords.searchVolumeUpdatedAt} < ${staleBefore}`,
    ),
  ];

  if (projectId) {
    conditions.push(eq(keywords.projectId, projectId));
  }

  return db
    .select({
      keyword: keywords,
      project: projects,
    })
    .from(keywords)
    .innerJoin(projects, eq(keywords.projectId, projects.id))
    .where(and(...conditions))
    .orderBy(
      sql`${keywords.searchVolumeUpdatedAt} asc nulls first`,
      asc(keywords.createdAt),
    )
    .limit(limit);
}

async function refreshKeywordBatch(
  rows: KeywordWithProject[],
): Promise<{ updated: number; skipped: number; failed: number; errors: string[] }> {
  if (rows.length === 0) {
    return { updated: 0, skipped: 0, failed: 0, errors: [] };
  }

  const project = rows[0].project;
  const customerId = resolveGadsCustomerId(project.gadsCustomerId);
  if (!customerId) {
    return {
      updated: 0,
      skipped: rows.length,
      failed: 0,
      errors: ["GADS MCP is not configured"],
    };
  }

  const keywordTexts = rows.map((row) => row.keyword.keyword);
  let results;
  let lastError: string | null = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      results = await fetchKeywordHistoricalMetricsFromMcp({
        customerId,
        keywords: keywordTexts,
        region: project.region,
      });
      lastError = null;
      break;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Lookup failed";
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
    }
  }

  if (!results) {
    for (const row of rows) {
      await logGadsRefreshFailure(row.keyword.id, lastError ?? "Lookup failed");
    }
    return {
      updated: 0,
      skipped: 0,
      failed: rows.length,
      errors: [lastError ?? "Lookup failed"],
    };
  }

  const metricsByNormalised = new Map(
    results.map((result) => [
      normaliseKeyword(result.keyword),
      result,
    ]),
  );

  const now = new Date();
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const metrics = metricsByNormalised.get(row.keyword.keywordNormalised);
    if (!metrics) {
      await db
        .update(keywords)
        .set({ searchVolumeUpdatedAt: now })
        .where(eq(keywords.id, row.keyword.id));
      skipped++;
      await logGadsRefreshFailure(
        row.keyword.id,
        `No metrics returned for "${row.keyword.keyword}"`,
      );
      continue;
    }

    try {
      await db
        .update(keywords)
        .set({
          searchVolume: metrics.searchVolume,
          gadsMetrics: metrics.metrics,
          searchVolumeUpdatedAt: now,
        })
        .where(eq(keywords.id, row.keyword.id));
      updated++;
    } catch (error) {
      failed++;
      const message =
        error instanceof Error ? error.message : "Database update failed";
      errors.push(message);
      await logGadsRefreshFailure(row.keyword.id, message);
    }
  }

  return { updated, skipped, failed, errors };
}

export async function refreshStaleGadsMetrics(options?: {
  limit?: number;
  projectId?: string;
}): Promise<GadsMetricsRefreshResult> {
  const limit = options?.limit ?? GADS_METRICS_BATCH_SIZE;
  const rows = await getKeywordsNeedingGadsRefresh(limit, options?.projectId);

  if (rows.length === 0) {
    return {
      processed: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      remaining: await countKeywordsNeedingGadsRefresh(options?.projectId),
      errors: [],
    };
  }

  const byProject = new Map<string, KeywordWithProject[]>();
  for (const row of rows) {
    const list = byProject.get(row.project.id) ?? [];
    list.push(row);
    byProject.set(row.project.id, list);
  }

  let updated = 0;
  let skipped = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const projectRows of byProject.values()) {
    for (let i = 0; i < projectRows.length; i += GADS_METRICS_BATCH_SIZE) {
      const batch = projectRows.slice(i, i + GADS_METRICS_BATCH_SIZE);
      const result = await refreshKeywordBatch(batch);
      updated += result.updated;
      skipped += result.skipped;
      failed += result.failed;
      errors.push(...result.errors);
    }
  }

  return {
    processed: rows.length,
    updated,
    skipped,
    failed,
    remaining: await countKeywordsNeedingGadsRefresh(options?.projectId),
    errors,
  };
}

export async function refreshProjectGadsMetricsIfStale(
  projectId: string,
): Promise<GadsMetricsRefreshResult> {
  const staleCount = await countKeywordsNeedingGadsRefresh(projectId);
  if (staleCount === 0) {
    return {
      processed: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      remaining: 0,
      errors: [],
    };
  }

  return refreshStaleGadsMetrics({
    projectId,
    limit: staleCount,
  });
}

export function keywordNeedsGadsRefresh(keyword: Keyword, now = new Date()): boolean {
  return isGadsMetricsStale(keyword.searchVolumeUpdatedAt, now);
}

export async function getProjectKeywordsNeedingRefresh(
  projectId: string,
  keywordIds: string[],
): Promise<Keyword[]> {
  if (keywordIds.length === 0) return [];

  const rows = await db
    .select()
    .from(keywords)
    .where(
      and(
        eq(keywords.projectId, projectId),
        isNull(keywords.deletedAt),
        inArray(keywords.id, keywordIds),
      ),
    );

  return rows.filter((row) => keywordNeedsGadsRefresh(row));
}
