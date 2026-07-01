import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { keywords, projects } from "@/lib/db/schema";
import { fetchKeywordVolumes } from "@/lib/google-ads-volumes";
import { normaliseKeyword } from "@/lib/normalise-keyword";

export type VolumeRefreshResult = {
  updated: number;
  skipped: number;
  errors: string[];
};

export async function refreshProjectKeywordVolumes(
  projectId: string,
): Promise<VolumeRefreshResult> {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) {
    throw new Error("Project not found");
  }

  const rows = await db
    .select()
    .from(keywords)
    .where(eq(keywords.projectId, projectId));

  const active = rows.filter((row) => !row.deletedAt);
  if (active.length === 0) {
    return { updated: 0, skipped: 0, errors: [] };
  }

  const volumeResults = await fetchKeywordVolumes(
    active.map((row) => row.keyword),
    project.region,
    project.gadsCustomerId,
  );

  const volumeByNormalised = new Map<
    string,
    { avgMonthlySearches: number | null; competition: string | null }
  >();

  for (const result of volumeResults) {
    volumeByNormalised.set(normaliseKeyword(result.keyword), {
      avgMonthlySearches: result.avgMonthlySearches,
      competition: result.competition,
    });
  }

  const now = new Date();
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of active) {
    const metrics = volumeByNormalised.get(row.keywordNormalised);
    if (!metrics) {
      skipped++;
      continue;
    }

    await db
      .update(keywords)
      .set({
        searchVolume: metrics.avgMonthlySearches,
        searchVolumeCompetition: metrics.competition,
        searchVolumeUpdatedAt: now,
      })
      .where(eq(keywords.id, row.id));

    updated++;
  }

  return { updated, skipped, errors };
}

export async function refreshKeywordVolumesByIds(
  projectId: string,
  keywordIds: string[],
): Promise<VolumeRefreshResult> {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) {
    throw new Error("Project not found");
  }

  if (keywordIds.length === 0) {
    return { updated: 0, skipped: 0, errors: [] };
  }

  const rows = await db
    .select()
    .from(keywords)
    .where(eq(keywords.projectId, projectId));

  const selected = rows.filter(
    (row) => !row.deletedAt && keywordIds.includes(row.id),
  );

  if (selected.length === 0) {
    return { updated: 0, skipped: 0, errors: [] };
  }

  const volumeResults = await fetchKeywordVolumes(
    selected.map((row) => row.keyword),
    project.region,
    project.gadsCustomerId,
  );

  const volumeByNormalised = new Map<
    string,
    { avgMonthlySearches: number | null; competition: string | null }
  >();

  for (const result of volumeResults) {
    volumeByNormalised.set(normaliseKeyword(result.keyword), {
      avgMonthlySearches: result.avgMonthlySearches,
      competition: result.competition,
    });
  }

  const now = new Date();
  let updated = 0;
  let skipped = 0;

  for (const row of selected) {
    const metrics = volumeByNormalised.get(row.keywordNormalised);
    if (!metrics) {
      skipped++;
      continue;
    }

    await db
      .update(keywords)
      .set({
        searchVolume: metrics.avgMonthlySearches,
        searchVolumeCompetition: metrics.competition,
        searchVolumeUpdatedAt: now,
      })
      .where(eq(keywords.id, row.id));

    updated++;
  }

  return { updated, skipped, errors: [] };
}
