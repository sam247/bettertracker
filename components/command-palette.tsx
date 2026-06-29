"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import "@/lib/commands/core-commands";
import {
  extractProjectId,
  filterPaletteItems,
} from "@/lib/commands/registry";
import type {
  CommandContext,
  CommandPaletteData,
  PaletteItem,
} from "@/lib/commands/types";
import { cn } from "@/lib/utils";

function isMac() {
  if (typeof navigator === "undefined") return true;
  return /Mac|iPhone|iPad/.test(navigator.platform);
}

export function CommandPalette({
  open,
  onClose,
  data,
}: {
  open: boolean;
  onClose: () => void;
  data: CommandPaletteData | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const ctx: CommandContext = useMemo(
    () => ({
      pathname,
      projectId: extractProjectId(pathname),
      router: {
        push: (href) => router.push(href),
        refresh: () => router.refresh(),
      },
    }),
    [pathname, router],
  );

  const items = useMemo(
    () =>
      data
        ? filterPaletteItems(query, ctx, data.projects, data.keywords)
        : [],
    [query, ctx, data],
  );

  const runItem = useCallback(
    async (item: PaletteItem) => {
      onClose();
      setQuery("");
      await item.run(ctx);
    },
    [ctx, onClose],
  );

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelectedIndex(0);
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, Math.max(items.length - 1, 0)));
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        return;
      }

      if (event.key === "Enter" && items[selectedIndex]) {
        event.preventDefault();
        void runItem(items[selectedIndex]);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, items, selectedIndex, onClose, runItem]);

  useEffect(() => {
    const list = listRef.current;
    const selected = list?.querySelector("[data-selected='true']");
    selected?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!open) return null;

  let lastGroup = "";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 px-4 pt-[15vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-lg border border-border bg-[#0a0a0a] shadow-sm">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a command or search…"
          className="w-full border-b border-border bg-transparent px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted"
          autoComplete="off"
          spellCheck={false}
        />

        <div ref={listRef} className="max-h-80 overflow-y-auto py-1">
          {data === null ? (
            <p className="px-4 py-6 text-center text-sm text-muted">
              Loading…
            </p>
          ) : items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted">
              No results
            </p>
          ) : (
            items.map((item, index) => {
              const showGroup = item.group !== lastGroup;
              lastGroup = item.group;

              return (
                <div key={item.id}>
                  {showGroup && (
                    <div className="px-4 pb-1 pt-2 text-[10px] uppercase tracking-wide text-muted">
                      {item.group}
                    </div>
                  )}
                  <button
                    type="button"
                    data-selected={index === selectedIndex}
                    onMouseEnter={() => setSelectedIndex(index)}
                    onClick={() => void runItem(item)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm",
                      index === selectedIndex
                        ? "bg-surface-hover text-foreground"
                        : "text-foreground",
                    )}
                  >
                    <span className="min-w-0 truncate">
                      {item.label}
                      {item.subtitle && (
                        <span className="ml-2 text-xs text-muted">
                          {item.subtitle}
                        </span>
                      )}
                    </span>
                    {item.hint && (
                      <span className="shrink-0 text-xs text-muted">
                        {item.hint}
                      </span>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[10px] text-muted">
          <span>↑↓ navigate · ↵ select · esc close</span>
          <span>{isMac() ? "⌘K" : "Ctrl+K"}</span>
        </div>
      </div>
    </div>
  );
}

export function GlobalCommandPalette() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<CommandPaletteData | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    fetch("/api/command-palette")
      .then((res) => res.json())
      .then(setData)
      .catch(() => null);
  }, [open]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const mod = isMac() ? event.metaKey : event.ctrlKey;

      if (mod && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
        return;
      }

      if (mod && event.key === ",") {
        const projectId = extractProjectId(pathname);
        if (!projectId) return;
        event.preventDefault();
        router.push(`/projects/${projectId}?edit=true`);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pathname, router]);

  return (
    <CommandPalette
      open={open}
      onClose={() => setOpen(false)}
      data={data}
    />
  );
}
