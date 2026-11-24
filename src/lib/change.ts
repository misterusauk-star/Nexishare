/** Change from `previous` to `current` in whole percent, or null when there is nothing to compare with (previous is 0). */
export function percentChange(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** One plain-English line for a change, e.g. "12% more than the previous 30 days". */
export function describeChange(current: number, previous: number, periodDays: number): string {
  const label = `the previous ${periodDays === 365 ? "year" : `${periodDays} days`}`;
  if (previous <= 0) return current > 0 ? `New: nothing in ${label}` : `Nothing in ${label} either`;
  const pct = percentChange(current, previous) ?? 0;
  if (pct === 0) return `Same as ${label}`;
  return `${Math.abs(pct)}% ${pct > 0 ? "more" : "less"} than ${label}`;
}
