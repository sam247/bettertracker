import type {
  CommandContext,
  CommandDefinition,
  CommandProvider,
  KeywordSearchItem,
  PaletteItem,
  ProjectSearchItem,
} from "@/lib/commands/types";

const providers: CommandProvider[] = [];

export function registerCommandProvider(provider: CommandProvider) {
  providers.push(provider);
}

export function getRegisteredCommands(ctx: CommandContext): CommandDefinition[] {
  return providers.flatMap((provider) => provider(ctx));
}

function matchScore(query: string, ...parts: string[]): number {
  const q = query.trim().toLowerCase();
  if (!q) return 1;

  let best = 0;
  for (const part of parts) {
    const text = part.toLowerCase();
    if (text === q) best = Math.max(best, 100);
    else if (text.startsWith(q)) best = Math.max(best, 80);
    else if (text.includes(q)) best = Math.max(best, 50);
    else if (q.split(/\s+/).every((word) => text.includes(word))) {
      best = Math.max(best, 40);
    }
  }
  return best;
}

function commandToItem(
  command: CommandDefinition,
  score: number,
): PaletteItem {
  return {
    id: command.id,
    label: command.label,
    group: command.group,
    hint: command.hint,
    score,
    run: command.run,
  };
}

export function filterPaletteItems(
  query: string,
  ctx: CommandContext,
  projects: ProjectSearchItem[],
  keywords: KeywordSearchItem[],
): PaletteItem[] {
  const items: PaletteItem[] = [];

  for (const command of getRegisteredCommands(ctx)) {
    if (command.visible && !command.visible(ctx)) continue;

    const score = matchScore(
      query,
      command.label,
      ...(command.keywords ?? []),
    );
    if (score > 0) {
      items.push(commandToItem(command, score));
    }
  }

  for (const project of projects) {
    const score = matchScore(query, project.name, project.domain);
    if (score > 0) {
      items.push({
        id: `project:${project.id}`,
        label: project.name,
        subtitle: project.domain,
        group: "Projects",
        score,
        run: (c) => c.router.push(`/projects/${project.id}`),
      });
    }
  }

  for (const keyword of keywords) {
    const score = matchScore(
      query,
      keyword.keyword,
      keyword.projectName,
    );
    if (score > 0) {
      items.push({
        id: `keyword:${keyword.id}`,
        label: keyword.keyword,
        subtitle: keyword.projectName,
        group: "Keywords",
        score,
        run: (c) =>
          c.router.push(`/projects/${keyword.projectId}?keyword=${keyword.id}`),
      });
    }
  }

  items.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  const grouped: PaletteItem[] = [];
  const groupOrder = [
    "Navigation",
    "Project Actions",
    "Projects",
    "Keywords",
  ];

  for (const group of groupOrder) {
    const inGroup = items.filter((item) => item.group === group);
    grouped.push(...inGroup);
  }

  const known = new Set(groupOrder);
  for (const item of items) {
    if (!known.has(item.group)) grouped.push(item);
  }

  return grouped;
}

export function extractProjectId(pathname: string): string | null {
  const match = pathname.match(/^\/projects\/([^/?]+)/);
  return match?.[1] && match[1] !== "new" ? match[1] : null;
}
