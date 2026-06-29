"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/spinner";
import { cn } from "@/lib/utils";
import type { Keyword } from "@/lib/db/schema";

export function KeywordActionsMenu({
  keyword,
  checking,
  onCheck,
  onOpenChange,
}: {
  keyword: Keyword;
  checking: boolean;
  onCheck: () => void;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [acting, setActing] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  function setMenuOpen(next: boolean) {
    setOpen(next);
    onOpenChange?.(next);
  }

  useEffect(() => {
    if (!open) return;

    function handleClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function toggleEnabled(enabled: boolean) {
    setActing(true);
    await fetch(`/api/keywords/${keyword.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    setActing(false);
    setMenuOpen(false);
    router.refresh();
  }

  async function deleteKeyword() {
    if (!confirm(`Delete "${keyword.keyword}"?`)) return;

    setActing(true);
    await fetch(`/api/keywords/${keyword.id}`, { method: "DELETE" });
    setActing(false);
    setMenuOpen(false);
    router.refresh();
  }

  function handleCheck() {
    setMenuOpen(false);
    onCheck();
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={`Actions for ${keyword.keyword}`}
        disabled={checking || acting}
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen(!open);
        }}
        className={cn(
          "inline-flex h-7 w-7 items-center justify-center rounded text-muted",
          "hover:bg-surface-hover hover:text-foreground",
          open && "bg-surface-hover text-foreground",
        )}
      >
        {checking ? (
          <Spinner className="h-3.5 w-3.5" />
        ) : (
          <span className="text-base leading-none tracking-widest">···</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 min-w-[120px] rounded border border-border bg-surface py-1 shadow-none">
          <button
            type="button"
            disabled={acting}
            onClick={(e) => {
              e.stopPropagation();
              handleCheck();
            }}
            className="block w-full px-3 py-1.5 text-left text-sm hover:bg-surface-hover"
          >
            Check
          </button>
          <button
            type="button"
            disabled={acting || keyword.enabled}
            onClick={(e) => {
              e.stopPropagation();
              void toggleEnabled(true);
            }}
            className="block w-full px-3 py-1.5 text-left text-sm hover:bg-surface-hover disabled:opacity-40"
          >
            Enable
          </button>
          <button
            type="button"
            disabled={acting || !keyword.enabled}
            onClick={(e) => {
              e.stopPropagation();
              void toggleEnabled(false);
            }}
            className="block w-full px-3 py-1.5 text-left text-sm hover:bg-surface-hover disabled:opacity-40"
          >
            Disable
          </button>
          <button
            type="button"
            disabled={acting}
            onClick={(e) => {
              e.stopPropagation();
              void deleteKeyword();
            }}
            className="block w-full px-3 py-1.5 text-left text-sm text-red hover:bg-surface-hover"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
