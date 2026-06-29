import { Spinner } from "@/components/spinner";

export function PositionCell({
  position,
  checking = false,
}: {
  position: number | null;
  checking?: boolean;
}) {
  if (checking) {
    return (
      <span className="inline-flex items-center justify-center text-muted">
        <Spinner className="h-3.5 w-3.5" />
      </span>
    );
  }

  if (position === null) {
    return <span className="text-sm text-muted">—</span>;
  }

  return (
    <span className="text-sm tabular-nums text-foreground">
      {position}
    </span>
  );
}
