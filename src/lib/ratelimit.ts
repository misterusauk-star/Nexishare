import { exec, queryOne } from "./db";

/**
 * Fixed-window counter stored in MySQL so limits hold across restarts and processes.
 * Returns true when the action is allowed (and counts it).
 */
export async function rateLimit(bucket: string, max: number, windowSec: number): Promise<boolean> {
  const win = Math.floor(Date.now() / 1000 / windowSec) * windowSec;
  const b = bucket.slice(0, 190);
  await exec(
    "INSERT INTO rate_limits (bucket, window_start, hits) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE hits = hits + 1",
    [b, win],
  );
  const row = await queryOne<{ hits: number }>("SELECT hits FROM rate_limits WHERE bucket = ? AND window_start = ?", [b, win]);
  // Opportunistic cleanup (~1% of calls) keeps the table tiny on shared hosting.
  if (Math.random() < 0.01) {
    exec("DELETE FROM rate_limits WHERE window_start < ?", [Math.floor(Date.now() / 1000) - 86_400]).catch(() => {});
  }
  return (row?.hits ?? 1) <= max;
}

/** Reads a counter without adding to it: true while the bucket is still under its limit. */
export async function rateLimitOpen(bucket: string, max: number, windowSec: number): Promise<boolean> {
  const win = Math.floor(Date.now() / 1000 / windowSec) * windowSec;
  const row = await queryOne<{ hits: number }>("SELECT hits FROM rate_limits WHERE bucket = ? AND window_start = ?", [bucket.slice(0, 190), win]);
  return (row?.hits ?? 0) < max;
}

/** Adds one to a counter (used for failures only, so successful sign-ins never lock anyone out). */
export async function rateLimitHit(bucket: string, windowSec: number): Promise<void> {
  const win = Math.floor(Date.now() / 1000 / windowSec) * windowSec;
  await exec("INSERT INTO rate_limits (bucket, window_start, hits) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE hits = hits + 1", [bucket.slice(0, 190), win]);
}
