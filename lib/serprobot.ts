import { db } from "@/lib/db";
import { apiLogs } from "@/lib/db/schema";

const BASE_URL = "https://api.serprobot.com/v1/api.php";

export interface RankCheckResult {
  success: boolean;
  position: number | null;
  rankingUrl: string | null;
  error: string | null;
  httpStatus: number;
}

export interface CreditResult {
  success: boolean;
  credits: number | null;
  error: string | null;
}

async function logApiCall(
  action: string,
  creditsCost: number,
  keywordId: string | null,
  httpStatus: number | null,
  error: string | null,
) {
  await db.insert(apiLogs).values({
    action,
    keywordId,
    creditsCost,
    httpStatus,
    error,
  });
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractPosition(data: Record<string, unknown>): number | null {
  const candidates = [data.position, data.rank, data.ranking];
  for (const value of candidates) {
    if (typeof value === "number" && value > 0) return value;
    if (typeof value === "string" && value !== "" && value !== "0") {
      const parsed = parseInt(value, 10);
      if (!Number.isNaN(parsed) && parsed > 0) return parsed;
    }
  }
  return null;
}

function extractRankingUrl(data: Record<string, unknown>): string | null {
  const candidates = [
    data.ranking_url,
    data.found_url,
    data.url,
    data.target_found,
    data.page_url,
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.startsWith("http")) return value;
  }
  return null;
}

async function request(
  params: Record<string, string>,
  creditsCost: number,
  keywordId: string | null = null,
): Promise<{ data: Record<string, unknown> | null; httpStatus: number; error: string | null }> {
  const url = new URL(BASE_URL);
  url.searchParams.set("api_key", process.env.SERPROBOT_API_KEY!);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  let httpStatus = 0;
  let error: string | null = null;
  let data: Record<string, unknown> | null = null;

  try {
    const response = await fetch(url.toString(), { cache: "no-store" });
    httpStatus = response.status;
    const text = await response.text();
    const parsed = parseJson(text);

    if (!response.ok) {
      error = `HTTP ${response.status}`;
    } else if (!parsed || typeof parsed !== "object") {
      error = "Invalid JSON response";
    } else {
      data = parsed as Record<string, unknown>;
      if (data.error || data.status === "error") {
        error = String(data.error ?? data.message ?? "API error");
      }
    }
  } catch (err) {
    error = err instanceof Error ? err.message : "Request failed";
  }

  await logApiCall(params.action, creditsCost, keywordId, httpStatus || null, error);
  return { data, httpStatus, error };
}

export async function rankCheck(
  region: string,
  keyword: string,
  targetUrl: string,
  device: string,
  keywordId: string,
): Promise<RankCheckResult> {
  const { data, httpStatus, error } = await request(
    {
      action: "rank_check",
      region,
      keyword,
      target_url: targetUrl,
      device,
    },
    1,
    keywordId,
  );

  if (error || !data) {
    return { success: false, position: null, rankingUrl: null, error, httpStatus };
  }

  return {
    success: true,
    position: extractPosition(data),
    rankingUrl: extractRankingUrl(data),
    error: null,
    httpStatus,
  };
}

export async function getCredits(): Promise<CreditResult> {
  const { data, error } = await request({ action: "credit" }, 0);

  if (error || !data) {
    return { success: false, credits: null, error };
  }

  const credits =
    typeof data.credits === "number"
      ? data.credits
      : typeof data.credit === "number"
        ? data.credit
        : typeof data.remaining === "number"
          ? data.remaining
          : null;

  return { success: true, credits, error: null };
}
