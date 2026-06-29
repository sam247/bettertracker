"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface CreditsData {
  remaining: number | null;
  usedToday: number;
  estimatedMonthly: number;
  lastApiCall: {
    success: boolean;
    error: string | null;
  } | null;
}

export function CreditsPanel() {
  const [data, setData] = useState<CreditsData | null>(null);

  useEffect(() => {
    fetch("/api/credits")
      .then((r) => r.json())
      .then(setData)
      .catch(() => null);
  }, []);

  if (!data) {
    return <div className="text-xs text-muted">Loading credits…</div>;
  }

  return (
    <div className="flex items-center gap-6 text-xs text-muted">
      <span>
        Credits:{" "}
        <span className="text-foreground">
          {data.remaining ?? "—"}
        </span>
      </span>
      <span>
        Today: <span className="text-foreground">{data.usedToday}</span>
      </span>
      <span>
        Est/mo: <span className="text-foreground">{data.estimatedMonthly}</span>
      </span>
      {data.lastApiCall && (
        <span className="flex items-center gap-1.5">
          API
          <span
            className={cn(
              "inline-block h-1.5 w-1.5 rounded-full",
              data.lastApiCall.success ? "bg-green" : "bg-red",
            )}
          />
        </span>
      )}
    </div>
  );
}
