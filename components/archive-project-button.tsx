"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ArchiveProjectButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleArchive() {
    if (!confirm("Archive this project? Keywords will stop being checked.")) return;
    setLoading(true);
    await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    router.push("/projects");
    router.refresh();
  }

  return (
    <Button type="button" variant="danger" onClick={handleArchive} disabled={loading}>
      {loading ? "Archiving…" : "Archive project"}
    </Button>
  );
}
