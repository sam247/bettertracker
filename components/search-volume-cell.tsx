import { formatSearchVolume } from "@/lib/format-search-volume";
import { getKeywordCompetition } from "@/lib/gads-metrics";
import type { Keyword } from "@/lib/db/schema";

export function SearchVolumeCell({ keyword }: { keyword: Keyword }) {
  const label = formatSearchVolume(keyword.searchVolume);
  const competition = getKeywordCompetition(keyword);
  const title = [
    keyword.searchVolume !== null && keyword.searchVolume !== undefined
      ? `${keyword.searchVolume.toLocaleString("en-GB")} avg monthly searches (cached)`
      : null,
    competition ? `Competition: ${competition}` : null,
    keyword.searchVolumeUpdatedAt
      ? `Updated ${new Date(keyword.searchVolumeUpdatedAt).toLocaleDateString("en-GB")}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <span className="tabular-nums text-xs text-muted" title={title || undefined}>
      {label}
    </span>
  );
}
