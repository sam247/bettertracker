import { getMovement } from "@/lib/keyword-stats";
import type { Keyword } from "@/lib/db/schema";

export interface ProjectKeywordStats {
  avgPosition: number | null;
  netMovement: number;
  improved: number;
  dropped: number;
}

export function computeProjectKeywordStats(
  keywords: Keyword[],
): ProjectKeywordStats {
  const ranked = keywords.filter(
    (k) => k.enabled && k.currentPosition !== null,
  );

  const avgPosition =
    ranked.length > 0
      ? ranked.reduce((sum, k) => sum + k.currentPosition!, 0) / ranked.length
      : null;

  let improved = 0;
  let dropped = 0;

  for (const keyword of keywords) {
    if (!keyword.enabled) continue;
    const movement = getMovement(keyword);
    if (movement === null) continue;
    if (movement > 0) improved++;
    else if (movement < 0) dropped++;
  }

  return {
    avgPosition,
    netMovement: improved - dropped,
    improved,
    dropped,
  };
}
