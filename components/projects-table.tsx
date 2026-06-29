"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PositionSparkline } from "@/components/position-sparkline";
import { ProjectMovementCell } from "@/components/project-movement-cell";
import { SortableTh } from "@/components/sortable-th";
import { formatRegionDisplay } from "@/lib/format-region";
import type { ProjectKeywordStats } from "@/lib/project-stats";
import {
  compareNumber,
  compareText,
  toggleSort,
  type SortState,
} from "@/lib/table-sort";
import type { Project } from "@/lib/db/schema";

type ProjectRow = {
  project: Project;
  keywordCount: number;
  stats: ProjectKeywordStats;
  trend: (number | null)[];
};

type SortKey =
  | "name"
  | "domain"
  | "region"
  | "avgPosition"
  | "movement"
  | "trend"
  | "keywords";

const DEFAULT_DIRECTION: Record<SortKey, "asc" | "desc"> = {
  name: "asc",
  domain: "asc",
  region: "asc",
  avgPosition: "asc",
  movement: "desc",
  trend: "asc",
  keywords: "desc",
};

export function ProjectsTable({ rows }: { rows: ProjectRow[] }) {
  const [sort, setSort] = useState<SortState<SortKey> | null>(null);

  function handleSort(key: SortKey) {
    setSort((current) => toggleSort(current, key, DEFAULT_DIRECTION[key]));
  }

  const sorted = useMemo(() => {
    if (!sort) return rows;

    const { key, direction: asc } = sort;
    const ascDir = asc === "asc";

    return [...rows].sort((a, b) => {
      switch (key) {
        case "name":
          return compareText(a.project.name, b.project.name, ascDir);
        case "domain":
          return compareText(
            a.project.targetDomain,
            b.project.targetDomain,
            ascDir,
          );
        case "region":
          return compareText(
            formatRegionDisplay(a.project.region),
            formatRegionDisplay(b.project.region),
            ascDir,
          );
        case "avgPosition":
          return compareNumber(a.stats.avgPosition, b.stats.avgPosition, ascDir);
        case "movement":
          return compareNumber(a.stats.netMovement, b.stats.netMovement, ascDir, 0);
        case "trend": {
          const trendA = a.trend.at(-1) ?? null;
          const trendB = b.trend.at(-1) ?? null;
          return compareNumber(trendA, trendB, ascDir);
        }
        case "keywords":
          return compareNumber(a.keywordCount, b.keywordCount, ascDir, 0);
        default:
          return 0;
      }
    });
  }, [rows, sort]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs">
            <SortableTh
              label="Name"
              sortKey="name"
              activeKey={sort?.key ?? null}
              direction={sort?.direction ?? "asc"}
              onSort={handleSort}
              className="pr-4"
            />
            <SortableTh
              label="Domain"
              sortKey="domain"
              activeKey={sort?.key ?? null}
              direction={sort?.direction ?? "asc"}
              onSort={handleSort}
              className="pr-4"
            />
            <SortableTh
              label="Region"
              sortKey="region"
              activeKey={sort?.key ?? null}
              direction={sort?.direction ?? "asc"}
              onSort={handleSort}
              className="pr-4"
            />
            <SortableTh
              label="Avg position"
              sortKey="avgPosition"
              activeKey={sort?.key ?? null}
              direction={sort?.direction ?? "asc"}
              onSort={handleSort}
              align="center"
              className="pl-4 pr-2"
            />
            <SortableTh
              label="Movement"
              sortKey="movement"
              activeKey={sort?.key ?? null}
              direction={sort?.direction ?? "asc"}
              onSort={handleSort}
              align="center"
              className="px-2"
            />
            <SortableTh
              label="Trend"
              sortKey="trend"
              activeKey={sort?.key ?? null}
              direction={sort?.direction ?? "asc"}
              onSort={handleSort}
              align="center"
              className="px-2"
            />
            <SortableTh
              label="Keywords"
              sortKey="keywords"
              activeKey={sort?.key ?? null}
              direction={sort?.direction ?? "asc"}
              onSort={handleSort}
              align="center"
              className="pl-2 pr-4"
            />
          </tr>
        </thead>
        <tbody>
          {sorted.map(({ project, keywordCount, stats, trend }) => (
            <tr
              key={project.id}
              className="border-b border-border/50 hover:bg-surface/50"
            >
              <td className="py-3 pr-4">
                <Link
                  href={`/projects/${project.id}`}
                  className="font-medium no-underline hover:underline"
                >
                  {project.name}
                </Link>
              </td>
              <td className="py-3 pr-4 text-muted">{project.targetDomain}</td>
              <td className="py-3 pr-4 text-muted">
                {formatRegionDisplay(project.region)}
              </td>
              <td className="py-3 pl-4 pr-2 text-center tabular-nums text-muted">
                {stats.avgPosition !== null
                  ? stats.avgPosition % 1 === 0
                    ? stats.avgPosition
                    : stats.avgPosition.toFixed(1)
                  : "—"}
              </td>
              <td className="py-3 px-2 text-center">
                <ProjectMovementCell net={stats.netMovement} />
              </td>
              <td className="py-3 px-2">
                <div className="flex justify-center">
                  <PositionSparkline positions={trend} />
                </div>
              </td>
              <td className="py-3 pl-2 pr-4 text-center tabular-nums text-muted">
                {keywordCount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <p className="py-12 text-center text-sm text-muted">
          No projects yet.{" "}
          <Link href="/projects/new" className="text-blue">
            Create one
          </Link>
        </p>
      )}
    </div>
  );
}
