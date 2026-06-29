export type Frequency = "daily" | "weekly" | "monthly";

const LONDON_TZ = "Europe/London";
const CHECK_HOUR = 0;
const CHECK_MINUTE = 1;

type LondonParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function getLondonParts(date: Date): LondonParts {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)!.value);

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
  };
}

function londonInstant(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  const windowStart = Date.UTC(year, month - 1, day - 1, 0, 0, 0);
  const windowEnd = Date.UTC(year, month - 1, day + 1, 23, 59, 0);

  for (let t = windowStart; t <= windowEnd; t += 60_000) {
    const candidate = new Date(t);
    const parts = getLondonParts(candidate);
    if (
      parts.year === year &&
      parts.month === month &&
      parts.day === day &&
      parts.hour === hour &&
      parts.minute === minute
    ) {
      return candidate;
    }
  }

  throw new Error(`Could not resolve London time ${year}-${month}-${day} ${hour}:${minute}`);
}

function addLondonCalendarDays(year: number, month: number, day: number, days: number) {
  const anchor = londonInstant(year, month, day, 12, 0);
  return getLondonParts(new Date(anchor.getTime() + days * 86_400_000));
}

/** Next scheduled check at 00:01 UK time after `from`. */
export function getNextCheckAt(from: Date, frequency: Frequency): Date {
  const { year, month, day } = getLondonParts(from);
  const increment = frequency === "daily" ? 1 : frequency === "weekly" ? 7 : 30;
  const next = addLondonCalendarDays(year, month, day, increment);
  let candidate = londonInstant(
    next.year,
    next.month,
    next.day,
    CHECK_HOUR,
    CHECK_MINUTE,
  );

  if (candidate.getTime() <= from.getTime()) {
    const later = addLondonCalendarDays(next.year, next.month, next.day, increment);
    candidate = londonInstant(
      later.year,
      later.month,
      later.day,
      CHECK_HOUR,
      CHECK_MINUTE,
    );
  }

  return candidate;
}

export function formatRelative(date: Date | string | null): string {
  if (!date) return "Never";
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function isDue(nextCheckAt: Date | string | null): boolean {
  if (!nextCheckAt) return true;
  const d = typeof nextCheckAt === "string" ? new Date(nextCheckAt) : nextCheckAt;
  return d.getTime() <= Date.now();
}

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
