"use client";

import { useEffect, useRef } from "react";

/** Ranking cron runs at :01 each hour; refresh shortly after so credits reflect new usage. */
const POST_CRON_REFRESH_MINUTE_UTC = 3;

export function msUntilNextPostCronRefresh(): number {
  const now = Date.now();
  const next = new Date();
  next.setUTCSeconds(0, 0);
  next.setUTCMinutes(POST_CRON_REFRESH_MINUTE_UTC, 0, 0);
  if (next.getTime() <= now) {
    next.setUTCHours(next.getUTCHours() + 1);
  }
  return next.getTime() - now;
}

export function usePostCronRefresh(onRefresh: () => void) {
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    function refreshIfVisible() {
      if (document.visibilityState === "visible") {
        onRefreshRef.current();
      }
    }

    function schedule() {
      timeoutId = setTimeout(() => {
        refreshIfVisible();
        schedule();
      }, msUntilNextPostCronRefresh());
    }

    schedule();

    window.addEventListener("focus", refreshIfVisible);
    document.addEventListener("visibilitychange", refreshIfVisible);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("focus", refreshIfVisible);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, []);
}
