import { exec, queryOne } from "./db";
import { getSetting, setSettings } from "./settings";
import { LIMIT_KEYS, effectiveLimit, type LimitKey } from "./limits";

/** Site-wide values are stored as settings "limit_<key>". The older api_rate_limit setting still counts for the per-minute limit. */
async function siteValue(key: LimitKey): Promise<number | null> {
  const v = await getSetting(`limit_${key}`) ?? (key === "api_per_minute" ? await getSetting("api_rate_limit") : undefined);
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function siteLimits(): Promise<Record<LimitKey, number | null>> {
  const out = {} as Record<LimitKey, number | null>;
  for (const k of LIMIT_KEYS) out[k] = await siteValue(k);
  return out;
}

export async function saveSiteLimits(values: Record<LimitKey, number | null>): Promise<void> {
  const rows: Record<string, string> = {};
  for (const k of LIMIT_KEYS) rows[`limit_${k}`] = values[k] === null ? "" : String(values[k]);
  await setSettings(rows);
}

type UserLimitRow = { role: "super_admin" | "user"; limit_api_per_minute: number | null; limit_api_per_day: number | null; limit_max_links: number | null; limit_max_api_keys: number | null };

/** Per-user overrides (NULL = none). Falls back to no overrides when migration 013 has not been applied yet. */
export async function userOverrides(userId: number): Promise<{ role: "super_admin" | "user"; values: Record<LimitKey, number | null> }> {
  try {
    const r = await queryOne<UserLimitRow>("SELECT role, limit_api_per_minute, limit_api_per_day, limit_max_links, limit_max_api_keys FROM users WHERE id = ?", [userId]);
    return {
      role: r?.role ?? "user",
      values: { api_per_minute: r?.limit_api_per_minute ?? null, api_per_day: r?.limit_api_per_day ?? null, max_links: r?.limit_max_links ?? null, max_api_keys: r?.limit_max_api_keys ?? null },
    };
  } catch {
    const r = await queryOne<{ role: "super_admin" | "user" }>("SELECT role FROM users WHERE id = ?", [userId]).catch(() => null);
    return { role: r?.role ?? "user", values: { api_per_minute: null, api_per_day: null, max_links: null, max_api_keys: null } };
  }
}

export interface UserLimits { values: Record<LimitKey, number>; unlimited: boolean }

const cache = new Map<number, { at: number; v: UserLimits }>();
const TTL = 30_000;

/** What this account may do. Super admins are not limited. Cached for 30 seconds so every API call does not cost a query. */
export async function limitsFor(userId: number): Promise<UserLimits> {
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < TTL) return hit.v;
  const [site, own] = await Promise.all([siteLimits(), userOverrides(userId)]);
  const values = {} as Record<LimitKey, number>;
  for (const k of LIMIT_KEYS) values[k] = effectiveLimit(k, own.values[k], site[k]);
  const v = { values, unlimited: own.role === "super_admin" };
  cache.set(userId, { at: Date.now(), v });
  if (cache.size > 2000) cache.clear();
  return v;
}

export const forgetLimits = (userId?: number) => { if (userId === undefined) cache.clear(); else cache.delete(userId); };

export async function saveUserOverrides(userId: number, values: Record<LimitKey, number | null>): Promise<void> {
  await exec(
    "UPDATE users SET limit_api_per_minute = ?, limit_api_per_day = ?, limit_max_links = ?, limit_max_api_keys = ? WHERE id = ?",
    [values.api_per_minute, values.api_per_day, values.max_links, values.max_api_keys, userId],
  );
  forgetLimits(userId);
}

export async function countLinks(userId: number): Promise<number> {
  const r = await queryOne<{ n: number }>("SELECT COUNT(*) AS n FROM links WHERE user_id = ?", [userId]);
  return Number(r?.n ?? 0);
}

export async function countActiveKeys(userId: number): Promise<number> {
  const r = await queryOne<{ n: number }>("SELECT COUNT(*) AS n FROM api_keys WHERE user_id = ? AND revoked_at IS NULL", [userId]);
  return Number(r?.n ?? 0);
}

