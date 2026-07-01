import { formatSearchVolume } from "@/lib/format-search-volume";
import type { Keyword } from "@/lib/db/schema";

export function SearchVolumeCell({ keyword }: { keyword: Keyword }) {
  const label = formatSearchVolume(keyword.searchVolume);
  const title = [
    keyword.searchVolume !== null && keyword.searchVolume !== undefined
      ? `${keyword.searchVolume.toLocaleString("en-GB")} avg monthly searches (Google Ads API estimate)`
      : null,
    keyword.searchVolumeCompetition
      ? `Competition: ${keyword.searchVolumeCompetition}`
      : null,
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
