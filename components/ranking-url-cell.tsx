import { urlPath } from "@/lib/utils";

export function RankingUrlCell({ url }: { url: string | null }) {
  if (!url) {
    return <span className="text-xs text-muted">—</span>;
  }

  const path = urlPath(url);
  const href = url.startsWith("http") ? url : `https://${url}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block max-w-[180px] truncate text-xs text-blue no-underline hover:underline"
      title={url}
      onClick={(e) => e.stopPropagation()}
    >
      {path}
    </a>
  );
}
