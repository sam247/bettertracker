import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeTargetDomain } from "@/lib/normalise-target-domain";
import { groups, keywords, projects } from "@/lib/db/schema";

const DEFAULT_GROUPS = ["Core", "Locations", "Blog"];

export async function GET(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const showArchived = searchParams.get("archived") === "true";

  const rows = await db
    .select({
      project: projects,
      keywordCount: sql<number>`count(${keywords.id})::int`,
    })
    .from(projects)
    .leftJoin(
      keywords,
      and(eq(keywords.projectId, projects.id), isNull(keywords.deletedAt)),
    )
    .where(
      showArchived
        ? sql`${projects.archivedAt} IS NOT NULL`
        : isNull(projects.archivedAt),
    )
    .groupBy(projects.id)
    .orderBy(desc(projects.createdAt));

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const name = String(body.name ?? "").trim();
  const targetDomain = normalizeTargetDomain(String(body.targetDomain ?? ""));
  const region = String(body.region ?? "www.google.co.uk").trim();
  const device = String(body.device ?? "desktop").trim();

  if (!name || !targetDomain) {
    return NextResponse.json(
      { error: "Name and target domain are required" },
      { status: 400 },
    );
  }

  const [project] = await db
    .insert(projects)
    .values({ name, targetDomain, region, device })
    .returning();

  const groupRows = await db
    .insert(groups)
    .values(
      DEFAULT_GROUPS.map((groupName, index) => ({
        projectId: project.id,
        name: groupName,
        sortOrder: index,
      })),
    )
    .returning();

  return NextResponse.json({ project, groups: groupRows }, { status: 201 });
}
