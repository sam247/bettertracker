import type { GadsMetricsCache } from "@/lib/db/schema";

/** Days before cached Google Ads metrics are considered stale (default: 60). */
export const GADS_METRICS_STALE_DAYS = parseInt(
  process.env.GADS_METRICS_STALE_DAYS ?? "60",
  10,
);

/** Keywords per Google Ads historical metrics request. */
export const GADS_METRICS_BATCH_SIZE = 100;

/** Keywords processed per cron invocation. */
export const GADS_METRICS_CRON_BATCH_SIZE = parseInt(
  process.env.GADS_METRICS_CRON_BATCH_SIZE ?? "200",
  10,
);

/** Retries per batch before logging failure and continuing. */
export const GADS_METRICS_MAX_RETRIES = 3;

export function isGadsMetricsStale(
  searchVolumeUpdatedAt: Date | string | null | undefined,
  now = new Date(),
): boolean {
  if (!searchVolumeUpdatedAt) {
    return true;
  }
  const updatedAt =
    searchVolumeUpdatedAt instanceof Date
      ? searchVolumeUpdatedAt
      : new Date(searchVolumeUpdatedAt);
  if (Number.isNaN(updatedAt.getTime())) {
    return true;
  }
  const staleMs = GADS_METRICS_STALE_DAYS * 24 * 60 * 60 * 1000;
  return now.getTime() - updatedAt.getTime() >= staleMs;
}

export function getKeywordCompetition(
  keyword: {
    gadsMetrics?: GadsMetricsCache | null;
  },
): string | null {
  return keyword.gadsMetrics?.competition ?? null;
}

export type GadsMcpConfig = {
  apiUrl: string;
  apiSecret: string;
  defaultCustomerId: string;
};

export function getGadsMcpConfig(): GadsMcpConfig | null {
  const apiUrl = process.env.GADS_MCP_API_URL?.trim().replace(/\/$/, "");
  const apiSecret = process.env.GADS_MCP_API_SECRET?.trim();
  const defaultCustomerId = process.env.GADS_DEFAULT_CUSTOMER_ID?.trim();

  if (!apiUrl || !apiSecret || !defaultCustomerId) {
    return null;
  }

  return {
    apiUrl,
    apiSecret,
    defaultCustomerId: defaultCustomerId.replace(/-/g, ""),
  };
}

export function isGadsMcpConfigured(): boolean {
  return getGadsMcpConfig() !== null;
}

export function resolveGadsCustomerId(
  projectCustomerId?: string | null,
): string | null {
  const config = getGadsMcpConfig();
  if (!config) return null;
  const customerId =
    projectCustomerId?.trim() || config.defaultCustomerId;
  return customerId ? customerId.replace(/-/g, "") : null;
}
