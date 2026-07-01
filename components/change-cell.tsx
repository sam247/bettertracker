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
      <span className="inline-flex items-center justify-center text-muted">
        <Spinner className="h-3.5 w-3.5" />
      </span>
    );
  }

  const movement = getMovement(keyword);

  if (movement === null || movement === 0) {
    return <span className="text-sm text-muted">—</span>;
  }

  if (movement > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-sm tabular-nums text-green">
        <span className="text-[9px] leading-none" aria-hidden>
          ▲
        </span>
        +{movement}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-0.5 text-sm tabular-nums text-red">
      <span className="text-[9px] leading-none" aria-hidden>
        ▼
      </span>
      {movement}
    </span>
  );
}
