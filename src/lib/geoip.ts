import { LRU } from "./lru.ts";
import { isPrivateIp } from "./link-health.ts";
import { getSetting } from "./settings";
import { decrypt } from "./crypto";
import type { ReqInfo } from "./request";

const cache = new LRU<string>(5000, 24 * 3600_000);

/** The ipinfo.io token: saved by an administrator (Admin > Security, stored encrypted), else the GEOIP_TOKEN environment variable, else "". */
export async function geoipToken(): Promise<string> {
  try {
    const saved = await getSetting("geoip_token");
    if (saved) return decrypt(saved).trim();
  } catch { /* a damaged value falls back to the environment */ }
  return (process.env.GEOIP_TOKEN ?? "").trim();
}

/**
 * The visitor's country. A CDN header (Cloudflare, Vercel) wins. Otherwise, when a GeoIP token is set, the address is looked up
 * once at ipinfo.io and remembered for a day (the address leaves this server only in that case). It never delays a redirect by
 * more than 0.7 seconds, and any failure means "unknown" (null).
 */
export async function countryFor(info: Pick<ReqInfo, "ip" | "country">): Promise<string | null> {
  if (info.country) return info.country;
  const ip = info.ip;
  const token = ip && !isPrivateIp(ip) ? await geoipToken() : "";
  if (!token || !ip || ip === "0.0.0.0" || isPrivateIp(ip)) return null;
  const hit = cache.get(ip);
  if (hit !== undefined) return hit || null;
  try {
    const res = await fetch(`https://ipinfo.io/${encodeURIComponent(ip)}/country?token=${encodeURIComponent(token)}`, { signal: AbortSignal.timeout(700), headers: { accept: "text/plain" } });
    const text = res.ok ? (await res.text()).trim().toUpperCase() : "";
    const cc = /^[A-Z]{2}$/.test(text) ? text : "";
    cache.set(ip, cc, cc ? undefined : 10 * 60_000);
    return cc || null;
  } catch {
    return null;
  }
}
