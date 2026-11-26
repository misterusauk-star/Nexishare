// Destination health: pure rules (no network, no database).

export type Health = "ok" | "broken";
export interface CheckResult { status: number | null; error?: "dns" | "refused" | "timeout" | "blocked" | "other" }

/**
 * Is the destination working? Any answer below 400 is fine. 401, 403, 405, 429 and 999 mean the site is there but does not
 * like automated visits, so they count as working (otherwise big sites would raise false alarms). 404, 410 and 5xx are broken,
 * and so are a missing domain or a refused connection. A timeout or a blocked target is not counted either way (null).
 */
export function classify(r: CheckResult): Health | null {
  if (r.status != null) {
    if (r.status < 400 || [401, 403, 405, 429, 999].includes(r.status)) return "ok";
    return "broken";
  }
  if (r.error === "dns" || r.error === "refused") return "broken";
  return null;
}

export const FAILS_TO_BREAK = 2;

/** One more check result: a link becomes "broken" only after two failures in a row, and an alert goes out once, when it flips. */
export function nextHealth(prev: { status: Health | null; fails: number }, r: CheckResult): { status: Health | null; fails: number; alert: boolean } {
  const c = classify(r);
  if (c === null) return { status: prev.status, fails: prev.fails, alert: false };
  if (c === "ok") return { status: "ok", fails: 0, alert: false };
  const fails = Math.min(255, prev.fails + 1);
  const broken = fails >= FAILS_TO_BREAK;
  return { status: broken ? "broken" : prev.status, fails, alert: broken && prev.status !== "broken" };
}

/** Addresses a server must never visit on a visitor's behalf: private, loopback, link-local and similar ranges. */
export function isPrivateIp(ip: string): boolean {
  const v = ip.toLowerCase();
  if (v.includes(":")) {
    if (v === "::1" || v === "::") return true;
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIp(mapped[1]);
    return /^f[cd]/.test(v) || /^fe[89ab]/.test(v) || v.startsWith("ff");
  }
  const p = v.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = p;
  return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
}
