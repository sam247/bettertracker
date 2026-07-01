import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { isGoogleAdsConfigured } from "@/lib/google-ads-config";
import { refreshProjectKeywordVolumes } from "@/lib/refresh-keyword-volumes";

async function main() {
  const projectId = process.argv[2];

  if (!isGoogleAdsConfigured()) {
    console.error(
      "Google Ads is not configured. Set GOOGLE_ADS_* env vars first.",
    );
    process.exit(1);
  }

  const projectRows = projectId
    ? await db.select().from(projects).where(eq(projects.id, projectId))
    : await db.select().from(projects).where(isNull(projects.archivedAt));

  if (projectRows.length === 0) {
    console.error("No projects found.");
    process.exit(1);
  }

  for (const project of projectRows) {
    console.log(`Refreshing volumes: ${project.name} (${project.id})`);
    const result = await refreshProjectKeywordVolumes(project.id);
    console.log(
      `  updated=${result.updated} skipped=${result.skipped} errors=${result.errors.length}`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
