export function PositionCell({ position }: { position: number | null }) {
  if (position === null) {
    return <span className="text-sm text-muted">—</span>;
  }

  return (
    <span className="text-base font-semibold tabular-nums text-foreground">
      #{position}
    </span>
  );
}
