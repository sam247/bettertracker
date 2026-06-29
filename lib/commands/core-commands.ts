import { registerCommandProvider } from "@/lib/commands/registry";
import type { CommandDefinition } from "@/lib/commands/types";

function dispatch(event: string, detail?: unknown) {
  window.dispatchEvent(new CustomEvent(event, { detail }));
}

registerCommandProvider((ctx): CommandDefinition[] => [
  {
    id: "nav:projects",
    label: "Projects",
    group: "Navigation",
    keywords: ["home", "all projects"],
    run: (c) => c.router.push("/projects"),
  },
  {
    id: "nav:current-project",
    label: "Current Project",
    group: "Navigation",
    keywords: ["project"],
    visible: (c) => !!c.projectId,
    run: (c) => c.router.push(`/projects/${c.projectId}`),
  },
  {
    id: "nav:settings",
    label: "Settings",
    group: "Navigation",
    hint: "⌘,",
    keywords: ["edit", "preferences"],
    visible: (c) => !!c.projectId,
    run: (c) => c.router.push(`/projects/${c.projectId}?edit=true`),
  },
  {
    id: "action:add-project",
    label: "Add Project",
    group: "Project Actions",
    keywords: ["new project", "create"],
    run: (c) => c.router.push("/projects/new"),
  },
  {
    id: "action:import-keywords",
    label: "Import Keywords",
    group: "Project Actions",
    keywords: ["bulk", "add keywords", "paste"],
    visible: (c) => !!c.projectId,
    run: () => dispatch("bettertracker:import-keywords"),
  },
  {
    id: "action:add-group",
    label: "Add Group",
    group: "Project Actions",
    visible: (c) => !!c.projectId,
    run: async (c) => {
      const name = window.prompt("Group name");
      if (!name?.trim() || !c.projectId) return;
      await fetch(`/api/projects/${c.projectId}/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      c.router.refresh();
    },
  },
  {
    id: "action:run-due-checks",
    label: "Run Due Checks",
    group: "Project Actions",
    hint: "↵",
    keywords: ["check", "due", "cron"],
    visible: (c) => !!c.projectId,
    run: () => dispatch("bettertracker:run-due-checks"),
  },
  {
    id: "action:check-selected",
    label: "Check Selected Keywords",
    group: "Project Actions",
    keywords: ["bulk check", "selected"],
    visible: (c) => !!c.projectId,
    run: () => dispatch("bettertracker:check-selected"),
  },
  {
    id: "action:refresh-credits",
    label: "Refresh Credits",
    group: "Project Actions",
    keywords: ["credits", "api", "serprobot"],
    run: () => dispatch("bettertracker:refresh-credits"),
  },
]);
