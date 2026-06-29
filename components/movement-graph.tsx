"use client";

import { useMemo, useState } from "react";
import type { MovementTimelinePoint } from "@/lib/keyword-history";
import type { BaselineMovementStats } from "@/lib/keyword-stats";

const CHART_WIDTH = 1000;
const CHART_HEIGHT = 250;
const PADDING = { top: 24, right: 16, bottom: 32, left: 40 };

export function MovementGraph({
  timeline,
  stats,
}: {
  timeline: MovementTimelinePoint[];
  stats: BaselineMovementStats;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const points = useMemo(() => {
    if (timeline.length > 0) return timeline;

    const today = new Date().toISOString().slice(0, 10);
    return [
      {
        date: today,
        label: "Today",
        improved: stats.improved,
        dropped: stats.dropped,
        unchanged: stats.unchanged,
        net: stats.improved - stats.dropped,
      },
    ];
  }, [timeline, stats]);

  const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  const nets = points.map((p) => p.net);
  const maxAbs = Math.max(...nets.map((n) => Math.abs(n)), 1);
  const yMin = -maxAbs;
  const yMax = maxAbs;

  const coords = points.map((point, index) => {
    const x =
      points.length === 1
        ? PADDING.left + plotWidth / 2
        : PADDING.left + (index / (points.length - 1)) * plotWidth;
    const y =
      PADDING.top +
      ((yMax - point.net) / (yMax - yMin)) * plotHeight;
    return { ...point, x, y, index };
  });

  const linePath = coords.map((p) => `${p.x},${p.y}`).join(" ");

  const yTicks = [yMax, 0, yMin].filter(
    (v, i, arr) => arr.indexOf(v) === i,
  );

  const xLabels =
    points.length === 1
      ? [{ x: coords[0].x, label: coords[0].label }]
      : [
          { x: coords[0].x, label: coords[0].label },
          { x: coords[coords.length - 1].x, label: coords[coords.length - 1].label },
        ];

  return (
    <div className="border-b border-border pb-4 mb-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="text-[10px] uppercase tracking-wide text-muted">
          Movement from baseline
        </div>
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

      <div className="relative w-full">
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="h-[250px] w-full"
          preserveAspectRatio="none"
          aria-label="Movement from baseline over time"
          onMouseLeave={() => setHover(null)}
        >
          {yTicks.map((tick) => {
            const y =
              PADDING.top +
              ((yMax - tick) / (yMax - yMin)) * plotHeight;
            return (
              <line
                key={tick}
                x1={PADDING.left}
                y1={y}
                x2={CHART_WIDTH - PADDING.right}
                y2={y}
                stroke="var(--border)"
                strokeWidth={tick === 0 ? 1 : 0.5}
              />
            );
          })}

          {yTicks.map((tick) => {
            const y =
              PADDING.top +
              ((yMax - tick) / (yMax - yMin)) * plotHeight;
            return (
              <text
                key={`label-${tick}`}
                x={PADDING.left - 8}
                y={y + 4}
                textAnchor="end"
                fill="var(--muted)"
                fontSize={10}
              >
                {tick > 0 ? `+${tick}` : tick}
              </text>
            );
          })}

          {points.length > 1 && (
            <polyline
              fill="none"
              stroke="var(--foreground)"
              strokeWidth={1.5}
              points={linePath}
              opacity={0.5}
            />
          )}

          {coords.map((point) => (
            <circle
              key={point.date}
              cx={point.x}
              cy={point.y}
              r={hover === point.index ? 5 : 4}
              fill="var(--foreground)"
              stroke="var(--background)"
              strokeWidth={2}
              onMouseEnter={() => setHover(point.index)}
            />
          ))}

          {xLabels.map((label) => (
            <text
              key={label.label}
              x={label.x}
              y={CHART_HEIGHT - 8}
              textAnchor="middle"
              fill="var(--muted)"
              fontSize={10}
            >
              {label.label}
            </text>
          ))}
        </svg>

        {hover !== null && coords[hover] && (
          <div
            className="pointer-events-none absolute z-10 rounded border border-border bg-surface px-2 py-1.5 text-xs shadow-none"
            style={{
              left: `${(coords[hover].x / CHART_WIDTH) * 100}%`,
              top: 8,
              transform: "translateX(-50%)",
            }}
          >
            <div className="font-medium">{coords[hover].label}</div>
            <div className="mt-1 text-muted">
              Net:{" "}
              <span className="text-foreground tabular-nums">
                {coords[hover].net > 0 ? "+" : ""}
                {coords[hover].net}
              </span>
            </div>
            <div className="text-green tabular-nums">▲ {coords[hover].improved}</div>
            <div className="text-red tabular-nums">▼ {coords[hover].dropped}</div>
          </div>
        )}
      </div>
    </div>
  );
}
