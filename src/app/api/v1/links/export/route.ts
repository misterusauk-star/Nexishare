import { NextResponse } from "next/server";
import { apiError, authApi } from "@/lib/api";
import { query } from "@/lib/db";
import { getDomainState, linkHost, linkUrl } from "@/lib/domains";
import { toCsv } from "@/lib/csv";
import { rateLimit } from "@/lib/ratelimit";
import { linkState, type LinkRow } from "@/lib/services/links";
import { guardApi } from "@/lib/host-guard";

export const dynamic = "force-dynamic";
const MAX_ROWS = 50_000;
const iso = (d: Date | null) => (d ? new Date(d).toISOString() : "");

/** All of your links as CSV, with device URLs, schedule, limits and click totals. Works with read-only keys. */
export async function GET(req: Request) {
  { const blocked = await guardApi(); if (blocked) return blocked; }
  const a = await authApi(req);
  if ("res" in a) return a.res;
  if (!(await rateLimit(`api:export:${a.user.id}`, 6, 600))) return apiError(429, "Too many exports. Try again in a few minutes.", undefined, { "Retry-After": "600" });
  const st = await getDomainState();
  const rows = await query<LinkRow & { clicks: number; uniques: number }>(
    `SELECT l.*,
            (SELECT COUNT(*) FROM clicks c WHERE c.entity_type = 'link' AND c.entity_id = l.id) AS clicks,
            (SELECT COALESCE(SUM(c.is_unique), 0) FROM clicks c WHERE c.entity_type = 'link' AND c.entity_id = l.id) AS uniques
       FROM links l WHERE l.user_id = ? ORDER BY l.id LIMIT ${MAX_ROWS}`, [a.user.id],
  );
  const csv = toCsv([
    ["id", "short_url", "domain", "slug", "target_url", "universal", "ios_url", "android_url", "windows_url", "mac_url", "linux_url", "expired_url", "title", "status", "starts_at", "expires_at", "max_clicks", "clicks", "unique_clicks", "created_at"],
    ...rows.map((r) => [
      r.id, linkUrl(st, r.domain_id, r.slug), linkHost(st, r.domain_id), r.slug, r.universal ? "" : r.target_url, r.universal ? "yes" : "no",
      r.ios_url ?? "", r.android_url ?? "", r.windows_url ?? "", r.mac_url ?? "", r.linux_url ?? "", r.expired_url ?? "",
      r.title ?? "", linkState(r), iso(r.starts_at), iso(r.expires_at), r.max_clicks ?? "", Number(r.clicks), Number(r.uniques), iso(r.created_at),
    ]),
  ]);
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="links.csv"', "Cache-Control": "no-store" } });
}
