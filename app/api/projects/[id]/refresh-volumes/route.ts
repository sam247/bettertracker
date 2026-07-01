import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { isGoogleAdsConfigured } from "@/lib/google-ads-config";
import { refreshProjectKeywordVolumes } from "@/lib/refresh-keyword-volumes";
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

  if (!isGoogleAdsConfigured(project.gadsCustomerId)) {
    return NextResponse.json(
      {
        error:
          "Google Ads is not configured. Set GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_REFRESH_TOKEN, and GOOGLE_ADS_CUSTOMER_ID.",
      },
      { status: 503 },
    );
  }

  try {
    const result = await refreshProjectKeywordVolumes(projectId);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Refresh failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
