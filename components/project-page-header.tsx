"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { KeywordStatsBar } from "@/components/keyword-stats-bar";
import { useChecking } from "@/components/checking-context";
import { formatRegionDisplay } from "@/lib/format-region";
import { computeKeywordStats } from "@/lib/keyword-stats";
import { isDue } from "@/lib/dates";
import { RUN_DUE_CHECKS } from "@/lib/checking-events";
import type { Keyword } from "@/lib/db/schema";

export function ProjectPageHeader({
  projectId,
  project,
  keywords,
}: {
  projectId: string;
  project: {
    name: string;
    targetDomain: string;
    region: string;
    device: string;
  };
  keywords: Keyword[];
}) {
  const router = useRouter();
  const [runningDue, setRunningDue] = useState(false);
  const { startChecking, stopChecking } = useChecking();

  const stats = useMemo(() => computeKeywordStats(keywords), [keywords]);

  const runDueChecks = useCallback(async () => {
    const dueIds = keywords
      .filter((k) => k.enabled && isDue(k.nextCheckAt))
      .map((k) => k.id);

    if (dueIds.length === 0) return;

    startChecking(dueIds);
    setRunningDue(true);
    try {
      let remaining = dueIds.length;
      while (remaining > 0) {
        const res = await fetch(`/api/projects/${projectId}/run-due-checks`, {
          method: "POST",
        });
        const data = (await res.json()) as {
          checked: number;
          remaining: number;
        };
        if (!res.ok || data.checked === 0) break;
        remaining = data.remaining;
        router.refresh();
      }
    } finally {
      stopChecking(dueIds);
      setRunningDue(false);
      router.refresh();
    }
  }, [keywords, projectId, router, startChecking, stopChecking]);

  useEffect(() => {
    function onRunDueChecks() {
      void runDueChecks();
    }

    window.addEventListener(RUN_DUE_CHECKS, onRunDueChecks);
    return () => window.removeEventListener(RUN_DUE_CHECKS, onRunDueChecks);
  }, [runDueChecks]);

  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-6">
      <div>
        <h1 className="text-xl font-medium">{project.name}</h1>
        <p className="mt-1 text-sm text-muted">
          {project.targetDomain} · {formatRegionDisplay(project.region)} ·{" "}
          {project.device}
        </p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <Link
          href={`/projects/${projectId}?edit=true`}
          className="text-sm text-blue no-underline hover:underline"
        >
          Edit
        </Link>
        <KeywordStatsBar
          stats={stats}
          runningDue={runningDue}
          onRunDueChecks={runDueChecks}
          variant="inline"
        />
      </div>
    </div>
  );
}
