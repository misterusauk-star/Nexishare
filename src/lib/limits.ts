// Pure usage-limit rules (no DB). Defaults are deliberately low; an administrator raises them globally or per user.
export type LimitKey = "api_per_minute" | "api_per_day" | "max_links" | "max_api_keys";

export const LIMIT_KEYS: LimitKey[] = ["api_per_minute", "api_per_day", "max_links", "max_api_keys"];

export const DEFAULT_LIMITS: Record<LimitKey, number> = {
  api_per_minute: 20,
  api_per_day: 1000,
  max_links: 100,
  max_api_keys: 3,
};

export const LIMIT_BOUNDS: Record<LimitKey, [number, number]> = {
  api_per_minute: [1, 10_000],
  api_per_day: [1, 10_000_000],
  max_links: [1, 10_000_000],
  max_api_keys: [1, 100],
};

export const LIMIT_LABELS: Record<LimitKey, string> = {
  api_per_minute: "API requests per minute, per key",
  api_per_day: "API requests per day, per account",
  max_links: "Total links per account",
  max_api_keys: "Active API keys per account",
};

/** Admin input: empty means "use the default" (null). Anything else must be a whole number inside the bounds. */
export function parseLimit(key: LimitKey, raw: string): { ok: true; value: number | null } | { ok: false; error: string } {
  const t = String(raw ?? "").trim();
  if (t === "") return { ok: true, value: null };
  const [lo, hi] = LIMIT_BOUNDS[key];
  if (!/^\d{1,9}$/.test(t)) return { ok: false, error: `Enter a whole number between ${lo} and ${hi}.` };
  const n = Number(t);
  if (n < lo || n > hi) return { ok: false, error: `Enter a whole number between ${lo} and ${hi}.` };
  return { ok: true, value: n };
}

/** A per-user value wins, then the site-wide value, then the built-in default. */
export function effectiveLimit(key: LimitKey, userValue: number | null | undefined, siteValue: number | null | undefined): number {
  const ok = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;
  if (ok(userValue)) return userValue;
  if (ok(siteValue)) return siteValue;
  return DEFAULT_LIMITS[key];
}
