"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAutoRefresh } from "@/lib/use-auto-refresh";
import { BulkActionsDialog } from "@/components/bulk-actions-dialog";
import { ChangeCell } from "@/components/change-cell";
import { FrequencyBadge } from "@/components/frequency-badge";
import { KeywordDetailPanel } from "@/components/keyword-detail-panel";
import { MovementGraph } from "@/components/movement-graph";
import { PositionCell } from "@/components/position-cell";
import { PositionSparkline } from "@/components/position-sparkline";
import { RankingUrlCell } from "@/components/ranking-url-cell";
import { Spinner } from "@/components/spinner";
import { KeywordActionsMenu } from "@/components/keyword-actions-menu";
import { SortableTh } from "@/components/sortable-th";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatRelative, isDue } from "@/lib/dates";
import {
  CHECKING_ENDED,
  CHECKING_STARTED,
  dispatchCheckingEnded,
  dispatchCheckingStarted,
} from "@/lib/checking-events";
import { computeBaselineMovementStats, getMovement } from "@/lib/keyword-stats";
import {
  compareDate,
  compareNumber,
  compareText,
  FREQUENCY_ORDER,
  toggleSort,
  type SortState,
} from "@/lib/table-sort";
import { cn, urlPath } from "@/lib/utils";
import type { MovementTimelinePoint } from "@/lib/keyword-history";
import type { Group, Keyword } from "@/lib/db/schema";

type KeywordRow = {
  keyword: Keyword;
  group: Group;
};

type SortKey =
  | "keyword"
  | "position"
  | "movement"
  | "best"
  | "trend"
  | "rankingUrl"
  | "group"
  | "frequency"
  | "lastChecked";

const DEFAULT_DIRECTION: Record<SortKey, "asc" | "desc"> = {
  keyword: "asc",
  position: "asc",
  movement: "desc",
  best: "asc",
  trend: "asc",
  rankingUrl: "asc",
  group: "asc",
  frequency: "asc",
  lastChecked: "desc",
};

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
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [sort, setSort] = useState<SortState<SortKey>>({
    key: "movement",
    direction: "desc",
  });
  const [checkingIds, setCheckingIds] = useState<Set<string>>(new Set());

  function addChecking(ids: string[]) {
    setCheckingIds((prev) => new Set([...prev, ...ids]));
  }

  function removeChecking(ids: string[]) {
    setCheckingIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
  }

  useAutoRefresh(checkingIds.size > 0, 4000);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const detailRow = detailId
    ? rows.find((r) => r.keyword.id === detailId) ?? null
    : null;

  const [bulkAddOpen, setBulkAddOpen] = useState(false);

  useEffect(() => {
    const keywordId = searchParams.get("keyword");
    if (keywordId && rows.some((r) => r.keyword.id === keywordId)) {
      setDetailId(keywordId);
    }
  }, [searchParams, rows]);

  useEffect(() => {
    function onImportKeywords() {
      setBulkAddOpen(true);
    }

    async function onCheckSelected() {
      const ids = [...selected];
      if (ids.length === 0) return;
      const batchIds = ids.slice(0, 5);
      dispatchCheckingStarted(batchIds);
      try {
        await fetch(`/api/projects/${projectId}/keywords/bulk-check`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: batchIds }),
        });
        router.refresh();
      } finally {
        dispatchCheckingEnded(batchIds);
      }
    }

    function onCheckingStarted(event: Event) {
      const ids = (event as CustomEvent<{ ids: string[] }>).detail.ids;
      addChecking(ids);
    }

    function onCheckingEnded(event: Event) {
      const ids = (event as CustomEvent<{ ids: string[] }>).detail.ids;
      removeChecking(ids);
    }

    window.addEventListener("bettertracker:import-keywords", onImportKeywords);
    window.addEventListener("bettertracker:check-selected", onCheckSelected);
    window.addEventListener(CHECKING_STARTED, onCheckingStarted);
    window.addEventListener(CHECKING_ENDED, onCheckingEnded);
    return () => {
      window.removeEventListener("bettertracker:import-keywords", onImportKeywords);
      window.removeEventListener("bettertracker:check-selected", onCheckSelected);
      window.removeEventListener(CHECKING_STARTED, onCheckingStarted);
      window.removeEventListener(CHECKING_ENDED, onCheckingEnded);
    };
  }, [projectId, router, selected]);

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
      const asc = sort.direction === "asc";

      switch (sort.key) {
        case "keyword":
          return compareText(a.keyword.keyword, b.keyword.keyword, asc);
        case "position":
          return compareNumber(
            a.keyword.currentPosition,
            b.keyword.currentPosition,
            asc,
          );
        case "movement":
          return compareNumber(getMovement(a.keyword), getMovement(b.keyword), asc);
        case "best":
          return compareNumber(
            a.keyword.bestPosition,
            b.keyword.bestPosition,
            asc,
          );
        case "trend": {
          const historyA = positionHistory[a.keyword.id] ?? [];
          const historyB = positionHistory[b.keyword.id] ?? [];
          const trendA = historyA.at(-1) ?? a.keyword.currentPosition;
          const trendB = historyB.at(-1) ?? b.keyword.currentPosition;
          return compareNumber(trendA, trendB, asc);
        }
        case "rankingUrl":
          return compareText(
            a.keyword.currentRankingUrl ?? "",
            b.keyword.currentRankingUrl ?? "",
            asc,
          );
        case "group":
          return compareText(a.group.name, b.group.name, asc);
        case "frequency":
          return compareNumber(
            FREQUENCY_ORDER[a.keyword.frequency] ?? 99,
            FREQUENCY_ORDER[b.keyword.frequency] ?? 99,
            asc,
            99,
          );
        case "lastChecked":
          return compareDate(a.keyword.lastCheckedAt, b.keyword.lastCheckedAt, asc);
        default:
          return 0;
      }
    });
  }, [rows, groupFilter, search, sort, positionHistory]);

  function handleSort(key: SortKey) {
    setSort((current) => toggleSort(current, key, DEFAULT_DIRECTION[key]));
  }

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
    dispatchCheckingStarted([id]);
    try {
      await fetch(`/api/keywords/${id}/check`, { method: "POST" });
      router.refresh();
    } finally {
      dispatchCheckingEnded([id]);
    }
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
          <div className="shrink-0">
            <BulkActionsDialog
              projectId={projectId}
              groups={groups}
              selectedIds={[...selected]}
              onClearSelection={clearSelection}
              open={bulkAddOpen}
              onOpenChange={setBulkAddOpen}
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
              <tr className="border-b border-border text-left text-xs">
                <th className="w-8 pb-2 pr-2 font-medium text-muted">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleAllFiltered}
                    aria-label="Select all visible keywords"
                    className="rounded border-border"
                  />
                </th>
                <SortableTh
                  label="Keyword"
                  sortKey="keyword"
                  activeKey={sort.key}
                  direction={sort.direction}
                  onSort={handleSort}
                  className="pr-4"
                />
                <SortableTh
                  label="Position"
                  sortKey="position"
                  activeKey={sort.key}
                  direction={sort.direction}
                  onSort={handleSort}
                  align="center"
                  className="px-4"
                />
                <SortableTh
                  label="Movement"
                  sortKey="movement"
                  activeKey={sort.key}
                  direction={sort.direction}
                  onSort={handleSort}
                  align="center"
                  className="px-4"
                />
                <SortableTh
                  label="Best"
                  sortKey="best"
                  activeKey={sort.key}
                  direction={sort.direction}
                  onSort={handleSort}
                  align="center"
                  className="px-4"
                />
                <SortableTh
                  label="Trend"
                  sortKey="trend"
                  activeKey={sort.key}
                  direction={sort.direction}
                  onSort={handleSort}
                  align="center"
                  className="px-4"
                />
                <SortableTh
                  label="Ranking URL"
                  sortKey="rankingUrl"
                  activeKey={sort.key}
                  direction={sort.direction}
                  onSort={handleSort}
                  className="pl-4 pr-6"
                />
                <SortableTh
                  label="Group"
                  sortKey="group"
                  activeKey={sort.key}
                  direction={sort.direction}
                  onSort={handleSort}
                  className="pr-4"
                />
                <SortableTh
                  label="Freq"
                  sortKey="frequency"
                  activeKey={sort.key}
                  direction={sort.direction}
                  onSort={handleSort}
                  className="pr-4"
                />
                <SortableTh
                  label="Last"
                  sortKey="lastChecked"
                  activeKey={sort.key}
                  direction={sort.direction}
                  onSort={handleSort}
                  className="pr-4"
                />
                <th className="pb-2 pr-2 text-right font-medium text-muted">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const { keyword, group } = row;
                const due = isDue(keyword.nextCheckAt);
                const isSelected = selected.has(keyword.id);
                const history = positionHistory[keyword.id] ?? [];

                const isChecking = checkingIds.has(keyword.id);

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
                        checking={isChecking}
                      />
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <ChangeCell keyword={keyword} checking={isChecking} />
                    </td>
                    <td className="px-4 py-2.5 text-center tabular-nums text-xs text-muted">
                      {isChecking && keyword.bestPosition === null ? (
                        <span className="inline-flex justify-center text-muted">
                          <Spinner className="h-3.5 w-3.5" />
                        </span>
                      ) : keyword.bestPosition !== null ? (
                        keyword.bestPosition
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-center">
                        {isChecking && history.length === 0 ? (
                          <Spinner className="h-3.5 w-3.5 text-muted" />
                        ) : (
                          <PositionSparkline positions={history} />
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 pl-4 pr-6 text-left">
                      <RankingUrlCell
                        url={keyword.currentRankingUrl}
                        checking={isChecking}
                      />
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
                          checking={isChecking}
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
