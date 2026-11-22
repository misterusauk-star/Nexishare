import { NextResponse } from "next/server";
import { exec, queryOne } from "./db";
import { ipHash, sha256 } from "./crypto";
import { rateLimit } from "./ratelimit";
import { limitsFor } from "./user-limits";
import { fromHeaders } from "./request";
import { linkState, type LinkRow } from "./services/links";
import { linkHost, linkUrl, type DomainState } from "./domains";

export interface ApiUser { id: number; username: string | null; role: "super_admin" | "user"; keyId: number }

export function apiError(status: number, message: string, extra?: Record<string, unknown>, headers?: Record<string, string>) {
  return NextResponse.json({ error: { message, ...extra } }, { status, headers });
}

export const num = (v: string | undefined | null, d: number) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);

/**
 * Authenticates a Bearer key and applies the per-key (per minute) and per-account (per day) limits.
 * Returns either the user or a ready-made error response.
 */
export async function authApi(req: Request): Promise<{ user: ApiUser } | { res: NextResponse }> {
  const info = fromHeaders(req.headers);
  // Throttle key guessing per IP before touching the key table.
  if (!(await rateLimit(`api:ip:${ipHash(info.ip)}`, 600, 60))) {
    return { res: apiError(429, "Too many requests.", undefined, { "Retry-After": "60" }) };
  }
  const m = /^Bearer\s+(ob_[A-Za-z0-9_-]{20,})$/.exec(req.headers.get("authorization") ?? "");
  if (!m) return { res: apiError(401, "Send your key as an Authorization: Bearer ob_... header.", undefined, { "WWW-Authenticate": "Bearer" }) };
  const row = await queryOne<{ id: number; user_id: number; username: string | null; role: "super_admin" | "user"; status: string }>(
    `SELECT k.id, k.user_id, u.username, u.role, u.status FROM api_keys k JOIN users u ON u.id = k.user_id
      WHERE k.key_hash = ? AND k.revoked_at IS NULL`,
    [sha256(m[1])],
  );
  if (!row || row.status !== "active") {
    // Wrong keys count against the caller's IP: 30 misses in 10 minutes locks guessing out for the rest of the window.
    if (!(await rateLimit(`api:bad:${ipHash(info.ip)}`, 30, 600))) return { res: apiError(429, "Too many failed attempts.", undefined, { "Retry-After": "600" }) };
    return { res: apiError(401, "That key is invalid or has been revoked.") };
  }
  // Limits are low by default; an administrator raises them for everyone or for one account (Admin > Security, Admin > Users).
  const lim = await limitsFor(row.user_id);
  if (!lim.unlimited) {
    const perMinute = lim.values.api_per_minute;
    if (!(await rateLimit(`api:key:${row.id}`, perMinute, 60))) {
      return { res: apiError(429, `Rate limit of ${perMinute} requests per minute reached.`, { limit: perMinute, window: "minute" }, { "Retry-After": "60" }) };
    }
    const perDay = lim.values.api_per_day;
    if (!(await rateLimit(`api:day:${row.user_id}`, perDay, 86_400))) {
      return { res: apiError(429, `Daily limit of ${perDay} API requests reached. It resets within 24 hours.`, { limit: perDay, window: "day" }, { "Retry-After": "3600" }) };
    }
  }
  exec("UPDATE api_keys SET last_used_at = UTC_TIMESTAMP() WHERE id = ?", [row.id]).catch(() => {});
  return { user: { id: row.user_id, username: row.username, role: row.role, keyId: row.id } };
}

export function linkJson(l: LinkRow, st: DomainState) {
  return {
    id: l.id,
    slug: l.slug,
    short_url: linkUrl(st, l.domain_id, l.slug),
    domain: linkHost(st, l.domain_id),
    domain_id: l.domain_id ?? null,
    target_url: l.target_url,
    // universal: true when the link has no destination of its own, only device URLs (other devices see a chooser page).
    universal: !!l.universal,
    ios_url: l.ios_url ?? null,
    android_url: l.android_url ?? null,
    windows_url: l.windows_url ?? null,
    mac_url: l.mac_url ?? null,
    linux_url: l.linux_url ?? null,
    expired_url: l.expired_url ?? null,
    title: l.title,
    password_protected: !!l.password_hash,
    enabled: !!l.enabled && !l.moderated,
    // max_clicks: null = unlimited. click_count only counts visits for links that have a limit.
    max_clicks: l.max_clicks ?? null,
    click_count: l.max_clicks != null ? Number(l.click_count ?? 0) : null,
    // status: active | scheduled | expired | disabled | review | moderated
    status: linkState(l),
    // null starts_at = live immediately, null expires_at = never expires.
    starts_at: l.starts_at ? new Date(l.starts_at).toISOString() : null,
    expires_at: l.expires_at ? new Date(l.expires_at).toISOString() : null,
    created_at: new Date(l.created_at).toISOString(),
  };
}

export async function jsonBody(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const b = await req.json();
    return b && typeof b === "object" && !Array.isArray(b) ? (b as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
