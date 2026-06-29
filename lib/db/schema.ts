import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  targetDomain: text("target_domain").notNull(),
  region: text("region").notNull().default("www.google.co.uk"),
  device: text("device").notNull().default("desktop"),
  archivedAt: timestamp("archived_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const groups = pgTable("groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .references(() => projects.id)
    .notNull(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const keywords = pgTable(
  "keywords",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .references(() => projects.id)
      .notNull(),
    groupId: uuid("group_id")
      .references(() => groups.id)
      .notNull(),
    keyword: text("keyword").notNull(),
    keywordNormalised: text("keyword_normalised").notNull(),
    targetUrl: text("target_url"),
    enabled: boolean("enabled").notNull().default(true),
    frequency: text("frequency").notNull().default("weekly"),
    currentPosition: integer("current_position"),
    previousPosition: integer("previous_position"),
    bestPosition: integer("best_position"),
    currentRankingUrl: text("current_ranking_url"),
    lastCheckedAt: timestamp("last_checked_at"),
    nextCheckAt: timestamp("next_check_at"),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("keywords_project_normalised_idx")
      .on(table.projectId, table.keywordNormalised)
      .where(sql`${table.deletedAt} IS NULL`),
    index("keywords_due_idx").on(
      table.enabled,
      table.nextCheckAt,
      table.deletedAt,
    ),
  ],
);

export const rankChecks = pgTable(
  "rank_checks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    keywordId: uuid("keyword_id")
      .references(() => keywords.id)
      .notNull(),
    position: integer("position"),
    rankingUrl: text("ranking_url"),
    status: text("status").notNull(),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("rank_checks_keyword_created_idx").on(
      table.keywordId,
      table.createdAt,
    ),
  ],
);

export const apiLogs = pgTable("api_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  action: text("action").notNull(),
  keywordId: uuid("keyword_id").references(() => keywords.id),
  creditsCost: integer("credits_cost").notNull().default(0),
  httpStatus: integer("http_status"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type Keyword = typeof keywords.$inferSelect;
export type RankCheck = typeof rankChecks.$inferSelect;
export type ApiLog = typeof apiLogs.$inferSelect;
