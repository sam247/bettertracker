"use client";

import { useState } from "react";

export function PositionSparkline({
  positions,
}: {
  positions: (number | null)[];
}) {
  const [hover, setHover] = useState<number | null>(null);

  if (positions.length === 0) {
    return <span className="text-xs text-muted">—</span>;
  }

  const width = 56;
  const height = 20;
  const padding = 2;
  const valid = positions.filter((p): p is number => p !== null && p > 0);

  if (valid.length === 0) {
    return <span className="text-xs text-muted">—</span>;
  }

  const maxPos = Math.max(...valid, 10);
  const minPos = 1;
  const range = maxPos - minPos || 1;

  const points = positions.map((pos, index) => {
    const x =
      padding +
      (index / Math.max(positions.length - 1, 1)) * (width - padding * 2);
    const y =
      pos === null
        ? height / 2
        : padding +
          ((pos - minPos) / range) * (height - padding * 2);
    return { x, y, pos, index };
  });

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div
      className="relative inline-block"
      onMouseLeave={() => setHover(null)}
    >
      <svg
        width={width}
        height={height}
        className="text-muted"
        aria-hidden
      >
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          points={polyline}
        />
        {points.map((p) => (
          <circle
            key={p.index}
            cx={p.x}
            cy={p.y}
            r="2"
            fill="currentColor"
            onMouseEnter={() => setHover(p.index)}
          />
        ))}
      </svg>
      {hover !== null && positions[hover] !== undefined && (
        <div className="absolute -top-7 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] text-foreground">
          {positions[hover] === null ? "—" : positions[hover]}
        </div>
      )}
    </div>
  );
}
