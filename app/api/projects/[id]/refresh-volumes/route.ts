import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { isGadsMcpConfigured } from "@/lib/gads-metrics";
import { refreshProjectGadsMetricsIfStale } from "@/lib/refresh-gads-metrics";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  if (!isGadsMcpConfigured()) {
    return NextResponse.json(
      {
        error:
          "Google Ads MCP API is not configured. Set GADS_MCP_API_URL, GADS_MCP_API_SECRET, and GADS_DEFAULT_CUSTOMER_ID.",
      },
      { status: 503 },
    );
  }

  try {
    const result = await refreshProjectGadsMetricsIfStale(projectId);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Refresh failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
