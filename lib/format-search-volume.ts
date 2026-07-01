export function formatSearchVolume(volume: number | null | undefined): string {
  if (volume === null || volume === undefined) return "—";
  if (volume >= 1_000_000) {
    const millions = volume / 1_000_000;
    return `${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}M`;
  }
  if (volume >= 10_000) {
    const thousands = volume / 1_000;
    return `${thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1)}K`;
  }
  return volume.toLocaleString("en-GB");
}
