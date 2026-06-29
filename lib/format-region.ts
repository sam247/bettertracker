export function formatRegionDisplay(region: string): string {
  return region.trim().replace(/^www\./i, "");
}

export function normalizeRegionInput(region: string): string {
  return region
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "");
}

export function toSerprobotRegion(region: string): string {
  const normalized = normalizeRegionInput(region);
  if (!normalized) return "google.co.uk";
  if (normalized.startsWith("www.")) return normalized;
  return `www.${normalized}`;
}
