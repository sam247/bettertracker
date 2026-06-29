import type { KeywordStats } from "@/lib/keyword-stats";
import { Button } from "@/components/ui/button";

export function KeywordStatsBar({
  stats,
  runningDue,
  onRunDueChecks,
}: {
  stats: KeywordStats;
  runningDue: boolean;
  onRunDueChecks: () => void;
}) {
  const items = [
    { label: "Keywords", value: stats.keywords },
    { label: "Improved", value: stats.improved },
    { label: "Dropped", value: stats.dropped },
    { label: "Due Today", value: stats.dueToday },
    { label: "New #1", value: stats.newOne },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
      <div className="flex flex-wrap gap-6">
        {items.map((item) => (
          <div key={item.label}>
            <div className="text-[10px] uppercase tracking-wide text-muted">
              {item.label}
            </div>
            <div className="text-sm font-medium tabular-nums">{item.value}</div>
          </div>
        ))}
      </div>
      {stats.dueToday > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">
            Due Today: <span className="text-foreground">{stats.dueToday}</span>
          </span>
          <Button size="sm" disabled={runningDue} onClick={onRunDueChecks}>
            {runningDue ? "Running…" : "Run Due Checks"}
          </Button>
        </div>
      )}
    </div>
  );
}
