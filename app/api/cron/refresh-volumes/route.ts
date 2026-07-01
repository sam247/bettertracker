import { NextResponse } from "next/server";
import { GADS_METRICS_CRON_BATCH_SIZE } from "@/lib/gads-metrics";
import { isGadsMcpConfigured } from "@/lib/gads-metrics";
import {
  countKeywordsNeedingGadsRefresh,
  refreshStaleGadsMetrics,
} from "@/lib/refresh-gads-metrics";

export const maxDuration = 300;

export async function GET() {
  if (!isGadsMcpConfigured()) {
    return NextResponse.json({
      skipped: true,
      reason: "GADS_MCP_API_URL is not configured",
    });
  }

  const pendingBefore = await countKeywordsNeedingGadsRefresh();
  if (pendingBefore === 0) {
    return NextResponse.json({
      processed: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      remaining: 0,
      errors: [],
    });
  }

  const result = await refreshStaleGadsMetrics({
    limit: GADS_METRICS_CRON_BATCH_SIZE,
  });

  return NextResponse.json(result);
}
