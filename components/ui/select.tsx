import { cn } from "@/lib/utils";
import type { SelectHTMLAttributes } from "react";

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "rounded border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-blue",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
