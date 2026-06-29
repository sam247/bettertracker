"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAutoRefresh } from "@/lib/use-auto-refresh";
import { BulkActionsDialog } from "@/components/bulk-actions-dialog";
import { ChangeCell } from "@/components/change-cell";
import { FrequencyBadge } from "@/components/frequency-badge";
import { KeywordDetailPanel } from "@/components/keyword-detail-panel";
import { MovementGraph } from "@/components/movement-graph";
import { PositionCell } from "@/components/position-cell";
import { PositionSparkline } from "@/components/position-sparkline";
import { RankingUrlCell } from "@/components/ranking-url-cell";
import { KeywordActionsMenu } from "@/components/keyword-actions-menu";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatRelative, isDue } from "@/lib/dates";
import { computeBaselineMovementStats, getMovement } from "@/lib/keyword-stats";
import { cn, urlPath } from "@/lib/utils";
import type { MovementTimelinePoint } from "@/lib/keyword-history";
import type { Group, Keyword } from "@/lib/db/schema";

type KeywordRow = {
  keyword: Keyword;
  group: Group;
};

type SortKey = "movement" | "position" | "lastChecked";

export function KeywordsTable({
  projectId,
  rows,
  groups,
  positionHistory,
  baselinePositions,
  movementTimeline,
}: {
  projectId: string;
  rows: KeywordRow[];
  groups: Group[];
  positionHistory: Record<string, (number | null)[]>;
  baselinePositions: Record<string, number | null>;
  movementTimeline: MovementTimelinePoint[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [sort, setSort] = useState<SortKey>("movement");
  const [checking, setChecking] = useState<string | null>(null);

  useAutoRefresh(checking !== null, 4000);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const detailRow = detailId
    ? rows.find((r) => r.keyword.id === detailId) ?? null
    : null;

  const baselineStats = useMemo(
    () =>
      computeBaselineMovementStats(
        rows.map((r) => r.keyword),
        baselinePositions,
      ),
    [rows, baselinePositions],
  );

  const filtered = useMemo(() => {
    let list = rows;

    if (groupFilter !== "all") {
      list = list.filter((r) => r.group.id === groupFilter);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((r) => {
        const kw = r.keyword.keyword.toLowerCase();
        const ranking = (r.keyword.currentRankingUrl ?? "").toLowerCase();
        const target = (r.keyword.targetUrl ?? "").toLowerCase();
        const rankingPath = urlPath(r.keyword.currentRankingUrl).toLowerCase();
        const targetPath = urlPath(r.keyword.targetUrl).toLowerCase();
        return (
          kw.includes(q) ||
          ranking.includes(q) ||
          target.includes(q) ||
          rankingPath.includes(q) ||
          targetPath.includes(q)
        );
      });
    }

    return [...list].sort((a, b) => {
      if (sort === "movement") {
        const changeA = getMovement(a.keyword) ?? -Infinity;
        const changeB = getMovement(b.keyword) ?? -Infinity;
        return changeB - changeA;
      }
      if (sort === "position") {
        const posA = a.keyword.currentPosition ?? 9999;
        const posB = b.keyword.currentPosition ?? 9999;
        return posA - posB;
      }
      const timeA = a.keyword.lastCheckedAt?.getTime() ?? 0;
      const timeB = b.keyword.lastCheckedAt?.getTime() ?? 0;
      return timeB - timeA;
    });
  }, [rows, groupFilter, search, sort]);

  const filteredIds = useMemo(
    () => new Set(filtered.map((r) => r.keyword.id)),
    [filtered],
  );

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((r) => selected.has(r.keyword.id));

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllFiltered() {
    if (allFilteredSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of filteredIds) next.delete(id);
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of filteredIds) next.add(id);
        return next;
      });
    }
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function checkNow(id: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    setChecking(id);
    await fetch(`/api/keywords/${id}/check`, { method: "POST" });
    setChecking(null);
    router.refresh();
  }

  function openDetail(row: KeywordRow) {
    setDetailId(row.keyword.id);
  }

  return (
    <div className="space-y-4">
      <MovementGraph timeline={movementTimeline} stats={baselineStats} />

      <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
        <div className="flex items-center gap-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search keyword or URL…"
            className="w-48 shrink-0"
          />
          <Select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="shrink-0"
          >
            <option value="movement">Sort by movement</option>
            <option value="position">Sort by position</option>
            <option value="lastChecked">Sort by last checked</option>
          </Select>
          <div className="shrink-0">
            <BulkActionsDialog
              projectId={projectId}
              groups={groups}
              selectedIds={[...selected]}
              onClearSelection={clearSelection}
            />
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => setGroupFilter("all")}
            className={cn(
              "rounded px-3 py-1 text-sm",
              groupFilter === "all"
                ? "bg-surface-hover text-foreground"
                : "text-muted hover:text-foreground",
            )}
          >
            All
          </button>
          {groups.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setGroupFilter(g.id)}
              className={cn(
                "rounded px-3 py-1 text-sm",
                groupFilter === g.id
                  ? "bg-surface-hover text-foreground"
                  : "text-muted hover:text-foreground",
              )}
            >
              {g.name}
            </button>
          ))}
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded border border-border bg-surface px-3 py-2 text-sm">
          <span className="text-muted">{selected.size} selected</span>
          <BulkActionsDialog
            projectId={projectId}
            groups={groups}
            selectedIds={[...selected]}
            onClearSelection={clearSelection}
            variant="inline"
          />
          <Button size="sm" variant="ghost" onClick={clearSelection}>
            Clear
          </Button>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-foreground">No keywords yet.</p>
          <p className="mt-1 text-sm text-muted">
            Add keywords to begin tracking.
          </p>
          <div className="mt-4">
            <BulkActionsDialog
              projectId={projectId}
              groups={groups}
              triggerLabel="Add keywords"
            />
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="w-8 pb-2 pr-2 font-medium">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleAllFiltered}
                    aria-label="Select all visible keywords"
                    className="rounded border-border"
                  />
                </th>
                <th className="pb-2 pr-4 font-medium">Keyword</th>
                <th className="px-4 pb-2 font-medium text-center">Position</th>
                <th className="px-4 pb-2 font-medium text-center">Movement</th>
                <th className="px-4 pb-2 font-medium text-center">Best</th>
                <th className="px-4 pb-2 font-medium text-center">Trend</th>
                <th className="pb-2 pl-4 pr-6 font-medium text-left">Ranking URL</th>
                <th className="pb-2 pr-4 font-medium">Group</th>
                <th className="pb-2 pr-4 font-medium">Freq</th>
                <th className="pb-2 pr-4 font-medium">Last</th>
                <th className="pb-2 pr-2 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const { keyword, group } = row;
                const due = isDue(keyword.nextCheckAt);
                const isSelected = selected.has(keyword.id);
                const history = positionHistory[keyword.id] ?? [];

                return (
                  <tr
                    key={keyword.id}
                    onClick={() => openDetail(row)}
                    className={cn(
                      "cursor-pointer border-b border-border/50 transition-colors hover:bg-surface-hover/50",
                      isSelected && "bg-surface/30",
                      !keyword.enabled && "opacity-60",
                    )}
                  >
                    <td
                      className="py-2.5 pr-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOne(keyword.id)}
                        aria-label={`Select ${keyword.keyword}`}
                        className="rounded border-border"
                      />
                    </td>
                    <td className="max-w-[220px] py-2.5 pr-4 font-medium">
                      <span className="block truncate">{keyword.keyword}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <PositionCell
                        position={keyword.currentPosition}
                        checking={checking === keyword.id}
                      />
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <ChangeCell keyword={keyword} />
                    </td>
                    <td className="px-4 py-2.5 text-center tabular-nums text-xs text-muted">
                      {keyword.bestPosition !== null
                        ? keyword.bestPosition
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-center">
                        <PositionSparkline positions={history} />
                      </div>
                    </td>
                    <td className="py-2.5 pl-4 pr-6 text-left">
                      <RankingUrlCell url={keyword.currentRankingUrl} />
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-muted">
                      {group.name}
                    </td>
                    <td className="py-2.5 pr-4">
                      <FrequencyBadge frequency={keyword.frequency} />
                    </td>
                    <td
                      className={cn(
                        "py-2.5 pr-4 text-xs",
                        due ? "text-amber" : "text-muted",
                      )}
                    >
                      {formatRelative(keyword.lastCheckedAt)}
                    </td>
                    <td
                      className="py-2.5 pr-2 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-end">
                        <KeywordActionsMenu
                          keyword={keyword}
                          checking={checking === keyword.id}
                          onCheck={() => checkNow(keyword.id)}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && rows.length > 0 && (
            <p className="py-8 text-center text-sm text-muted">
              No keywords match your search.
            </p>
          )}
        </div>
      )}

      {detailRow && (
        <KeywordDetailPanel
          keyword={detailRow.keyword}
          group={detailRow.group}
          groups={groups}
          onClose={() => setDetailId(null)}
        />
      )}
    </div>
  );
}
