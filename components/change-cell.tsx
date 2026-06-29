export function ChangeCell({
  current,
  previous,
}: {
  current: number | null;
  previous: number | null;
}) {
  if (current === null || previous === null) {
    return <span className="text-muted">—</span>;
  }

  const change = previous - current;

  if (change === 0) {
    return <span className="text-muted">—</span>;
  }

  if (change > 0) {
    return (
      <span className="font-semibold text-green">
        +{change}
      </span>
    );
  }

  return (
    <span className="font-semibold text-red">
      {change}
    </span>
  );
}
