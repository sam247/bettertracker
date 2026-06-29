export function buildPositionHistory(
  rows: { keywordId: string; position: number | null }[],
): Record<string, (number | null)[]> {
  const grouped = new Map<string, (number | null)[]>();

  for (const row of rows) {
    const list = grouped.get(row.keywordId) ?? [];
    list.push(row.position);
    if (list.length > 10) list.shift();
    grouped.set(row.keywordId, list);
  }

  return Object.fromEntries(grouped);
}

export function buildBaselinePositions(
  rows: { keywordId: string; position: number | null }[],
): Record<string, number | null> {
  const result: Record<string, number | null> = {};

  for (const row of rows) {
    if (!(row.keywordId in result)) {
      result[row.keywordId] = row.position;
    }
  }

  return result;
}

export interface MovementTimelinePoint {
  date: string;
  label: string;
  improved: number;
  dropped: number;
  unchanged: number;
  net: number;
}

function dateKey(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toISOString().slice(0, 10);
}

function formatTimelineLabel(iso: string): string {
  const today = dateKey(new Date());
  if (iso === today) return "Today";

  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function buildMovementTimeline(
  rows: { keywordId: string; position: number | null; createdAt: Date | string }[],
  baselines: Record<string, number | null>,
  keywordIds: string[],
): MovementTimelinePoint[] {
  const enabled = new Set(keywordIds);
  const byKeyword = new Map<
    string,
    { position: number | null; createdAt: Date }[]
  >();

  for (const row of rows) {
    if (!enabled.has(row.keywordId)) continue;

    const list = byKeyword.get(row.keywordId) ?? [];
    list.push({
      position: row.position,
      createdAt:
        typeof row.createdAt === "string"
          ? new Date(row.createdAt)
          : row.createdAt,
    });
    byKeyword.set(row.keywordId, list);
  }

  const dates = new Set<string>();
  for (const row of rows) {
    if (enabled.has(row.keywordId)) {
      dates.add(
        dateKey(
          typeof row.createdAt === "string"
            ? new Date(row.createdAt)
            : row.createdAt,
        ),
      );
    }
  }

  const sortedDates = [...dates].sort();
  if (sortedDates.length === 0) return [];

  return sortedDates.map((date) => {
    const dayEnd = new Date(`${date}T23:59:59.999Z`);
    let improved = 0;
    let dropped = 0;
    let unchanged = 0;

    for (const keywordId of keywordIds) {
      const baseline = baselines[keywordId];
      if (baseline === undefined || baseline === null) continue;

      const checks = byKeyword.get(keywordId) ?? [];
      let latest: number | null = null;

      for (const check of checks) {
        if (check.createdAt <= dayEnd && check.position !== null) {
          latest = check.position;
        }
      }

      if (latest === null) continue;

      const movement = baseline - latest;
      if (movement > 0) improved++;
      else if (movement < 0) dropped++;
      else unchanged++;
    }

    return {
      date,
      label: formatTimelineLabel(date),
      improved,
      dropped,
      unchanged,
      net: improved - dropped,
    };
  });
}

export function buildProjectAvgHistory(
  rows: {
    projectId: string;
    position: number | null;
    createdAt: Date | string;
  }[],
): Record<string, number[]> {
  const byProject = new Map<string, Map<string, number[]>>();

  for (const row of rows) {
    if (row.position === null) continue;

    const dates =
      byProject.get(row.projectId) ?? new Map<string, number[]>();
    const key = dateKey(row.createdAt);
    const list = dates.get(key) ?? [];
    list.push(row.position);
    dates.set(key, list);
    byProject.set(row.projectId, dates);
  }

  const result: Record<string, number[]> = {};

  for (const [projectId, dateMap] of byProject) {
    const sortedDates = [...dateMap.keys()].sort().slice(-10);
    result[projectId] = sortedDates.map((date) => {
      const positions = dateMap.get(date) ?? [];
      const avg = positions.reduce((sum, pos) => sum + pos, 0) / positions.length;
      return Math.round(avg * 10) / 10;
    });
  }

  return result;
}
