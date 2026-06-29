export interface CommandContext {
  pathname: string;
  projectId: string | null;
  router: {
    push: (href: string) => void;
    refresh: () => void;
  };
}

export interface PaletteItem {
  id: string;
  label: string;
  group: string;
  hint?: string;
  subtitle?: string;
  score?: number;
  run: (ctx: CommandContext) => void | Promise<void>;
}

export interface CommandDefinition {
  id: string;
  label: string;
  group: string;
  hint?: string;
  keywords?: string[];
  visible?: (ctx: CommandContext) => boolean;
  run: (ctx: CommandContext) => void | Promise<void>;
}

export interface ProjectSearchItem {
  id: string;
  name: string;
  domain: string;
}

export interface KeywordSearchItem {
  id: string;
  keyword: string;
  projectId: string;
  projectName: string;
}

export interface CommandPaletteData {
  projects: ProjectSearchItem[];
  keywords: KeywordSearchItem[];
}

export type CommandProvider = (
  ctx: CommandContext,
) => CommandDefinition[];
