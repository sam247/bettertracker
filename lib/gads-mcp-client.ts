import type { GadsMetricsCache } from "@/lib/db/schema";
import { getGadsMcpConfig } from "@/lib/gads-metrics";

export type GadsKeywordMetricsResult = {
  keyword: string;
  searchVolume: number | null;
  metrics: GadsMetricsCache;
};

type McpMetricsPayload = {
  avg_monthly_searches?: number | string | null;
  competition?: string | null;
  competition_index?: number | null;
  low_top_of_page_bid_micros?: number | null;
  high_top_of_page_bid_micros?: number | null;
};

type McpKeywordResult = {
  keyword?: string;
  text?: string;
  metrics?: McpMetricsPayload | null;
  keyword_metrics?: McpMetricsPayload | null;
};

function parseSearchVolume(value: number | string | null | undefined): number | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapMetrics(payload: McpMetricsPayload | null | undefined): GadsMetricsCache {
  if (!payload) return {};
  return {
    competition: payload.competition ?? null,
    competitionIndex: payload.competition_index ?? null,
    lowTopOfPageBidMicros: payload.low_top_of_page_bid_micros ?? null,
    highTopOfPageBidMicros: payload.high_top_of_page_bid_micros ?? null,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchKeywordHistoricalMetricsFromMcp(input: {
  customerId: string;
  keywords: string[];
  region: string;
  attempt?: number;
}): Promise<GadsKeywordMetricsResult[]> {
  const config = getGadsMcpConfig();
  if (!config) {
    throw new Error("GADS_MCP_API_URL is not configured");
  }

  const attempt = input.attempt ?? 1;
  const url = `${config.apiUrl}/v1/keyword-historical-metrics`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customer_id: input.customerId.replace(/-/g, ""),
        keywords: input.keywords,
        region: input.region,
        country_code: "GB",
      }),
    });
  } catch (error) {
    if (attempt < 3) {
      await sleep(500 * attempt);
      return fetchKeywordHistoricalMetricsFromMcp({ ...input, attempt: attempt + 1 });
    }
    throw error;
  }

  if (!response.ok) {
    const text = await response.text();
    if (attempt < 3 && response.status >= 500) {
      await sleep(500 * attempt);
      return fetchKeywordHistoricalMetricsFromMcp({ ...input, attempt: attempt + 1 });
    }
    throw new Error(
      `GADS MCP API failed (${response.status}): ${text.slice(0, 300)}`,
    );
  }

  const data = (await response.json()) as { results?: McpKeywordResult[] };
  return (data.results ?? []).map((row) => {
    const metricsPayload = row.metrics ?? row.keyword_metrics ?? null;
    const keyword = row.keyword ?? row.text ?? "";
    return {
      keyword,
      searchVolume: parseSearchVolume(metricsPayload?.avg_monthly_searches),
      metrics: mapMetrics(metricsPayload),
    };
  });
}
