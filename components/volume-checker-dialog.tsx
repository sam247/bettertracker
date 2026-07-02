"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatSearchVolume } from "@/lib/format-search-volume";
import { cn } from "@/lib/utils";

type VolumeResult = {
  keyword: string;
  volume: number | null;
  competition: string | null;
  competitionIndex: number | null;
};

function competitionLabel(
  competition: string | null,
  index: number | null,
): { label: string; className: string } {
  const raw = competition?.toUpperCase();
  if (raw === "LOW") return { label: "Low", className: "text-green" };
  if (raw === "MEDIUM") return { label: "Med", className: "text-amber" };
  if (raw === "HIGH") return { label: "High", className: "text-red" };
  if (index !== null) {
    if (index < 34) return { label: "Low", className: "text-green" };
    if (index < 67) return { label: "Med", className: "text-amber" };
    return { label: "High", className: "text-red" };
  }
  return { label: "—", className: "text-muted" };
}

export function VolumeCheckerDialog({
  projectId,
}: {
  projectId: string;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<VolumeResult[] | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && results === null) {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [open, results]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function close() {
    setOpen(false);
    setInput("");
    setError("");
    setResults(null);
  }

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault();
    const keywords = input
      .split("\n")
      .map((k) => k.trim())
      .filter(Boolean);

    if (keywords.length === 0) return;
    if (keywords.length > 100) {
      setError("Maximum 100 keywords per check.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/projects/${projectId}/check-volumes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Volume check failed.");
        return;
      }

      setResults(data.results as VolumeResult[]);
    } catch {
      setError("Request failed — please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleCheckMore() {
    setResults(null);
    setInput("");
    setError("");
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  const keywordCount = input
    .split("\n")
    .map((k) => k.trim())
    .filter(Boolean).length;

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => setOpen(true)}
      >
        Check volumes
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="flex w-full max-w-lg flex-col rounded border border-border bg-surface">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-base font-medium">Check keyword volumes</h2>
              <button
                type="button"
                onClick={close}
                className="text-muted hover:text-foreground text-lg leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              {results === null ? (
                <form onSubmit={handleCheck} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs text-muted">
                      Keywords to check — one per line (max 100)
                    </label>
                    <Textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      rows={8}
                      placeholder={"keyword one\nkeyword two\nkeyword three"}
                    />
                  </div>
                  {error && <p className="text-sm text-red">{error}</p>}
                  <div className="flex items-center gap-3">
                    <Button
                      type="submit"
                      disabled={loading || keywordCount === 0}
                    >
                      {loading
                        ? "Checking…"
                        : keywordCount > 0
                          ? `Check ${keywordCount} keyword${keywordCount === 1 ? "" : "s"}`
                          : "Check volumes"}
                    </Button>
                    <Button type="button" variant="ghost" onClick={close}>
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="max-h-[400px] overflow-y-auto rounded border border-border">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-surface">
                        <tr className="border-b border-border text-left text-xs text-muted">
                          <th className="px-3 py-2 font-medium">Keyword</th>
                          <th className="px-3 py-2 text-right font-medium tabular-nums">
                            Volume
                          </th>
                          <th className="px-3 py-2 text-right font-medium">
                            Competition
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {results
                          .slice()
                          .sort((a, b) => (b.volume ?? -1) - (a.volume ?? -1))
                          .map((r) => {
                            const comp = competitionLabel(
                              r.competition,
                              r.competitionIndex,
                            );
                            return (
                              <tr
                                key={r.keyword}
                                className="border-b border-border/50 last:border-0"
                              >
                                <td className="px-3 py-2 font-medium">
                                  {r.keyword}
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums text-muted">
                                  {formatSearchVolume(r.volume)}
                                </td>
                                <td
                                  className={cn(
                                    "px-3 py-2 text-right text-xs",
                                    comp.className,
                                  )}
                                >
                                  {comp.label}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted">
                    {results.length} keyword{results.length === 1 ? "" : "s"} ·
                    Google Ads API estimate · volumes are monthly averages
                  </p>
                  <div className="flex gap-2">
                    <Button type="button" onClick={handleCheckMore}>
                      Check more
                    </Button>
                    <Button type="button" variant="ghost" onClick={close}>
                      Done
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
