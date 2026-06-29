import { urlPath } from "@/lib/utils";
import { Spinner } from "@/components/spinner";

export function RankingUrlCell({
  url,
  checking = false,
}: {
  url: string | null;
  checking?: boolean;
}) {
  if (checking && !url) {
    return (
      <span className="inline-flex text-muted">
        <Spinner className="h-3.5 w-3.5" />
      </span>
    );
  }

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
