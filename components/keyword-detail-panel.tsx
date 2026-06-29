"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChangeCell } from "@/components/change-cell";
import { FrequencyBadge } from "@/components/frequency-badge";
import { PositionCell } from "@/components/position-cell";
import { PositionSparkline } from "@/components/position-sparkline";
import { RankingUrlCell } from "@/components/ranking-url-cell";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { formatRelative } from "@/lib/dates";
import type { Group, Keyword } from "@/lib/db/schema";
import { urlPath } from "@/lib/utils";

type HistoryEntry = {
  position: number | null;
  rankingUrl: string | null;
  createdAt: string;
};

export function KeywordDetailPanel({
  keyword,
  group,
  groups,
  onClose,
}: {
  keyword: Keyword;
  group: Group;
  groups: Group[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [groupId, setGroupId] = useState(group.id);
  const [frequency, setFrequency] = useState(keyword.frequency);
  const [enabled, setEnabled] = useState(keyword.enabled);
  const [targetUrl, setTargetUrl] = useState(keyword.targetUrl ?? "");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [positions, setPositions] = useState<(number | null)[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadHistory() {
      const res = await fetch(`/api/keywords/${keyword.id}/history`);
      if (!res.ok) return;
      const data = await res.json();
      setHistory(data.history ?? []);
      setPositions(data.positions ?? []);
    }
    loadHistory();
  }, [keyword.id]);

  async function runCheck() {
    setChecking(true);
    await fetch(`/api/keywords/${keyword.id}/check`, { method: "POST" });
    setChecking(false);
    router.refresh();
    const res = await fetch(`/api/keywords/${keyword.id}/history`);
    if (res.ok) {
      const data = await res.json();
      setHistory(data.history ?? []);
      setPositions(data.positions ?? []);
    }
  }

  async function saveChanges() {
    setSaving(true);
    await fetch(`/api/keywords/${keyword.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groupId,
        frequency,
        enabled,
        targetUrl: targetUrl.trim() || null,
      }),
    });
    setSaving(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm(`Delete "${keyword.keyword}"?`)) return;
    await fetch(`/api/keywords/${keyword.id}`, { method: "DELETE" });
    onClose();
    router.refresh();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-md flex-col border-l border-border bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div className="min-w-0 pr-4">
            <h2 className="truncate text-base font-medium">{keyword.keyword}</h2>
            <p className="mt-0.5 text-xs text-muted">{group.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-sm text-muted hover:text-foreground"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-6 flex items-end gap-6">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted">
                Current
              </div>
              <PositionCell position={keyword.currentPosition} />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted">
                Movement
              </div>
              <ChangeCell keyword={keyword} />
            </div>
            <div>
              <PositionSparkline positions={positions} />
            </div>
          </div>

          <dl className="space-y-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Previous</dt>
              <dd className="tabular-nums">
                {keyword.previousPosition !== null
                  ? keyword.previousPosition
                  : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Best</dt>
              <dd className="tabular-nums">
                {keyword.bestPosition !== null
                  ? keyword.bestPosition
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="mb-1 text-muted">Expected URL</dt>
              <dd>
                {keyword.targetUrl ? (
                  <a
                    href={
                      keyword.targetUrl.startsWith("http")
                        ? keyword.targetUrl
                        : `https://${keyword.targetUrl}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue no-underline hover:underline"
                    title={keyword.targetUrl}
                  >
                    {urlPath(keyword.targetUrl)}
                  </a>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="mb-1 text-muted">Ranking URL</dt>
              <dd>
                <RankingUrlCell url={keyword.currentRankingUrl} />
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Last checked</dt>
              <dd className="text-muted">
                {formatRelative(keyword.lastCheckedAt)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Frequency</dt>
              <dd>
                <FrequencyBadge frequency={keyword.frequency} />
              </dd>
            </div>
          </dl>

          {history.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 text-xs uppercase tracking-wide text-muted">
                History
              </h3>
              <div className="space-y-1">
                {history.map((entry, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-muted">
                      {new Date(entry.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                    <span className="tabular-nums">
                      {entry.position !== null ? entry.position : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 space-y-4 border-t border-border pt-6">
            <h3 className="text-xs uppercase tracking-wide text-muted">
              Edit
            </h3>
            <div>
              <label className="mb-1 block text-xs text-muted">Group</label>
              <Select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">Frequency</label>
              <Select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">
                Expected URL
              </label>
              <input
                type="text"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="/page-path"
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="rounded border-border"
              />
              <span>Tracking enabled</span>
            </label>
            <Button
              size="sm"
              variant="ghost"
              disabled={saving}
              onClick={saveChanges}
            >
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>

        <div className="flex gap-2 border-t border-border px-5 py-4">
          <Button disabled={checking} onClick={runCheck}>
            {checking ? "Checking…" : "Run Check"}
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
