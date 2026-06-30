import { db } from "@/lib/db";
import { apiLogs } from "@/lib/db/schema";
import {
  normalizeTargetDomain,
  resolveRankingUrl,
} from "@/lib/normalise-target-domain";

const BASE_URL = "https://api.serprobot.com/v1/api.php";

const POSITION_KEYS = [
  "position",
  "rank",
  "ranking",
  "pos",
  "latest",
  "latest_position",
  "found_position",
  "check_position",
  "current_position",
];

const URL_KEYS = [
  "found_serp",
  "ranking_url",
  "found_url",
  "url",
  "url_found",
  "target_found",
  "page_url",
  "found",
  "link",
  "result_url",
];

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
  responseSnippet: string | null,
) {
  await db.insert(apiLogs).values({
    action,
    keywordId,
    creditsCost,
    httpStatus,
    error,
    responseSnippet,
  });
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function parsePositionValue(value: unknown): number | null {
  if (typeof value === "number" && value > 0) return value;
  if (typeof value === "string") {
    const lower = value.toLowerCase();
    if (
      lower === "not found" ||
      lower === "n/a" ||
      lower === "-" ||
      lower === ""
    ) {
      return null;
    }
    const parsed = parseInt(value, 10);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function extractPositionForTarget(
  data: unknown,
  targetDomain: string,
): number | null {
  const direct = extractPosition(data);
  if (direct !== null) return direct;

  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;

  for (const [key, value] of Object.entries(record)) {
    const keyLower = key.toLowerCase();
    if (
      keyLower === targetDomain ||
      keyLower.includes(targetDomain) ||
      targetDomain.includes(keyLower)
    ) {
      const pos = parsePositionValue(value);
      if (pos !== null) return pos;
      const nested = extractPosition(value);
      if (nested !== null) return nested;
    }
  }

  return null;
}

function extractPosition(data: unknown, depth = 0): number | null {
  if (depth > 6 || data === null || data === undefined) return null;

  if (Array.isArray(data)) {
    for (const item of data) {
      const found = extractPosition(item, depth + 1);
      if (found !== null) return found;
    }
    return null;
  }

  if (typeof data !== "object") return null;

  const record = data as Record<string, unknown>;

  for (const key of POSITION_KEYS) {
    const found = parsePositionValue(record[key]);
    if (found !== null) return found;
  }

  for (const value of Object.values(record)) {
    if (typeof value === "object") {
      const found = extractPosition(value, depth + 1);
      if (found !== null) return found;
    }
  }

  return null;
}

function extractRankingUrl(
  data: unknown,
  targetDomain: string,
  depth = 0,
): string | null {
  if (depth > 6 || data === null || data === undefined) return null;

  if (Array.isArray(data)) {
    for (const item of data) {
      const found = extractRankingUrl(item, targetDomain, depth + 1);
      if (found) return found;
    }
    return null;
  }

  if (typeof data !== "object") return null;

  const record = data as Record<string, unknown>;

  for (const key of URL_KEYS) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return resolveRankingUrl(value, targetDomain);
    }
  }

  for (const value of Object.values(record)) {
    if (typeof value === "object") {
      const found = extractRankingUrl(value, targetDomain, depth + 1);
      if (found) return found;
    }
  }

  return null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPendingResponse(data: Record<string, unknown>): boolean {
  const status = String(data.status ?? data.state ?? "").toLowerCase();
  if (
    ["pending", "checking", "processing", "queued", "running", "waiting"].includes(
      status,
    )
  ) {
    return true;
  }
  if (data.checking === true || data.pending === true) {
    return true;
  }
  const message = String(data.message ?? "").toLowerCase();
  return message.includes("wait") || message.includes("checking");
}

function isTerminalNotFound(data: Record<string, unknown>): boolean {
  if (data.found === false || data.is_found === false) return true;
  const position = data.position ?? data.rank;
  if (position === 0 || position === "0") return true;
  const lower = String(position ?? "").toLowerCase();
  return lower === "not found" || lower === "n/a";
}

function findResultsArray(data: Record<string, unknown>): Record<string, unknown>[] {
  const candidates = [
    data.results,
    data.serps,
    data.organic,
    data.data,
    data.items,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as Record<string, unknown>[];
    }
    if (candidate && typeof candidate === "object") {
      const nested = candidate as Record<string, unknown>;
      for (const value of Object.values(nested)) {
        if (Array.isArray(value)) {
          return value as Record<string, unknown>[];
        }
      }
    }
  }

  return [];
}

async function findPositionViaSerps(
  region: string,
  keyword: string,
  targetDomain: string,
  device: string,
  keywordId: string,
): Promise<{ position: number | null; rankingUrl: string | null }> {
  const { data, error } = await request(
    {
      action: "get_serps",
      region,
      keyword,
      device,
    },
    1,
    keywordId,
    targetDomain,
  );

  if (error || !data) {
    return { position: null, rankingUrl: null };
  }

  const results = findResultsArray(data);
  for (let index = 0; index < results.length; index++) {
    const item = results[index];
    const url = String(item.url ?? item.link ?? item.href ?? "");
    if (!url.toLowerCase().includes(targetDomain)) continue;

    const position = parsePositionValue(
      item.position ?? item.rank ?? item.pos ?? index + 1,
    );
    return {
      position,
      rankingUrl: url ? resolveRankingUrl(url, targetDomain) : null,
    };
  }

  return { position: null, rankingUrl: null };
}

function extractRankingUrlFromSerps(
  serps: unknown,
  targetDomain: string,
  position: number | null,
): string | null {
  if (!Array.isArray(serps)) return null;

  if (position !== null && position > 0 && position <= serps.length) {
    const atPosition = String(serps[position - 1] ?? "");
    if (atPosition.toLowerCase().includes(targetDomain)) {
      return resolveRankingUrl(atPosition, targetDomain);
    }
  }

  for (const entry of serps) {
    const url = String(entry ?? "");
    if (url.toLowerCase().includes(targetDomain)) {
      return resolveRankingUrl(url, targetDomain);
    }
  }

  return null;
}

function parseRankCheckData(
  data: Record<string, unknown>,
  targetDomain: string,
): { position: number | null; rankingUrl: string | null; pending: boolean } {
  const position = extractPositionForTarget(data, targetDomain);
  const rankingUrl =
    extractRankingUrl(data, targetDomain) ??
    extractRankingUrlFromSerps(data.serps, targetDomain, position);

  if (position !== null || isTerminalNotFound(data)) {
    return { position, rankingUrl, pending: false };
  }

  if (isPendingResponse(data)) {
    return { position: null, rankingUrl, pending: true };
  }

  return { position: null, rankingUrl, pending: false };
}

async function request(
  params: Record<string, string>,
  creditsCost: number,
  keywordId: string | null = null,
  targetDomain = "",
): Promise<{
  data: Record<string, unknown> | null;
  httpStatus: number;
  error: string | null;
  rawText: string;
}> {
  const url = new URL(BASE_URL);
  url.searchParams.set("api_key", process.env.SERPROBOT_API_KEY!);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  let httpStatus = 0;
  let error: string | null = null;
  let data: Record<string, unknown> | null = null;
  let rawText = "";

  try {
    const response = await fetch(url.toString(), { cache: "no-store" });
    httpStatus = response.status;
    rawText = await response.text();
    const parsed = parseJson(rawText);

    if (!response.ok) {
      error = `HTTP ${response.status}`;
    } else if (!parsed || typeof parsed !== "object") {
      error = "Invalid JSON response";
    } else {
      data = parsed as Record<string, unknown>;
      if (data.error) {
        error = String(data.error);
      } else if (data.status === "error") {
        error = String(data.message ?? data.error ?? "API error");
      }
    }
  } catch (err) {
    error = err instanceof Error ? err.message : "Request failed";
  }

  const snippet = rawText ? rawText.slice(0, 2000) : null;
  await logApiCall(
    params.action,
    creditsCost,
    keywordId,
    httpStatus || null,
    error,
    snippet,
  );

  return { data, httpStatus, error, rawText };
}

export async function rankCheck(
  region: string,
  keyword: string,
  targetUrl: string,
  device: string,
  keywordId: string,
): Promise<RankCheckResult> {
  const targetDomain = normalizeTargetDomain(targetUrl);
  const params = {
    action: "rank_check",
    region,
    keyword,
    target_url: targetDomain,
    device,
  };

  const maxAttempts = 24;
  const waitMs = 5000;
  let checkId: string | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const requestParams: Record<string, string> = { ...params };
    if (checkId) requestParams.check_id = checkId;

    const { data, httpStatus, error } = await request(
      requestParams,
      attempt === 0 ? 1 : 0,
      keywordId,
      targetDomain,
    );

    if (error || !data) {
      return {
        success: false,
        position: null,
        rankingUrl: null,
        error,
        httpStatus,
      };
    }

    if (data.check_id) checkId = String(data.check_id);

    const parsed = parseRankCheckData(data, targetDomain);

    if (!parsed.pending) {
      if (parsed.position !== null) {
        return {
          success: true,
          position: parsed.position,
          rankingUrl: parsed.rankingUrl,
          error: null,
          httpStatus,
        };
      }
      break;
    }

    if (attempt < maxAttempts - 1) {
      await sleep(waitMs);
    }
  }

  const fallback = await findPositionViaSerps(
    region,
    keyword,
    targetDomain,
    device,
    keywordId,
  );

  return {
    success: true,
    position: fallback.position,
    rankingUrl: fallback.rankingUrl,
    error: null,
    httpStatus: 200,
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
