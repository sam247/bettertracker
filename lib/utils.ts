export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function truncateUrl(url: string, max = 40): string {
  if (url.length <= max) return url;
  return `${url.slice(0, max)}…`;
}

export function urlPath(url: string | null): string {
  if (!url) return "";
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return `${parsed.pathname}${parsed.search}` || "/";
  } catch {
    return url.startsWith("/") ? url : `/${url}`;
  }
}
