import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { fetchKeywordHistoricalMetricsFromMcp } from "@/lib/gads-mcp-client";
import { isGadsMcpConfigured, resolveGadsCustomerId } from "@/lib/gads-metrics";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isGadsMcpConfigured()) {
    return NextResponse.json(
      { error: "Google Ads API is not configured." },
      { status: 503 },
    );
  }

  const { id: projectId } = await context.params;

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const rawKeywords: unknown = body?.keywords;

  if (
    !Array.isArray(rawKeywords) ||
    rawKeywords.length === 0 ||
    rawKeywords.some((k) => typeof k !== "string")
  ) {
    return NextResponse.json(
      { error: "Provide a non-empty array of keyword strings." },
      { status: 400 },
    );
  }

  const keywords = (rawKeywords as string[])
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, 100);

  const customerId = resolveGadsCustomerId(project.gadsCustomerId);
  if (!customerId) {
    return NextResponse.json(
      { error: "No Google Ads customer ID configured for this project." },
      { status: 503 },
    );
  }

  try {
    const results = await fetchKeywordHistoricalMetricsFromMcp({
      customerId,
      keywords,
      region: project.region,
    });

    return NextResponse.json({
      results: results.map((r) => ({
        keyword: r.keyword,
        volume: r.searchVolume,
        competition: r.metrics?.competition ?? null,
        competitionIndex: r.metrics?.competitionIndex ?? null,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lookup failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
