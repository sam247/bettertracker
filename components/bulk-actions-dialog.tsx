"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Tab = "add" | "delete";

export function BulkActionsDialog({
  projectId,
  groups,
  selectedIds = [],
  onClearSelection,
}: {
  projectId: string;
  groups: { id: string; name: string }[];
  selectedIds?: string[];
  onClearSelection?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("add");
  const [bulk, setBulk] = useState("");
  const [groupId, setGroupId] = useState(groups[0]?.id ?? "");
  const [frequency, setFrequency] = useState("weekly");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function close() {
    setOpen(false);
    setMessage("");
    setBulk("");
    setTab("add");
  }

  async function handleAdd(e: React.FormEvent) {
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
    setTimeout(close, 1500);
  }

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const hasSelection = selectedIds.length > 0;
    const hasPaste = bulk.trim().length > 0;

    if (!hasSelection && !hasPaste) {
      setMessage("Select keywords in the table or paste keywords to delete");
      setLoading(false);
      return;
    }

    const count = hasSelection ? selectedIds.length : bulk.split("\n").filter((l) => l.trim()).length;
    if (!confirm(`Delete ${count} keyword${count === 1 ? "" : "s"}?`)) {
      setLoading(false);
      return;
    }

    const res = await fetch(`/api/projects/${projectId}/keywords/bulk-delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        hasSelection && !hasPaste
          ? { ids: selectedIds }
          : { keywords: bulk },
      ),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessage(data.error ?? "Failed to delete keywords");
      return;
    }

    const notFound =
      data.notFound?.length > 0
        ? ` (${data.notFound.length} not found)`
        : "";
    setMessage(`Deleted ${data.deleted} keywords${notFound}`);
    setBulk("");
    onClearSelection?.();
    router.refresh();
    setTimeout(close, 1500);
  }

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        Bulk actions
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded border border-border bg-surface p-6">
        <h2 className="mb-4 text-lg font-medium">Bulk actions</h2>

        <div className="mb-4 flex gap-1 border-b border-border">
          <button
            type="button"
            onClick={() => { setTab("add"); setMessage(""); }}
            className={cn(
              "px-3 py-2 text-sm",
              tab === "add"
                ? "border-b border-foreground text-foreground"
                : "text-muted hover:text-foreground",
            )}
          >
            Add keywords
          </button>
          <button
            type="button"
            onClick={() => { setTab("delete"); setMessage(""); }}
            className={cn(
              "px-3 py-2 text-sm",
              tab === "delete"
                ? "border-b border-foreground text-foreground"
                : "text-muted hover:text-foreground",
            )}
          >
            Delete keywords
          </button>
        </div>

        {tab === "add" ? (
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs text-muted">
                One keyword per line
              </label>
              <Textarea
                value={bulk}
                onChange={(e) => setBulk(e.target.value)}
                rows={8}
                placeholder={"keyword one\nkeyword two"}
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
                {loading ? "Adding…" : "Add keywords"}
              </Button>
              <Button type="button" variant="ghost" onClick={close}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleDelete} className="space-y-4">
            {selectedIds.length > 0 && (
              <p className="text-sm text-muted">
                {selectedIds.length} keyword{selectedIds.length === 1 ? "" : "s"} selected in the table.
                Paste below to delete by name instead, or delete the selection.
              </p>
            )}
            <div>
              <label className="mb-1 block text-xs text-muted">
                Keywords to delete (one per line)
              </label>
              <Textarea
                value={bulk}
                onChange={(e) => setBulk(e.target.value)}
                rows={8}
                placeholder={"keyword one\nkeyword two"}
              />
            </div>
            {message && (
              <p className={message.includes("Deleted") ? "text-green text-sm" : "text-red text-sm"}>
                {message}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                type="submit"
                variant="danger"
                disabled={loading || (selectedIds.length === 0 && !bulk.trim())}
              >
                {loading
                  ? "Deleting…"
                  : selectedIds.length > 0 && !bulk.trim()
                    ? `Delete ${selectedIds.length} selected`
                    : "Delete keywords"}
              </Button>
              <Button type="button" variant="ghost" onClick={close}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
