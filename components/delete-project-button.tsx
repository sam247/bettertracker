"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/spinner";

export function DeleteProjectButton({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const confirmed = confirm(
      `Permanently delete "${projectName}"?\n\nThis removes all keywords, rank history, and checks. This cannot be undone.`,
    );
    if (!confirmed) return;

    setLoading(true);

    const res = await fetch(`/api/projects/${projectId}/delete`, {
      method: "DELETE",
    });

    if (!res.ok) {
      setLoading(false);
      alert("Failed to delete project");
      return;
    }

    router.push("/projects");
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="danger"
      onClick={handleDelete}
      disabled={loading}
    >
      {loading ? (
        <span className="flex items-center gap-1.5">
          <Spinner /> Deleting…
        </span>
      ) : (
        "Delete project"
      )}
    </Button>
  );
}
