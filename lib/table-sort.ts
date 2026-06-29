export type SortDirection = "asc" | "desc";

export type SortState<K extends string> = {
  key: K;
  direction: SortDirection;
};

export function toggleSort<K extends string>(
  current: SortState<K> | null,
  key: K,
  defaultDirection: SortDirection = "asc",
): SortState<K> {
  if (current?.key === key) {
    return { key, direction: current.direction === "asc" ? "desc" : "asc" };
  }
  return { key, direction: defaultDirection };
}

export function compareText(a: string, b: string, asc: boolean): number {
  const result = a.localeCompare(b, undefined, { sensitivity: "base" });
  return asc ? result : -result;
}

export function compareNumber(
  a: number | null | undefined,
  b: number | null | undefined,
  asc: boolean,
  nullValue = asc ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY,
): number {
  const va = a ?? nullValue;
  const vb = b ?? nullValue;
  return asc ? va - vb : vb - va;
}

export function compareDate(
  a: Date | string | null | undefined,
  b: Date | string | null | undefined,
  asc: boolean,
): number {
  const ta = a ? new Date(a).getTime() : 0;
  const tb = b ? new Date(b).getTime() : 0;
  return asc ? ta - tb : tb - ta;
}

export const FREQUENCY_ORDER: Record<string, number> = {
  daily: 1,
  weekly: 2,
  monthly: 3,
};
