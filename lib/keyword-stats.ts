import { isDue } from "@/lib/dates";
import type { Keyword } from "@/lib/db/schema";

export function getMovement(keyword: Keyword): number | null {
  if (keyword.currentPosition === null || keyword.previousPosition === null) {
    return null;
  }
  return keyword.previousPosition - keyword.currentPosition;
}

export interface BaselineMovementStats {
  improved: number;
  dropped: number;
  unchanged: number;
  noData: number;
}

export function getBaselineMovement(
  keyword: Keyword,
  baseline: number | null | undefined,
): number | null {
  if (
    baseline === null ||
    baseline === undefined ||
    keyword.currentPosition === null
  ) {
    return null;
  }
  return baseline - keyword.currentPosition;
}

export function computeBaselineMovementStats(
  keywords: Keyword[],
  baselines: Record<string, number | null>,
): BaselineMovementStats {
  let improved = 0;
  let dropped = 0;
  let unchanged = 0;
  let noData = 0;

  for (const keyword of keywords) {
    if (!keyword.enabled) continue;

    const movement = getBaselineMovement(keyword, baselines[keyword.id]);
    if (movement === null) {
      noData++;
      continue;
    }
    if (movement > 0) improved++;
    else if (movement < 0) dropped++;
    else unchanged++;
  }

  return { improved, dropped, unchanged, noData };
}

export interface KeywordStats {
  keywords: number;
  improved: number;
  dropped: number;
  dueToday: number;
  newOne: number;
}

export function computeKeywordStats(keywords: Keyword[]): KeywordStats {
  let improved = 0;
  let dropped = 0;
  let dueToday = 0;
  let newOne = 0;

  for (const keyword of keywords) {
    if (!keyword.enabled) continue;

    const movement = getMovement(keyword);
    if (movement !== null && movement > 0) improved++;
    if (movement !== null && movement < 0) dropped++;

    if (isDue(keyword.nextCheckAt)) dueToday++;

    if (
      keyword.currentPosition === 1 &&
      keyword.previousPosition !== null &&
      keyword.previousPosition > 1
    ) {
      newOne++;
    }
  }

  return {
    keywords: keywords.length,
    improved,
    dropped,
    dueToday,
    newOne,
  };
}
