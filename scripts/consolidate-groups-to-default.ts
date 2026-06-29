import { and, asc, eq, isNull, ne } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { getDatabaseUrl } from "../lib/db/url";
import { groups, keywords, projects } from "../lib/db/schema";

const LEGACY_GROUP_NAMES = new Set(["Core", "Locations", "Blog"]);

async function main() {
  const db = drizzle(neon(getDatabaseUrl()));

  const allProjects = await db.select().from(projects);
  let projectsUpdated = 0;
  let keywordsMoved = 0;
  let groupsDeleted = 0;

  for (const project of allProjects) {
    const projectGroups = await db
      .select()
      .from(groups)
      .where(eq(groups.projectId, project.id))
      .orderBy(asc(groups.sortOrder));

    if (projectGroups.length === 0) {
      await db.insert(groups).values({
        projectId: project.id,
        name: "Default",
        sortOrder: 0,
      });
      console.log(`[${project.name}] created Default group`);
      projectsUpdated++;
      continue;
    }

    let defaultGroup =
      projectGroups.find((group) => group.name === "Default") ?? null;

    if (!defaultGroup) {
      const [created] = await db
        .insert(groups)
        .values({
          projectId: project.id,
          name: "Default",
          sortOrder: 0,
        })
        .returning();
      defaultGroup = created;
      console.log(`[${project.name}] created Default group`);
    }

    const moved = await db
      .update(keywords)
      .set({ groupId: defaultGroup.id })
      .where(
        and(
          eq(keywords.projectId, project.id),
          isNull(keywords.deletedAt),
          ne(keywords.groupId, defaultGroup.id),
        ),
      )
      .returning({ id: keywords.id });

    keywordsMoved += moved.length;

    const groupsToDelete = projectGroups.filter(
      (group) => group.id !== defaultGroup!.id,
    );

    for (const group of groupsToDelete) {
      await db.delete(groups).where(eq(groups.id, group.id));
      groupsDeleted++;
      const legacy = LEGACY_GROUP_NAMES.has(group.name) ? " (legacy)" : "";
      console.log(`[${project.name}] deleted group "${group.name}"${legacy}`);
    }

    if (moved.length > 0 || groupsToDelete.length > 0) {
      projectsUpdated++;
      console.log(
        `[${project.name}] moved ${moved.length} keyword(s) to Default`,
      );
    }
  }

  console.log("");
  console.log(
    `Done. ${projectsUpdated} project(s) updated, ${keywordsMoved} keyword(s) moved, ${groupsDeleted} group(s) deleted.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
