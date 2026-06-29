import type { BaselineMovementStats } from "@/lib/keyword-stats";

export function MovementGraph({ stats }: { stats: BaselineMovementStats }) {
  const total = stats.improved + stats.dropped + stats.unchanged;

  if (total === 0) {
    return (
      <div className="border-b border-border pb-4">
        <div className="mb-2 text-[10px] uppercase tracking-wide text-muted">
          Movement from baseline
        </div>
        <p className="text-xs text-muted">No baseline data yet.</p>
      </div>
    );
  }

  const width = 320;
  const height = 48;
  const barHeight = 24;
  const y = (height - barHeight) / 2;
  const scale = width / total;

  const improvedW = stats.improved * scale;
  const droppedW = stats.dropped * scale;
  const unchangedW = stats.unchanged * scale;

  const segments: { width: number; fill: string; opacity?: number }[] = [];
  if (improvedW > 0) segments.push({ width: improvedW, fill: "var(--green)" });
  if (droppedW > 0) segments.push({ width: droppedW, fill: "var(--red)" });
  if (unchangedW > 0) {
    segments.push({ width: unchangedW, fill: "var(--muted)", opacity: 0.35 });
  }

  let x = 0;

  return (
    <div className="border-b border-border pb-4">
      <div className="mb-2 text-[10px] uppercase tracking-wide text-muted">
        Movement from baseline
      </div>
      <div className="flex flex-wrap items-end gap-6">
        <svg
          width={width}
          height={height}
          className="shrink-0"
          aria-label="Movement from baseline"
        >
          {segments.map((segment, i) => {
            const rect = (
              <rect
                key={i}
                x={x}
                y={y}
                width={segment.width}
                height={barHeight}
                fill={segment.fill}
                opacity={segment.opacity}
              />
            );
            x += segment.width;
            return rect;
          })}
        </svg>
        <div className="flex flex-wrap gap-4 text-xs">
          <span className="text-green tabular-nums">
            ▲ {stats.improved} improved
          </span>
          <span className="text-red tabular-nums">
            ▼ {stats.dropped} dropped
          </span>
          <span className="text-muted tabular-nums">
            — {stats.unchanged} unchanged
          </span>
        </div>
      </div>
    </div>
  );
}
