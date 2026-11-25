/** The busiest hour of the day (UTC) from 24 click counts, or null when there are no clicks. Ties go to the earlier hour. */
export function busiestHour(hours: number[]): { hour: number; n: number } | null {
  let best = -1;
  hours.forEach((n, h) => { if (n > 0 && (best < 0 || n > hours[best])) best = h; });
  return best < 0 ? null : { hour: best, n: hours[best] };
}

/** 14 -> "14:00-15:00 UTC". */
export function hourLabel(h: number): string {
  const p = (x: number) => String(x % 24).padStart(2, "0");
  return `${p(h)}:00-${p(h + 1)}:00 UTC`;
}
