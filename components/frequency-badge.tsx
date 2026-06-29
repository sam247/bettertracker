export function FrequencyBadge({ frequency }: { frequency: string }) {
  const label = frequency.charAt(0).toUpperCase() + frequency.slice(1);
  return (
    <span className="inline-block rounded border border-border px-1.5 py-0.5 text-[10px] tracking-wide text-muted">
      {label}
    </span>
  );
}
