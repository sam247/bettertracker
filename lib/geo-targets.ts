const REGION_GEO_TARGETS: Record<string, string> = {
  uk: "geoTargetConstants/2826",
  gb: "geoTargetConstants/2826",
  "google.co.uk": "geoTargetConstants/2826",
  "google.uk": "geoTargetConstants/2826",
  us: "geoTargetConstants/2840",
  "google.com": "geoTargetConstants/2840",
  au: "geoTargetConstants/2036",
  "google.com.au": "geoTargetConstants/2036",
  ca: "geoTargetConstants/2124",
  "google.ca": "geoTargetConstants/2124",
  ie: "geoTargetConstants/2372",
  "google.ie": "geoTargetConstants/2372",
  de: "geoTargetConstants/2276",
  "google.de": "geoTargetConstants/2276",
  fr: "geoTargetConstants/2250",
  "google.fr": "geoTargetConstants/2250",
  es: "geoTargetConstants/2724",
  "google.es": "geoTargetConstants/2724",
  it: "geoTargetConstants/2380",
  "google.it": "geoTargetConstants/2380",
  nl: "geoTargetConstants/2528",
  "google.nl": "geoTargetConstants/2528",
  nz: "geoTargetConstants/2554",
  "google.co.nz": "geoTargetConstants/2554",
};

const DEFAULT_GEO_TARGET = "geoTargetConstants/2826";
export const DEFAULT_LANGUAGE = "languageConstants/1000";

export function resolveGeoTarget(region: string): string {
  const key = region.trim().toLowerCase().replace(/^www\./, "");
  return REGION_GEO_TARGETS[key] ?? DEFAULT_GEO_TARGET;
}
