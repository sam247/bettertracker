"use client";

import { useEffect, useMemo, useState } from "react";
import type { MovementTimelinePoint } from "@/lib/keyword-history";
import type { BaselineMovementStats } from "@/lib/keyword-stats";
import { cn } from "@/lib/utils";

type DateRange = "7d" | "1m" | "3m" | "6m";

const DATE_RANGE_OPTIONS: { value: DateRange; label: string; days: number }[] = [
  { value: "7d", label: "7d", days: 7 },
  { value: "1m", label: "1m", days: 30 },
  { value: "3m", label: "3m", days: 90 },
  { value: "6m", label: "6m", days: 180 },
];

function filterByRange(points: MovementTimelinePoint[], days: number): MovementTimelinePoint[] {
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - days);
  const cutoffKey = cutoff.toISOString().slice(0, 10);
  return points.filter((p) => p.date >= cutoffKey);
}

const CHART_WIDTH = 1000;
const CHART_HEIGHT = 250;
const PADDING = { top: 24, right: 16, bottom: 32, left: 40 };
const TEMP_PADDING_RIGHT = 44;

export function MovementGraph({
  timeline,
  stats,
}: {
  timeline: MovementTimelinePoint[];
  stats: BaselineMovementStats;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [showTemperature, setShowTemperature] = useState(false);
  const [temperatures, setTemperatures] = useState<Record<string, number>>({});
  const [tempLoading, setTempLoading] = useState(false);
  const [tempError, setTempError] = useState("");
  const [rangeKey, setRangeKey] = useState<DateRange>("1m");

  const points = useMemo(() => {
    const base = timeline.length > 0 ? timeline : [
      {
        date: new Date().toISOString().slice(0, 10),
        label: "Today",
        improved: stats.improved,
        dropped: stats.dropped,
        unchanged: stats.unchanged,
        net: stats.improved - stats.dropped,
      },
    ];

    const rangeDays = DATE_RANGE_OPTIONS.find((o) => o.value === rangeKey)?.days ?? 30;
    const filtered = filterByRange(base, rangeDays);
    // Always show at least one point so the chart renders.
    return filtered.length > 0 ? filtered : base.slice(-1);
  }, [timeline, stats, rangeKey]);

  const dateRange = useMemo(() => {
    const dates = points.map((p) => p.date).sort();
    return { start: dates[0], end: dates[dates.length - 1] };
  }, [points]);

  useEffect(() => {
    if (!showTemperature) {
      setTempError("");
      return;
    }

    let cancelled = false;
    setTempLoading(true);
    setTempError("");

    fetch(
      `/api/weather/uk-temperature?start=${dateRange.start}&end=${dateRange.end}`,
    )
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load temperature");
        if (!cancelled) setTemperatures(data.temperatures ?? {});
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setTemperatures({});
          setTempError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) setTempLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [showTemperature, dateRange.start, dateRange.end]);

  const rightPadding = showTemperature ? TEMP_PADDING_RIGHT : PADDING.right;
  const plotWidth = CHART_WIDTH - PADDING.left - rightPadding;
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
      PADDING.top + ((yMax - point.net) / (yMax - yMin)) * plotHeight;
    return { ...point, x, y, index };
  });

  const linePath = coords.map((p) => `${p.x},${p.y}`).join(" ");

  const tempValues = points
    .map((p) => temperatures[p.date])
    .filter((v): v is number => v != null);

  const hasTemperature = showTemperature && tempValues.length > 0;
  const tempMin = hasTemperature ? Math.min(...tempValues) : 0;
  const tempMax = hasTemperature ? Math.max(...tempValues) : 0;
  const tempRange = tempMax - tempMin || 1;

  const tempCoords = hasTemperature
    ? coords
        .map((point) => {
          const temp = temperatures[point.date];
          if (temp == null) return null;
          return {
            x: point.x,
            y: PADDING.top + ((tempMax - temp) / tempRange) * plotHeight,
            temp,
            index: point.index,
          };
        })
        .filter((p): p is NonNullable<typeof p> => p != null)
    : [];

  const tempLinePath = tempCoords.map((p) => `${p.x},${p.y}`).join(" ");
  const tempPathD =
    tempCoords.length > 0
      ? `M${tempCoords.map((p) => `${p.x},${p.y}`).join(" L")}`
      : "";
  const tempAreaPath =
    tempCoords.length > 0
      ? `${tempPathD} L${tempCoords[tempCoords.length - 1].x},${PADDING.top + plotHeight} L${tempCoords[0].x},${PADDING.top + plotHeight} Z`
      : "";

  const tempTicks = hasTemperature
    ? [tempMax, Math.round((tempMax + tempMin) / 2), tempMin].filter(
        (v, i, arr) => arr.indexOf(v) === i,
      )
    : [];

  const yTicks = [yMax, 0, yMin].filter((v, i, arr) => arr.indexOf(v) === i);

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
        <div className="flex items-center gap-3">
          <div className="text-[10px] uppercase tracking-wide text-muted">
            Movement from baseline
          </div>
          <div className="flex items-center gap-1">
            {DATE_RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRangeKey(opt.value)}
                className={cn(
                  "rounded px-2 py-0.5 text-xs transition-colors",
                  rangeKey === opt.value
                    ? "bg-surface-hover text-foreground"
                    : "text-muted hover:text-foreground",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowTemperature((on) => !on)}
            className={cn(
              "rounded border px-2 py-0.5 text-xs transition-colors",
              showTemperature
                ? "border-amber/50 bg-amber/10 text-amber"
                : "border-border text-muted hover:text-foreground",
            )}
            aria-pressed={showTemperature}
          >
            UK temp
          </button>
          {showTemperature && tempLoading && (
            <span className="text-xs text-muted">Loading…</span>
          )}
          {showTemperature && tempError && (
            <span className="text-xs text-red">{tempError}</span>
          )}
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
          {hasTemperature && (
            <span className="text-amber tabular-nums">— UK mean temp (°C)</span>
          )}
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
              PADDING.top + ((yMax - tick) / (yMax - yMin)) * plotHeight;
            return (
              <line
                key={tick}
                x1={PADDING.left}
                y1={y}
                x2={CHART_WIDTH - rightPadding}
                y2={y}
                stroke="var(--border)"
                strokeWidth={tick === 0 ? 1 : 0.5}
              />
            );
          })}

          {yTicks.map((tick) => {
            const y =
              PADDING.top + ((yMax - tick) / (yMax - yMin)) * plotHeight;
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

          {hasTemperature && tempAreaPath && (
            <path d={tempAreaPath} fill="var(--amber)" opacity={0.08} />
          )}

          {hasTemperature && tempCoords.length > 1 && (
            <polyline
              fill="none"
              stroke="var(--amber)"
              strokeWidth={1.5}
              points={tempLinePath}
              opacity={0.75}
            />
          )}

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

          {hasTemperature &&
            tempCoords.map((point) => (
              <circle
                key={`temp-${point.index}`}
                cx={point.x}
                cy={point.y}
                r={hover === point.index ? 4 : 3}
                fill="var(--amber)"
                stroke="var(--background)"
                strokeWidth={1.5}
                onMouseEnter={() => setHover(point.index)}
              />
            ))}

          {tempTicks.map((tick) => {
            const y =
              PADDING.top + ((tempMax - tick) / tempRange) * plotHeight;
            return (
              <text
                key={`temp-${tick}`}
                x={CHART_WIDTH - rightPadding + 8}
                y={y + 4}
                textAnchor="start"
                fill="var(--amber)"
                fontSize={10}
                opacity={0.85}
              >
                {tick}°
              </text>
            );
          })}

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
            {showTemperature && temperatures[coords[hover].date] != null && (
              <div className="mt-1 text-amber tabular-nums">
                {temperatures[coords[hover].date]}°C UK mean
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
