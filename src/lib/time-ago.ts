/** "just now", "5 minutes ago", "3 days ago"... for a past time. Returns "" for an invalid date. */
export function timeAgo(then: Date | string | number | null | undefined, now: number = Date.now()): string {
  if (then == null) return "";
  const t = new Date(then).getTime();
  if (Number.isNaN(t)) return "";
  const s = Math.max(0, Math.floor((now - t) / 1000));
  const unit = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"} ago`;
  if (s < 60) return "just now";
  if (s < 3600) return unit(Math.floor(s / 60), "minute");
  if (s < 86400) return unit(Math.floor(s / 3600), "hour");
  if (s < 86400 * 14) return unit(Math.floor(s / 86400), "day");
  if (s < 86400 * 60) return unit(Math.floor(s / (86400 * 7)), "week");
  if (s < 86400 * 365) return unit(Math.floor(s / (86400 * 30)), "month");
  return "over a year ago";
}
