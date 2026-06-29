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
}: {
  projectId: string;
  groups: Group[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

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
        keywords via bulk actions or the keyword detail panel.
      </p>
      {groups.length > 0 ? (
        <ul className="mb-4 space-y-1 text-sm">
          {groups.map((group) => (
            <li key={group.id} className="text-foreground">
              {group.name}
            </li>
          ))}
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
