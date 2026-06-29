"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/spinner";
import type { Group } from "@/lib/db/schema";

export function GroupsManager({
  projectId,
  groups,
  keywordCounts = {},
}: {
  projectId: string;
  groups: Group[];
  keywordCounts?: Record<string, number>;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleDelete(group: Group) {
    if (groups.length <= 1) return;

    const count = keywordCounts[group.id] ?? 0;
    const targetName =
      groups.find((row) => row.id !== group.id && row.name === "Default")
        ?.name ??
      groups.find((row) => row.id !== group.id)?.name ??
      "another group";

    const message =
      count > 0
        ? `Delete "${group.name}"?\n\n${count} keyword${count === 1 ? "" : "s"} will be moved to ${targetName}.`
        : `Delete "${group.name}"?`;

    if (!confirm(message)) return;

    setDeletingId(group.id);
    setError("");
    try {
      const res = await fetch(
        `/api/projects/${projectId}/groups/${group.id}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Could not delete group");
        return;
      }
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setAdding(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Could not create group");
        return;
      }
      setName("");
      router.refresh();
    } finally {
      setAdding(false);
    }
  }

  return (
    <div>
      <h2 className="mb-2 text-sm font-medium">Keyword groups</h2>
      <p className="mb-4 text-xs text-muted">
        New projects start with a Default group. Add more here, then assign
        keywords via bulk actions or the keyword detail panel. Deleting a group
        moves its keywords to Default, or another group if Default is removed.
      </p>
      {groups.length > 0 ? (
        <ul className="mb-4 divide-y divide-border rounded border border-border">
          {groups.map((group) => {
            const count = keywordCounts[group.id] ?? 0;
            const isDeleting = deletingId === group.id;

            return (
              <li
                key={group.id}
                className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
              >
                <div>
                  <span className="text-foreground">{group.name}</span>
                  <span className="ml-2 text-xs text-muted">
                    {count} keyword{count === 1 ? "" : "s"}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  disabled={groups.length <= 1 || isDeleting}
                  onClick={() => void handleDelete(group)}
                  title={
                    groups.length <= 1
                      ? "Each project needs at least one group"
                      : undefined
                  }
                >
                  {isDeleting ? <Spinner /> : "Delete"}
                </Button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mb-4 text-sm text-muted">No groups yet.</p>
      )}
      <form onSubmit={handleSubmit} className="flex max-w-sm items-end gap-2">
        <div className="flex-1">
          <label htmlFor="group-name" className="mb-1 block text-xs text-muted">
            New group
          </label>
          <Input
            id="group-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Locations"
            disabled={adding}
          />
        </div>
        <Button type="submit" size="sm" disabled={adding || !name.trim()}>
          {adding ? <Spinner /> : "Add"}
        </Button>
      </form>
      {error && <p className="mt-2 text-xs text-red">{error}</p>}
    </div>
  );
}
