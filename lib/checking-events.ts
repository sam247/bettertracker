export const RUN_DUE_CHECKS = "bettertracker:run-due-checks";

export function dispatchRunDueChecks() {
  window.dispatchEvent(new CustomEvent(RUN_DUE_CHECKS));
}
