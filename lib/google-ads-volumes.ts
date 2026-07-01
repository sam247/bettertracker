import { DEFAULT_LANGUAGE, resolveGeoTarget } from "@/lib/geo-targets";
import { getGoogleAdsConfig, type GoogleAdsConfig } from "@/lib/google-ads-config";

const GOOGLE_ADS_API_VERSION = "v21";
const BATCH_SIZE = 100;

export type KeywordVolumeResult = {
  keyword: string;
  avgMonthlySearches: number | null;
  competition: string | null;
};

type HistoricalMetricsResponse = {
  results?: Array<{
    text?: string;
    keywordMetrics?: {
      avgMonthlySearches?: string | number;
      competition?: string;
    };
  }>;
};

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(config: GoogleAdsConfig): Promise<string> {
  const now = Date.now();
  if (cachedAccessToken && cachedAccessToken.expiresAt > now + 60_000) {
    return cachedAccessToken.token;
  }

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: config.refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google OAuth failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in?: number;
  };

  cachedAccessToken = {
    token: data.access_token,
    expiresAt: now + (data.expires_in ?? 3600) * 1000,
  };

  return data.access_token;
}

function parseAvgMonthlySearches(
  value: string | number | undefined,
): number | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function fetchHistoricalMetricsBatch(
  config: GoogleAdsConfig,
  keywords: string[],
  region: string,
): Promise<KeywordVolumeResult[]> {
  const accessToken = await getAccessToken(config);
  const url = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${config.customerId}:generateKeywordHistoricalMetrics`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "developer-token": config.developerToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      keywords,
      geoTargetConstants: [resolveGeoTarget(region)],
      language: DEFAULT_LANGUAGE,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Google Ads keyword metrics failed (${res.status}): ${text.slice(0, 300)}`,
    );
  }

  const data = (await res.json()) as HistoricalMetricsResponse;
  return (data.results ?? []).map((row) => ({
    keyword: row.text ?? "",
    avgMonthlySearches: parseAvgMonthlySearches(
      row.keywordMetrics?.avgMonthlySearches,
    ),
    competition: row.keywordMetrics?.competition ?? null,
  }));
}

export async function fetchKeywordVolumes(
  keywords: string[],
  region: string,
  projectCustomerId?: string | null,
): Promise<KeywordVolumeResult[]> {
  const config = getGoogleAdsConfig(projectCustomerId);
  if (!config) {
    throw new Error("Google Ads is not configured");
  }

  const uniqueKeywords = [
    ...new Set(keywords.map((k) => k.trim()).filter(Boolean)),
  ];
  const results: KeywordVolumeResult[] = [];

  for (let i = 0; i < uniqueKeywords.length; i += BATCH_SIZE) {
    const batch = uniqueKeywords.slice(i, i + BATCH_SIZE);
    const batchResults = await fetchHistoricalMetricsBatch(
      config,
      batch,
      region,
    );
    results.push(...batchResults);
  }

  return results;
}
