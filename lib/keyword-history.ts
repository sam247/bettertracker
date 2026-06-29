export function buildPositionHistory(
  rows: { keywordId: string; position: number | null }[],
): Record<string, (number | null)[]> {
  const grouped = new Map<string, (number | null)[]>();

  for (const row of rows) {
    const list = grouped.get(row.keywordId) ?? [];
    if (list.length < 10) {
      list.push(row.position);
      grouped.set(row.keywordId, list);
    }
  }

  const result: Record<string, (number | null)[]> = {};
  for (const [id, list] of grouped) {
    result[id] = [...list].reverse();
  }
  return result;
}
