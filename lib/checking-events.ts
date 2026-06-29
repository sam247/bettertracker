export const CHECKING_STARTED = "bettertracker:checking-started";
export const CHECKING_ENDED = "bettertracker:checking-ended";
export const RUN_DUE_CHECKS = "bettertracker:run-due-checks";

export function dispatchCheckingStarted(ids: string[]) {
  window.dispatchEvent(
    new CustomEvent(CHECKING_STARTED, { detail: { ids } }),
  );
}

export function dispatchCheckingEnded(ids: string[]) {
  window.dispatchEvent(new CustomEvent(CHECKING_ENDED, { detail: { ids } }));
}

export function dispatchRunDueChecks() {
  window.dispatchEvent(new CustomEvent(RUN_DUE_CHECKS));
}
