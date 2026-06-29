export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function truncateUrl(url: string, max = 40): string {
  if (url.length <= max) return url;
  return `${url.slice(0, max)}…`;
}
