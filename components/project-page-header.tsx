"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { KeywordStatsBar } from "@/components/keyword-stats-bar";
import { formatRegionDisplay } from "@/lib/format-region";
import { computeKeywordStats } from "@/lib/keyword-stats";
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

  const stats = useMemo(() => computeKeywordStats(keywords), [keywords]);

  async function runDueChecks() {
    setRunningDue(true);
    await fetch(`/api/projects/${projectId}/run-due-checks`, {
      method: "POST",
    });
    setRunningDue(false);
    router.refresh();
  }

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
