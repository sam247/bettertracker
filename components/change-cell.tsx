import { Spinner } from "@/components/spinner";
import { getMovement } from "@/lib/keyword-stats";
import type { Keyword } from "@/lib/db/schema";

export function ChangeCell({
  keyword,
  checking = false,
}: {
  keyword: Keyword;
  checking?: boolean;
}) {
  if (checking) {
    return (
      <span className="flex w-full items-center justify-center text-muted">
        <Spinner className="h-3.5 w-3.5" />
      </span>
    );
  }

  const movement = getMovement(keyword);

  if (movement === null || movement === 0) {
    return (
      <span className="flex w-full items-center justify-center text-sm text-muted">
        —
      </span>
    );
  }

  const colorClass = movement > 0 ? "text-green" : "text-red";
  const label = movement > 0 ? `+${movement}` : String(movement);

  return (
    <span className={`flex w-full items-center ${colorClass}`}>
      <span className="flex flex-1 justify-end pr-0.5">
        <span className="text-[10px] leading-none" aria-hidden>
          {movement > 0 ? "▲" : "▼"}
        </span>
      </span>
      <span className="shrink-0 text-xs tabular-nums">{label}</span>
      <span className="flex-1" aria-hidden />
    </span>
  );
}
