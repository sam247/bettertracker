export function ProjectMovementCell({ net }: { net: number }) {
  if (net === 0) {
    return <span className="text-sm text-muted">—</span>;
  }

  if (net > 0) {
    return (
      <span className="text-sm font-semibold tabular-nums text-green">
        ▲ +{net}
      </span>
    );
  }

  return (
    <span className="text-sm font-semibold tabular-nums text-red">
      ▼ {net}
    </span>
  );
}
