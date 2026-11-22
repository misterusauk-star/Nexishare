// Pure scheduling helpers (no DB). Relative durations like "30m", "12h", "7d", "2w".
const UNIT_MS: Record<string, number> = { m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 };
export const MAX_DURATION_DAYS = 3650;
export const DURATION_HINT = "Use a number and a unit: 30m, 12h, 7d, 2w.";

export function parseDuration(input: string): number | null {
  const m = /^(\d{1,6})\s*([mhdw])$/i.exec(String(input).trim());
  if (!m) return null;
  const ms = Number(m[1]) * UNIT_MS[m[2].toLowerCase()];
  if (ms <= 0 || ms > MAX_DURATION_DAYS * UNIT_MS.d) return null;
  return ms;
}

export type ScheduleInput = {
  starts_at?: Date | null;
  expires_at?: Date | null;
  starts_in?: string | null;
  expires_in?: string | null;
};
export type ScheduleResult =
  | { ok: true; starts_at: Date | null; expires_at: Date | null }
  | { ok: false; field: "starts_at" | "expires_at" | "starts_in" | "expires_in"; error: string };

/**
 * Defaults: no start = live immediately (null), no expiry = never expires (null).
 * starts_in counts from now; expires_in counts from the start (or from now when there is no start).
 */
export function resolveSchedule(v: ScheduleInput, now: number = Date.now()): ScheduleResult {
  let starts: Date | null = v.starts_at ?? null;
  let expires: Date | null = v.expires_at ?? null;
  if (v.starts_in) {
    if (starts) return { ok: false, field: "starts_in", error: "Give either starts_at or starts_in, not both." };
    const ms = parseDuration(v.starts_in);
    if (ms === null) return { ok: false, field: "starts_in", error: DURATION_HINT };
    starts = new Date(now + ms);
  }
  if (v.expires_in) {
    if (expires) return { ok: false, field: "expires_in", error: "Give either expires_at or expires_in, not both." };
    const ms = parseDuration(v.expires_in);
    if (ms === null) return { ok: false, field: "expires_in", error: DURATION_HINT };
    expires = new Date((starts ? starts.getTime() : now) + ms);
  }
  if (starts && expires && expires.getTime() <= starts.getTime()) return { ok: false, field: "expires_at", error: "Expiry must be after the start date." };
  return { ok: true, starts_at: starts, expires_at: expires };
}
