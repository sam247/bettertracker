import { getMovement } from "@/lib/keyword-stats";
import type { Keyword } from "@/lib/db/schema";

export function ChangeCell({ keyword }: { keyword: Keyword }) {
  const movement = getMovement(keyword);

  if (movement === null || movement === 0) {
    return <span className="text-sm text-muted">—</span>;
  }

  if (movement > 0) {
    return (
      <span className="text-base font-semibold tabular-nums text-green">
        ▲ +{movement}
      </span>
    );
  }

  return (
    <span className="text-base font-semibold tabular-nums text-red">
      ▼ {movement}
    </span>
  );
}
