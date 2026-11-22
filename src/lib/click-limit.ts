// Pure helpers for the optional per-link click limit (no DB).
export const MAX_CLICK_LIMIT = 1_000_000_000;

/** True when a link has a limit and has used it up. No limit (null/undefined) never runs out. */
export function clicksExhausted(maxClicks: number | null | undefined, used: number | null | undefined): boolean {
  if (maxClicks === null || maxClicks === undefined) return false;
  return Number(used ?? 0) >= Number(maxClicks);
}

/** Clicks left, or null when there is no limit. */
export function clicksLeft(maxClicks: number | null | undefined, used: number | null | undefined): number | null {
  if (maxClicks === null || maxClicks === undefined) return null;
  return Math.max(0, Number(maxClicks) - Number(used ?? 0));
}
