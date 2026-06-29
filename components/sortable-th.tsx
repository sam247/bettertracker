"use client";

import { cn } from "@/lib/utils";
import type { SortDirection } from "@/lib/table-sort";

export function SortableTh<K extends string>({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  align = "left",
  className,
}: {
  label: string;
  sortKey: K;
  activeKey: K | null;
  direction: SortDirection;
  onSort: (key: K) => void;
  align?: "left" | "center" | "right";
  className?: string;
}) {
  const active = activeKey === sortKey;

  return (
    <th
      className={cn(
        "pb-2 font-medium",
        align === "center" && "text-center",
        align === "right" && "text-right",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-0.5 hover:text-foreground",
          align === "center" && "mx-auto",
          align === "right" && "ml-auto",
          active ? "text-foreground" : "text-muted",
        )}
      >
        <span>{label}</span>
        <span className="inline-block w-3 text-[10px] leading-none tabular-nums">
          {active ? (direction === "asc" ? "↑" : "↓") : ""}
        </span>
      </button>
    </th>
  );
}
