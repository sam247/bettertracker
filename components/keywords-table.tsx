"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChangeCell } from "@/components/change-cell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatRelative, isDue } from "@/lib/dates";
import { cn, truncateUrl } from "@/lib/utils";
import type { Group, Keyword } from "@/lib/db/schema";

type KeywordRow = {
  keyword: Keyword;
  group: Group;
};

type SortKey = "movement" | "position" | "lastChecked";

export function KeywordsTable({
  rows,
  groups,
}: {
  rows: KeywordRow[];
  groups: Group[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [sort, setSort] = useState<SortKey>("movement");
  const [checking, setChecking] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = rows;

    if (groupFilter !== "all") {
      list = list.filter((r) => r.group.id === groupFilter);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((r) =>
        r.keyword.keyword.toLowerCase().includes(q),
      );
    }

    return [...list].sort((a, b) => {
      if (sort === "movement") {
        const changeA =
          a.keyword.currentPosition !== null && a.keyword.previousPosition !== null
            ? a.keyword.previousPosition - a.keyword.currentPosition
            : -Infinity;
        const changeB =
          b.keyword.currentPosition !== null && b.keyword.previousPosition !== null
            ? b.keyword.previousPosition - b.keyword.currentPosition
            : -Infinity;
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

  async function checkNow(id: string) {
    setChecking(id);
    await fetch(`/api/keywords/${id}/check`, { method: "POST" });
    setChecking(null);
    router.refresh();
  }

  async function toggleEnabled(id: string, enabled: boolean) {
    await fetch(`/api/keywords/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !enabled }),
    });
    router.refresh();
  }

  async function deleteKeyword(id: string) {
    if (!confirm("Delete this keyword?")) return;
    await fetch(`/api/keywords/${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function moveGroup(id: string, groupId: string) {
    await fetch(`/api/keywords/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search keywords…"
          className="max-w-xs"
        />
        <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
          <option value="movement">Sort by movement</option>
          <option value="position">Sort by position</option>
          <option value="lastChecked">Sort by last checked</option>
        </Select>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border pb-3">
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

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="pb-2 pr-4 font-medium">Keyword</th>
              <th className="pb-2 pr-4 font-medium">Group</th>
              <th className="pb-2 pr-4 font-medium text-right">Current</th>
              <th className="pb-2 pr-4 font-medium text-right">Previous</th>
              <th className="pb-2 pr-4 font-medium text-right">Change</th>
              <th className="pb-2 pr-4 font-medium text-right">Best</th>
              <th className="pb-2 pr-4 font-medium">Ranking URL</th>
              <th className="pb-2 pr-4 font-medium">Last checked</th>
              <th className="pb-2 pr-4 font-medium">Frequency</th>
              <th className="pb-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(({ keyword, group }) => {
              const due = isDue(keyword.nextCheckAt);
              return (
                <tr
                  key={keyword.id}
                  className="border-b border-border/50 hover:bg-surface/50"
                >
                  <td className="py-2.5 pr-4 font-medium">
                    {keyword.keyword}
                    {!keyword.enabled && (
                      <span className="ml-2 text-xs text-muted">(off)</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 text-muted">{group.name}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">
                    {keyword.currentPosition ?? "—"}
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-muted">
                    {keyword.previousPosition ?? "—"}
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">
                    <ChangeCell
                      current={keyword.currentPosition}
                      previous={keyword.previousPosition}
                    />
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-muted">
                    {keyword.bestPosition ?? "—"}
                  </td>
                  <td className="py-2.5 pr-4 max-w-[200px]">
                    {keyword.currentRankingUrl ? (
                      <a
                        href={keyword.currentRankingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue text-xs"
                        title={keyword.currentRankingUrl}
                      >
                        {truncateUrl(keyword.currentRankingUrl)}
                      </a>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td
                    className={cn(
                      "py-2.5 pr-4 text-xs",
                      due ? "text-amber" : "text-muted",
                    )}
                  >
                    {formatRelative(keyword.lastCheckedAt)}
                  </td>
                  <td className="py-2.5 pr-4 text-xs text-muted capitalize">
                    {keyword.frequency}
                  </td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={checking === keyword.id}
                        onClick={() => checkNow(keyword.id)}
                      >
                        {checking === keyword.id ? "…" : "Check"}
                      </Button>
                      <Select
                        value={group.id}
                        onChange={(e) => moveGroup(keyword.id, e.target.value)}
                        className="text-xs py-1"
                      >
                        {groups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </Select>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleEnabled(keyword.id, keyword.enabled)}
                      >
                        {keyword.enabled ? "Off" : "On"}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => deleteKeyword(keyword.id)}
                      >
                        Del
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">No keywords found.</p>
        )}
      </div>
    </div>
  );
}
