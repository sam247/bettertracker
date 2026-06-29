"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function BulkKeywordDialog({
  projectId,
  groups,
}: {
  projectId: string;
  groups: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [bulk, setBulk] = useState("");
  const [groupId, setGroupId] = useState(groups[0]?.id ?? "");
  const [frequency, setFrequency] = useState("weekly");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("Adding keywords and running initial rank checks…");

    const res = await fetch(`/api/projects/${projectId}/keywords`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bulk, groupId, frequency }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessage(data.error ?? "Failed to add keywords");
      return;
    }

    const skipped =
      data.skipped?.length > 0
        ? ` (${data.skipped.length} duplicates skipped)`
        : "";
    setMessage(`Added ${data.created.length} keywords${skipped}`);
    setBulk("");
    router.refresh();
    setTimeout(() => {
      setOpen(false);
      setMessage("");
    }, 1500);
  }

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        Add keywords
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded border border-border bg-surface p-6">
        <h2 className="mb-4 text-lg font-medium">Add keywords</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-muted">
              One keyword per line
            </label>
            <Textarea
              value={bulk}
              onChange={(e) => setBulk(e.target.value)}
              rows={8}
              placeholder="keyword one&#10;keyword two"
              required
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-muted">Group</label>
              <Select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs text-muted">Frequency</label>
              <Select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </Select>
            </div>
          </div>
          {message && (
            <p className={message.includes("Added") ? "text-green text-sm" : "text-red text-sm"}>
              {message}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Adding…" : "Add"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
